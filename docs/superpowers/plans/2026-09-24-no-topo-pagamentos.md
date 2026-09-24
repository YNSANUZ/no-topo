# No Topo Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the Ursoninhos Mercado Pago account and checkout pattern so an approved higher bid takes the No Topo screen, with a ten-minute protection window and a daily midnight reset.

**Architecture:** Keep `nexo.yt` as a static GitHub Pages frontend and add a separate PHP API under `public_html/_no_topo_backend`. The new API reads the existing private Mercado Pago configuration from `_ursoninhos_backend/config/mercadopago.php`, but stores No Topo bids in its own locked JSON data file and exposes its own CORS, reservation, payment, status, and webhook routes.

**Tech Stack:** Next.js/Vinext static export, React 19, Node test runner, PHP 8.3+, Mercado Pago Payment Brick and Orders API, JSON persistence with `flock()`.

**Spec:** `docs/superpowers/specs/2026-09-24-no-topo-pagamentos-design.md`

## Global Constraints

- Reset every day at `00:00:00` in `America/Sao_Paulo`.
- Initial base bid is exactly `2000` centavos and the minimum increment is exactly `2000` centavos.
- An approved winner is protected for exactly `600` seconds.
- A checkout reservation expires after exactly `300` seconds.
- Only a server-verified Mercado Pago `approved` state can change the ranking.
- Never commit the Access Token, webhook secret, buyer CPF, payment token, or complete payment payload.
- Never modify or overwrite Ursoninhos orders, users, products, or `data/orders.json`.
- Production PHP is backed up and hashed before upload; deployment remains reversible.
- Entry speech plays at most once per browser session and conquest effects play at most once per approved bid ID per device.
- Celebration respects `prefers-reduced-motion` and every sound obeys a persistent mute control.
- Share video stays on the winner's device; no recording is uploaded in the first release.

## Review Focus

- Two buyers submit different bids within the same second: only the highest still-valid reservation may reach Mercado Pago.
- A delayed webhook arrives after a cycle reset: it must not overwrite the new cycle.
- The same webhook or payment request is delivered more than once: ranking and charging remain idempotent.
- A valid-looking Instagram URL contains credentials, a foreign hostname, or an encoded path trick: reject it before creating a reservation.
- The frontend cannot reach the API or Instagram refuses the embed: preserve the current screen and show a recoverable error.
- MediaRecorder lacks MP4 support or fails mid-capture: offer WebM or link sharing without affecting the approved bid.

---

### Task 1: Domain rules and locked persistence

**Files:**
- Create: `backend/no-topo/lib/arena.php`
- Create: `backend/no-topo/tests/arena-test.php`
- Create: `backend/no-topo/data/.gitignore`
- Create: `backend/no-topo/data/arena.example.json`

**Interfaces:**
- Produces: `no_topo_cycle(DateTimeImmutable $now): array`, `no_topo_normalize_instagram_url(string $url): array`, `no_topo_next_bid(array $state, DateTimeImmutable $now): int`, `no_topo_reserve(array $state, array $input, DateTimeImmutable $now): array`, `no_topo_approve(array $state, string $reservationId, string $providerId, DateTimeImmutable $now): array`, `no_topo_with_state(string $path, callable $mutation): mixed`.
- Consumes: no application code.

- [ ] **Step 1: Write failing domain tests**

Create a dependency-free PHP test runner whose assertions cover:

