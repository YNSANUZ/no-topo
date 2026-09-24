<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/lib/mercado-pago.php';

if (!defined('NO_TOPO_TESTING')) {
    try {
        header('Content-Type: application/json; charset=utf-8');
        $dataId = (string) ($_GET['data_id'] ?? $_GET['data.id'] ?? '');
        $signature = (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? '');
        $requestId = (string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? '');
        $config = no_topo_load_mercado_pago_config();
        $secret = no_topo_config_value($config, ['webhook_secret', 'webhookSecret', 'WEBHOOK_SECRET']);
        if (!no_topo_validate_webhook_signature($signature, $requestId, $dataId, $secret)) {
            throw new DomainException('Assinatura invalida.', 401);
        }
        if (!preg_match('/^[0-9]+$/', $dataId)) {
            throw new InvalidArgumentException('Pagamento invalido.');
        }
        $provider = no_topo_mercado_pago_request('GET', '/v1/payments/' . rawurlencode($dataId));
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
        no_topo_with_state(no_topo_data_path(), static function (array $state) use ($provider, $now): array {
            $state = no_topo_current_state($state ?: no_topo_empty_state($now), $now);
            $state = no_topo_apply_provider_status($state, $provider, $now);
            return ['state' => $state, 'result' => true];
        });
        no_topo_emit_json(['received' => true]);
    } catch (Throwable $error) {
        no_topo_emit_json(['error' => $error->getMessage()], $error->getCode() >= 400 ? min($error->getCode(), 599) : 400);
    }
}
