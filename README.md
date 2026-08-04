# Kharcha 💸

> Expense analyzer for couples — track, split, and analyze shared spending together.

**Live App:** https://aguywithnojob.github.io/domanga/

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Step 1 — Firebase Project Setup](#step-1--firebase-project-setup)
4. [Step 2 — Enable Phone Authentication](#step-2--enable-phone-authentication)
5. [Step 3 — Create Firestore Database](#step-3--create-firestore-database)
6. [Step 4 — Get Firebase Config Keys](#step-4--get-firebase-config-keys)
7. [Step 5 — Clone & Install](#step-5--clone--install)
8. [Step 6 — Configure Environment Variables](#step-6--configure-environment-variables)
9. [Step 7 — Run Locally](#step-7--run-locally)
10. [Step 8 — Deploy to GitHub Pages](#step-8--deploy-to-github-pages)
11. [Step 9 — Add GitHub Pages Domain to Firebase](#step-9--add-github-pages-domain-to-firebase)
12. [How Couple Linking Works](#how-couple-linking-works)
13. [Project Structure](#project-structure)

---

## Features

- **Auth** — Sign in with Google as the primary method; a mobile number is collected and required for every account (used for account recovery/notifications); Phone OTP is also available as an alternate sign-in method; couple linked via 6-digit invite code
- **Expenses** — add, edit, delete; tap any row for a full detail sheet with actions
- **Insights** — monthly / weekly / custom range; category breakdown + You vs Partner chart
- **Budgets** — monthly budget with progress bar; per-category limits with over-budget alerts
- **Haul** — shared shopping/needs list; mark items picked up, auto-clear after 24h; accessible from BottomNav
- **Real-time + Offline** — both screens sync instantly; expenses queue offline and auto-sync on reconnect
- **PWA** — installable on iOS & Android; push notifications with in-app inbox
- **Admin panel** — collapsible sections for feature flags, custom categories, and OCR keyword rules (merchant → category mappings) — all without redeploying
- Serverless — Firebase handles auth & database; hosted free on GitHub Pages

---

## Tech Stack

| Layer | Tool |
|---|---|
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Auth | Firebase Auth — Google Sign-In + Phone OTP |
| Database | Firebase Firestore |
| Charts | Recharts |
| Routing | React Router v6 (HashRouter) |
| Font | Inter (Google Fonts) |
| Deploy | GitHub Pages via `gh-pages` |

---

## Step 1 — Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it `kharcha` (or anything you prefer)
4. Disable Google Analytics (not needed) → Click **"Create project"**
5. Wait for the project to be created → Click **"Continue"**

---

## Step 2 — Enable Phone Authentication

1. In the Firebase Console sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Under **"Sign-in method"** tab, find **"Phone"** and click it
4. Toggle **"Enable"** → Click **"Save"**

> **Important:** Firebase Phone Auth requires a real phone number and will send actual SMS messages. For testing locally, you can add test phone numbers:
> - In Authentication → Sign-in method → Phone, scroll down to **"Phone numbers for testing"**
> - Add a test number like `+91 9999999999` with OTP `123456`
> - This avoids SMS charges during development

---

## Step 3 — Create Firestore Database

1. In the sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add proper rules later)
4. Select a location closest to India — choose **`asia-south1` (Mumbai)** → Click **"Enable"**
5. Wait for the database to be provisioned

---

## Step 4 — Get Firebase Config Keys

1. In the Firebase Console, click the ⚙️ gear icon → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **"</>"** (Web) icon to add a web app
4. Enter app nickname: `kharcha-web` → Click **"Register app"**
5. You'll see a config object like this — **copy all the values**:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kharcha-xxxxx.firebaseapp.com",
  projectId: "kharcha-xxxxx",
  storageBucket: "kharcha-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

---

## Step 5 — Clone & Install

```bash
# Clone the repo
git clone https://github.com/aguywithnojob/domanga.git
cd domanga

# Install dependencies
npm install
```

---

## Step 6 — Configure Environment Variables

1. Copy the example env file:

```bash
cp .env.example .env.local
```

2. Open `.env.local` and fill in your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=kharcha-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kharcha-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=kharcha-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

> `.env.local` is gitignored — your keys will never be committed to GitHub.

---

## Step 7 — Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Note:** Phone OTP requires `localhost` to be an authorized domain. It is automatically allowed by Firebase for local development.

---

## Step 8 — Deploy to GitHub Pages

1. Make sure your GitHub repo is named `domanga` and `main` branch exists
2. Run:

```bash
npm run deploy
```

This command:
- Builds the app with `vite build`
- Pushes the `/dist` folder to the `gh-pages` branch
- GitHub Pages serves it from `https://aguywithnojob.github.io/domanga/`

3. In your GitHub repo → **Settings** → **Pages**:
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** → **/ (root)**
   - Click **Save**

Your app will be live in 1-2 minutes.

---

## Step 9 — Add GitHub Pages Domain to Firebase

After deploying, you must whitelist your GitHub Pages URL in Firebase Auth:

1. Go to Firebase Console → **Authentication** → **Settings** tab
2. Under **"Authorized domains"**, click **"Add domain"**
3. Add: `aguywithnojob.github.io`
4. Click **"Add"**

Without this step, phone OTP will fail on the live site.

---

## How Couple Linking Works

1. **Person A** signs in with Google (or Phone OTP, if enabled) → adds a mobile number if not already on file → completes profile setup
2. Person A gets a **6-digit couple invite code** (shown in Settings)
3. **Person B** signs in → on Profile Setup screen, enters Person A's invite code
4. Both are now linked under the same `coupleId`
5. All expenses added by either person are visible to both

> If you want to unlink and re-link, use the Settings screen.

---

## Project Structure

```
domanga/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/              # PhoneLogin, OTPVerify, ProfileSetup
│   │   ├── dashboard/         # Dashboard, SummaryCard, RecentExpenses
│   │   ├── expenses/          # AddExpense, ExpenseList, ExpenseItem
│   │   ├── analytics/         # Analytics, CategoryChart, PersonChart
│   │   └── common/            # BottomNav, Header, Spinner, Modal
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Firebase auth state
│   │   └── ExpenseContext.jsx # Firestore expense CRUD
│   ├── firebase/
│   │   ├── config.js          # Firebase app initialization
│   │   ├── auth.js            # Phone auth helpers
│   │   └── db.js              # Firestore helpers
│   ├── hooks/
│   │   ├── useExpenses.js     # Expense fetch + filter logic
│   │   └── useCouple.js       # Couple link/unlink logic
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── OTPPage.jsx
│   │   ├── ProfileSetupPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── AddExpensePage.jsx
│   │   ├── ExpensesPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── utils/
│   │   ├── dateUtils.js       # Date range helpers
│   │   └── formatUtils.js     # Currency (₹) formatting
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .env.local                 # Your keys — never committed
├── firestore.rules
├── index.html
├── tailwind.config.js
├── vite.config.js
├── package.json
└── README.md
```

---

## Currency

All amounts are displayed in **Indian Rupees (₹ INR)**.

---

## SMS Auto-Ingestion (Android)

Kharcha can automatically detect incoming bank transaction SMS and save them as expenses — no manual entry needed.

### How it works

1. The Android app (built via Capacitor) listens for new SMS using `cordova-plugin-sms`
2. A quick on-device pre-filter checks for an amount (₹/Rs/INR) + transaction keyword
3. Matching SMS are sent to the `ingestSms` Cloud Function
4. The function validates, parses, and stores the expense in Firestore under your user

### One-time local setup (before building the APK)

```bash
# Install Capacitor + SMS plugin
npm install
npm install cordova-plugin-sms
npx cap add android

# Add permissions to android/app/src/main/AndroidManifest.xml:
# <uses-permission android:name="android.permission.RECEIVE_SMS"/>
# <uses-permission android:name="android.permission.READ_SMS"/>

# Sync and open in Android Studio (or build via GitHub Actions)
npm run cap:sync
```

### Deploy the Cloud Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
# Copy the deployed URL — looks like:
# https://asia-south1-YOUR_PROJECT.cloudfunctions.net/ingestSms
```

### Using the hook in your app

Already wired into `App.jsx` — no changes needed. The hook writes directly to Firestore (no Cloud Function, no extra env vars).

---

## Build Android APK via GitHub Actions

No Android Studio needed. Push to `main` → GitHub builds the APK → download and install on your phone.

### Setup (one-time)

1. Add your Firebase env vars as **GitHub repository secrets**:
   - Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Add each of: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`

2. Push your code to `main` — the workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml) runs automatically.

### Download the APK

1. Go to your GitHub repo → **Actions** tab
2. Click the latest **"Build Android APK"** run
3. Scroll to **Artifacts** → download `kharcha-debug-{run_number}`
4. Extract the `.apk` file and transfer to your phone (WhatsApp / Google Drive / USB)

### Install on your phone

1. Open the `.apk` on your phone
2. If prompted, enable **"Install from unknown sources"** for your browser/Files app
3. Tap **Install**

> The APK is a debug build — signed with a debug keystore. Fine for personal use.

---

## API Endpoint Security

The `ingestSms` Cloud Function is protected by multiple layers:

| Layer | What it does |
|---|---|
| **Firebase Auth token** | Every request must carry a valid `Bearer <id-token>`. Anonymous or unauthenticated requests get `401`. Tokens expire in 1 hour and are auto-refreshed by the SDK. |
| **Rate limiting** | Max **30 requests per user per hour**, tracked in Firestore (`smsRateLimits` collection). Returns `429` when exceeded. |
| **Input validation** | SMS body must be 10–500 chars, contain an amount pattern, and a transaction keyword. Returns `400` otherwise. |
| **HTTPS only** | Firebase Cloud Functions enforce HTTPS — plain HTTP is rejected. |
| **No CORS** | `cors: false` — the endpoint is not callable from arbitrary browser origins. |

> For production hardening you can additionally enable [Firebase App Check](https://firebase.google.com/docs/app-check) to bind requests to your specific APK.

---

## License

MIT

