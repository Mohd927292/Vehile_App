# Vehicle/party release 1.2 — 1 October 2026

## Delivered behavior

All four histories open as data tables: each vehicle, all vehicles, each party and all parties. Each row represents exactly one From → To pair. A party-ID filter cannot include another party's pairs. Vehicle views include all pairs belonging to that vehicle. Records, suggestions, customer details, archives and drafts stay within the selected user workspace. The administrator can switch workspaces while remaining authenticated as administrator.

Tables use indexed 40-row pages, explicit Previous/Next controls, complete-scope prefix search, date filters, creation/date/amount sorting, row selection across pages and bulk archive with explicit vehicle-trip scope. Month browsing is available for both vehicles and parties. From/To and driver fields accept newlines; long table values scroll horizontally and retain typed line breaks.

PDF and Excel buttons use persistent image icons. Export includes selected records, or every matching page. PDF uses A4 cards, explicit labels, sequential row numbers and page numbers. Excel preserves newlines, wrapping, zero values and separate rows. Shared historical trip totals remain labelled and are not multiplied between parties.

Multi-vehicle drafts save as fields change, are scoped to both operator and workspace, and preserve their active tab. A saved client ID makes retrying a trip creation safe against duplicate records. Archive/restore updates parent trips, pair rows and summary/month counts together.

## Recovery and access

The owner-approved recovery restored 303 vehicle trips and 397 pair records into the requested destination account, including the one record available only in an earlier backup. Every planned write was read back and compared. The original root data remains preserved. Vehicle month counters were derived from all 303 restored trips. The final backup covers 65 collections across seven staff workspaces and preserved legacy data. Business fields match the preceding backup apart from the approved vehicle month counters; equivalent timestamp formatting was normalized during comparison. Private backup contents remain local.

The administrator is `92rnatransport@gmail.com`. Recovered history is in `92rnamashuk@gmail.com`. Ordinary users cannot read or write another user's workspace. Local emulator tests also verify role escalation and root writes are rejected.

## Verification

- 15 automated JavaScript tests pass; TypeScript and ESLint error checks pass.
- Firestore rules tests cover all eight business collections and administrator/user isolation.
- Actual service tests cover transactions, retry idempotency, summary counters, edits, archive and restore.
- 36 live read-only queries against restored data verify scope, word-prefix search and all three sort fields in both directions.
- Dedicated live testing uses only `testuser92@gmail.com`: create, retry, edit, archive, restore, month counts, cross-user read denial, sorting, search and 91 rows across three pages passed.
- Android device checks confirmed the four table scopes, Previous/Next, amount sort, vehicle month selection and exact party-only display.
- Native Excel export was reopened independently: 46 party-only rows, exact newlines, explicit wrapping and zero preserved.
- Native PDF was reopened and rendered: 46 party-only rows across 16 A4 pages, correct line breaks and page numbers, no sibling-party content. First and last pages visually inspected.
- Android PDF sharing failed because the generator used an external files folder outside the sharing provider roots. Fixed by generating/copying into the application cache; the PDF share sheet subsequently opened successfully.
- Optimized Android QA build also passed cold startup, two-tab draft restoration after force-stop, preserved newlines, server search, selection across two pages, and PDF/Excel sharing. Independently reopened exports contain exactly 45 selected destination rows.
- All 145 owned live test documents were removed after verification; all eight test workspace collections are empty. Only the separate QA application cache/drafts were cleared.
- The dependency audit reports zero vulnerabilities after updating SheetJS, Metro, CLI tooling and the gRPC dependency.
- APK and AAB release builds pass with code shrinking and protected release signing. Production bundle checks exclude emulator credentials and the QA entry point.

## Build and installation

Production: `android/app/build/outputs/apk/release/app-release.apk` and `android/app/build/outputs/bundle/release/app-release.aab`. The verified delivery APK is at `C:/Users/Akhtar/Desktop/vehicle_trip/android apps apks/vehicle_trip.apk`. SHA-256: `237D983C28E0971FE331064D26529D1C44A4E1BF59880D0A5482F7064C40323D`.

Release key: protected local `Documents/TripTrack-release-signing`. The properties and key are ignored by Git. Preserve an offline backup of this directory for future app updates. The certificate SHA-256 is `98247fac84e184c4dbf4d0810f9166e013b976e6a1a5f10d2d11e93b9db8e247`.

This key differs from earlier debug-signed previews. Android will not install it as an update over a differently signed app. A compatible in-place update requires that installation's original signing key. Preserve unfinished local drafts before replacing an older installation. Cloud data remains in Firebase and is loaded after signing in to the correct workspace account.

## Scope and practical limits

See `REFERENCE_PARITY.md` for the source comparison. The reference contains a separate invoicing system (daily/monthly bills, payment tracking, formulas, attachments and bill records). Those modules are inventoried, not included in this vehicle/party release. Customer names with existing trip references cannot be renamed without a controlled identity migration. Historical shared amounts cannot be allocated to parties without a business rule. Search uses prefixes, not arbitrary substring/fuzzy search. Large exports still require fetching their matching records; normal browsing is bounded to 40 rows. Testing does not establish that every possible device and data combination is defect-free.
