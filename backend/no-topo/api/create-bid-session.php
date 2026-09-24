<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function no_topo_create_bid_session(array $state, array $input, DateTimeImmutable $now): array
{
    $created = no_topo_reserve($state ?: no_topo_empty_state($now), no_topo_validate_bid_input($input), $now);
    $reservation = $created['reservation'];
    return [
        'state' => $created['state'],
        'public' => [
            'reservationId' => $reservation['id'],
            'amountCents' => $reservation['amountCents'],
            'expiresAt' => $reservation['expiresAt'],
            'nickname' => $reservation['nickname'],
            'postUrl' => $reservation['postUrl'],
        ],
    ];
}

if (!defined('NO_TOPO_TESTING')) {
    try {
        no_topo_http_bootstrap();
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            throw new DomainException('Metodo nao permitido.', 405);
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
        no_topo_rate_limit(dirname(__DIR__) . '/data/rate', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $now);
        $input = no_topo_parse_json_body((string) file_get_contents('php://input'));
        $payload = no_topo_with_state(no_topo_data_path(), static function (array $state) use ($input, $now): array {
            $created = no_topo_create_bid_session($state, $input, $now);
            return ['state' => $created['state'], 'result' => $created['public']];
        });
        no_topo_emit_json($payload, 201);
    } catch (Throwable $error) {
        no_topo_emit_json(['error' => $error->getMessage()], $error->getCode() >= 400 ? $error->getCode() : 400);
    }
}
