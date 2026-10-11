# Fixes & Changes in This Release

A pass over the whole app for correctness, data-safety, and the money math. Grouped by area.

## Accounting engine (the money math)

- **Owner earnings breakdown now adds up.** On the dashboard, each organizer's
  `Table Share + Profit Share` now exactly equals `Total Earned`. Previously the table-recovery
  amount was double-counted and the "Profit Share" column secretly equaled the total. The engine now
  tracks each owner's table-recovery share separately from their profit share, and the column totals
  are summed from the rows so they always reconcile.
- **Credits / refunds now move money.** A "Credit / Adjustment" entry on the Expenses page now adds
  money back into the owner profit pool (it was previously recorded but ignored by every
  calculation). General/monthly expenses still draw the pool down.
- **The misleading "Session Expense" option was removed** from the general Expenses form — per-session
  expenses belong to a session and are entered there. (The ones entered on the general page affected
  nothing.)
- **Bucket transfers conserve money exactly.** Moving funds between Table Recovery, Festival Jar, and
  Owner Profit now only ever moves what is actually available and keeps the owner pool and owner
  entitlements reconciled to the paise, including the "fund the Festival Jar from table recovery"
  flow used after collecting a payment.
- Reconciliation is now verified by a 3,000-scenario randomized property test on top of the existing
  34 unit tests.

## Crashes & data loss

- **Fixed a white-screen crash** in Add Session: typing a negative gross fee no longer blanks the app.
- **Voiding or deleting a session now also voids/deletes its "paid on the spot" payments.** Before,
  the fee vanished but the payment stayed, leaving the player looking overpaid and owner cash
  overstated.
- **Member-to-member transfers now persist to the cloud.** They previously violated a database
  constraint and silently failed on the server, so on a second device the transfer looked like free
  money and the ledger stopped reconciling.
- **The realtime sync subscription is now cleaned up properly** and no longer reads stale (empty)
  state when refetching, which could drop locally-entered data.
- **IDs are now collision-resistant** (time + random suffix), so a fast double-click or two devices
  acting at once can't mint duplicate records.
- **Submit buttons are disabled while saving** on Add Session, Add Fee, Add Expense, and Record
  Settlement to stop accidental duplicate entries from a double-tap.

## Security

- Real Supabase Auth login; the hard-coded admin password and its on-screen hint were removed.
- Row Level Security locked to authenticated users; `.env` is no longer committed.
- See [`SECURITY_AND_DEPLOYMENT.md`](SECURITY_AND_DEPLOYMENT.md) for the required setup.

## Smaller correctness & UX fixes

- Dashboard "Table Recovery %" and the stat-card progress bars no longer show `NaN%` when a target
  is set to 0.
- The footer reconciliation badge now reflects the real reconciliation state instead of always
  saying "Reconciled & Balanced".
- Settings rejects a blank/invalid "absent owner %" instead of poisoning every owner calculation with
  `NaN`.
- The Festival calculation table's column totals now equal the sum of their rows.
- "Record Settlement" no longer pre-fills an amount the system will reject, and its button is no
  longer stuck disabled for an owner who is owed money.
- Owner-count assumptions (previously hard-coded to 4) now follow the actual active-owner count in
  payment/transfer previews.
- Overpayments / prepayments are now allowed and shown as a member **credit** (per request).
- Settlement edits are now validated against remaining entitlement, like the create flow.
- Date/time fields default to **local** time, fixing an off-by-one-day default for early-morning
  entries (was UTC).
- Session-expense amount fields accept decimals cleanly while typing.
- CSV export: correct per-row status, member-name/owner-name columns, a Credit column, exclusion of
  internal member-transfer rows from fee/paid totals, and protection against spreadsheet
  formula-injection and stray newlines.
- Audit log metadata renders as readable `key: value` pairs instead of scrambled text on mobile.
- Removed dead imports/variables and a duplicate mistyped object key passed to the engine.