```php
$tz = new DateTimeZone('America/Sao_Paulo');
$before = new DateTimeImmutable('2026-09-24 23:59:59', $tz);
$after = new DateTimeImmutable('2026-09-25 00:00:00', $tz);
assert_same('2026-09-24', no_topo_cycle($before)['id'], 'cycle before midnight');
assert_same('2026-09-25', no_topo_cycle($after)['id'], 'cycle at midnight');
assert_same(2000, no_topo_next_bid(empty_state($before), $before), 'base bid');

$first = no_topo_reserve(empty_state($before), bid_input(2000), $before);
assert_same('reserved', $first['reservation']['status'], 'first bid reserves');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(2000), $before), 'Lance minimo');
assert_throws(fn () => no_topo_reserve($first['state'], bid_input(3000), $before), 'Lance minimo');

$approved = no_topo_approve($first['state'], $first['reservation']['id'], 'mp-1', $before);
assert_same(2000, $approved['ranking'][0]['amountCents'], 'approved bid ranks first');
assert_throws(fn () => no_topo_reserve($approved, bid_input(4000), $before->modify('+599 seconds')), 'protegido');
assert_same(4000, no_topo_reserve($approved, bid_input(4000), $before->modify('+600 seconds'))['reservation']['amountCents'], 'protection expires');

assert_same('DV966NsjYCk', no_topo_normalize_instagram_url('https://www.instagram.com/reel/DV966NsjYCk/?utm_source=x')['shortcode'], 'normalizes reel');
assert_throws(fn () => no_topo_normalize_instagram_url('https://instagram.com.evil.test/reel/DV966NsjYCk/'), 'Instagram');
assert_throws(fn () => no_topo_normalize_instagram_url('https://user:pass@instagram.com/reel/DV966NsjYCk/'), 'Instagram');
```

- [ ] **Step 2: Run the test and verify RED**

Run: `php backend/no-topo/tests/arena-test.php`

Expected: FAIL because `backend/no-topo/lib/arena.php` and its functions do not exist.

- [ ] **Step 3: Implement the minimum domain model**

Implement state shaped as:

```php
[
  'version' => 1,
  'cycle' => ['id' => '2026-09-24', 'startsAt' => '...', 'endsAt' => '...'],
  'baseBidCents' => 2000,
  'incrementCents' => 2000,
  'protectionSeconds' => 600,
  'reservationSeconds' => 300,
  'ranking' => [],
  'reservations' => [],
]
```

Use `random_bytes(16)` for reservation IDs, integer centavos for every comparison, `array_slice($ranking, 0, 3)` for the visible podium, ISO-8601 UTC timestamps for storage, and `flock($handle, LOCK_EX)` plus write-to-temp-and-rename inside `no_topo_with_state()`.

- [ ] **Step 4: Run domain tests and the PHP syntax gate**

Run: `php backend/no-topo/tests/arena-test.php && php -l backend/no-topo/lib/arena.php`

Expected: all assertions print `PASS`, exit code `0`, and PHP reports no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add backend/no-topo
git commit -m "feat: add No Topo bidding domain rules"
```

---

### Task 2: Public state and bid reservation API

**Files:**
- Create: `backend/no-topo/api/bootstrap.php`
- Create: `backend/no-topo/api/arena-state.php`
- Create: `backend/no-topo/api/create-bid-session.php`
- Create: `backend/no-topo/tests/api-test.php`
- Create: `backend/no-topo/.htaccess`
- Create: `backend/no-topo/data/.htaccess`

**Interfaces:**
- Consumes: all Task 1 domain functions.
- Produces: `GET /_no_topo_backend/api/arena-state.php` and `POST /_no_topo_backend/api/create-bid-session.php`.

- [ ] **Step 1: Write failing API tests**

Test the endpoint handlers as functions before emitting HTTP responses:

```php
$stateResponse = no_topo_arena_state(empty_state($now), $now);
assert_same(2000, $stateResponse['nextBidCents'], 'public next bid');
assert_same([], $stateResponse['ranking'], 'empty public ranking');

$created = no_topo_create_bid_session(empty_state($now), [
  'nickname' => 'Visitante 482',
  'email' => 'pessoa@example.com',
  'postUrl' => 'https://www.instagram.com/reel/DV966NsjYCk/',
  'amountCents' => 2000,
], $now);
assert_same(2000, $created['amountCents'], 'server accepted exact bid');
assert_false(isset($created['email']), 'public response hides email');
```

Also test unsupported origins, malformed JSON, bodies over 16 KiB, invalid nickname/email, rate-limit rejection, and CORS acceptance for exactly `https://nexo.yt` and `https://www.nexo.yt`.

