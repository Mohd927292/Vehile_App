# TripTrack project audit and modernization plan

Reviewed from `neeraj5696/Vehile_App` at `1e52ebc` on 2026-09-23. The Android app is React Native 0.82, Firebase Authentication, and Cloud Firestore. This document records source findings and work performed; it does not claim production data was inspected.

## What the app does

1. `App.tsx` watches Firebase authentication. Signed out users see Login; signed in users see Home and the trip, vehicle, party, and customer screens.
2. `src/screens/LoginScreen.js` signs in or creates an email/password user. `HomeScreen.js` opens Add Trip, Vehicles, Parties, All Trips, and Customers, plus theme/logout controls.
3. `TripEntryScreen.js` manages one or more trip forms, draft autosave, customer validation, suggestions, and submission. A trip holds `vehicleNo`, `driverName`, `amount`, `date`, `dateTimestamp`, and an array of `{from,to}` locations.
4. `src/config/firebase.js` writes trips to `tripEntries`, plus summary documents in `vehicles`, `parties`, `drivers`, and `fromcustomers`. Customer records live in `customers`. `src/services/firestoreService.js` supplies autocomplete queries.
5. Vehicle and party lists derive groups from trips. Their detail pages and All Trips show searchable, horizontally scrolling tables with edit/delete and `Pdf_Excel_calender_Sort.js` date, sort, Excel, and PDF controls.
6. `AddCustomer.js`, `CustomerList.js`, and `EditCustomer.js` manage customer records. `ThemeContext.js` stores light/dark preference in AsyncStorage.

## Source map

| Area | Files and responsibility |
| --- | --- |
| Startup/navigation | `index.js`, `App.tsx`, `src/utils/navigation.js`, `src/screens/HomeScreen.js`, `src/screens/LoginScreen.js` |
| Data and identity | `src/config/firebase.js`, `src/services/firestoreService.js`, `src/utils/tripData.js`, `firestore.rules` |
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
| P1 | Customer rename does not update trip destinations | `EditCustomer.js` only updates one customer document; trip `to` strings remain old names. | Open; stable customer ID migration needed |
| P1 | Duplicate customer names and case-sensitive validation | `AddCustomer.js` used random IDs without a duplicate check; Trip Entry compared `msName` exactly. | Basic normalized lookup fixed; concurrent uniqueness and legacy backfill remain open |
| P1 | Origin blur used destination customer validation | A `from` value was checked against `customers` even though origins live in `fromcustomers`. | Fixed: customer validation applies to destinations only |
| P1 | Source rules omit `customers`, `drivers`, `fromcustomers` | `firestore.rules` lists only 3 collections although code writes 6. Deployed rules may differ. | Open; verify live rules before deployment |
| P2 | Draft autosave could re-submit successful trips after partial save | Original code left all trips in draft after partial success. | Fixed: only failed trips remain |
| P2 | UI tables have variable column counts and require broad horizontal scrolling | Dynamic `FromN/ToN` columns appear in three screens; action icons sit far right. | Open; replace with compact rows and a trip detail sheet |
| P2 | Date field in Edit Trip was free text, and amount accepted invalid numbers | `EditTrip.js` had no validation and did not update `dateTimestamp`. | Fixed validation and timestamp update |
| P2 | Tests did not run due to native gesture module in a bare render test | Original `App.test.tsx` failed before assertion. | Replaced with trip identity/date tests |
| P2 | Release signing password was hardcoded | `android/app/build.gradle` embedded a password. | Removed; provide ignored `keystore.properties` for release builds |
| P2 | Login wrote email and account ID to device logs | Authentication handlers logged identifiers during sign-in and registration. | Removed identifier logging |
| P2 | Dependency advisories | Baseline `npm ci` reported 40 advisories: 4 critical, 18 high, 17 moderate, 1 low. | Open, dependency review needed |
| P2 | Home images were oversized | Three photos were 4096–4864 pixels wide; five carousel files totalled about 24 MB. | Replaced by five 1200-pixel WebP assets under 0.4 MB total |

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
5. **Usable tables:** replace dynamic wide columns with a concise row (date, vehicle, party/load count, amount/status), an expandable location view, a fixed visible action menu, clear filter chips, reset, active sort indicator, and export of the currently filtered set. Test compact and large Android screens and accessibility labels.
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
- After fixes, Jest passes 4 targeted tests, TypeScript passes, and ESLint has no errors with `--quiet`.
- A non-breaking lockfile refresh reduced the dependency audit to 13 advisories (7 moderate, 6 high, 0 critical). The unmaintained `xlsx` npm package has no npm fix and needs replacement.
- Android debug build succeeded with JDK 17. A standalone release-variant APK also built successfully, signed with the default debug key strictly for preview. It is not a production signing setup.
- The debug APK launched in an Android emulator. Login and Sign Up both showed the expected empty-field validation message. The redesigned login screen was visually inspected on a foldable emulator.
- The standalone APK launched without Metro and an existing signed-in emulator session displayed Home. Vehicles opened, passed through loading, and showed an empty state and search field. This account had no representative vehicle records, so load time and populated behavior could not be measured.
- Authenticated tables, edit/delete, Firestore writes, exports, and every in-app control remain unverified end to end. Source review and a Home screenshot do not substitute for these checks. Use a non-production Firebase project with representative data for full QA.
- No production Firestore data has been modified for this audit.
