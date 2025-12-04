import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { config } from '../config';

const SUPABASE_URL = config.supabase.url;
const SUPABASE_ANON_KEY = config.supabase.anonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table schemas for Supabase
/*
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  current_round INTEGER DEFAULT 1,
  max_rounds INTEGER DEFAULT 3,
  max_players INTEGER DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  is_host BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  round INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE guesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  guessed_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  is_correct BOOLEAN DEFAULT false,
  round INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE guesses ENABLE ROW LEVEL SECURITY;

-- Create policies (basic - you may want to refine these)
CREATE POLICY "Game rooms are viewable by everyone" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Players can view their room data" ON players FOR SELECT USING (true);
CREATE POLICY "Photos are viewable by room members" ON photos FOR SELECT USING (true);
CREATE POLICY "Guesses are viewable by room members" ON guesses FOR SELECT USING (true);
*/