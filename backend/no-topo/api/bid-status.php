<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/lib/mercado-pago.php';

if (!defined('NO_TOPO_TESTING')) {
    try {
        no_topo_http_bootstrap();
        $reservationId = (string) ($_GET['reservationId'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $reservationId)) {
            throw new InvalidArgumentException('Reserva invalida.');
        }
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
        $public = no_topo_with_state(no_topo_data_path(), static function (array $state) use ($reservationId, $now): array {
            $state = no_topo_current_state($state ?: no_topo_empty_state($now), $now);
            $reservation = $state['reservations'][$reservationId] ?? null;
            if (!is_array($reservation)) {
                throw new DomainException('Reserva nao encontrada.', 404);
            }
            $providerId = (string) ($reservation['providerId'] ?? '');
            if ($providerId !== '' && in_array($reservation['status'] ?? '', ['pending', 'reserved'], true)) {
                $provider = no_topo_mercado_pago_request('GET', '/v1/payments/' . rawurlencode($providerId));
                $state = no_topo_apply_provider_status($state, $provider, $now);
                $reservation = $state['reservations'][$reservationId];
            }
            return ['state' => $state, 'result' => [
                'reservationId' => $reservationId,
                'status' => $reservation['status'],
                'amountCents' => $reservation['amountCents'],
            ]];
        });
        no_topo_emit_json($public);
    } catch (Throwable $error) {
        no_topo_emit_json(['error' => $error->getMessage()], $error->getCode() >= 400 ? min($error->getCode(), 599) : 400);
    }
}
