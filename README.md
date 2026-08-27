# Photo Roulette

A multiplayer party game for mobile: everyone drops in some of their own photos,
then you all take turns guessing whose photo just popped up. Fast, silly, best
played with friends in the same room. It's live on the Google Play Store.

I built the whole thing end to end — the React Native app, the realtime
multiplayer backend, and the database — and shipped it to real users, which was
the fun (and painful) part.

## How it's put together

- **App** — React Native + TypeScript.
- **Realtime backend** — a Node server using Socket.IO for the live game rooms,
  deployed on Railway.
- **Data & auth** — Supabase (Postgres); the schema is in `supabase-schema.sql`.

## Running it yourself

```sh
npm install
cp .env.example .env      # fill in your own Supabase + backend values
npm start                 # Metro
npm run android           # or: npm run ios
```

The backend lives in `backend/` and also reads its config from environment
variables (see `.env.example`).

## Config

No secrets are committed — the app reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
the backend URLs from the environment. Copy `.env.example` and fill in your own.
