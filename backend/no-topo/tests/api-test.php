<?php
declare(strict_types=1);

define('NO_TOPO_TESTING', true);
require_once dirname(__DIR__) . '/api/arena-state.php';
require_once dirname(__DIR__) . '/api/create-bid-session.php';

function api_same(mixed $expected, mixed $actual, string $label): void
{
    if ($expected !== $actual) {
        throw new RuntimeException("FAIL {$label}: " . var_export($actual, true));
    }
    echo "PASS {$label}\n";
}

function api_throws(callable $callback, string $part): void
{
    try { $callback(); } catch (Throwable $error) {
        if (str_contains($error->getMessage(), $part)) { echo "PASS exception {$part}\n"; return; }
        throw $error;
    }
    throw new RuntimeException("FAIL expected {$part}");
}

$now = new DateTimeImmutable('2026-09-24 12:00:00', new DateTimeZone('America/Sao_Paulo'));
$state = no_topo_empty_state($now);
$public = no_topo_arena_state($state, $now);
api_same(2000, $public['nextBidCents'], 'public next bid');
api_same(600, $public['protectionRules']['baseSeconds'], 'public base protection');
api_same(120, $public['protectionRules']['incrementSeconds'], 'public protection increment');
api_same(3600, $public['protectionRules']['maxSeconds'], 'public protection cap');
api_same(null, $public['cycle']['endsAt'], 'public cycle has no daily reset');
api_same([], $public['ranking'], 'empty public ranking');

$created = no_topo_create_bid_session($state, [
    'nickname' => 'Visitante 482',
    'email' => 'pessoa@example.com',
    'postUrl' => 'https://www.instagram.com/reel/DV966NsjYCk/',
    'amountCents' => 2000,
], $now);
api_same(2000, $created['public']['amountCents'], 'server accepted exact bid');
api_same(false, isset($created['public']['email']), 'public response hides email');

no_topo_assert_origin('https://nexo.yt');
no_topo_assert_origin('https://www.nexo.yt');
api_throws(fn () => no_topo_assert_origin('https://evil.test'), 'Origem');
api_throws(fn () => no_topo_parse_json_body('{'), 'Syntax');
api_throws(fn () => no_topo_parse_json_body(str_repeat('x', 16385)), 'grande');
api_throws(fn () => no_topo_validate_bid_input(['nickname' => '', 'email' => 'x']), 'Apelido');
api_throws(fn () => no_topo_validate_bid_input(['nickname' => 'Pessoa', 'email' => 'x']), 'E-mail');

$rate = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'no-topo-rate-' . bin2hex(random_bytes(5));
no_topo_rate_limit($rate, '127.0.0.1', $now, 1, 60);
api_throws(fn () => no_topo_rate_limit($rate, '127.0.0.1', $now, 1, 60), 'Muitas');
array_map('unlink', glob($rate . DIRECTORY_SEPARATOR . '*') ?: []);
rmdir($rate);

echo "All API tests passed.\n";
