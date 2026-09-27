# TripTrack

React Native Android app for recording trips, vehicles, party destinations, and customers. See [the project audit](docs/PROJECT_AUDIT.md) for the data model, known problems, verification, and modernization plan.

## Local setup (Windows)

Install Node.js 20+, Android SDK 36, NDK 27.1.12297006, and JDK 17. Use the bundled Android Gradle wrapper. The debug build uses `android/app/google-services.json` for the existing `vehicle2-79fd6` Firebase test project. Use a different Firebase configuration for any separate environment.

```powershell
npm ci
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
cd android
.\gradlew.bat assembleDebug
cd ..
npm start
```

With an emulator running, install `android/app/build/outputs/apk/debug/app-debug.apk` using `adb install -r`. For a development build, keep Metro running and use `adb reverse tcp:8081 tcp:8081`.

## Checks

```powershell
npm test -- --runInBand
npm exec tsc -- --noEmit
npm run lint -- --quiet
```

## Data and release notes

Trips are stored in `tripEntries`. Vehicle, party, driver, and origin collections are derived summaries or autocomplete sources; customer records are in `customers`. New and edited trips include normalized `vehicleKey` and `partyKeys`. All 303 existing trips in the connected test project were backed up and backfilled on 2026-09-27, so vehicle and party detail screens use indexed queries. A different Firestore project needs its own reviewed backup and backfill before this app version is installed.

The repeatable test-project data checks are:

```powershell
.\scripts\backup-firestore.ps1
$backup = (Get-ChildItem .local-backup -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
node scripts/analyze-backup.cjs $backup
node scripts/backfill-trip-keys.cjs $backup # dry run
node scripts/backfill-trip-keys.cjs $backup --apply
.\scripts\backup-firestore.ps1
$backup = (Get-ChildItem .local-backup -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
node scripts/repair-party-summaries.cjs $backup # dry run
node scripts/repair-party-summaries.cjs $backup --apply
node scripts/verify-firestore-queries.cjs $backup
```

These scripts target `vehicle2-79fd6` explicitly and require Google Cloud CLI authentication with Firestore data access. Backups contain customer details and are ignored by Git. The repository's `firestore.rules` file is incomplete for the live six-collection data model; deployed rules could not be read with the current account. Do not deploy those rules until access policy and permissions are resolved.

Release signing requires an ignored `android/keystore.properties` file with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Do not commit a release keystore or credentials.
