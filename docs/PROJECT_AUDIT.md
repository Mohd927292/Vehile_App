# TripTrack project audit and modernization plan

Reviewed from `neeraj5696/Vehile_App` at `1e52ebc` on 2026-09-23. The Android app is React Native 0.82, Firebase Authentication, and Cloud Firestore. This document records source findings and work performed; it does not claim production data was inspected.

## What the app does

1. `App.tsx` watches Firebase authentication. Signed out users see Login; signed in users see Home and the trip, vehicle, party, and customer screens.
2. `src/screens/LoginScreen.js` signs in or creates an email/password user. `HomeScreen.js` opens Add Trip, Vehicles, Parties, All Trips, and Customers, plus theme/logout controls.
3. `TripEntryScreen.js` manages one or more trip forms, draft autosave, customer validation, suggestions, and submission. A trip holds `vehicleNo`, `driverName`, `amount`, `date`, `dateTimestamp`, and an array of `{from,to}` locations.
4. `src/config/firebase.js` writes trips to `tripEntries`, plus summary documents in `vehicles`, `parties`, `drivers`, and `fromcustomers`. Customer records live in `customers`. `src/services/firestoreService.js` supplies autocomplete queries.
5. Vehicle and party lists derive groups from trips. Their detail pages and All Trips show searchable trip cards with edit/delete and `Pdf_Excel_calender_Sort.js` date, sort, Excel, and PDF controls.
6. `AddCustomer.js`, `CustomerList.js`, and `EditCustomer.js` manage customer records. `ThemeContext.js` stores light/dark preference in AsyncStorage.

## Source map

| Area | Files and responsibility |
| --- | --- |
| Startup/navigation | `index.js`, `App.tsx`, `src/screens/HomeScreen.js`, `src/screens/LoginScreen.js` |
| Data and identity | `src/config/firebase.js`, `src/services/firestoreService.js`, `src/utils/tripData.js`, `src/utils/customerValidation.js`, `firestore.rules` |
| Trip entry/edit | `src/screens/tripentry/TripEntryScreen.js`, `src/screens/Vehicle/EditTrip.js`, `src/components/AutoSuggestInput.js`, `src/hooks/useDebounce.js` |
| Trip views | `src/screens/Vehicle/TripList.js`, `VehicleList.js`, `Vehicle_list_Screen.js`, `src/screens/Party/PartyListScreen.js`, `PartyList_Details_Screen.js` |
| Customers | `src/screens/Customer/AddCustomer.js`, `CustomerList.js`, `EditCustomer.js` |
| Export and date/sort UI | `src/components/Pdf_Excel_calender_Sort.js`, bundled PDF and image assets |
| Theme | `src/theme/ThemeContext.js`, `colors.js`, `src/hooks/useTheme.js` |
| Native/build | `android/`, `app.json`, `package.json`, `metro.config.js`, `babel.config.js`, `react-native.config.js`, `tsconfig.json`, `jest.config.js`, `Gemfile`, icon generator/build batch file |

## Confirmed findings

