<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/lib/arena.php';

function assert_same(mixed $expected, mixed $actual, string $label): void
{
    if ($expected !== $actual) {
        throw new RuntimeException("FAIL {$label}: expected " . var_export($expected, true) . ', got ' . var_export($actual, true));
    }
    echo "PASS {$label}\n";
}

function assert_throws(callable $callback, string $messagePart): void
{
    try {
        $callback();
    } catch (Throwable $error) {
        if (!str_contains($error->getMessage(), $messagePart)) {
            throw new RuntimeException("FAIL exception: expected message containing {$messagePart}, got {$error->getMessage()}");
        }
        echo "PASS exception {$messagePart}\n";
        return;
    }
    throw new RuntimeException("FAIL exception: expected {$messagePart}");
}

function empty_state(DateTimeImmutable $now): array
{
    return no_topo_empty_state($now);
}

function bid_input(int $amountCents): array
{
    return [
        'nickname' => 'Visitante 482',
        'email' => 'pessoa@example.com',
        'postUrl' => 'https://www.instagram.com/reel/DV966NsjYCk/',
        'amountCents' => $amountCents,
    ];
}

$tz = new DateTimeZone('America/Sao_Paulo');
$before = new DateTimeImmutable('2026-09-24 23:59:59', $tz);
$after = new DateTimeImmutable('2026-09-25 00:00:00', $tz);

assert_same('2026-09-24', no_topo_cycle($before)['id'], 'cycle before midnight');
assert_same('2026-09-25', no_topo_cycle($after)['id'], 'cycle at midnight');
assert_same(2000, no_topo_next_bid(empty_state($before), $before), 'base bid');

$bidTime = new DateTimeImmutable('2026-09-24 12:00:00', $tz);
$first = no_topo_reserve(empty_state($bidTime), bid_input(2000), $bidTime);
assert_same('reserved', $first['reservation']['status'], 'first bid reserves');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(2000), $bidTime), 'Lance minimo');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(3000), $bidTime), 'Lance minimo');

$approved = no_topo_approve($first['state'], $first['reservation']['id'], 'mp-1', $bidTime);
assert_same(2000, $approved['ranking'][0]['amountCents'], 'approved bid ranks first');
assert_same(1, count(no_topo_approve($approved, $first['reservation']['id'], 'mp-1', $bidTime)['ranking']), 'approval is idempotent');
assert_throws(fn () => no_topo_reserve($approved, bid_input(4000), $bidTime->modify('+599 seconds')), 'protegido');
assert_same(4000, no_topo_reserve($approved, bid_input(4000), $bidTime->modify('+600 seconds'))['reservation']['amountCents'], 'protection expires');

assert_same('DV966NsjYCk', no_topo_normalize_instagram_url('https://www.instagram.com/reel/DV966NsjYCk/?utm_source=x')['shortcode'], 'normalizes reel');
assert_throws(fn () => no_topo_normalize_instagram_url('https://instagram.com.evil.test/reel/DV966NsjYCk/'), 'Instagram');
assert_throws(fn () => no_topo_normalize_instagram_url('https://user:pass@instagram.com/reel/DV966NsjYCk/'), 'Instagram');

$temp = tempnam(sys_get_temp_dir(), 'no-topo-test-');
file_put_contents($temp, json_encode(empty_state($before), JSON_THROW_ON_ERROR));
$result = no_topo_with_state($temp, function (array $state) use ($before): array {
    $state['test'] = true;
    return ['state' => $state, 'result' => 'saved'];
});
assert_same('saved', $result, 'locked mutation result');
assert_same(true, json_decode((string) file_get_contents($temp), true, 512, JSON_THROW_ON_ERROR)['test'], 'locked mutation persists');
unlink($temp);

echo "All arena domain tests passed.\n";
