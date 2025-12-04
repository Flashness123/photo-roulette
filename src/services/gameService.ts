import { supabase } from './supabase';
import { GameRoom, Player, GameStatus } from '../types/game';
import { config } from '../config';
import io, { Socket } from 'socket.io-client';

class GameService {
  private socket: Socket | null = null;

  // Initialize WebSocket connection
  private initSocket(): Socket {
    if (!this.socket) {
      this.socket = io(config.backend.wsUrl);
    }
    return this.socket;
  }
  // Generate a random 6-digit room code
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create a new game room
  async createRoom(hostName: string): Promise<{ room: GameRoom; player: Player } | null> {
    try {
      const response = await fetch(`${config.backend.url}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostName }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating room:', error);
        return null;
      }

      const data = await response.json();
      
      const room: GameRoom = {
        id: data.room.id,
        code: data.room.code,
        hostId: data.room.hostId,
        players: [data.player],
        status: data.room.status as GameStatus,
        currentRound: 1,
        maxRounds: 3,
        photos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const player: Player = {
        id: data.player.id,
        name: data.player.name,
        isHost: data.player.is_host,
        score: data.player.score,
      };

      // Connect to WebSocket and join room
      const socket = this.initSocket();
      socket.emit('joinRoom', {
        roomId: room.id,
        playerId: player.id,
      });

      return { room, player };
    } catch (error) {
      console.error('Error in createRoom:', error);
      return null;
    }
  }

  // Join an existing game room
  async joinRoom(roomCode: string, playerName: string): Promise<{ room: GameRoom; player: Player } | null> {
    try {
      const response = await fetch(`${config.backend.url}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode, playerName }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error joining room:', error);
        return null;
      }

      const data = await response.json();
      
      const room: GameRoom = {
        id: data.room.id,
        code: data.room.code,
        hostId: data.room.hostId,
        players: data.room.players,
        status: data.room.status as GameStatus,
        currentRound: 1,
        maxRounds: 3,
        photos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const player: Player = {
        id: data.player.id,
        name: data.player.name,
        isHost: data.player.is_host,
        score: data.player.score,
      };

      // Connect to WebSocket and join room
      const socket = this.initSocket();
      socket.emit('joinRoom', {
        roomId: room.id,
        playerId: player.id,
      });

      return { room, player };
    } catch (error) {
      console.error('Error in joinRoom:', error);
      return null;
    }
  }

  // Subscribe to room events via WebSocket
  subscribeToRoomEvents(callbacks: {
    onPlayerJoined?: (data: { player: Player; totalPlayers: number }) => void;
    onPlayerLeft?: (data: { playerId: string; totalPlayers: number }) => void;
    onGameStarted?: (data: { status: string; round: number; prompt: string }) => void;
    onRoomState?: (data: { players: Player[]; status: string }) => void;
    onError?: (error: { message: string }) => void;
  }) {
    const socket = this.initSocket();

    if (callbacks.onPlayerJoined) {
      socket.on('playerJoined', callbacks.onPlayerJoined);
    }
    if (callbacks.onPlayerLeft) {
      socket.on('playerLeft', callbacks.onPlayerLeft);
    }
    if (callbacks.onGameStarted) {
      socket.on('gameStarted', callbacks.onGameStarted);
    }
    if (callbacks.onRoomState) {
      socket.on('roomState', callbacks.onRoomState);
    }
    if (callbacks.onError) {
      socket.on('error', callbacks.onError);
    }

    return socket;
  }

  // Start the game (host only)
  startGame(roomId: string, playerId: string) {
    const socket = this.initSocket();
    socket.emit('startGame', { roomId, playerId });
  }

  // Disconnect from WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const gameService = new GameService();