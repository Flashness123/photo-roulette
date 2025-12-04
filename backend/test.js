const io = require('socket.io-client');

// Replace with your Railway URL
const BACKEND_URL = 'https://your-app-name.up.railway.app';

async function testBackend() {
  console.log('🧪 Testing Photo Roulette Backend...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const health = await healthResponse.json();
    console.log('✅ Health check:', health);

    // Test room creation
    const createResponse = await fetch(`${BACKEND_URL}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hostName: 'TestHost' }),
    });
    
    const roomData = await createResponse.json();
    console.log('✅ Room created:', roomData);

    // Test WebSocket connection
    const socket = io(BACKEND_URL);
    
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      
      // Join the created room
      socket.emit('joinRoom', {
        roomId: roomData.room.id,
        playerId: roomData.player.id
      });
    });

    socket.on('roomState', (state) => {
      console.log('✅ Received room state:', state);
      socket.disconnect();
    });

    socket.on('error', (error) => {
      console.log('❌ Socket error:', error);
      socket.disconnect();
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBackend();