# TripTrack

React Native Android app for recording trips, vehicles, party destinations, and customers. See [the project audit](docs/PROJECT_AUDIT.md) for the data model, known problems, verification, and modernization plan.

## Local setup (Windows)

Install Node.js 20+, Android SDK 36, NDK 27.1.12297006, and JDK 17. Use the bundled Android Gradle wrapper. The debug build uses `android/app/google-services.json` for the existing Firebase project; create a separate Firebase project and config for isolated test data.

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

Trips are stored in `tripEntries`. Vehicle, party, driver, and origin collections are derived summaries or autocomplete sources; customer records are in `customers`. New and edited trips include normalized `vehicleKey` and `partyKeys`, but legacy records need a reviewed backfill before the app can use these fields for indexed queries. Avoid changing production Firestore rules or migrating production data without a backup and an agreed access policy.

Release signing requires an ignored `android/keystore.properties` file with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Do not commit a release keystore or credentials.
