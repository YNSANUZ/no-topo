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

assert_same('continuous-v1', no_topo_cycle($before)['id'], 'continuous cycle before midnight');
assert_same('continuous-v1', no_topo_cycle($after)['id'], 'continuous cycle after midnight');
assert_same(null, no_topo_cycle($after)['endsAt'], 'continuous cycle has no daily reset');
assert_same(2000, no_topo_next_bid(empty_state($before), $before), 'base bid');
assert_same(600, no_topo_protection_seconds_for_bid(2000), 'base bid protects ten minutes');
assert_same(720, no_topo_protection_seconds_for_bid(4000), 'each increment adds two minutes');
assert_same(1080, no_topo_protection_seconds_for_bid(10000), 'one hundred reais protects eighteen minutes');
assert_same(3480, no_topo_protection_seconds_for_bid(50000), 'five hundred reais protects fifty eight minutes');
assert_same(3600, no_topo_protection_seconds_for_bid(120000), 'protection is capped at one hour');

$bidTime = new DateTimeImmutable('2026-09-24 12:00:00', $tz);
$first = no_topo_reserve(empty_state($bidTime), bid_input(2000), $bidTime);
assert_same('reserved', $first['reservation']['status'], 'first bid reserves');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(2000), $bidTime), 'Lance minimo');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(3000), $bidTime), 'Lance minimo');

$approved = no_topo_approve($first['state'], $first['reservation']['id'], 'mp-1', $bidTime);
assert_same(2000, $approved['ranking'][0]['amountCents'], 'approved bid ranks first');
assert_same('2026-09-24T15:10:00+00:00', $approved['ranking'][0]['protectedUntil'], 'approved base bid protects ten minutes');
assert_same(1, count(no_topo_approve($approved, $first['reservation']['id'], 'mp-1', $bidTime)['ranking']), 'approval is idempotent');
assert_same(1, count($approved['purchaseHistory']), 'approved payment enters public history once');
assert_same(1, count(no_topo_approve($approved, $first['reservation']['id'], 'mp-1', $bidTime)['purchaseHistory']), 'duplicate approval does not duplicate history');
assert_throws(fn () => no_topo_reserve($approved, bid_input(4000), $bidTime->modify('+599 seconds')), 'protegido');
assert_same(4000, no_topo_reserve($approved, bid_input(4000), $bidTime->modify('+600 seconds'))['reservation']['amountCents'], 'protection expires');
$secondInput = bid_input(4000);
$secondInput['nickname'] = 'Ana';
$secondInput['email'] = 'ana@example.com';
$secondInput['postUrl'] = 'https://www.instagram.com/reel/ANA123456/';
$secondReservation = no_topo_reserve($approved, $secondInput, $bidTime->modify('+600 seconds'));
$secondApproved = no_topo_approve($secondReservation['state'], $secondReservation['reservation']['id'], 'mp-2', $bidTime->modify('+600 seconds'));
assert_same(4000, $secondApproved['ranking'][0]['amountCents'], 'new winner becomes first');
assert_same(2000, $secondApproved['ranking'][1]['amountCents'], 'previous winner becomes second');
assert_same(600, $secondApproved['ranking'][1]['durationSeconds'], 'previous winner keeps time on top');

$otherInput = bid_input(6000);
$otherInput['nickname'] = 'Carlos';
$otherInput['email'] = 'carlos@example.com';
$otherInput['postUrl'] = 'https://www.instagram.com/reel/ABCDE12345/';
$otherReservation = no_topo_reserve($secondApproved, $otherInput, $bidTime->modify('+1320 seconds'));
$otherApproved = no_topo_approve($otherReservation['state'], $otherReservation['reservation']['id'], 'mp-3', $bidTime->modify('+1320 seconds'));
assert_same(['Carlos', 'Ana', 'Visitante 482'], array_column(array_slice($otherApproved['ranking'], 0, 3), 'nickname'), 'distinct winners occupy distinct podium places');

$returnInput = bid_input(8000);
$returnReservation = no_topo_reserve($otherApproved, $returnInput, $bidTime->modify('+2160 seconds'));
$returnApproved = no_topo_approve($returnReservation['state'], $returnReservation['reservation']['id'], 'mp-4', $bidTime->modify('+2160 seconds'));
assert_same(['Visitante 482', 'Carlos', 'Ana'], array_column(array_slice($returnApproved['ranking'], 0, 3), 'nickname'), 'returning buyer moves to first without duplicating podium entry');
assert_same(1, count(array_filter($returnApproved['ranking'], static fn (array $entry): bool => ($entry['bidderKey'] ?? '') === hash('sha256', 'pessoa@example.com'))), 'buyer identity occupies only one podium entry');
assert_same(1, count(array_filter($returnApproved['ranking'], static fn (array $entry): bool => ($entry['shortcode'] ?? '') === 'DV966NsjYCk')), 'same publication occupies only one podium entry');
assert_same(4, count($returnApproved['purchaseHistory']), 'repeat buyer keeps every approved purchase in history');
assert_same([8000, 6000, 4000, 2000], array_column($returnApproved['purchaseHistory'], 'amountCents'), 'purchase history remains newest first');

$nearReset = new DateTimeImmutable('2026-09-24 23:30:00', $tz);
$highReservation = no_topo_reserve(empty_state($nearReset), bid_input(120000), $nearReset);
$highApproved = no_topo_approve($highReservation['state'], $highReservation['reservation']['id'], 'mp-high', $nearReset);
assert_same('2026-09-25T03:30:00+00:00', $highApproved['ranking'][0]['protectedUntil'], 'protection crosses midnight without a reset');
assert_same(122000, no_topo_next_bid($highApproved, $nearReset->modify('+1 hour')), 'next bid starts one increment above winner');
assert_same(120000, no_topo_next_bid($highApproved, $nearReset->modify('+2 hours')), 'next bid cools by one increment per open hour');
assert_same(2000, no_topo_next_bid($highApproved, $nearReset->modify('+61 hours')), 'next bid never cools below base');

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