- [ ] **Step 2: Run the API test and verify RED**

Run: `php backend/no-topo/tests/api-test.php`

Expected: FAIL because the API handlers are absent.

- [ ] **Step 3: Implement bootstrap and endpoints**

`bootstrap.php` must set JSON/no-store headers, enforce the origin allowlist, parse at most 16 KiB, expose a per-IP hashed rate limiter without storing raw IP addresses, and resolve the production data file outside the API directory. `arena-state.php` must expose only cycle times, base/increment, next bid, protection end, public ranking fields, and the featured Instagram embed URL. `create-bid-session.php` must ignore any client-supplied status, rank, cycle, or provider identifier.

Protect `data/` with:

```apache
Require all denied
```

- [ ] **Step 4: Run API and syntax tests**

Run: `php backend/no-topo/tests/api-test.php && Get-ChildItem backend/no-topo -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }`

Expected: all tests pass and every PHP file reports no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add backend/no-topo
git commit -m "feat: add No Topo bid reservation API"
```

---

### Task 3: Mercado Pago adapter, payment status, and webhook

**Files:**
- Create: `backend/no-topo/lib/mercado-pago.php`
- Create: `backend/no-topo/api/process-bid-payment.php`
- Create: `backend/no-topo/api/bid-status.php`
- Create: `backend/no-topo/api/mercadopago-webhook.php`
- Create: `backend/no-topo/tests/payment-test.php`
- Create: `backend/no-topo/config/mercadopago.example.php`
- Create: `backend/no-topo/config/.htaccess`

**Interfaces:**
- Consumes: Task 1 state transitions and the existing private config file `public_html/_ursoninhos_backend/config/mercadopago.php`.
- Produces: `no_topo_process_payment(array $request, callable $gateway): array`, `no_topo_apply_provider_status(array $state, array $providerOrder, DateTimeImmutable $now): array`, payment/status/webhook HTTP routes.

- [ ] **Step 1: Write failing payment tests**

Use a callable fake gateway, never the network:

```php
$gateway = fn (array $request) => [
  'id' => 'mp-order-123',
  'status' => 'approved',
  'external_reference' => $request['external_reference'],
  'total_amount' => $request['total_amount'],
];

