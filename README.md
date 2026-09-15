# Tracker

Mobile-first funnel metric counter. Track conversion funnels (dating opens → numbers, music walk-ins → follow-ups → bookings, etc.) with a big-tap **Count** grid, **Charts**, and a daily **Sheet**.

Data lives in the browser (`localStorage`). No backend or auth.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Recharts

## Local development

```bash
cd tracker   # or: cd /workspace/tracker
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Features

- **Funnels** — create, rename, delete via hamburger side menu
- **Metrics** — create, rename, delete, drag-and-drop reorder
- **Count** — 2-column grid, large +1 (today’s count), −1 and Undo
- **Charts** — funnel + daily bar charts; Today / 7d / 30d / All
- **Sheet** — daily table, metrics as columns (phone-friendly horizontal scroll)
- Seeded **Dating** and **Music** example funnels with sample events
- PWA manifest + icons; dark theme; safe-area insets

## Deploy to Vercel

1. Push this repo to GitHub: [ZackPlauche/tracker](https://github.com/ZackPlauche/tracker)
2. Go to [vercel.com/new](https://vercel.com/new)
3. **Import** the `ZackPlauche/tracker` repository
4. Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Click **Deploy**

Optional CLI:

```bash
npm i -g vercel
vercel
```

After the first deploy, connect a custom domain in the Vercel project settings if you want.

## Data model

Events are append-only deltas so history and undo work:

```ts
{ id: string, metricId: string, timestamp: number, delta: number }
```

Clear site data in the browser to reset to the seeded examples.
