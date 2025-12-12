# URGENT: Add photos_locked Column to Database

## Quick Fix - Run This SQL in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/jovuumvoqvpdjupqwaze/editor
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Paste this SQL:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT false;
```

5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see: "Success. No rows returned"

## Verification

After running the SQL, test by visiting:
```
https://photo-roulette-production-b12d.up.railway.app/debug/add-fake-player
```

Then try locking photos in the app again.

## What This Does

- Adds a `photos_locked` column to track if a player has selected their 16 photos
- Sets default value to `false` for all existing and new players
- Enables the green ✓ checkmark feature in the room lobby

## If You Don't Have Supabase Dashboard Access

The app will show a helpful error message with the SQL to run.
