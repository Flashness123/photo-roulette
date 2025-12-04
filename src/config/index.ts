// Environment configuration
// You'll need to replace these with your actual values

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://jovuumvoqvpdjupqwaze.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdnV1bXZvcXZwZGp1cHF3YXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjM5MDgsImV4cCI6MjA4MDQzOTkwOH0.IjBS6xeP5yNdx-17wDR8H4e50UGCYTD114QKOc8yq70',
  },
  
  // Railway Backend Configuration (for WebSocket connections)
  backend: {
    url: process.env.BACKEND_URL || 'https://photo-roulette-production-b12d.up.railway.app',
    wsUrl: process.env.WS_URL || 'https://photo-roulette-production-b12d.up.railway.app',
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