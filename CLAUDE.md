# WWE 2K25 Auction — Claude Code Guide

## What this is
A real-time multiplayer auction app for WWE 2K25 superstars. 5 players (Srikant, Ashpak, KVD, Ekansh, Debu), each with ₹50,000, bidding on ~180 superstars in random order. Built with React + Vite + Supabase Realtime. Deployed on Vercel.

## Tech stack
- **Frontend**: React 18 + Vite 5
- **Backend/Realtime**: Supabase (postgres_changes subscription)
- **Hosting**: Vercel

## Project structure
```
src/
  App.jsx               # Root — routing between Lobby / Auction / Results + recovery screen
  main.jsx              # ReactDOM entry
  lib/
    supabase.js         # Supabase client, roster data, PLAYERS, constants, helpers
  components/
    Lobby.jsx           # Player selection, start auction (Srikant only), reset
    Auction.jsx         # Main bidding screen — huge superstar name, bid controls, sold button, un-bid
    Results.jsx         # Post-auction standings + per-player rosters
supabase_setup.sql      # Run this in Supabase SQL editor to create/recreate the table
```

## Key rules & design decisions
- **No timer** — Srikant manually clicks "Sold" when bidding dies down
- **Srikant is the admin** — only he can start auction, click Sold, skip superstars, reset
- **Un-bid** — only the current leader can remove their last bid; it restores the previous bidder from bid_history
- **Cinematic aesthetic** — dark (#06040a bg), Bebas Neue for display, Barlow Condensed for labels, gold (#c8a84b) as primary accent
- **Superstar name** is the hero element — huge, centered, Bebas Neue, full width
- **Tactile feedback** — ripple on click, action flash label, SOLD overlay between rounds
- **Reset** — always confirms before wiping; available in Lobby, Auction, and Results screens

## Supabase table: auction_state (id=1)
```
phase           text       — 'lobby' | 'bidding' | 'results'
roster          jsonb      — shuffled array of [name, ovr] pairs
roster_index    integer    — current position in roster
current_superstar text
current_ovr     integer
current_bid     integer
current_leader  text       — player name or null
bid_history     jsonb      — [{bidder, bid}] stack for un-bid
purses          jsonb      — {Srikant: 50000, Ashpak: 50000, ...}
sold_log        jsonb      — [{superstar, ovr, winner, price}]
```

## Environment variables needed
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Common tasks for Claude Code

### Run locally
```bash
npm install
npm run dev
```

### Build for Vercel
```bash
npm run build
```

### Add a new player
Edit `PLAYERS` array in `src/lib/supabase.js` and add their color in `PLAYER_COLORS` in `Auction.jsx`, `Lobby.jsx`, and `Results.jsx`.

### Change starting purse or bid increment
Edit `STARTING_PURSE` and `BID_INCREMENT` in `src/lib/supabase.js`.

### Change base prices by tier
Edit `getBaseBid()` in `src/lib/supabase.js`.

### Add/remove superstars from the roster
Edit the `ROSTER` array in `src/lib/supabase.js`. Each entry is `[name, ovr]`. The `.filter(([, r]) => r >= 80)` at the bottom excludes below-80 OVR automatically.

### Reset the Supabase table
Run `supabase_setup.sql` in the Supabase SQL editor — it drops and recreates the table cleanly.

## If the black screen / missing row issue happens
The app shows a recovery screen with an "Initialise Auction Data" button — clicking it upserts a fresh row with id=1. No need to touch Supabase directly.
