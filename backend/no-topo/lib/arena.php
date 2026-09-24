<?php
declare(strict_types=1);

const NO_TOPO_BASE_BID_CENTS = 2000;
const NO_TOPO_INCREMENT_CENTS = 2000;
const NO_TOPO_PROTECTION_SECONDS = 600;
const NO_TOPO_RESERVATION_SECONDS = 300;

function no_topo_utc(DateTimeImmutable $date): string
{
    return $date->setTimezone(new DateTimeZone('UTC'))->format(DateTimeInterface::ATOM);
}

function no_topo_cycle(DateTimeImmutable $now): array
{
    $zone = new DateTimeZone('America/Sao_Paulo');
    $local = $now->setTimezone($zone);
    $start = $local->setTime(0, 0, 0);
    $end = $start->modify('+1 day');

    return [
        'id' => $start->format('Y-m-d'),
        'startsAt' => no_topo_utc($start),
        'endsAt' => no_topo_utc($end),
    ];
}

function no_topo_empty_state(DateTimeImmutable $now): array
{
    return [
        'version' => 1,
        'cycle' => no_topo_cycle($now),
        'baseBidCents' => NO_TOPO_BASE_BID_CENTS,
        'incrementCents' => NO_TOPO_INCREMENT_CENTS,
        'protectionSeconds' => NO_TOPO_PROTECTION_SECONDS,
        'reservationSeconds' => NO_TOPO_RESERVATION_SECONDS,
        'ranking' => [],
        'reservations' => [],
    ];
}

function no_topo_current_state(array $state, DateTimeImmutable $now): array
{
    $cycle = no_topo_cycle($now);
    if (($state['cycle']['id'] ?? null) === $cycle['id']) {
        return $state;
    }

    $fresh = no_topo_empty_state($now);
    $fresh['history'] = $state['history'] ?? [];
    if (!empty($state['ranking'])) {
        $fresh['history'][] = [
            'cycle' => $state['cycle'] ?? null,
            'ranking' => $state['ranking'],
        ];
    }
    return $fresh;
}

function no_topo_parse_time(?string $value): ?DateTimeImmutable
{
    if (!$value) {
        return null;
    }
    try {
        return new DateTimeImmutable($value);
    } catch (Throwable) {
        return null;
    }
}

function no_topo_next_bid(array $state, DateTimeImmutable $now): int
{
    $state = no_topo_current_state($state, $now);
    $highest = 0;
    foreach ($state['ranking'] ?? [] as $entry) {
        $highest = max($highest, (int) ($entry['amountCents'] ?? 0));
    }
    foreach ($state['reservations'] ?? [] as $reservation) {
        $expires = no_topo_parse_time($reservation['expiresAt'] ?? null);
        if (($reservation['status'] ?? null) === 'reserved' && $expires && $expires > $now) {
            $highest = max($highest, (int) ($reservation['amountCents'] ?? 0));
        }
    }

    return $highest === 0
        ? (int) ($state['baseBidCents'] ?? NO_TOPO_BASE_BID_CENTS)
        : $highest + (int) ($state['incrementCents'] ?? NO_TOPO_INCREMENT_CENTS);
}

function no_topo_normalize_instagram_url(string $url): array
{
    $parts = parse_url(trim($url));
    $host = strtolower((string) ($parts['host'] ?? ''));
    if (($parts['scheme'] ?? '') !== 'https' || !in_array($host, ['instagram.com', 'www.instagram.com'], true)) {
        throw new InvalidArgumentException('Use um link valido do Instagram.');
    }
    if (isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
        throw new InvalidArgumentException('Use um link valido do Instagram.');
    }
    $path = rawurldecode((string) ($parts['path'] ?? ''));
    if (!preg_match('~^/(?:reel|p)/([A-Za-z0-9_-]{5,32})/?$~', $path, $match)) {
        throw new InvalidArgumentException('Use um link de publicacao ou Reel do Instagram.');
    }
    $shortcode = $match[1];
    return [
        'shortcode' => $shortcode,
        'url' => "https://www.instagram.com/reel/{$shortcode}/",
        'embedUrl' => "https://www.instagram.com/reel/{$shortcode}/embed/",
    ];
}