| Priority | Finding | Evidence and impact | State |
| --- | --- | --- | --- |
| P0 | Account registration plus permissive rules expose all business data to any authenticated account | `LoginScreen.js` allows Sign Up; `firestore.rules` uses only `request.auth != null`. A Firebase role/allowlist design and deployment are required. | Open |
| P0 | Trip edit changed the trip without updating vehicle or party summaries | `EditTrip.js` formerly called `updateDoc` only on `tripEntries`. Lists and counters could disagree. | Fixed for future edits with atomic transaction |
| P0 | Trip deletion used separate writes; a failure could leave partial data | Three trip screens formerly deleted first, then independently decremented counters. | Fixed with one transaction |
| P1 | Party detail mixed other parties' locations and could attribute a shared trip amount to one party | Party screen scanned all trips and displayed the full `locations` array. | Matching locations shown; shared amount labelled rather than allocated |
| P1 | Party names with case or whitespace differences formed separate groups | `PartyListScreen.js` keyed by raw `to`. | Grouped for display; canonical IDs and migration still open |
| P1 | Vehicle summary counts could be stale and whole collection reads slow lists | `getVehicleTripsData` read all vehicles and all trips; vehicle list used summary count. | Removed redundant vehicle read and derives counts from trips; pagination open |
| P1 | All trip, vehicle, and party tables read too many records | All Trips and Parties scan the entire trip collection; vehicle detail caps at 1000. Search/filter/sort happen on device. | Open; needs indexed keys, pagination, and migration |
| P1 | Existing party query cannot match a partial object in an array | `getTripsByParty` used `array-contains-any` with `{to}` although stored location objects also contain `from`. | Fixed correctness with a legacy-safe scan; use indexed `partyKeys` after migration for speed |
| P1 | Date filter misunderstood `DD-MM-YYYY` values | Entry saves day first, export parser tried native `Date` parsing. | Fixed parser for day first, slash, ISO formats |
| P1 | Excel export used `btoa`, which is not reliably available in React Native | `Pdf_Excel_calender_Sort.js` converted binary workbook via `btoa`. | Fixed with XLSX base64 output; device export check pending |
| P1 | Excel/PDF actions ignored the active date and sort selection | Table display applied date and sort locally, but export handlers received the unprocessed `data` prop. | Export now receives the same filtered and sorted trip set; populated-device check pending |
| P1 | Customer rename does not update trip destinations | `EditCustomer.js` only updates one customer document; trip `to` strings remain old names. | Open; stable customer ID migration needed |
| P1 | Duplicate customer names and case-sensitive validation | `AddCustomer.js` used random IDs without a duplicate check; Trip Entry compared `msName` exactly. | Basic normalized lookup fixed; concurrent uniqueness and legacy backfill remain open |
| P1 | Origin blur used destination customer validation | A `from` value was checked against `customers` even though origins live in `fromcustomers`. | Fixed: customer validation applies to destinations only |
| P1 | Source rules omit `customers`, `drivers`, `fromcustomers` | `firestore.rules` lists only 3 collections although code writes 6. Deployed rules may differ. | Open; verify live rules before deployment |
| P2 | Draft autosave could re-submit successful trips after partial save | Original code left all trips in draft after partial success. | Fixed: only failed trips remain |
| P2 | UI tables had variable column counts and required broad horizontal scrolling | Dynamic `FromN/ToN` columns appeared in three screens; action icons sat far right. | Replaced three trip tables with compact cards, expandable routes, and visible actions; populated-device QA pending |
| P2 | Sort choices applied before pressing Apply | Changing sort state immediately retriggered the table effect even while the dialog was open. | Dialog keeps a draft selection until Apply; active filter and sort indicators added |
| P2 | Date field in Edit Trip was free text, and amount accepted invalid numbers | `EditTrip.js` had no validation and did not update `dateTimestamp`. | Fixed validation and timestamp update |
| P2 | Tests did not run due to native gesture module in a bare render test | Original `App.test.tsx` failed before assertion. | Replaced with trip identity/date tests |
| P2 | Release signing password was hardcoded | `android/app/build.gradle` embedded a password. | Removed; provide ignored `keystore.properties` for release builds |
| P2 | Login wrote email and account ID to device logs | Authentication handlers logged identifiers during sign-in and registration. | Removed identifier logging |
| P2 | Dependency advisories | Baseline `npm ci` reported 40 advisories: 4 critical, 18 high, 17 moderate, 1 low. | Open, dependency review needed |
| P2 | Home images were oversized | Three photos were 4096–4864 pixels wide; five carousel files totalled about 24 MB. | Replaced by five 1200-pixel WebP assets under 0.4 MB total |
| P2 | Removing the selected trip left its form off-screen | The horizontal form scroll offset stayed at the deleted trip's index. | Fixed by scrolling to the surviving trip; verified on the emulator |
| P2 | Home header buttons were pushed off-screen on a foldable device | Square cards and a fixed content area overflowed vertically; the customer and theme icons could not be tapped. | Home content now scrolls, cards have bounded height, and buttons have accessibility names; visually rechecked, Customers opened |
| P2 | Date filter action buttons were below the visible modal on a foldable device | Calendar day boxes scaled with screen width and pushed Cancel, Clear, and OK off-screen. | Calendar rows use a fixed touch height; filter and Clear verified on the emulator |
| P2 | Edit Trip has a separate hardcoded dark and purple style and uses free-text dates and party names | A populated device view confirmed visual inconsistency with the rest of the app. Typing a destination bypasses Add Trip customer validation. | Open; move to shared theme, date picker, and stable customer selection |

## Follow-up source review (2026-09-26)

The JavaScript/TypeScript source, tests, rules, package configuration, and Android build configuration were read again before running the app. This is a static review; behavior that depends on production data still needs a controlled test project.

