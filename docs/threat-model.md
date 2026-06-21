# Threat Model

This is the living threat model for Reminiscence. It describes what the system is and is not
built to defend, where its trust boundaries sit, the abuse it expects, and the specific
mitigation behind each — with pointers to the code that implements it so the claims can be
verified rather than taken on faith.

For the short version aimed at reviewers, see [`../SECURITY.md`](../SECURITY.md). An earlier
threat-model sketch is preserved in the frozen product PRD
([`journal/product/queue-reminiscence-prd.md`](journal/product/queue-reminiscence-prd.md),
§13); this document supersedes it as the maintained reference.

## Designed for

Casual arcade and venue queueing where the realistic alternative is a paper sheet, a
whiteboard, or an informal verbal queue. The goal is to preserve that low-friction,
no-account, self-moderated culture while making the queue durable, observable, and
display-friendly.

## Not designed for

- high-security booking or paid reservations
- identity verification or proof of presence
- anti-cheat or competitive-integrity enforcement
- preventing a determined on-site participant from gaming an inherently social queue

If you need any of the above, Reminiscence is the wrong tool — those guarantees conflict
with the no-account, physical-board model it deliberately keeps.

## Trust boundaries

| Boundary                            | Who holds it                              | What it authorizes                                                                                                    |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Admin/staff session**             | Authenticated operators                   | Manage organizations, venues, boards; open/close/reset; rotate access; view full history. Scoped by role (see below). |
| **Public board invite**             | Anyone with the current `/q/<token>` link | View, join, and remove entries on **one** board, for a short-lived session. Nothing else.                             |
| **Org → Venue → Board ownership**   | Admins, by membership                     | Which boards an operator may act on. A staff member of one venue cannot act on another.                               |
| **Expired / rotated public access** | Old link holders                          | View only. Editing is gone the moment the link expires or is rotated.                                                 |

These boundaries are enforced server-side. The API is the single source of truth; the web
clients hold no authorization logic of their own.

- **Public ↔ admin isolation.** A public session is cryptographically bound to a single
  `boardId` and rejected on any other board (`resolveSessionForBoard` in
  `../apps/api/src/queue/mutations.ts`). Admin routes require a separate `qr_admin_session`
  cookie and never accept a public credential (`../apps/api/src/auth/admin-route-auth.ts`).
  The two cookies are independent, and a cross-origin Origin/CSRF gate guards mutations on
  **both** surfaces (`../apps/api/src/http/csrf.ts`).
- **Role hierarchy.** Admin authority is `org_owner` > `venue_manager` > `venue_staff`
  (plus a superuser flag), scoped to the org/venue a membership grants, with an explicit
  chain of command for who may create whom (`../apps/api/src/auth/rbac.ts`).
- **Token strength.** Public access tokens are 32 bytes of CSPRNG randomness, base64url
  encoded, stored only as a keyed (HMAC-SHA256) hash — never in plaintext
  (`../apps/api/src/security/tokens.ts`).

## Expected abuse

The model assumes a leaked or screenshotted link and ordinary online mischief, not a
targeted APT. Concretely:

1. **Fake or offensive display names** — players type arbitrary names.
2. **Accidental removals** — someone removes the wrong entry.
3. **Deliberate removals / griefing** — someone removes entries to disrupt the queue.
4. **Add/remove spam** — rapid automated or manual churn.
5. **Remote trolling from a leaked/shared QR** — the current link is posted online and used
   by people who are not on-site.
6. **Stale entries / no-shows** — people join and never play.

## Mitigations

Each control below is implemented today. Rate-limit thresholds are first-cut and tunable
(flagged for tuning against real polling intervals in the hardening journal), so the
**code is the authoritative source for exact numbers** — this document describes the
_structure_ rather than freezing values that will drift.

- **Short-lived public invites.** Edit access flows from a current credential to a
  short-lived session; expiry stops editing while viewing continues. Enforcement and the
  "always viewable unless deleted" rule live in `../apps/api/src/queue/read.ts` and
  `../apps/api/src/auth/public-sessions.ts`.
