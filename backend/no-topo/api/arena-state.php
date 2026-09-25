<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function no_topo_arena_state(array $state, DateTimeImmutable $now): array
{
    $state = no_topo_current_state($state ?: no_topo_empty_state($now), $now);
    $ranking = array_map(static fn (array $entry): array => [
        'nickname' => $entry['nickname'],
        'postUrl' => $entry['postUrl'],
        'embedUrl' => 'https://www.instagram.com/reel/' . $entry['shortcode'] . '/embed/',
        'amountCents' => $entry['amountCents'],
        'approvedAt' => $entry['approvedAt'],
        'protectedUntil' => $entry['protectedUntil'],
        'endedAt' => $entry['endedAt'] ?? null,
        'durationSeconds' => $entry['durationSeconds'] ?? null,
    ], array_slice($state['ranking'] ?? [], 0, 100));
    return [
        'cycle' => $state['cycle'],
        'baseBidCents' => $state['baseBidCents'],
        'incrementCents' => $state['incrementCents'],
        'nextBidCents' => no_topo_next_bid($state, $now),
        'protectionRules' => [
            'baseSeconds' => NO_TOPO_PROTECTION_SECONDS,
            'incrementSeconds' => NO_TOPO_PROTECTION_INCREMENT_SECONDS,
            'maxSeconds' => NO_TOPO_MAX_PROTECTION_SECONDS,
        ],
        'protectedUntil' => $ranking[0]['protectedUntil'] ?? null,
        'ranking' => $ranking,
    ];
}

if (!defined('NO_TOPO_TESTING')) {
    try {
        no_topo_http_bootstrap();
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
        $payload = no_topo_with_state(no_topo_data_path(), static function (array $state) use ($now): array {
            $state = no_topo_current_state($state ?: no_topo_empty_state($now), $now);
            return ['state' => $state, 'result' => no_topo_arena_state($state, $now)];
        });
        no_topo_emit_json($payload);
    } catch (Throwable $error) {
        no_topo_emit_json(['error' => $error->getMessage()], $error->getCode() >= 400 ? $error->getCode() : 400);
    }
}
