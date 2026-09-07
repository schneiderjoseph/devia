# Authentication

## P0

1. Use a proven password hashing algorithm (e.g. Argon2id / bcrypt) — never plaintext or reversible encryption for passwords.
2. Protect login/password-reset against brute force (rate limits, lockout/backoff).
3. Sessions/tokens expire; logout revokes server-side session or refresh token where applicable.
4. Prefer established auth providers/libraries over home-grown crypto.
5. Reject unexpected JWT algorithms explicitly (disallow `none`).

## P1

1. Email verification for self-serve signup when identity matters
2. MFA for admin / high-privilege accounts
3. Secure account recovery flows (no user enumeration where feasible)
4. Refresh-token rotation and silent refresh patterns that preserve UX without eternal sessions

## Detect

- Passwords stored with MD5/SHA1
- Tokens in `localStorage` without a clear XSS threat strategy
- Infinite session lifetime

## Verify

- Parallel login stress does not collide sessions
- Expired tokens are rejected
- Password reset tokens are single-use and time-limited