- **Rotation as a kill switch.** Staff can rotate a board's access credential at any time.
  Rotation revokes the old credential **and cascade-revokes every session derived from it**,
  then issues a fresh one and logs an `access_rotated` event
  (`../apps/api/src/access/board-access.ts`, `../apps/api/src/routes/admin-boards.ts`). A
  leaked QR is neutralized by one rotation — old links immediately stop granting edits.
- **Layered rate limits.** Public claim, add, and remove actions are throttled across
  several independent dimensions at once — **per IP, per session, and per board**, each with
  a short window and a longer window — so a single dimension cannot be trivially evaded
  (e.g. re-claiming a session still hits the per-IP-per-board ceiling). Unauthenticated
  board reads, event reads, and QR rendering are also throttled per IP. See
  `../apps/api/src/queue/mutations.ts`, `../apps/api/src/routes/public-access.ts`,
  `../apps/api/src/routes/public-boards.ts`, and the limiter in
  `../apps/api/src/rate-limit/rate-limiter.ts`.
- **Public activity log.** Every add, remove, reset, open, close, and rotation is recorded
  as a board event and is publicly viewable with no authentication
  (`GET /api/public/boards/:publicSlug/events` in `../apps/api/src/routes/public-boards.ts`;
  read logic in `../apps/api/src/queue/read.ts`). The board self-moderates the way a physical
  one does — actions are visible. Private audit metadata (hashed IP / user-agent, session id)
  is recorded for abuse review but is **never** exposed in the public log
  (`../apps/api/src/public/audit-metadata.ts`).
- **Soft deletion.** Removed entries are hidden from the active queue but preserved in
  history, so an accidental or malicious removal is recoverable context rather than data
  loss (`../apps/api/src/queue/mutations.ts`).
- **Per-board "panic" modes.** Each board carries `publicAddPolicy` and `publicRemovePolicy`
  (`access_code_required | staff_only | disabled`). Under active abuse, staff can flip a
  board to **Add-Only** (players add, only staff remove) or **Staff-Controlled** (only staff
  add/remove) without closing it. Write access additionally requires the board be **open**,
  so closing a board is the hard stop (`mutationAccessFor` in
  `../apps/api/src/queue/read.ts`).
- **Hardened transport surface.** Security response headers (nosniff, frame-deny,
  referrer-policy, permissions-policy, HSTS on HTTPS), a strict CORS allowlist derived from
  the configured origins, a request-body size cap, and a capped event-query limit are all in
  place (`../apps/api/src/http/`, `../apps/api/src/app.ts`). Admin login is brute-force
  throttled with a constant-time dummy-hash path to resist user enumeration
  (`../apps/api/src/auth/admin-sessions.ts`).

## On removal: "anyone can remove anyone" is intentional

Removing **any** active entry (not just one you created) is a deliberate product decision,
matching the physical board it replaces. It is bounded by the mitigations above — rotation,
rate limits, the public log, soft deletion, and the Add-Only / Staff-Controlled escape
hatches — rather than by per-entry ownership. Treat this as _socially moderated_, not
_unmoderated_.

## Deliberately out of scope

Consistent with the product thesis, the following are intentionally **not** used as default
defenses, because they would damage the no-account experience:

- mandatory participant accounts or login
- CAPTCHA by default
- geolocation or Wi-Fi-only enforcement
- automated content moderation beyond basic limits

These remain possible future, opt-in venue controls — see the PRD's future-work section —
but they are not part of the baseline trust model.

## References

- [`../SECURITY.md`](../SECURITY.md) — reviewer summary, public-access model, disclosure.
- [`operator-pilot.md`](operator-pilot.md) — how an operator runs a low-risk pilot.
- [`journal/plans/2026-06-14-security-hardening-journal.md`](journal/plans/2026-06-14-security-hardening-journal.md)
  — the two security hardening passes (findings + patches + tests).
- [`journal/product/queue-reminiscence-prd.md`](journal/product/queue-reminiscence-prd.md)
  §13 — the original (frozen) abuse-handling sketch this document supersedes.
