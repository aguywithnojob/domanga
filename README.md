# Karcha 💸

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
12. [Firestore Security Rules](#firestore-security-rules)
13. [How Couple Linking Works](#how-couple-linking-works)
14. [Project Structure](#project-structure)

---

## Features

- Phone OTP authentication (no password needed)
- Link two accounts with a 6-digit couple invite code
- Add expenses by category, date, and person
- Monthly / weekly / custom date range analysis
- Category donut chart and per-person bar chart
- Filter expenses by category, person, or date
- Fully mobile-optimized UI
- Completely serverless — Firebase handles everything
- Hosted free on GitHub Pages

---

## Tech Stack

| Layer | Tool |
|---|---|
| UI Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Auth | Firebase Phone OTP |
| Database | Firebase Firestore |
| Charts | Recharts |
| Routing | React Router v6 (HashRouter) |
| Font | Inter (Google Fonts) |
| Deploy | GitHub Pages via `gh-pages` |

---

## Step 1 — Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it `karcha` (or anything you prefer)
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
4. Enter app nickname: `karcha-web` → Click **"Register app"**
5. You'll see a config object like this — **copy all the values**:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "karcha-xxxxx.firebaseapp.com",
  projectId: "karcha-xxxxx",
  storageBucket: "karcha-xxxxx.appspot.com",
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
VITE_FIREBASE_AUTH_DOMAIN=karcha-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=karcha-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=karcha-xxxxx.appspot.com
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

## Firestore Security Rules

After testing, replace the default test rules with these secure rules:

In Firebase Console → Firestore → **Rules** tab, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Couples: only members can read/write
    match /couples/{coupleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        (resource == null || request.auth.uid in resource.data.members);
    }

    // Expenses: only couple members can read/write
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/couples/$(resource.data.coupleId)).data.members;
      allow create: if request.auth != null;
    }
  }
}
```

Click **"Publish"**.

---

## How Couple Linking Works

1. **Person A** signs in with their phone number → completes profile setup
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

## License

MIT