$result = no_topo_process_payment(valid_payment_request($reservation), $gateway);
assert_same('approved', $result['provider']['status'], 'approved provider response');
assert_same($reservation['id'], $result['provider']['external_reference'], 'reservation is external reference');
assert_same(20.00, $result['provider']['total_amount'], 'server amount is sent');
assert_same($result, no_topo_process_payment(valid_payment_request($reservation), $gateway), 'idempotent replay');
assert_throws(fn () => no_topo_process_payment(tampered_amount_request($reservation), $gateway), 'reserva');
```

Test that a valid signature plus a provider re-query can approve once, invalid signatures return `401`, duplicate webhooks preserve one ranking entry, rejected payments never rank, and a prior-cycle approval is archived without replacing the active cycle.

- [ ] **Step 2: Run payment tests and verify RED**

Run: `php backend/no-topo/tests/payment-test.php`

Expected: FAIL because the Mercado Pago adapter and transitions are absent.

- [ ] **Step 3: Implement the adapter and routes**

Load configuration without copying secrets:

```php
$sharedConfigPath = dirname(__DIR__, 3) . '/_ursoninhos_backend/config/mercadopago.php';
if (!is_file($sharedConfigPath)) {
    throw new RuntimeException('Configuracao do Mercado Pago indisponivel.');
}
$config = require $sharedConfigPath;
```

Send the server-owned reservation amount to Mercado Pago Orders API with `external_reference` equal to the reservation ID and an idempotency key derived from `hash('sha256', 'no-topo:' . $reservationId)`. Forward only the Payment Brick fields explicitly accepted by the existing Ursoninhos `process-payment.php`; never persist token/card data. The webhook must validate the configured secret, re-query the provider order, compare amount and external reference, and then call `no_topo_approve()` under the state lock.

- [ ] **Step 4: Run payment, domain, API, and syntax tests**

Run: `php backend/no-topo/tests/payment-test.php && php backend/no-topo/tests/arena-test.php && php backend/no-topo/tests/api-test.php && Get-ChildItem backend/no-topo -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName; if ($LASTEXITCODE) { exit $LASTEXITCODE } }`

Expected: every assertion passes with no network calls and every PHP file passes lint.

- [ ] **Step 5: Commit**

```bash
git add backend/no-topo
git commit -m "feat: connect No Topo bids to Mercado Pago"
```

---

### Task 4: Typed frontend API client and checkout state machine

**Files:**
- Create: `lib/no-topo-api.mjs`
- Create: `lib/no-topo-api.d.ts`
- Create: `lib/no-topo-api.test.mjs`
- Create: `lib/bid-checkout.mjs`
- Create: `lib/bid-checkout.test.mjs`

**Interfaces:**
- Consumes: Task 2 and Task 3 JSON contracts.
- Produces: `fetchArenaState(fetchImpl, baseUrl)`, `createBidSession(fetchImpl, baseUrl, input)`, `fetchBidStatus(fetchImpl, baseUrl, reservationId)`, and a pure checkout reducer.

- [ ] **Step 1: Write failing Node tests**

Cover URL construction, JSON error propagation, abort/timeout behavior, centavos formatting, approved/pending/rejected states, API-unavailable recovery, and protection countdown. Example:

```js
test('never trusts a client amount returned by a stale screen', async () => {
  const fetchImpl = async () => response(409, { ok: false, error: 'Lance minimo atualizado.', nextBidCents: 6000 });
  await assert.rejects(
    createBidSession(fetchImpl, API, { amountCents: 4000, nickname: 'Ana', email: 'ana@example.com', postUrl: REEL }),
    error => error.code === 'bid_changed' && error.nextBidCents === 6000,
  );
});
```

- [ ] **Step 2: Run frontend unit tests and verify RED**

Run: `node --test lib/no-topo-api.test.mjs lib/bid-checkout.test.mjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement the minimal client and reducer**

Use `https://primusdf.com.br/_no_topo_backend/api` as the production base URL, `AbortSignal.timeout(10000)`, explicit response validation, and integer centavos. Keep Mercado Pago form data out of reducer state and localStorage. Persist only the reservation ID needed to resume a Pix/boleto status check.

- [ ] **Step 4: Run the complete Node suite**

Run: `npm test`

Expected: all existing arena/chat/embed tests and the new API/checkout tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib
git commit -m "feat: add No Topo checkout client"
```

---

### Task 5: Replace the demo modal with the Payment Brick

**Files:**
- Create: `components/bid-checkout-dialog.tsx`
- Create: `components/mercado-pago-brick.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `lib/featured-post.mjs`
- Modify: `lib/featured-post.d.ts`
- Create: `lib/live-arena.test.mjs`

**Interfaces:**
- Consumes: Task 4 client and reducer, Mercado Pago Public Key `APP_USR-68053913-290d-4ec4-9333-62b33a49f099` (public credential), and public arena state.
- Produces: real bid form, live podium state, protected-state UI, payment result UI, and polling every 10 seconds while the page is visible.

- [ ] **Step 1: Write failing live-arena tests**

Test conversion from the API state into screen props:

```js
test('approved API ranking replaces the static featured post', () => {
  const view = arenaViewFromState({
    nextBidCents: 6000,
    protectionEndsAt: null,
    ranking: [{ nickname: 'Ana', postUrl: REEL, shortcode: 'DV966NsjYCk', amountCents: 4000 }],
  });
  assert.equal(view.featured.username, 'Ana');
  assert.equal(view.featured.bid, 4000);
  assert.equal(view.nextBid, 6000);
});
```

