# Security & Trust Model

Reminiscence is an operator-managed digital queue board for arcades and casual venues. It
deliberately keeps the no-account, self-moderated culture of a physical whiteboard queue.
That design choice is easy to misread from the outside — a QR code, an unfamiliar domain,
and "anyone can edit" can look risky without context. This document makes the trust model
explicit so players, venue operators, and security reviewers can evaluate something
concrete instead of guessing.

For the full threat model (trust boundaries, expected abuse, and the mitigation for each),
see [`docs/threat-model.md`](docs/threat-model.md).

## Trust model at a glance

- A public queue link is a **temporary board invite, not an account.** Players never sign
  up, log in, or install anything.
- **No login, payment, OAuth authorization, or app install** is ever requested of a player.
- The intended deployment is a **QR printed in a trusted physical place** — beside the
  cabinet or queue area it controls. A link posted online loses that physical context and
  should be treated as an optional demo link, not the normal deployment.
- A public invite **cannot reach admin controls or any other board.** Staff/operator
  access is a completely separate authenticated surface.
- Boards are **player-moderated by design** (see below), and **staff can rotate, close, or
  reset** a board at any time. Every queue change is written to a public activity log.

## What a public board invite can and cannot do

A public invite (the `/q/<token>` link behind the QR) grants a short-lived, single-board
edit session. With it, anyone holding the current link can:

- **view** that one board's queue and activity,
- **join** that board's queue with any display name, and
- **remove** entries from that board's queue.

A public invite **cannot**:

- open admin/operator controls,
- create, configure, close, reset, or rotate boards,
- reach any other board, venue, or organization,
- access user accounts — players do not have accounts.

These boundaries are enforced server-side: a public session is cryptographically bound to a
single board and is rejected on any other (`apps/api/src/queue/mutations.ts`), while admin
routes require a separate authenticated session and reject public credentials
(`apps/api/src/auth/admin-route-auth.ts`). Public tokens are 32 bytes of CSPRNG randomness,
stored only as a keyed hash (`apps/api/src/security/tokens.ts`).

## Viewing versus editing

Viewing a board is always public — a board is viewable unless it is deleted. **Editing** a
board (joining or removing entries) requires a **current invite**. When the invite expires
or staff rotate it, **editing stops, but viewing continues** — old links simply stop
granting edit access. There is no separate "read-only mode" to switch on; reading was never
gated, and rotation is the kill switch for a leaked link.

## Why players can remove any entry

Reminiscence intentionally mirrors a physical whiteboard: on a real board, anyone present
can add a name, erase a no-show, or fix a mistake. The app keeps that social model instead
of forcing every player into an account. This is **socially moderated queueing, not
unmoderated** — the bounds are described in
[`docs/threat-model.md`](docs/threat-model.md) and include short-lived invites, rotation,
per-IP/per-session/per-board rate limits, a public activity log, soft deletion (removed
entries are preserved in history), and staff close/reset plus per-board Add-Only or
Staff-Controlled modes when a board is under abuse.

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue for a
vulnerability.

- **Preferred:** open a private report via GitHub Security Advisories:
  <https://github.com/Umi4Life/reminiscence/security/advisories/new>

When reporting, please include what permission boundary is affected (public invite, admin
auth, session handling, or rate limiting), the abuse case, and how you reproduced it. We aim
to acknowledge reports promptly and will coordinate a fix and disclosure timeline with you.

## Development and review note

Reminiscence is built with AI-assisted development tools, but changes are reviewed, tested,
and maintained by the repository owner. Security-sensitive code paths — public board access,
admin authentication, session handling, and rate limiting — are treated as **manually
reviewed code paths**, not generated-and-forgotten.

This is not just a stance. The repository preserves a security hardening record: an
out-of-band review produced an 11-finding pass (brute-force, CORS, rate-limiting, CSRF, user
enumeration, and more) plus a follow-up 5-finding pass (security headers, request-size cap,
event-limit clamp, public-mutation Origin gate, public-read throttles) — all patched with
tests. See
[`docs/journal/plans/2026-06-14-security-hardening-journal.md`](docs/journal/plans/2026-06-14-security-hardening-journal.md).

Security-relevant pull requests should state what permission boundary changed, what abuse
case it affects, and how it was tested.