| Source | Finding or change |
| --- | --- |
| `App.tsx`, `LoginScreen.js`, `HomeScreen.js` | Removed redundant auth and navigation listeners. Login now shows readable Firebase errors. Registration remains enabled pending a business access decision; current rules allow every authenticated user to reach all listed collections. Home carousel now pauses off-screen. |
| `config/firebase.js`, `utils/tripData.js` | Create/edit/delete use atomic writes for trip and summary changes. Transaction reads and clamps missing legacy counts. Legacy trip sorting handles missing `createdAt`; normalized vehicle lookup now keeps spelling variants in one history. Full scans remain a latency risk. Existing display-name based IDs can still confuse similarly named businesses. |
| `services/firestoreService.js`, `components/AutoSuggestInput.js`, `hooks/useDebounce.js` | Removed unused duplicate driver writer. Autocomplete had a state variable referenced before initialization, causing a render failure; fixed. Tapping a suggestion no longer triggers a stale blur warning. Queries still depend on lower-case fields that legacy records may lack. |
| `TripEntryScreen.js`, `EditTrip.js` | Replaced nested in-place state mutation, tightened route/amount validation and duplicate-submit guards, preserved zero amounts, and handled deleted trips. Drafts are now scoped to the signed-in account. The prior shared draft is intentionally not loaded across accounts. Edit Trip still has free-text party names and date entry; adding customer IDs and a date picker is planned. |
| `Customer/AddCustomer.js`, `EditCustomer.js`, `CustomerList.js`, `utils/customerValidation.js` | Shared input validation, duplicate-name checks, and focus refresh address immediate form and stale-list issues. Concurrent duplicate creation and customer rename across old trips remain unresolved until stable IDs and migration. |
| `Vehicle/VehicleList.js`, `Vehicle_list_Screen.js`, `TripList.js`, `Party/PartyListScreen.js`, `PartyList_Details_Screen.js`, `components/TripCard.js` | Lists refresh on focus, vehicle display groups normalized registrations, and detail views match legacy variants. Empty search results now show an empty state. Party details only show that party's matching locations. All Trips, Vehicle, and Party still load unbounded data. |
| `components/Pdf_Excel_calender_Sort.js` | Filtered/sorted exports, spreadsheet text escaping, HTML escaping, and same-path PDF copy guard are in place. Removed file-path debug logging. Sharing and cleanup still require populated Android device checks. |
| `theme/*`, `hooks/useTheme.js`, `index.js`, `metro.config.js`, `android/*`, package/test configuration | Read for initialization, visual consistency, and build behavior. Removed unused navigation helper and stale Firebase config copy. Android release build remains a preview signed with a debug key; production signing and secret handling require a separate release setup. |

Current limits: no production records were sampled, so the exact duplicate-party cases and their correct identity mapping are unknown. A complete guarantee for every control or line of code requires representative data, account permissions, and repeated device testing. The open items above are tracked rather than silently merged or guessed.

## Controls and flow inventory

| Screen | Main controls | Review focus |
| --- | --- | --- |
| Login | Email, password, Login, Sign Up | Authentication errors, registration access |
| Home | Theme, Customers, Add Trip, Vehicles, Parties, All Trips, Logout, carousel | Navigation, tap targets, screen size |
| Add Trip | Add/remove trip, date picker, vehicle/driver/from/to suggestions, add/remove location, amount, Save, draft restoration | Duplicate identities, validation, partial save |
| Vehicles/Parties/Customers | Search, row open, pull to refresh, customer add/edit menu | Group correctness, empty states, refresh |
| All Trips, Vehicle Details, Party Details | Search, date range, sort, Excel, PDF, edit, delete, refresh | Data isolation, export correctness, responsiveness |
| Edit Trip | Date, vehicle, driver, amount, location add/remove, Save | Summary consistency, validation, stale lists |

## Plan to reach a professional release