function no_topo_reserve(array $state, array $input, DateTimeImmutable $now): array
{
    $state = no_topo_current_state($state, $now);
    $leader = $state['ranking'][0] ?? null;
    $protectedUntil = no_topo_parse_time($leader['protectedUntil'] ?? null);
    if ($protectedUntil && $protectedUntil > $now) {
        throw new DomainException('O primeiro lugar ainda esta protegido.');
    }

    $amount = (int) ($input['amountCents'] ?? 0);
    $minimum = no_topo_next_bid($state, $now);
    $increment = (int) ($state['incrementCents'] ?? NO_TOPO_INCREMENT_CENTS);
    if ($amount < $minimum || (($amount - $minimum) % $increment) !== 0) {
        throw new DomainException('Lance minimo: ' . $minimum . ' centavos.');
    }

    $instagram = no_topo_normalize_instagram_url((string) ($input['postUrl'] ?? ''));
    $id = bin2hex(random_bytes(16));
    $reservation = [
        'id' => $id,
        'cycleId' => $state['cycle']['id'],
        'status' => 'reserved',
        'nickname' => trim((string) ($input['nickname'] ?? '')),
        'email' => strtolower(trim((string) ($input['email'] ?? ''))),
        'postUrl' => $instagram['url'],
        'shortcode' => $instagram['shortcode'],
        'amountCents' => $amount,
        'createdAt' => no_topo_utc($now),
        'expiresAt' => no_topo_utc($now->modify('+' . (int) $state['reservationSeconds'] . ' seconds')),
    ];
    $state['reservations'][$id] = $reservation;

    return ['state' => $state, 'reservation' => $reservation];
}

function no_topo_approve(array $state, string $reservationId, string $providerId, DateTimeImmutable $now): array
{
    foreach ($state['ranking'] ?? [] as $entry) {
        if (($entry['reservationId'] ?? null) === $reservationId || ($entry['providerId'] ?? null) === $providerId) {
            return $state;
        }
    }
    if (!isset($state['reservations'][$reservationId])) {
        throw new DomainException('Reserva nao encontrada.');
    }
    $reservation = $state['reservations'][$reservationId];
    if (($reservation['cycleId'] ?? null) !== ($state['cycle']['id'] ?? null)) {
        $state['reservations'][$reservationId]['status'] = 'archived';
        return $state;
    }
    if (($reservation['status'] ?? null) !== 'reserved') {
        throw new DomainException('Reserva indisponivel.');
    }

    $state['reservations'][$reservationId]['status'] = 'approved';
    $state['reservations'][$reservationId]['providerId'] = $providerId;
    $state['reservations'][$reservationId]['approvedAt'] = no_topo_utc($now);
    $entry = [
        'reservationId' => $reservationId,
        'providerId' => $providerId,
        'nickname' => $reservation['nickname'],
        'postUrl' => $reservation['postUrl'],
        'shortcode' => $reservation['shortcode'],
        'amountCents' => $reservation['amountCents'],
        'approvedAt' => no_topo_utc($now),
        'protectedUntil' => no_topo_utc($now->modify('+' . (int) $state['protectionSeconds'] . ' seconds')),
    ];
    $state['ranking'][] = $entry;
    usort($state['ranking'], static fn (array $a, array $b): int => $b['amountCents'] <=> $a['amountCents']);

    return $state;
}

function no_topo_with_state(string $path, callable $mutation): mixed
{
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Nao foi possivel criar o diretorio de dados.');
    }
    $lock = fopen($path . '.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Nao foi possivel bloquear o estado da arena.');
    }
    try {
        $contents = is_file($path) ? file_get_contents($path) : false;
        $state = $contents ? json_decode($contents, true, 512, JSON_THROW_ON_ERROR) : [];
        $mutationResult = $mutation($state);
        if (!is_array($mutationResult) || !array_key_exists('state', $mutationResult)) {
            throw new LogicException('A mutacao deve retornar state.');
        }
        $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));
        $json = json_encode($mutationResult['state'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (file_put_contents($temporary, $json . PHP_EOL, LOCK_EX) === false || !rename($temporary, $path)) {
            @unlink($temporary);
            throw new RuntimeException('Nao foi possivel salvar o estado da arena.');
        }
        return $mutationResult['result'] ?? null;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
