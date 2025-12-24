# Vehicle App Icon Generation Guide

## Icon Sizes Required for Android:

- **mdpi**: 48x48px (android/app/src/main/res/mipmap-mdpi/)
- **hdpi**: 72x72px (android/app/src/main/res/mipmap-hdpi/)
- **xhdpi**: 96x96px (android/app/src/main/res/mipmap-xhdpi/)
- **xxhdpi**: 144x144px (android/app/src/main/res/mipmap-xxhdpi/)
- **xxxhdpi**: 192x192px (android/app/src/main/res/mipmap-xxxhdpi/)

## How to Generate PNG Icons:

### Option 1: Online SVG to PNG Converter
1. Use the `app_icon_clean.svg` file
2. Go to https://svgtopng.com/ or similar service
3. Upload the SVG file
4. Generate PNG files for each required size
5. Name them `ic_launcher.png` and `ic_launcher_round.png`

### Option 2: Using ImageMagick (if installed)
```bash
# Install ImageMagick first, then run:
magick app_icon_clean.svg -resize 48x48 ic_launcher_mdpi.png
magick app_icon_clean.svg -resize 72x72 ic_launcher_hdpi.png
magick app_icon_clean.svg -resize 96x96 ic_launcher_xhdpi.png
magick app_icon_clean.svg -resize 144x144 ic_launcher_xxhdpi.png
magick app_icon_clean.svg -resize 192x192 ic_launcher_xxxhdpi.png
```

### Option 3: Android Studio
1. Right-click on `app` folder in Android Studio
2. Select New > Image Asset
3. Choose "Launcher Icons (Adaptive and Legacy)"
4. Upload the SVG file
5. Android Studio will generate all required sizes

## Icon Design Features:

✅ **Vehicle Theme**: Features a truck with route tracking
✅ **Professional Colors**: Green gradient background with gray truck
✅ **Clear Visibility**: High contrast design works at all sizes
✅ **Route Tracking**: Dotted path with location pins
✅ **Motion Elements**: Speed lines suggest movement
✅ **Scalable**: SVG format ensures crisp rendering at any size

## Installation:
1. Generate PNG files using one of the methods above
2. Replace existing icons in the respective mipmap folders
3. Clean and rebuild your project
4. The new vehicle-themed icon will appear on your device

## Color Scheme:
- **Primary Green**: #4CAF50 to #2E7D32 (gradient)
- **Truck**: #616161 to #424242 (gradient)
- **Accent**: #FF5722 (location pins)
- **Route**: #81C784 (path and motion lines)
- **Highlights**: #FFF176 (headlight)