const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://jovuumvoqvpdjupqwaze.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdnV1bXZvcXZwZGp1cHF3YXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjM5MDgsImV4cCI6MjA4MDQzOTkwOH0.IjBS6xeP5yNdx-17wDR8H4e50UGCYTD114QKOc8yq70'
);

// Initialize Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active game rooms and their socket connections
const activeRooms = new Map();

// Generate random 6-digit room code
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug endpoint to test Supabase connection
app.get('/debug/supabase', async (req, res) => {
  try {
    // Test simple query
    const { data: rooms, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .limit(1);
    
    if (roomError) {
      console.error('Supabase query error:', roomError);
      return res.json({ error: 'Query failed', details: roomError });
    }
    
    // Test insert with minimal data
    const testCode = 'TEST' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('game_rooms')
      .insert({
        code: testCode,
        status: 'waiting',
        max_players: 8,
        current_round: 1,
        max_rounds: 3
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.json({ 
        querySuccess: true, 
        queryData: rooms,
        insertError: insertError,
        message: 'Query works but insert failed'
      });
    }
    
    // Clean up test data
    await supabase
      .from('game_rooms')
      .delete()
      .eq('code', testCode);
    
    res.json({ 
      querySuccess: true,
      insertSuccess: true,
      queryData: rooms,
      insertData: insertData,
      message: 'Supabase connection working'
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.json({ error: 'Debug failed', details: error.message });
  }
});

// Debug endpoint to add fake player to a room
app.post('/debug/add-fake-player', async (req, res) => {
  try {
    const { roomId, playerName = 'Bot Player' } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Check if room exists
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Create fake player
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: roomId,
        name: playerName,
        is_host: false,
        score: 0,
        photos_locked: false
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error creating fake player:', playerError);
      return res.status(500).json({ 
        error: 'Failed to create fake player', 
        details: playerError.message,
        hint: 'The photos_locked column might not exist. Please add it manually in Supabase.'
      });
    }

    res.json({ 
      success: true, 
      player: playerData,
      message: 'Fake player added successfully'
    });
  } catch (error) {
    console.error('Error adding fake player:', error);
    res.status(500).json({ error: 'Failed to add fake player' });
  }
});

// Get room by ID with all players
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get room data
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !roomData) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get all players in the room
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    res.json({
      room: {
        id: roomData.id,
        code: roomData.code,
        hostId: roomData.host_id,
        status: roomData.status,
        players: playersData || []
      }
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Lock in photos for a player
app.post('/api/rooms/:roomId/lock-photos', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerId, photoCount } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Try to update player to mark photos as locked
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update({ photos_locked: true })
      .eq('id', playerId)
      .eq('room_id', roomId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating player photos:', updateError);
      
      // Check if error is due to missing column
      if (updateError.message && updateError.message.includes('column') && updateError.message.includes('photos_locked')) {
        return res.status(500).json({ 
          error: 'Database column missing',
          hint: 'Please add photos_locked column to players table in Supabase Dashboard',
          sql: 'ALTER TABLE players ADD COLUMN photos_locked BOOLEAN DEFAULT false;'
        });
      }
      
      return res.status(500).json({ error: 'Failed to lock photos' });
    }

    res.json({ success: true, player: updatedPlayer });
  } catch (error) {
    console.error('Error locking photos:', error);
    res.status(500).json({ error: 'Failed to lock photos' });
  }
});

// Leave a room (remove player)
app.post('/api/rooms/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { playerId } = req.body;

    console.log(`Player ${playerId} leaving room ${roomId}`);

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Delete player from database
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)
      .eq('room_id', roomId);

    if (deleteError) {
      console.error('Error removing player from DB:', deleteError);
      return res.status(500).json({ error: 'Failed to remove player' });
    }

    console.log(`Player ${playerId} deleted from database`);

    // Also remove from activeRooms Map
    const room = activeRooms.get(roomId);
    if (room) {
      room.players.delete(playerId);
      console.log(`Player ${playerId} removed from activeRooms, remaining: ${room.players.size}`);
    }

    // Check if room is now empty
    const { data: remainingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    // If room is empty, delete it
    if (!remainingPlayers || remainingPlayers.length === 0) {
      await supabase
        .from('game_rooms')
        .delete()
        .eq('id', roomId);
      activeRooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }

    // Notify other players via Socket.IO that someone left
    console.log(`Emitting playerLeft to room:${roomId}`);
    io.to(`room:${roomId}`).emit('playerLeft', {
      playerId: playerId,
      roomId: roomId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Create a new game room
app.post('/api/rooms/create', async (req, res) => {
  try {
    const { hostName } = req.body;
    
    if (!hostName) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    const roomCode = generateRoomCode();
    
    console.log('Creating room with code:', roomCode);
    
    // First, create a temporary room with a placeholder host_id to get the room_id
    // We'll use a dummy UUID first, then update it
    const dummyHostId = '00000000-0000-0000-0000-000000000000';
    
    // Create room in Supabase
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        code: roomCode,
        host_id: dummyHostId,
        status: 'waiting',
        max_players: 8,
        current_round: 1,
        max_rounds: 3
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return res.status(500).json({ error: 'Failed to create room', details: roomError.message });
    }

    console.log('Room created:', roomData);

    // Create host player
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: roomData.id,
        name: hostName,
        is_host: true,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error creating host player:', playerError);
      // Clean up the room if player creation fails
      await supabase.from('game_rooms').delete().eq('id', roomData.id);
      return res.status(500).json({ error: 'Failed to create host player', details: playerError.message });
    }

    console.log('Player created:', playerData);

    // Update room with actual host_id
    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ host_id: playerData.id })
      .eq('id', roomData.id);

    if (updateError) {
      console.error('Error updating room with host_id:', updateError);
      return res.status(500).json({ error: 'Failed to update room', details: updateError.message });
    }

    // Initialize room in memory
    activeRooms.set(roomData.id, {
      roomId: roomData.id,
      code: roomCode,
      hostId: playerData.id,
      players: new Map([[playerData.id, playerData]]),
      status: 'waiting'
    });

    res.json({
      room: {
        id: roomData.id,
        code: roomCode,
        hostId: playerData.id,
        status: 'waiting'
      },
      player: playerData
    });

  } catch (error) {
    console.error('Error in create room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join an existing game room
app.post('/api/rooms/join', async (req, res) => {
  try {
    const { roomCode, playerName } = req.body;
    
    if (!roomCode || !playerName) {
      return res.status(400).json({ error: 'Room code and player name are required' });
    }

    // Find room by code
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', roomCode)
      .eq('status', 'waiting')
      .single();

    if (roomError || !roomData) {
      return res.status(404).json({ error: 'Room not found or not available' });
    }

    // Check if room is full
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id);

    if (existingPlayers && existingPlayers.length >= roomData.max_players) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if player with same name already exists in this room
    const existingPlayer = existingPlayers?.find(p => p.name === playerName);
    
    let playerData;
    if (existingPlayer) {
      // Player is rejoining - use existing player record
      playerData = existingPlayer;
      console.log(`Player ${playerName} rejoining room ${roomData.id}`);
    } else {
      // New player - add to room
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: roomData.id,
          name: playerName,
          is_host: false,
        })
        .select()
        .single();

      if (playerError) {
        console.error('Error joining room:', playerError);
        return res.status(500).json({ error: 'Failed to join room' });
      }
      
      playerData = newPlayer;
      console.log(`New player ${playerName} joined room ${roomData.id}`);
    }

    // Update room in memory
    let room = activeRooms.get(roomData.id);
    if (!room) {
      // Room not in memory, initialize it
      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);
      
      room = {
        roomId: roomData.id,
        code: roomData.code,
        hostId: roomData.host_id,
        players: new Map(allPlayers.map(p => [p.id, p])),
        status: roomData.status
      };
      activeRooms.set(roomData.id, room);
    } else {
      room.players.set(playerData.id, playerData);
    }

    // Notify other players in the room
    io.to(`room:${roomData.id}`).emit('playerJoined', {
      player: playerData,
      totalPlayers: room.players.size
    });

    res.json({
      room: {
        id: roomData.id,
        code: roomData.code,
        hostId: roomData.host_id,
        status: roomData.status,
        players: Array.from(room.players.values())
      },
      player: playerData
    });

  } catch (error) {
    console.error('Error in join room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Join a room
  socket.on('joinRoom', async (data) => {
    const { roomId, playerId } = data;
    
    socket.join(`room:${roomId}`);
    socket.roomId = roomId;
    socket.playerId = playerId;
    
    console.log(`Player ${playerId} joined socket room ${roomId}`);
    
    // Make sure room exists in activeRooms - fetch from database if needed
    let room = activeRooms.get(roomId);
    if (!room) {
      // Room not in memory, fetch from database
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);
      
      if (roomData && players) {
        room = {
          roomId: roomData.id,
          code: roomData.code,
          hostId: roomData.host_id,
          players: new Map(players.map(p => [p.id, p])),
          status: roomData.status
        };
        activeRooms.set(roomId, room);
        console.log(`Room ${roomId} loaded into activeRooms from database`);
      }
    }
    
    // Send current room state
    if (room) {
      socket.emit('roomState', {
        players: Array.from(room.players.values()),
        status: room.status
      });
    }
  });

  // Start game (host only)
  socket.on('startGame', async (data) => {
    const { roomId, playerId } = data;
    console.log('startGame received:', { roomId, playerId, activeRoomsSize: activeRooms.size });
    
    const room = activeRooms.get(roomId);
    console.log('Room found:', room ? 'yes' : 'no', room ? `hostId: ${room.hostId}, players: ${room.players.size}` : '');
    
    if (!room || room.hostId !== playerId) {
      console.log('Validation failed: room exists:', !!room, 'host match:', room?.hostId === playerId);
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (room.players.size < 1) {
      socket.emit('error', { message: 'Need at least 1 player to start' });
      return;
    }

    // Update room status in database
    await supabase
      .from('game_rooms')
      .update({ status: 'in_game' })
      .eq('id', roomId);

    room.status = 'in_game';
    
    // Notify all players in the room - emit to the room
    console.log('Broadcasting gameStarted to room:', roomId);
    io.to(`room:${roomId}`).emit('gameStarted', {
      status: 'in_game',
      roomId: roomId,
      round: 1
    });
  });

  // Handle disconnection - CRITICAL: remove player from database and room
  socket.on('disconnect', async () => {
    console.log('Player disconnected:', socket.id);
    
    if (socket.roomId && socket.playerId) {
      try {
        // Remove player from database
        await supabase
          .from('players')
          .delete()
          .eq('id', socket.playerId)
          .eq('room_id', socket.roomId);
        
        // Update room in memory
        const room = activeRooms.get(socket.roomId);
        if (room) {
          room.players.delete(socket.playerId);
          
          // Check if room is now empty
          if (room.players.size === 0) {
            // Delete empty room from database
            await supabase
              .from('game_rooms')
              .delete()
              .eq('id', socket.roomId);
            activeRooms.delete(socket.roomId);
            console.log(`Room ${socket.roomId} deleted (empty)`);
          }
        }
        
        // Notify other players that someone left
        socket.to(`room:${socket.roomId}`).emit('playerLeft', {
          playerId: socket.playerId,
          roomId: socket.roomId
        });
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Photo Roulette backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});