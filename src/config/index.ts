// Environment configuration
// You'll need to replace these with your actual values

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project-id.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key-here',
  },
  
  // Railway Backend Configuration (for WebSocket connections)
  backend: {
    url: process.env.BACKEND_URL || 'https://your-app-name.up.railway.app',
    wsUrl: process.env.WS_URL || 'https://your-app-name.up.railway.app',
  },
  
  // Game Configuration
  game: {
    maxPlayers: 8,
    defaultRounds: 3,
    photoTimeLimit: 120, // seconds
    guessingTimeLimit: 60, // seconds
  },
};

// Development mode check
export const isDev = __DEV__;

// API endpoints
export const API_ENDPOINTS = {
  createRoom: '/api/rooms/create',
  joinRoom: '/api/rooms/join',
  uploadPhoto: '/api/photos/upload',
  submitGuess: '/api/guesses/submit',
};