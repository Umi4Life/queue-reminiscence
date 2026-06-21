# Operator Guide: Running a Low-Risk Pilot

This guide is for venue operators and staff deciding whether and how to try Reminiscence. It
exists because the people who feel the queue pain (players) and the people who carry the
operational risk (operators) have different concerns. An operator's worry is usually not "is
this secure" — it's "will this confuse my customers, add work, or clash with how we already
run the floor." This page addresses that directly.

The short version: **you do not have to replace anything on day one.** Reminiscence is built
to run quietly alongside your existing board until it earns its place.

## Pilot model

Run it as an **optional digital companion**, not a replacement:

- **One venue, one cabinet, one session.** Pick a single board and a single busy session to
  try it. Don't roll it out floor-wide.
- **The physical board stays official.** Your normal queue rules and your existing
  board/marker system remain the source of truth during the pilot. Reminiscence is a
  convenience copy for that one cabinet.
- **Nothing required from players.** No account, no app install, no payment, no Discord or
  Google login. A player scans the QR (or types the short URL), enters a name, and waits.
- **Instant rollback.** If it causes confusion, **pull the QR sign.** That's the whole
  rollback — no data migration, no customer accounts to unwind. The physical board was
  official the entire time.

This keeps the blast radius of trying it to roughly "we taped up a sign for an afternoon."

## What to tell a confused customer

Keep it to one sentence: _"It's an optional digital copy of the queue for this cabinet — use
the board on the wall if you'd rather, or ask staff."_ Regulars who feel the queue pain tend
to adopt it; walk-ins can ignore it entirely without missing anything, because the physical
board still works.

The printable signage in [`signage/queue-sign-template.md`](signage/queue-sign-template.md)
is written to set this expectation up front ("Optional — normal venue rules still apply").

## Why players can remove any entry (and why that's safe to pilot)

On the wall board, anyone can erase a no-show or fix a mistake. Reminiscence keeps that:
**any player with the current link can remove any active entry.** This surprises people at
first, so it's worth understanding why it's deliberate and what bounds it.

It mirrors the physical board you already trust — and it is **socially moderated, not
unmoderated.** The controls that bound it:

- **Short-lived links + rotation.** Edit access is temporary, and you can rotate the link
  any time (see below). A removed-but-leaked link is one rotation away from dead.
- **Public activity log.** Every join and removal is recorded and visible on the board, so
  mischief is attributable and obvious — exactly like watching someone erase the wall board.
- **Soft deletion.** Removed entries are hidden from the queue but kept in history; a wrong
  removal is recoverable context, not lost data.
- **Rate limits.** Rapid add/remove churn is throttled per person, per session, and per
  board.
- **Escape hatches.** If a board is actually being abused, you can switch it to Add-Only or
  Staff-Controlled mode, or just close it (see below).

If a particular cabinet is high-conflict, start it in **Add-Only** mode so only staff can
remove — you get the digital queue without the open-removal behavior.

## Staff controls

From the admin app, an operator can:

- **Open / close** a board. Closing it stops all public edits while keeping it viewable.
- **Reset** a board — clear the active queue (entries are soft-removed, preserved in
  history) between sessions.
- **Rotate the access link.** This issues a fresh QR/URL and **immediately invalidates the
  old one and any sessions opened from it.** This is your response to a leaked or
  screenshotted link: rotate, reprint, done.
- **Set the board mode** — Protected Open (default), Add-Only, or Staff-Controlled — to dial
  how much players can do.

These actions are role-gated: staff can operate boards; managers and owners can additionally
manage venues, boards, and accounts.

## If a link gets shared online

A QR is meant to live in a **trusted physical place** — beside the cabinet it controls.
Posted to a chat or social feed, it loses that context and can be used by people who aren't
in your venue. If that happens:

1. **Rotate the access link** in the admin app — the shared one stops working at once.
2. Reprint the sign with the new QR/URL.
3. If trolling continues, switch the board to **Add-Only** or **Staff-Controlled**, or
   **close** it.

Because viewing is always allowed and editing always requires the _current_ link, a leaked
old link can at worst show the queue — it cannot edit once rotated.

## When to go beyond a pilot

Promote it from "optional companion" to "primary board" only after a session or two where it
ran without adding staff work or confusing customers. Until then, the wall board wins ties.
The trust and security details behind all of this are in
[`../SECURITY.md`](../SECURITY.md) and [`threat-model.md`](threat-model.md).
