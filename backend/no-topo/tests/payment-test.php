<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/mercado-pago.php';

function pay_same(mixed $expected, mixed $actual, string $label): void
{
    if ($expected !== $actual) { throw new RuntimeException("FAIL {$label}: " . var_export($actual, true)); }
    echo "PASS {$label}\n";
}
function pay_throws(callable $callback, string $part): void
{
    try { $callback(); } catch (Throwable $error) {
        if (str_contains($error->getMessage(), $part)) { echo "PASS exception {$part}\n"; return; }
        throw $error;
    }
    throw new RuntimeException("FAIL expected {$part}");
}

pay_same(dirname(__DIR__, 2) . '/_ursoninhos_backend/config/mercadopago.php', no_topo_shared_config_path(), 'shared config remains a sibling backend');

$now = new DateTimeImmutable('2026-09-24 12:00:00', new DateTimeZone('America/Sao_Paulo'));
$reserved = no_topo_reserve(no_topo_empty_state($now), [
    'nickname' => 'Visitante 482', 'email' => 'pessoa@example.com',
    'postUrl' => 'https://www.instagram.com/reel/DV966NsjYCk/', 'amountCents' => 2000,
], $now);
$reservation = $reserved['reservation'];
$request = [
    'reservationId' => $reservation['id'], 'reservation' => $reservation,
    'formData' => ['token' => 'tok_test', 'installments' => 1, 'payment_method_id' => 'visa'],
];
$gateway = static fn (array $request): array => [
    'id' => 'mp-payment-123', 'status' => 'approved',
    'external_reference' => $request['payload']['external_reference'],
    'transaction_amount' => $request['payload']['transaction_amount'],
];
$result = no_topo_process_payment($request, $gateway);
pay_same('approved', $result['provider']['status'], 'approved provider response');
pay_same($reservation['id'], $result['provider']['external_reference'], 'reservation is external reference');
pay_same(20, $result['provider']['transaction_amount'], 'server amount is sent');
pay_same('https://primusdf.com.br/_no_topo_backend/api/mercadopago-webhook.php', no_topo_payment_payload($reservation, $request['formData'])['notification_url'], 'payment registers isolated webhook');
pay_same($result, no_topo_process_payment($request, $gateway), 'idempotent replay');

$tampered = $request;
$tampered['reservationId'] = 'other';
pay_throws(fn () => no_topo_process_payment($tampered, $gateway), 'reserva');

$approved = no_topo_apply_provider_status($reserved['state'], $result['provider'], $now);
pay_same(1, count($approved['ranking']), 'approved payment ranks once');
pay_same(1, count(no_topo_apply_provider_status($approved, $result['provider'], $now)['ranking']), 'duplicate webhook ranks once');
$rejectedProvider = $result['provider'];
$rejectedProvider['status'] = 'rejected';
pay_same(0, count(no_topo_apply_provider_status($reserved['state'], $rejectedProvider, $now)['ranking']), 'rejected payment never ranks');

$secret = 'secret-test'; $requestId = 'req-1'; $dataId = '123'; $ts = '1742505638683';
$digest = hash_hmac('sha256', "id:123;request-id:req-1;ts:{$ts};", $secret);
pay_same(true, no_topo_validate_webhook_signature("ts={$ts},v1={$digest}", $requestId, $dataId, $secret), 'valid webhook signature');
pay_same(false, no_topo_validate_webhook_signature("ts={$ts},v1=bad", $requestId, $dataId, $secret), 'invalid webhook signature');

echo "All payment tests passed.\n";
