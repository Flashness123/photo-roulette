import { GameRoom, Player, GameStatus } from '../types/game';
import { config } from '../config';

class GameService {
  // Generate a random 6-digit room code
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create a new game room
  async createRoom(hostName: string): Promise<{ room: GameRoom; player: Player } | null> {
    try {
      console.log('Creating room for:', hostName);
      console.log('Backend URL:', config.backend.url);
      
      const response = await fetch(`${config.backend.url}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostName }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating room:', errorText);
        return null;
      }

      const data = await response.json();
      console.log('Room created:', data);
      
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

      return { room, player };
    } catch (error) {
      console.error('Error in createRoom:', error);
      return null;
    }
  }

  // Join an existing game room
  async joinRoom(roomCode: string, playerName: string): Promise<{ room: GameRoom; player: Player } | null> {
    try {
      console.log('Joining room:', roomCode, 'as:', playerName);
      
      const response = await fetch(`${config.backend.url}/api/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode, playerName }),
      });

      console.log('Join response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error joining room:', errorText);
        return null;
      }

      const data = await response.json();
      console.log('Joined room:', data);
      
      // Map the players data properly
      const mappedPlayers: Player[] = data.room.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        isHost: p.is_host,
        score: p.score,
      }));

      const room: GameRoom = {
        id: data.room.id,
        code: data.room.code,
        hostId: data.room.hostId,
        players: mappedPlayers,
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

      return { room, player };
    } catch (error) {
      console.error('Error in joinRoom:', error);
      return null;
    }
  }

  // For now, we'll implement WebSocket functionality later
  // Focus on getting the basic REST API working first
}

export const gameService = new GameService();