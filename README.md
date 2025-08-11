# Workers Tracking — React Native Application

A mobile application for employee **Check-In / Check-Out** via **QR code**, with a live **map** of currently active employees.  
Works together with a **Next.js** web admin panel that generates QR codes, tracks attendance statistics, and manages accounts.

## Table of Contents
- [Key Features](#key-features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Screens](#screens)
- [Installation and Running](#installation-and-running)
- [Build (Android)](#build-android)
- [Environment Configuration](#environment-configuration)
- [QR Check-In Flow](#qr-check-in-flow)
- [Test Login Values](#test-login-values)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [License](#license)

---

## Key Features
- ✅ **QR Check-In / Check-Out** for employees (in-app QR scanner)
- 🗺️ **Map of active employees** (real-time display of who is currently checked in)
- 🔐 Backend validation to prevent misuse
- 📊 Attendance statistics (available in web admin panel)

## Technologies
- **React Native** (Expo or bare RN — depending on setup)
- **JavaScript / TypeScript**
- **React Navigation**
- **react-native-camera** or **expo-barcode-scanner** (QR scanning)
- **react-native-maps** (Google Maps integration)
- **Axios / Fetch API** (API communication)

## Architecture
```
[Mobile App (React Native)]
   ├─ QR Scanner → POST /api/checkin
   ├─ Map Screen → GET /api/active-workers
   └─ Auth (workspace/tenant)

[Web Admin (Next.js)]
   ├─ /admin/qr/entry → public QR for check-in
   ├─ /admin/login → admin (admin / 1234)
   └─ Statistics, employee list, export

[Backend + DB]
   ├─ Validates QR token
   ├─ Records check-in/out timestamps
   └─ Lists active employees
```

## Screens
- **Scanner Screen**: Opens camera to scan QR code from web panel.
- **Map Screen**: Displays real-time location of active employees.
- **Admin Panel (Web)**: Generates QR codes, shows statistics, and manages workers.

## Installation and Running
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/workers-tracking.git
   cd workers-tracking
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start development server:
   ```bash
   npm start
   # or
   yarn start
   ```

4. Run on Android device/emulator:
   ```bash
   npm run android
   # or
   yarn android
   ```

## Build (Android)
To build the APK for distribution:
```bash
expo build:android
# or if bare RN:
cd android && ./gradlew assembleRelease
```

## Environment Configuration
- API base URL should be configured in `.env` file (or config file in the project).
- Google Maps API key is required for the Map screen.

## QR Check-In Flow
1. Employee opens the app and scans QR code displayed on the web admin panel.
2. App sends request to backend with QR data and employee credentials.
3. Backend validates and records Check-In or Check-Out.
4. Map updates in real-time with active employees.

## Test Login Values
For testing purposes, you can use:
```
First field (workspace): workers-tracking
Second field (tenant/test code): test
```

## Troubleshooting
- **QR code not scanning?** Make sure the app has camera permissions enabled.
- **Map not showing employees?** Check Google Maps API key configuration.
- **Cannot connect to API?** Verify backend is running and API URL is correct in `.env`.

## Project Structure
```
/src
  /components
  /screens
    ScannerScreen.js
    MapScreen.js
  /services
    api.js
  App.js
```

## License
This project is licensed under the MIT License.