Also cover an empty cycle falling back to the current demonstration Reel, protection disabling both bid buttons, rank two/three text updates, and API failure preserving the last known good view.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test lib/live-arena.test.mjs`

Expected: FAIL because the state-to-view adapter is absent.

- [ ] **Step 3: Implement the dialog and live arena state**

Load the Mercado Pago SDK once in `app/layout.tsx`, mount/unmount the Payment Brick only after the server creates a reservation, and pass the Brick submission to `process-bid-payment.php`. Replace “Protótipo seguro” and “SIMULAR” copy with the approved transaction wording. Poll public state every ten seconds and immediately after approval. Preserve the last known good state when polling fails.

- [ ] **Step 4: Verify tests, lint, and static export**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint reports no errors, and the static export contains `index.html`, `CNAME`, model assets, and absolute root asset paths suitable for `nexo.yt`.

- [ ] **Step 5: Commit**

```bash
git add app components lib
git commit -m "feat: enable real bids in No Topo UI"
```

---

### Task 6: Hall da Fama data and ranking page

**Files:**
- Modify: `backend/no-topo/lib/arena.php`
- Create: `backend/no-topo/api/ranking.php`
- Modify: `backend/no-topo/tests/arena-test.php`
- Create: `app/ranking/page.tsx`
- Create: `components/ranking-board.tsx`
- Create: `lib/ranking.mjs`
- Create: `lib/ranking.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: approved bids and cycle boundaries from Tasks 1–3.
- Produces: `GET /_no_topo_backend/api/ranking.php?sort=time|bid|recent`, `no_topo_public_participant_id(string $email, string $secret): string`, `rankingRows(array $bids, DateTimeImmutable $now): array`, and `/ranking`.

- [ ] **Step 1: Write failing backend and frontend ranking tests**

Add PHP assertions proving that a winner's duration stops at the next approval or cycle end, the active winner accrues time up to `now`, repeat wins aggregate by HMAC public participant ID, and public rows omit email/provider fields. Add Node assertions for all three sort modes and duration formatting:

```js
test('sorts the Hall da Fama by accumulated screen time', () => {
  const rows = sortRanking([
    { publicId: 'a', totalSeconds: 120, maxBidCents: 8000, lastWonAt: '2026-09-24T10:00:00Z' },
    { publicId: 'b', totalSeconds: 600, maxBidCents: 4000, lastWonAt: '2026-09-24T09:00:00Z' },
  ], 'time');
  assert.equal(rows[0].publicId, 'b');
  assert.equal(formatDuration(600), '10min');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `php backend/no-topo/tests/arena-test.php && node --test lib/ranking.test.mjs`

Expected: FAIL because ranking aggregation and frontend helpers are absent.

- [ ] **Step 3: Implement ranking aggregation, endpoint, and page**

Use `hash_hmac('sha256', strtolower(trim($email)), $privateSecret)` and expose only the first 20 hex characters as `publicId`. Return position, nickname, post URL/shortcode, total seconds, win count, maximum approved bid, and last win. Build `/ranking` with tabs “Mais tempo”, “Maiores lances”, and “Recentes”; fetch public data without authentication and render an error/retry state without exposing raw server messages.

- [ ] **Step 4: Run PHP, Node, lint, and build gates**

Run: `php backend/no-topo/tests/arena-test.php && node --test lib/ranking.test.mjs && npm test && npm run lint && npm run build`

Expected: all assertions pass, lint is clean, and static export contains `ranking/index.html`.

- [ ] **Step 5: Commit**

```bash
git add backend/no-topo app/ranking components/ranking-board.tsx lib/ranking.mjs lib/ranking.test.mjs app/globals.css
git commit -m "feat: add No Topo Hall da Fama"
```

---

### Task 7: In-scene explanation, Hall da Fama plaque, and voice announcements

**Files:**
- Modify: `components/arena-3d.tsx`
- Create: `components/how-it-works-dialog.tsx`
- Create: `hooks/use-arena-announcer.ts`
- Create: `lib/arena-announcer.mjs`
- Create: `lib/arena-announcer.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: live arena state and ranking preview.
- Produces: clickable “COMO FUNCIONA” and “HALL DA FAMA” meshes, accessible HTML dialog, `announcementForEntry(state, session)`, and mute control.

