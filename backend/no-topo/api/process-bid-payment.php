<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/lib/mercado-pago.php';

if (!defined('NO_TOPO_TESTING')) {
    try {
        no_topo_http_bootstrap();
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            throw new DomainException('Metodo nao permitido.', 405);
        }
        $input = no_topo_parse_json_body((string) file_get_contents('php://input'));
        $reservationId = (string) ($input['reservationId'] ?? '');
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
        no_topo_rate_limit(dirname(__DIR__) . '/data/rate-pay', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $now, 5, 60);

        $reservation = no_topo_with_state(no_topo_data_path(), static function (array $state) use ($reservationId, $now): array {
            $state = no_topo_current_state($state ?: no_topo_empty_state($now), $now);
            $reservation = $state['reservations'][$reservationId] ?? null;
            if (!is_array($reservation)) {
                throw new DomainException('Reserva nao encontrada.', 404);
            }
            $expiresAt = no_topo_parse_time($reservation['expiresAt'] ?? null);
            if (!$expiresAt || $expiresAt <= $now) {
                throw new DomainException('Reserva expirada.', 409);
            }
            return ['state' => $state, 'result' => $reservation];
        });

        $processed = no_topo_process_payment([
            'reservationId' => $reservationId,
            'reservation' => $reservation,
            'formData' => $input['formData'] ?? [],
        ], static fn (array $request): array => no_topo_mercado_pago_request('POST', '/v1/payments', $request['payload'], $request['idempotencyKey']));

        $public = no_topo_with_state(no_topo_data_path(), static function (array $state) use ($processed, $now): array {
            $state = no_topo_apply_provider_status($state, $processed['provider'], $now);
            return ['state' => $state, 'result' => [
                'paymentId' => (string) $processed['provider']['id'],
                'status' => (string) $processed['provider']['status'],
                'reservationId' => $processed['reservationId'],
            ]];
        });
        no_topo_emit_json($public);
    } catch (Throwable $error) {
        no_topo_emit_json(['error' => $error->getMessage()], $error->getCode() >= 400 ? min($error->getCode(), 599) : 400);
    }
}