1. **Access and data safety:** decide who may register and see data. Add roles or an allowlist in Firestore rules, enforce them server side, deploy and test against an emulator. Back up production data before migration.
2. **Stable identity:** give each customer/party and vehicle a stable ID. Store `vehicleId` on trips and a separate load document for every party movement. Each load should contain `tripId`, `partyId`, origin, destination, and an optional party-specific amount. Retain display names separately, backfill legacy trips, and show a review queue for ambiguous names. A trip total must stay unallocated when historical data cannot identify each party's share. Do not silently merge uncertain businesses.
3. **Reliable trip accounting:** use one service for create/edit/delete, write all dependent data atomically, and add emulator tests for a trip with multiple parties, repeated party locations, edits, deletion, and concurrent updates. Derive or periodically reconcile summary counts.
4. **Fast reads:** query indexed IDs, load 25–50 trips at a time with Firestore cursors, keep search scoped to the selected vehicle/party, and avoid loading all trips for list screens. Add required indexes and measure latency on representative data.
5. **Usable tables:** compact trip cards and expandable route views now replace the three wide tables. Active date and sort indicators are visible, and exports use the current result set. Add clear filter chips and one-tap reset. Test populated lists on compact and large Android screens and check accessibility labels.
6. **Exports and quality gates:** escape user data in generated HTML, verify PDF/Excel on device, cover critical model logic with tests, eliminate lint errors, upgrade vulnerable dependencies deliberately, then validate release signing and a release build.

The [Firestore query guide](https://firebase.google.com/docs/firestore/query-data/queries) supports indexed array membership for a dedicated ID array; [cursor pagination](https://firebase.google.com/docs/firestore/query-data/query-cursors) supports bounded pages. [React Native FlatList guidance](https://reactnative.dev/docs/flatlist) covers stable keys and layout optimization. Firestore [transactions and batches](https://firebase.google.com/docs/firestore/manage-data/transactions) explain the atomic changes used here.

### Proposed data shape

```text
vehicles/{vehicleId}   -> normalized registration, display registration
parties/{partyId}      -> canonical name, aliases, contact/customer fields
trips/{tripId}         -> vehicleId, driver, date, total amount, timestamps
loads/{loadId}         -> tripId, partyId, from, to, allocated amount (optional)
```

This separates party ownership from the trip's multi-stop route. Vehicle history queries `trips` by `vehicleId`; party history queries `loads` by `partyId`. A party screen can then show only that party's loads without scanning every trip or displaying other customers' movements. Migration must preserve old document IDs and keep a reversible mapping until counts and exports reconcile.

## Verification record

- Baseline `npm ci` succeeded; baseline Jest failed before tests, TypeScript had two errors, ESLint had 17 errors/61 warnings.
- After the follow-up source fixes, Jest passes 8 targeted tests, TypeScript passes, and ESLint has no errors with `--quiet`.
- A non-breaking lockfile refresh reduced the dependency audit to 13 advisories (7 moderate, 6 high, 0 critical). The unmaintained `xlsx` npm package has no npm fix and needs replacement.
- Android debug build succeeded with JDK 17. A standalone release-variant APK also built successfully, signed with the default debug key strictly for preview. It is not a production signing setup.
- After the trip card and export changes, Jest, TypeScript, ESLint, a production JavaScript bundle, and the standalone Android build passed again.
- After the 2026-09-26 source review, 8 Jest tests, TypeScript, ESLint, and the Android release preview build passed. The APK contains the updated JavaScript bundle.
- The debug APK launched in an Android emulator. Login and Sign Up both showed the expected empty-field validation message. The redesigned login screen was visually inspected on a foldable emulator.
- The standalone APK launched without Metro and an existing signed-in emulator session displayed Home. Vehicles opened, passed through loading, and showed an empty state and search field. This account had no representative vehicle records, so load time and populated behavior could not be measured.
- On 2026-09-26, the emulator session displayed populated vehicles and parties. A vehicle history opened, expanded its route, sorted by date, and produced Excel and PDF share sheets. A party history showed only the matching party route. Search showed an empty result for an impossible term. No source records were edited or deleted.
- A device check found that removing the selected trip left a blank form; this was fixed and rechecked after reinstalling the preview APK. The foldable Home overflow was fixed and visually rechecked; Customers opened through its restored header button. Customer list, edit form, add form, and required-name validation opened without writes.
- A foldable date dialog initially hid its action buttons. After compacting the calendar, a selected date range reduced the vehicle history to its matching trip; Clear restored the full list.
- Edit Trip loaded an existing record without saving. Delete showed a confirmation dialog, and Cancel left the trip in the list. The write paths themselves were not exercised against live data.
- Home theme switching worked in both directions on the foldable emulator; the original light preference was restored.
- Some authenticated list, route, sort, search, and export controls have been checked with existing records. Edit/delete, Firestore writes, customer creation, date filtering, and every in-app control remain unverified end to end. Use a non-production Firebase project with representative data for full QA.
- No production Firestore data has been modified for this audit.
