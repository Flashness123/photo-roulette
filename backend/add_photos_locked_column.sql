-- Add photos_locked column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS photos_locked BOOLEAN DEFAULT false;
