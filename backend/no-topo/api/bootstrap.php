<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/arena.php';

const NO_TOPO_ALLOWED_ORIGINS = ['https://nexo.yt', 'https://www.nexo.yt'];
const NO_TOPO_MAX_BODY_BYTES = 16384;

function no_topo_assert_origin(?string $origin): void
{
    if ($origin !== null && $origin !== '' && !in_array($origin, NO_TOPO_ALLOWED_ORIGINS, true)) {
        throw new DomainException('Origem nao autorizada.', 403);
    }
}

function no_topo_parse_json_body(string $raw): array
{
    if (strlen($raw) > NO_TOPO_MAX_BODY_BYTES) {
        throw new LengthException('Corpo da requisicao muito grande.', 413);
    }
    $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($decoded)) {
        throw new InvalidArgumentException('JSON invalido.');
    }
    return $decoded;
}

function no_topo_validate_bid_input(array $input): array
{
    $nickname = trim((string) ($input['nickname'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    if ($nickname === '' || mb_strlen($nickname) > 20 || preg_match('/[<>\r\n]/u', $nickname)) {
        throw new InvalidArgumentException('Apelido invalido.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160) {
        throw new InvalidArgumentException('E-mail invalido.');
    }
    return [
        'nickname' => $nickname,
        'email' => $email,
        'postUrl' => (string) ($input['postUrl'] ?? ''),
        'amountCents' => (int) ($input['amountCents'] ?? 0),
    ];
}

function no_topo_rate_limit(string $directory, string $ip, DateTimeImmutable $now, int $limit = 8, int $windowSeconds = 60): void
{
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) {
        throw new RuntimeException('Rate limiter indisponivel.');
    }
    $key = hash('sha256', 'no-topo-rate:' . $ip);
    $path = rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . $key . '.json';
    $lock = fopen($path . '.lock', 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Rate limiter indisponivel.');
    }
    try {
        $timestamps = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];
        $cutoff = $now->getTimestamp() - $windowSeconds;
        $timestamps = array_values(array_filter(is_array($timestamps) ? $timestamps : [], static fn ($stamp): bool => is_int($stamp) && $stamp > $cutoff));
        if (count($timestamps) >= $limit) {
            throw new DomainException('Muitas tentativas. Aguarde um minuto.', 429);
        }
        $timestamps[] = $now->getTimestamp();
        file_put_contents($path, json_encode($timestamps, JSON_THROW_ON_ERROR), LOCK_EX);
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function no_topo_data_path(): string
{
    return dirname(__DIR__) . '/data/arena.json';
}

function no_topo_emit_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function no_topo_http_bootstrap(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    no_topo_assert_origin($origin);
    if ($origin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Cache-Control: no-store');
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
