export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  score: number;
}

export interface Photo {
  id: string;
  playerId: string;
  url: string;
  uploadedAt: Date;
}

export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentRound: number;
  maxRounds: number;
  photos: Photo[];
  createdAt: Date;
  updatedAt: Date;
}

export enum GameStatus {
  WAITING = 'waiting',
  PHOTO_SUBMISSION = 'photo_submission',
  GUESSING = 'guessing',
  RESULTS = 'results',
  FINISHED = 'finished',
}

export interface GameSettings {
  maxPlayers: number;
  roundTimeLimit: number; // in seconds
  photoTimeLimit: number; // in seconds
  rounds: number;
}

export interface Guess {
  playerId: string;
  photoId: string;
  guessedPlayerId: string;
  isCorrect: boolean;
}

export interface RoundResult {
  round: number;
  photos: Photo[];
  guesses: Guess[];
  scores: { [playerId: string]: number };
}