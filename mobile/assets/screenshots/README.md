# Screenshots for Play Store

Generate these screenshots after the app is running:

## How to Generate

1. Start the app: `cd mobile && npx expo start`
2. Open on a Pixel 6/7 emulator (1080×1920)
3. Take screenshots using Android Studio:
   - `Cmd+S` (Mac) or `Ctrl+S` (Windows) in emulator
   - Or use `adb shell screencap /sdcard/screenshot.png && adb pull /sdcard/screenshot.png`

## Required Screenshots

| Filename | Content |
|---|---|
| `phone-01-dashboard.png` | Dashboard with balance, stats, health score |
| `phone-02-expenses.png` | Expense list with filter pills |
| `phone-03-income.png` | Income sources with monthly/yearly summary |
| `phone-04-reports.png` | Reports income vs expense chart |

## Optional

| Filename | Content |
|---|---|
| `phone-05-gmail-import.png` | Gmail import scan results |
| `phone-06-budgets.png` | Budget list with progress bars |

## Feature Graphic

Create `assets/feature-graphic.png` (1024×500):
- Simple gradient background (#4F46E5 → #7C3AED)
- App icon in center
- Text: "MyMoney — Personal Finance Manager"
