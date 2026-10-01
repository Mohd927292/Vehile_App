# Workspace operation guide

## Identity and storage

`staff/{authUid}` stores email, displayName, role (`admin` or `user`), active, and createdAt. Firestore rules enforce privileges from this trusted document. The admin email is used only during trusted provisioning to resolve the exact existing Auth UID.

Each account owns `workspaces/{authUid}/{collection}/{documentId}`. Collections: tripEntries, archivedTrips, vehicles, parties, customers, drivers, fromcustomers, loads. The parent workspace document need not exist. Always enumerate users through `staff`, not through workspace parent documents. Archived trip IDs equal their original trip IDs.

Root business collections hold preserved legacy data. They are read-only to the administrator. Never copy them automatically into every user's workspace. No reliable historical ownership field exists.

## Admin workflow

Sign in with the confirmed administrator account. Use **Switch user** at the top left of Home, search a name/email, and select a workspace. All subsequent screens belong to that user until switching again. **Existing shared data** opens historical records read-only. User switching does not change Firebase Authentication or require that user's password.

Trip removal is a recoverable archive action in the application. Use **Archive → Restore trip** to restore it and its summary counts. Firestore project owners can still bypass app rules; administrative console deletions are outside this recovery flow.

## Local commands

From the repository root:

```powershell
npm ci
npm test -- --runInBand
npx tsc --noEmit
npx eslint . --quiet
$env:JAVA_HOME='C:\Program Files\Java\jdk-17'
firebase emulators:exec --only firestore --project demo-triptrack 'node scripts/test-firestore-rules.cjs'
firebase emulators:exec --only firestore --project demo-triptrack 'node scripts/test-workspace-service.cjs'
```

Build Android:

```powershell
$env:ANDROID_HOME='C:\Users\Akhtar\AppData\Local\Android\Sdk'
Set-Location android
.\gradlew.bat assembleRelease
```

Local `android/release-signing.properties` is ignored. Release builds use the protected key configured there and enable code shrinking. The emulator QA variant has a separate `.qa` application ID and connects only to local Firebase emulators. The `.qa.live` variant uses the production entry point and optimized native code against the Firebase test account; it remains a separate, debug-signed package. Never distribute QA builds. A newly generated signing key cannot update an installation signed by a different key; retain the original signing key for existing distribution channels.

## Trusted provisioning and rules

Use an authorized Google Cloud login and the correct project. The provisioning script backs up existing staff, account-directory metadata, and deployed rules before applying changes. It defaults to a dry run. `-Apply` resets enabled Auth accounts to ordinary users except the specified single administrator; review the directory before rerunning if a multi-admin setup is introduced later.

```powershell
.\scripts\provision-workspaces.ps1 -AdminEmail '<confirmed-admin-email>'
.\scripts\provision-workspaces.ps1 -AdminEmail '<confirmed-admin-email>' -Apply
firebase deploy --only firestore:rules --project vehicle2-79fd6
node scripts/verify-workspace-deployment.cjs
```

The verification script checks the configured admin, exact deployed rule contents, and live nested indexes without changing business records. Use `x-goog-user-project: vehicle2-79fd6` for Rules/Auth REST requests made with local Google credentials.

## Copying existing records

The owner-approved recovery was completed on 2026-09-30 into the exact Firebase Auth account resolved from the requested destination. It contains 303 original vehicle trips and 397 separate pair records, including the trip recovered from the earlier preserved backup. Original IDs and business fields remain preserved. Party/month/vehicle counts were rebuilt and every written document was read back and compared with the recovery plan. The root source was not deleted. See the local recovery manifest for account identifiers and source snapshots.

For a future empty destination, review `scripts/recover-workspace.cjs`. Its default action makes a backup and plan; `--apply <plan-directory>` performs create-only writes. Do not rerun a completed plan or use it to overwrite a populated destination.

Run `.\scripts\backup-workspaces.ps1` for a complete current app backup: all eight business subcollections under every staff UID, staff profiles, and preserved root collections. Its manifest records each collection count. The original backup-firestore script exports only the legacy root collections.


## Pair tables and drafts

`tripEntries/{tripId}` preserves a vehicle tab and its route pairs. `loads/{tripId}__{pairIndex}` stores one pair per row, with the same vehicle/date/driver plus exact From/To text and a stable `partyId`. Trip writes update both representations and their summaries in a transaction. IDs supplied by saved drafts make retried creation idempotent.

Individual vehicles, All vehicles, individual parties, and All parties use the same `TripTable`. Party queries match one `partyId`; vehicle queries match a normalized `vehicleKey`. Pages contain at most 40 rows. Search uses indexed word prefixes across the complete selected scope. Date filters and date/created/amount sorting use deployed indexes. Date ranges require trip-date order. Legacy root browsing is read-only and retains limited filters.

Enter adds a literal new line in From/To. Table rows preserve those breaks and scroll horizontally for long lines. Hold a row to select it. PDF/Excel buttons export selected rows, or all matching pages when none are selected. A vehicle trip total shared by several pairs is explicitly marked as shared; it is not multiplied or guessed per party. Editing/archiving a vehicle trip affects all its pairs and is labelled accordingly. Archive restores the full trip and pair records.

Drafts are saved on device as fields change and when the app leaves the foreground. They are scoped to both the signed-in operator and selected workspace. Closing/reopening Add Trip restores tabs, fields, and the selected tab. The visible draft status confirms persistence. A successful save clears its completed draft.

## QA commands

```powershell
firebase emulators:start --only auth,firestore --project demo-triptrack --config firebase.qa.json
# Separate terminal, with those emulators running:
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
node scripts/test-workspace-service.cjs
node scripts/test-firestore-rules.cjs
node scripts/seed-qa.cjs
.\android\gradlew.bat -p android assembleQa
```

Tests clear the demo database; seed fixtures after running them. Device QA uses reversed local ports 8080 and 9099. The synthetic credentials in `qa/index.js` are emulator-only and are not included by the production entry point.


Dedicated live QA uses only the owner-approved test account and an ignored local credential file. `node scripts/test-live-workspace.cjs` refuses a populated baseline, tests actual service operations, and records exact owned fixture paths. `node scripts/test-live-workspace.cjs --cleanup` removes only those paths and verifies the original baseline. The 1 October test run removed 145 fixture documents and restored all eight collections to empty. Never place real customer records in the dedicated test workspace while these fixtures are active.