- [ ] **Step 1: Write failing announcer tests**

Cover one entry announcement per session, no repeat after polling, a pending announcement before user interaction, mute suppression, sanitized pronunciation, and a separate one-time conquest announcement keyed by approved bid ID:

```js
test('announces one conquest once per device', () => {
  const first = nextConquestAnnouncement({ bidId: 'bid-7', nickname: '@ana' }, new Set(), false);
  assert.equal(first.text, 'Novo primeiro lugar. O primeiro lugar é ana.');
  assert.equal(nextConquestAnnouncement({ bidId: 'bid-7', nickname: '@ana' }, new Set(['bid-7']), false), null);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test lib/arena-announcer.test.mjs`

Expected: FAIL because announcer functions are absent.

- [ ] **Step 3: Implement plaques, dialog, speech, and mute**

Render the five approved rules and live bid values on the explanation plaque texture. Use Three.js raycasting to open the HTML dialog and `window.open('/ranking', '_blank', 'noopener,noreferrer')` for Hall da Fama. In the hook, queue `SpeechSynthesisUtterance` until the first pointer/keyboard interaction, select a `pt-BR` voice when available, store entry/conquest keys in `sessionStorage`, and store mute preference in `localStorage`.

- [ ] **Step 4: Run tests, lint, and build**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, both plaques are keyboard-accessible through equivalent HTML controls, and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add components hooks lib app
git commit -m "feat: explain and announce No Topo winners"
```

---

### Task 8: Celebration sequence and local share recording

**Files:**
- Modify: `components/arena-3d.tsx`
- Create: `lib/celebration.mjs`
- Create: `lib/celebration.test.mjs`
- Create: `hooks/use-conquest-recorder.ts`
- Create: `lib/conquest-recorder.mjs`
- Create: `lib/conquest-recorder.test.mjs`
- Create: `components/conquest-share.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: newly approved bid ID, winner nickname, amount, WebGL canvas, audio bus, mute setting, and reduced-motion preference.
- Produces: deterministic eight-second celebration timeline, ten-second cinematic replay, MP4/WebM `Blob`, Web Share action, download fallback, and copied ranking link.

- [ ] **Step 1: Write failing celebration and recorder tests**

Test timeline boundaries, deduplication, reduced-motion behavior, MIME selection, failure fallback, and absence of private/chat data:

```js
test('prefers MP4 and falls back to WebM', () => {
  assert.equal(selectRecordingMime(type => type === 'video/mp4'), 'video/mp4');
  assert.equal(selectRecordingMime(type => type === 'video/webm;codecs=vp9,opus'), 'video/webm;codecs=vp9,opus');
});

test('reduced motion removes jumps and fireworks', () => {
  const timeline = celebrationTimeline({ reducedMotion: true });
  assert.equal(timeline.some(event => event.type === 'jump' || event.type === 'firework'), false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test lib/celebration.test.mjs lib/conquest-recorder.test.mjs`

Expected: FAIL because celebration and recorder modules are absent.

- [ ] **Step 3: Implement the lightweight celebration**

Add one reusable celebration state to the existing animation loop. Drive NPC root height and both arm rotations from the timeline; do not create one animation loop per NPC. Use a pooled `THREE.Points` particle buffer for fireworks, cap particles by device tier, animate existing arena lights, and restore the visitor's camera after the cinematic sequence. Skip jumps/fireworks under reduced motion.

- [ ] **Step 4: Implement local recording and sharing**

