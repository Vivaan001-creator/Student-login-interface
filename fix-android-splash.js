// Removes the Android system splash (white square with the old circle logo on a navy
// background) that shows BEFORE the app's own splash. Run from the project root,
// AFTER "npm run assets" and BEFORE "npm run sync":
//     node fix-android-splash.js
const fs = require('fs');
const path = require('path');

const res = path.join('android', 'app', 'src', 'main', 'res');
if (!fs.existsSync(res)) {
  console.error('Cannot find ' + res + '. Run this from the project root (the folder that contains "android").');
  process.exit(1);
}

// 1. An empty drawable, so the system splash shows no icon at all.
fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
fs.writeFileSync(path.join(res, 'drawable', 'splash_empty.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <size android:width="1dp" android:height="1dp" />
    <solid android:color="@android:color/transparent" />
</shape>
`);

// 2. Patch the launch theme in every values*/styles.xml.
const block = (parent) => `<style name="AppTheme.NoActionBarLaunch" parent="${parent}">
        <item name="android:windowBackground">#FFFFFF</item>
        <item name="android:background">@drawable/splash</item>
        <item name="android:statusBarColor">#FFFFFF</item>
        <item name="android:navigationBarColor">#FFFFFF</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="windowSplashScreenBackground">#FFFFFF</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_empty</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>`;

let patched = 0;
for (const dir of fs.readdirSync(res)) {
  if (!dir.startsWith('values')) continue;
  const file = path.join(res, dir, 'styles.xml');
  if (!fs.existsSync(file)) continue;
  const xml = fs.readFileSync(file, 'utf8');
  const re = /<style\s+name="AppTheme\.NoActionBarLaunch"\s+parent="([^"]*)"\s*>[\s\S]*?<\/style>/;
  const m = xml.match(re);
  if (!m) continue;
  fs.writeFileSync(file, xml.replace(re, block(m[1])));
  console.log('Patched ' + file);
  patched++;
}
if (!patched) {
  console.error('AppTheme.NoActionBarLaunch was not found in any styles.xml. Send me android/app/src/main/res/values/styles.xml and I will fix it by hand.');
  process.exit(1);
}
console.log('Done. Now run: npm run sync   and rebuild the app.');
