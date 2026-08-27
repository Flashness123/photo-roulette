# Pic Roulette

A multiplayer party game where you guess whose picture is on the screen. Everyone
adds some of their own photos, then you take turns guessing who each one belongs
to — quick, silly, and best with friends.

It's a real, published game — you can download it from the Google Play Store under
the name **Pic Roulette**.

I built and shipped the whole thing myself: the mobile app, the multiplayer that
keeps everyone's game in sync, and the backend behind it.

## Built with

React Native + TypeScript on the front end, a Node/Socket.IO server for realtime
multiplayer (hosted on Railway), and Supabase for data.

## Running it yourself

```sh
npm install
cp .env.example .env      # add your own Supabase + backend values
npm start
npm run android           # or: npm run ios
```

No secrets are committed — config is read from the environment (see
`.env.example`).
