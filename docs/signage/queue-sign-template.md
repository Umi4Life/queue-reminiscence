# Printable Queue Sign Templates

Copy-paste templates for the sign you place beside a cabinet. They are written to defuse the
"random QR" reaction: state plainly that the link is optional, opens only this board, and
asks nothing of the player. Fill in the bracketed fields.

**Why the wording matters.** A QR beside a cabinet has physical trust context — a player can
see where it is and what it controls. The same QR posted online does not. These signs lean on
that physical context and say out loud what the link does and does not do, so a scan feels
like reading a board, not opening a mystery link.

**Always print the URL next to the QR.** Not everyone scans QR codes, and a visible URL lets
a cautious player read the destination before deciding. Paste the access URL straight from
the admin app after rotating the board's link.

> **Note on the URL.** The access link (`/q/<token>`) is intentionally long and random — it
> is the temporary edit credential for the board, so it is not meant to be hand-typed. If you
> want a short, readable address on the sign, point your own short link or redirect at the
> current access URL and reprint when you rotate. Otherwise, just show the QR with the full
> URL beneath it.

---

## Template 1 — Trust-first queue sign

For normal use once you're comfortable with the board.

```text
┌─────────────────────────────────────────────┐
│ [ Venue name ]                                │
│ [ Cabinet / game name ] — Queue               │
│                                               │
│            [  QR CODE HERE  ]                 │
│                                               │
│ Scan, or visit:                               │
│ [ paste the access URL from the admin app ]   │
│                                               │
│ • No login. No app install. No payment.       │
│ • Opens only this queue board.                │
│ • Add your name, wait your turn, remove        │
│   yourself after you play.                    │
│ • Staff can reset or close this board.        │
└─────────────────────────────────────────────┘
```

Plain-text version (for a label printer or a quick page):

```text
[Venue name]
[Cabinet / game name] — Queue

Scan the QR, or visit:
[paste the access URL from the admin app]

No login. No app install. No payment.
This opens only this queue board.
Staff can reset or close the board.
```

---

## Template 2 — Pilot sign ("Optional")

For a first trial, while the physical board is still official. This wording lowers the stakes
for both staff and walk-in customers.

```text
┌─────────────────────────────────────────────┐
│ Queue Board Test — Optional                   │
│ [ Cabinet / game name ]                        │
│                                               │
│ The normal venue queue rules still apply.     │
│ This QR opens a temporary digital copy of      │
│ the queue for this cabinet/session.           │
│                                               │
│            [  QR CODE HERE  ]                 │
│                                               │
│ Or visit:                                     │
│ [ paste the access URL from the admin app ]   │
│                                               │
│ 1. Enter your name                            │
│ 2. Wait for your turn                         │
│ 3. Remove yourself after playing              │
│                                               │
│ No login, app install, or payment required.   │
│ If confused, use the physical board or ask    │
│ staff/regulars.                               │
└─────────────────────────────────────────────┘
```

---

## Placement checklist

- Print and place the sign **beside the cabinet/queue area it controls** — that physical
  context is part of the trust model.
- Keep the **readable URL visible next to the QR**, not the QR alone.
- After you **rotate** the board's link in the admin app, **reprint** the sign — the old
  QR/URL stops granting edits immediately.
- For a first trial, prefer **Template 2** and leave the physical board as the official one.

See [`../operator-pilot.md`](../operator-pilot.md) for how rotation, board modes, and
rollback work, and [`../../SECURITY.md`](../../SECURITY.md) for what the link can and cannot
do.
