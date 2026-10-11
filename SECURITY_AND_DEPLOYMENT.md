# Security & Deployment Guide

This release hardens the ledger for real, multi-partner use. **Read this before deploying** — the
security changes require a one-time Supabase setup, and the app will reject logins until that setup
is done.

---

## 1. What changed (and why it matters)

Previously:
- The admin password (`AdminPass2026!`) was hard-coded in the client **and printed on the login
  screen**. Anyone who opened the site had it.
- Row Level Security allowed the public `anon` key to read **and write** everything, so anyone with
  the site URL could edit the ledger directly, bypassing the login.

Now:
- Login uses **real Supabase Auth** (email + password per partner). No password lives in the code.
- RLS is locked to **authenticated users only**. The public key in the bundle can do nothing until
  a partner signs in.
- `.env` is no longer committed to git.

**Consequence:** after you deploy this build, logins will fail until you (a) run the updated
database script and (b) create a Supabase Auth account for each partner. Do those first.

---

## 2. One-time Supabase setup (do this BEFORE deploying)

### Step A — Run the updated schema

1. Open your Supabase project → **SQL Editor**.
2. Paste the full contents of [`src/lib/supabase/schema.sql`](src/lib/supabase/schema.sql) and run it.

It is safe to run on your existing database — it only adds things and is idempotent:
- Adds columns the app now uses: `payments.payment_type`, `payments.transfer_source_player_id`,
  `payments.game_id`, `rake_entries.transfer_target_player_id`, `bucket_transfers.deducted_from_owner_id`.
- Allows member-to-member transfers (`rake_entries.entry_type` now permits `member_transfer`).
- **Replaces the open RLS policy with an authenticated-only policy** on every table.

### Step B — Create a login for each partner

In the Supabase Dashboard → **Authentication → Users → Add user**:
1. Enter the partner's email + a password.
2. Enable **Auto Confirm User** (so they can log in immediately without an email link).
3. Repeat for each of the 4 partners.

To reset a password later, use the same Users screen.

> Tip: if you prefer email-link sign-in or password resets by email, configure an SMTP sender under
> **Authentication → Providers / Emails**. Not required for password login.

### Step C — Environment variables (optional)

The app falls back to the project URL + public `anon` key baked into
[`src/lib/supabase/client.ts`](src/lib/supabase/client.ts), so it works without a `.env`. If you want
to point a build at a different project, create a local `.env` (now git-ignored):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

The `anon` key is public by design and safe to ship **because RLS now requires a signed-in user.**

---

## 3. Deploy

```bash
npm install
npm run build
npm run deploy
```

`npm run deploy` publishes `dist/` to GitHub Pages. Verify you can log in with one of the accounts
from Step B before telling the other partners.

---

## 4. Notes

- **`.env` history:** the old key was committed previously. Under locked RLS it is harmless (useless
  without a login), so rotating it is optional. If you want to rotate anyway: Supabase → Project
  Settings → API → roll the `anon` key, then update `client.ts` / your `.env`.
- **Local-only use:** the app still caches to `localStorage`, but a fresh device must sign in through
  Supabase to load or change cloud data. If Supabase is unreachable, sign-in won't be possible.
- Full list of behavior fixes in this release is in [`CHANGELOG-FIXES.md`](CHANGELOG-FIXES.md).
