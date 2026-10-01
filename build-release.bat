@echo off
echo Building Release APK...
cd /d "%~dp0android" || exit /b 1
call gradlew.bat assembleRelease
if errorlevel 1 (
  echo Release build failed.
  exit /b 1
)
echo Release APK built successfully.
echo Location: %~dp0android\app\build\outputs\apk\release\app-release.apk
