<?php
declare(strict_types=1);

require_once __DIR__ . '/arena.php';

function no_topo_payment_payload(array $reservation, array $form): array
{
    if (($reservation['status'] ?? null) !== 'reserved') {
        throw new DomainException('A reserva nao esta disponivel para pagamento.');
    }
    $token = trim((string) ($form['token'] ?? ''));
    $method = trim((string) ($form['payment_method_id'] ?? ''));
    $email = strtolower(trim((string) ($reservation['email'] ?? '')));
    if ($token === '' || $method === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Dados de pagamento incompletos.');
    }
    $payload = [
        'transaction_amount' => ((int) $reservation['amountCents']) / 100,
        'token' => $token,
        'description' => 'Lance No Topo',
        'installments' => max(1, (int) ($form['installments'] ?? 1)),
        'payment_method_id' => $method,
        'external_reference' => $reservation['id'],
        'payer' => ['email' => $email],
    ];
    if (!empty($form['issuer_id'])) {
        $payload['issuer_id'] = (string) $form['issuer_id'];
    }
    $identification = $form['payer']['identification'] ?? null;
    if (is_array($identification) && !empty($identification['type']) && !empty($identification['number'])) {
        $payload['payer']['identification'] = [
            'type' => substr((string) $identification['type'], 0, 10),
            'number' => preg_replace('/\D+/', '', (string) $identification['number']),
        ];
    }
    return $payload;
}

function no_topo_process_payment(array $request, callable $gateway): array
{
    $reservation = $request['reservation'] ?? null;
    if (!is_array($reservation) || ($request['reservationId'] ?? null) !== ($reservation['id'] ?? null)) {
        throw new DomainException('A reserva informada e invalida.');
    }
    $payload = no_topo_payment_payload($reservation, $request['formData'] ?? []);
    $provider = $gateway([
        'payload' => $payload,
        'idempotencyKey' => hash('sha256', 'no-topo:' . $reservation['id']),
    ]);
    if (!is_array($provider) || empty($provider['id']) || empty($provider['status'])) {
        throw new RuntimeException('Resposta de pagamento invalida.');
    }
    if (($provider['external_reference'] ?? null) !== $reservation['id']) {
        throw new DomainException('O provedor retornou uma reserva divergente.');
    }
    $providerAmount = (int) round(((float) ($provider['transaction_amount'] ?? $provider['total_amount'] ?? 0)) * 100);
    if ($providerAmount !== (int) $reservation['amountCents']) {
        throw new DomainException('O provedor retornou um valor divergente da reserva.');
    }
    return ['provider' => $provider, 'reservationId' => $reservation['id']];
}

function no_topo_apply_provider_status(array $state, array $providerPayment, DateTimeImmutable $now): array
{
    $reservationId = (string) ($providerPayment['external_reference'] ?? '');
    if ($reservationId === '' || !isset($state['reservations'][$reservationId])) {
        throw new DomainException('Reserva do pagamento nao encontrada.');
    }
    $reservation = $state['reservations'][$reservationId];
    $amount = (int) round(((float) ($providerPayment['transaction_amount'] ?? $providerPayment['total_amount'] ?? 0)) * 100);
    if ($amount !== (int) $reservation['amountCents']) {
        throw new DomainException('Valor do pagamento nao corresponde a reserva.');
    }
    $status = (string) ($providerPayment['status'] ?? 'unknown');
    $providerId = (string) ($providerPayment['id'] ?? '');
    if ($status === 'approved') {
        return no_topo_approve($state, $reservationId, $providerId, $now);
    }
    $state['reservations'][$reservationId]['providerId'] = $providerId;
    $state['reservations'][$reservationId]['status'] = in_array($status, ['rejected', 'cancelled', 'refunded'], true) ? 'rejected' : 'pending';
    return $state;
}

function no_topo_validate_webhook_signature(string $signature, string $requestId, string $dataId, string $secret): bool
{
    if ($signature === '' || $requestId === '' || $dataId === '' || $secret === '') {
        return false;
    }
    $parts = [];
    foreach (explode(',', $signature) as $piece) {
        [$key, $value] = array_pad(explode('=', trim($piece), 2), 2, '');
        $parts[$key] = $value;
    }
    if (empty($parts['ts']) || empty($parts['v1'])) {
        return false;
    }
    $manifest = 'id:' . strtolower($dataId) . ';request-id:' . $requestId . ';ts:' . $parts['ts'] . ';';
    return hash_equals(hash_hmac('sha256', $manifest, $secret), $parts['v1']);
}

function no_topo_shared_config_path(): string
{
    // In production both isolated backends are siblings inside public_html.
    return dirname(__DIR__, 2) . '/_ursoninhos_backend/config/mercadopago.php';
}

function no_topo_load_mercado_pago_config(): array
{
    $shared = no_topo_shared_config_path();
    if (!is_file($shared)) {
        throw new RuntimeException('Configuracao do Mercado Pago indisponivel.');
    }
    $config = require $shared;
    if (!is_array($config)) {
        throw new RuntimeException('Configuracao do Mercado Pago invalida.');
    }
    return $config;
}

function no_topo_config_value(array $config, array $keys): string
{
    foreach ($keys as $key) {
        if (!empty($config[$key]) && is_string($config[$key])) {
            return $config[$key];
        }
    }
    return '';
}

function no_topo_mercado_pago_request(string $method, string $path, ?array $payload = null, ?string $idempotencyKey = null): array
{
    $config = no_topo_load_mercado_pago_config();
    $token = no_topo_config_value($config, ['access_token', 'accessToken', 'ACCESS_TOKEN']);
    if ($token === '') {
        throw new RuntimeException('Access Token do Mercado Pago indisponivel.');
    }
    $curl = curl_init('https://api.mercadopago.com' . $path);
    $headers = ['Authorization: Bearer ' . $token, 'Content-Type: application/json'];
    if ($idempotencyKey) {
        $headers[] = 'X-Idempotency-Key: ' . $idempotencyKey;
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    if ($payload !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR));
    }
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    if ($body === false || $curlError !== '') {
        throw new RuntimeException('Falha ao conectar ao Mercado Pago.');
    }
    $decoded = json_decode((string) $body, true);
    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        throw new RuntimeException('Mercado Pago recusou a solicitacao.', $status ?: 502);
    }
    return $decoded;
}
