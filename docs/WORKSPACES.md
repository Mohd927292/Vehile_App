# Workspace operation guide

## Identity and storage

`staff/{authUid}` stores email, displayName, role (`admin` or `user`), active, and createdAt. Firestore rules enforce privileges from this trusted document. The admin email is used only during trusted provisioning to resolve the exact existing Auth UID.

Each account owns `workspaces/{authUid}/{collection}/{documentId}`. Collections: tripEntries, archivedTrips, vehicles, parties, customers, drivers, fromcustomers. The parent workspace document need not exist. Always enumerate users through `staff`, not through workspace parent documents. Archived trip IDs equal their original trip IDs.

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

Local `android/keystore.properties` is ignored. The provided preview uses debug signing. Supply an independently protected production key before a public release.

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

Wait for the owner's destination account and missing-trip decision. Take a fresh backup. Copy with document IDs preserved, reconcile party/month/vehicle counts against actual trips, verify party-specific rows, and compare source/target counts. Keep a copy manifest and both backups. Do not remove source collections during this first copy.

Run `.\scripts\backup-workspaces.ps1` for a complete current app backup: all seven business subcollections under every staff UID, staff profiles, and preserved root collections. Its manifest records each collection count. The original backup-firestore script exports only the legacy root collections.
