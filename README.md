# WWE 2K25 Auction — Setup Guide

A real-time multiplayer auction app for 5 players, built with React + Supabase. Host on Vercel, play over Discord.

---

## Stack
- **Frontend**: React + Vite
- **Realtime backend**: Supabase (free tier)
- **Hosting**: Vercel (free)

---

## Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick a name (e.g. `wwe-auction`) and a region close to you (Mumbai or Singapore)
3. Once created, go to **SQL Editor** in the left sidebar
4. Paste the entire contents of `supabase_setup.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon / public** key → this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Local Setup (for testing)

```bash
npm install
cp .env.example .env
# Fill in your Supabase URL and anon key in .env
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Step 3: Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import that repo
3. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Deploy — Vercel gives you a URL like `wwe-auction-xyz.vercel.app`
5. Share that URL with all 5 players on Discord

---

## How the Auction Works

- **You (Srikant)** are the only one who can click "Start Auction" — this shuffles the roster and kicks things off
- Each superstar appears on everyone's screen simultaneously with a 30-second countdown
- Players bid using the +₹500 / +₹1000 / +₹2000 buttons, or type a custom amount
- Every new bid resets the timer back to 30 seconds
- When the timer hits 0, the highest bidder wins — a **SOLD!** flash appears on all screens
- The next superstar auto-advances immediately
- The purse bars update in real-time for everyone
- After all superstars are sold, a results screen shows everyone's roster and final standings

---

## Rules Reminder
- Starting purse: ₹50,000 each
- Minimum bid increment: ₹500
- Base prices: S-Tier (90+ OVR) = ₹3,000 · A-Tier (85-89) = ₹2,000 · B-Tier (80-84) = ₹1,000
- Superstars below 80 OVR are excluded

---

## Customization

All key values are in `src/lib/supabase.js`:
- `STARTING_PURSE` — change the starting budget
- `BID_INCREMENT` — minimum raise amount
- `ROUND_DURATION` — timer length in seconds
- `PLAYERS` — change player names
- `ROSTER` — the full superstar list (already filtered to 80+ OVR)
