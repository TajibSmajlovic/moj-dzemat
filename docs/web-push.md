# Web Push operations

Moj Džemat uses anonymous browser Web Push subscriptions for newly published posts.
Delivery runs inside the existing request-driven application process and does not require another Fly Machine, worker, cron job, Redis instance, static IP, or notification provider.

## Privacy and retention

The server stores the push endpoint, browser public key, and authentication secret together in a standard Compact JWE encrypted with AES-256-GCM.
Only a versioned SHA-256 endpoint hash is stored in clear text for idempotent synchronization and deletion.
The browser stores only the last successfully synchronized endpoint hash, its synchronization time, and at most one hash awaiting cleanup.
The application does not record notification opens, clicks, engagement, or device fingerprints.
Active subscription data remains until the visitor unsubscribes, the browser expiration passes, or the push service reports that the subscription is invalid.
Non-secret delivery history is retained for 30 days.
The permanent first-publication decision marker is retained so editing or republishing a post cannot send a second notification.

## Generate stable keys

Generate one VAPID pair and keep it stable for the lifetime of existing subscriptions.
Changing the VAPID public key requires visitors to subscribe again.

```sh
npx web-push generate-vapid-keys
```

Generate the primary subscription-encryption key as an unpadded base64url string representing exactly 32 random bytes.

```sh
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

Store all key material as Fly secrets and never commit real values to the repository.
The sender uses the existing `APP_URL` as its VAPID contact subject.

## Initial rollout

1. Deploy the migration and application code with `WEB_PUSH_ENABLED=false`.
2. Confirm the active `/sw.js` responds to the version 1 Web Push capability handshake.
3. Configure the stable VAPID public key, VAPID private key, and encryption keyring.
4. Enable Web Push only after the current service worker is active on real devices.
5. Subscribe one real device and publish one newly created test post with `Pošalji obavijest` selected.
6. Verify receipt, click-through to the stable post resolver, unsubscribe, and publication while the push endpoint is unavailable.
7. Check the Fly upcoming invoice after rollout and after the first full month.

The feature adds no fixed Fly resource.
Use $4.50 as the manual billing review threshold so the deployment keeps headroom below the desired $5 range.
Do not reduce the Machine to 256 MB without production-like measurement.

## Delivery behavior

Publication and Web Push delivery are separated by a durable database decision marker and delivery rows.
A push-service failure never rolls back or delays a successful post publication.
Normal public requests resume pending work at most once every 30 seconds per process, while a new publication bypasses that cooldown.
The publication transaction snapshots all currently active subscriptions into delivery rows with one SQLite `INSERT ... SELECT` statement.
Each run has a 10-second work budget and sends at most 5 requests concurrently.
Every outbound request has a 5-second timeout and is pinned to a DNS address that was verified as public while preserving the original TLS hostname.
The sender uses only the response status and headers, then closes the response without retaining its body.
The sender never follows redirects.

Temporary network failures, timeouts, HTTP 408, HTTP 429, and server errors retry after approximately 1 minute, 5 minutes, 30 minutes, 2 hours, and 12 hours.
A valid `Retry-After` response for HTTP 429 is honored without passing the 24-hour deadline.
HTTP 400 and HTTP 413 are permanent delivery failures.
HTTP 401 and HTTP 403 stop the current batch because they usually indicate invalid VAPID configuration.
HTTP 404 and HTTP 410 invalidate the subscription and cancel its other unfinished deliveries.
The application considers `sent` to mean accepted by the push service, not displayed or opened by the visitor.

## Encryption-key rotation

`WEB_PUSH_ENCRYPTION_KEYS` is a comma-separated keyring.
The first key encrypts new writes, and every listed key may decrypt existing subscriptions.

To rotate safely, prepend the new key and retain the old key:

```text
WEB_PUSH_ENCRYPTION_KEYS=new_key,old_key
```

Subscriptions read with an older key are re-encrypted with the primary key during delivery.
Remove an old key only after operational verification confirms that no stored subscription still requires it.
If a key is removed too early, affected subscriptions are treated as invalid and visitors must subscribe again.

## Editorial rules

Only the first transition from draft to published can create a pending notification.
Editing, unpublishing, deleting, or republishing cannot create another notification.
The migration records every pre-existing post as skipped so legacy content cannot notify after republication.
If Web Push is disabled or the checkbox was not selected at first publication, the permanent decision is recorded as skipped.

## Rollback and incidents

Set `WEB_PUSH_ENABLED=false` to stop new subscriptions and outbound sending without removing the unsubscribe endpoint.
Disabled mode still expires overdue work and removes delivery history in bounded batches.
Existing visitors with a local subscription see a paused state and can remove it.
Disable Web Push during any PWA recovery-worker deployment.

For a VAPID incident, keep sending disabled until the stable configured pair is corrected.
For an encryption-key incident, restore the required old key to the keyring before re-enabling delivery.
For an unexpected cost increase, keep Web Push disabled while checking Machine runtime, root filesystem usage, and public egress in Fly Billing.
