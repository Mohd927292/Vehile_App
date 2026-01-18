@echo off
echo Building Release APK...
cd android
call gradlew assembleRelease
echo.
echo Release APK built successfully!
echo Location: android\app\build\outputs\apk\release\app-release.apk
pause