Create a same-origin celebration screen texture containing only winner nickname, approved amount, position, permitted cover, and `nexo.yt`. Capture the WebGL canvas with `captureStream()`; connect applause/ovation through one `AudioContext` destination; choose MP4 only when supported and otherwise VP9/VP8 WebM. Stop tracks and revoke object URLs after use. Use `navigator.canShare({ files: [file] })` before invoking native sharing; otherwise expose download and copy `https://nexo.yt/ranking`.

- [ ] **Step 5: Run the complete frontend gate**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass and build succeeds without bundling server credentials or external video encoders.

- [ ] **Step 6: Commit**

```bash
git add components hooks lib app
git commit -m "feat: celebrate and share No Topo conquests"
```

---

### Task 9: Backup, deploy, and verify without charging a customer

**Files:**
- Create locally during deployment: `backups/no-topo-payments-YYYYMMDD-HHMMSS/manifest.sha256`
- Upload: `backend/no-topo/` contents to `public_html/_no_topo_backend/`
- Publish frontend through: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: production API and frontend, with rollback artifacts.

- [ ] **Step 1: Capture production before state**

Download the current `_ursoninhos_backend/api/bootstrap.php`, `process-payment.php`, `webhook.php`, and private configuration file into a local dated backup that is excluded from Git. Compute SHA-256 hashes without printing file contents or secrets. Record the existing `_ursoninhos_backend` directory listing and verify no Ursoninhos file will be overwritten.

- [ ] **Step 2: Run all local gates**

Run: `npm test && npm run lint && npm run build` and all three PHP test commands from Tasks 1–3.

Expected: zero test failures, zero lint errors, successful static export, and no PHP syntax errors.

- [ ] **Step 3: Upload the isolated backend**

Create `public_html/_no_topo_backend/`, upload only the reviewed files from `backend/no-topo/`, create the writable production `data/arena.json` from `arena.example.json`, and confirm `config/` and `data/` return `403` over HTTP. Do not copy or modify the existing Ursoninhos JSON data.

- [ ] **Step 4: Exercise the API without sending payment**

Run preflight requests for allowed/disallowed origins, public state, invalid URL, stale bid, and a valid reservation. Do not submit Payment Brick token data and do not create a real Mercado Pago charge. Confirm the valid reservation expires after five minutes or remove only that test reservation through the state maintenance helper.

- [ ] **Step 5: Publish and verify the frontend**

Push the reviewed commits to `YNSANUZ/no-topo`, wait for the Pages workflow, test `https://nexo.yt` on desktop and mobile widths, and verify that the checkout reaches the Mercado Pago form while the current telão stays unchanged before approval.

- [ ] **Step 6: Enable the webhook URL and perform the financial handoff**

Configure the existing Mercado Pago application to notify `https://primusdf.com.br/_no_topo_backend/api/mercadopago-webhook.php`. Because a real validation charge spends money, stop at the ready-to-pay screen and request the user's action-time confirmation before submitting the minimum R$ 20,00 payment. After approval, verify API state, main telão, rankings, protection timer, payment status, webhook idempotency, and that Ursoninhos checkout still loads normally.

- [ ] **Step 7: Record hashes and rollback**

Compare uploaded public PHP hashes with prepared artifacts. Record changed files, preserved data, tests, public URLs, and rollback steps: restore the dated backup only if a shared file changed, remove/disable `_no_topo_backend`, and revert the frontend to the last known-good commit. Never delete payment audit records during rollback.

- [ ] **Step 8: Verify ranking and media fallbacks**

Confirm `/ranking` sorts all three views correctly, the entry announcement occurs once, a synthetic non-financial conquest event triggers one celebration, reduced-motion removes jumps/fireworks, mute blocks audio, MP4/WebM selection follows browser support, and a recording failure leaves link sharing available.

- [ ] **Step 9: Commit deployment documentation**

```bash
git add docs
git commit -m "docs: record No Topo payment deployment"
```
