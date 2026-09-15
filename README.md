# Tracker

Mobile-first funnel metric counter. Track conversion funnels (dating opens → numbers, music walk-ins → follow-ups → bookings, etc.) with a big-tap **Count** grid, **Charts**, and a daily **Sheet**.

Works offline with `localStorage`. Sign in with Google (Firebase Auth) to sync funnels & events across desktop and phone via Firestore.

## Stack

- Vite + React + TypeScript (SPA — GitHub Pages friendly)
- Tailwind CSS v4
- Recharts, Iconify, dnd-kit
- Firebase Auth (Google) + Cloud Firestore (client SDK only)

## Local development

```bash
cd tracker   # or: cd /workspace/tracker
cp .env.example .env.local
# paste Firebase web config into .env.local (see below)
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/tracker/`).

Without Firebase env vars the app still runs in **local-only** mode; the header shows “Firebase not configured”.

Production build:

```bash
npm run build
npm run preview
```

## Firebase setup (exact steps)

### 1. Create a project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → name it (e.g. `tracker`) → continue (Google Analytics optional)
3. When ready, open the project

### 2. Register a web app

1. Project Overview → **</> Add app** (Web)
2. App nickname: `tracker`
3. **Do not** check Hosting unless you want it — this app deploys to GitHub Pages
4. Register → copy the `firebaseConfig` values

### 3. Paste config into env

Create `.env.local` in the repo root (same folder as `package.json`):

```env
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…          # e.g. your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…       # e.g. your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
```

These map 1:1 from the Firebase SDK snippet (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

### 4. Enable Google sign-in

1. Console → **Build → Authentication** → **Get started**
2. **Sign-in method** tab → **Google** → Enable → set project support email → **Save**

### 5. Authorized domains (required for GitHub Pages)

1. Authentication → **Settings** → **Authorized domains**
2. Ensure these are listed (add if missing):
   - `localhost` (dev)
   - `zackplauche.github.io` (GitHub Pages)
   - any custom domain you use

Without `zackplauche.github.io`, Google sign-in will fail on Pages with an unauthorized-domain error.

### 6. Create Firestore

1. **Build → Firestore Database** → **Create database**
2. Start in **production mode** (or test mode for a quick try — lock it down before sharing)
3. Pick a region → Enable

### 7. Security rules

Firestore → **Rules** → paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Publish. Each signed-in user can only read/write their own `users/{uid}` document.

### 8. GitHub Pages build secrets

For [zackplauche.github.io/tracker](https://zackplauche.github.io/tracker/) (Actions workflow):

1. GitHub repo → **Settings → Secrets and variables → Actions**
2. Add repository secrets (same names as env vars):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Push to `main` (or run **Deploy to GitHub Pages** workflow)

The workflow injects these at build time so the client bundle includes your Firebase config.

## Sync behavior

| State | Data |
| --- | --- |
| Logged out / guest | `localStorage` only |
| First Google sign-in, cloud empty | Migrates existing local data → `users/{uid}` |
| Signed in | Live `onSnapshot`; local edits debounced ~300ms to Firestore |
| Conflict | Last-write-wins via `updatedAt` |

Document shape (`users/{uid}`):

```ts
{
  funnels: Funnel[],
  events: Event[],
  activeFunnelId: string | null,
  updatedAt: number
}
```

## Features

- **Google sign-in** — header button + “Sign in to sync” banner; avatar, email, sign out
- **Funnels** — create, rename, delete via hamburger side menu
- **Metrics** — create, rename, delete, drag-and-drop reorder
- **Count** — 2-column grid, large +1 (today’s count), −1 and Undo
- **Charts** — funnel + daily bar charts; Today / 7d / 30d / All
- **Sheet** — daily table, metrics as columns (phone-friendly horizontal scroll)
- Seeded **Dating** and **Music** example funnels with sample events
- PWA manifest + icons; dark theme; safe-area insets

## Deploy

### GitHub Pages (primary)

Push to `main`. Workflow builds with Vite `base: '/tracker/'` and deploys the `dist` artifact.

### Vercel (optional)

1. Import [ZackPlauche/tracker](https://github.com/ZackPlauche/tracker)
2. Framework: Vite — build `npm run build`, output `dist`
3. Add the same `VITE_FIREBASE_*` env vars in the Vercel project
4. Add your Vercel domain under Firebase Auth → Authorized domains

## Data model

Events are append-only deltas so history and undo work:

```ts
{ id: string, metricId: string, timestamp: number, delta: number }
```

Clear site data in the browser to reset local guest data (cloud data is unchanged until you edit while signed in).
