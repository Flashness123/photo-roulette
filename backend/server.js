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

    // Add player to room
    const { data: playerData, error: playerError } = await supabase
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
    
    console.log(`Player ${playerId} joined room ${roomId}`);
    
    // Send current room state
    const room = activeRooms.get(roomId);
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
    const room = activeRooms.get(roomId);
    
    if (!room || room.hostId !== playerId) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (room.players.size < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    // Update room status in database
    await supabase
      .from('game_rooms')
      .update({ status: 'photo_submission' })
      .eq('id', roomId);

    room.status = 'photo_submission';
    
    // Notify all players
    io.to(`room:${roomId}`).emit('gameStarted', {
      status: 'photo_submission',
      round: 1,
      prompt: 'Take a photo of something blue!'
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    if (socket.roomId && socket.playerId) {
      const room = activeRooms.get(socket.roomId);
      if (room) {
        // Notify other players
        socket.to(`room:${socket.roomId}`).emit('playerLeft', {
          playerId: socket.playerId,
          totalPlayers: room.players.size - 1
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Photo Roulette backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});