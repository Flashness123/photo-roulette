import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  StatusBar,
  Dimensions,
  Switch,
  Share,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import io, { Socket } from 'socket.io-client';
import { GameRoom, Player, GameType } from '../types/game';
import Colors from '../theme/colors';
import { adService } from '../services/AdService';

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/background.png');

// Player spawn positions - scattered pattern
const PLAYER_POSITIONS = [
  { top: '10%', left: '20%' },
  { top: '5%', left: '55%' },
  { top: '25%', left: '10%' },
  { top: '20%', left: '70%' },
  { top: '45%', left: '25%' },
  { top: '40%', left: '60%' },
  { top: '60%', left: '15%' },
  { top: '55%', left: '75%' },
];

interface RoomScreenProps {
  route: any;
  navigation: any;
}

export const RoomScreen: React.FC<RoomScreenProps> = ({ route, navigation }) => {
  const params = route?.params;
  const socketRef = useRef<Socket | null>(null);
  
  if (!params || !params.room || !params.player) {
    return (
      <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.overlay} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Room data is missing</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.navigate('Welcome')}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }
  
  const { room: initialRoom, player: currentPlayer, selectedPhotos: initialPhotos, numRounds: initialNumRounds, gameType: initialGameType } = params;
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [myPhotos, setMyPhotos] = useState<string[]>(initialPhotos || []);
  const [numRounds, setNumRounds] = useState(initialNumRounds || 20);
  const [gameType, setGameType] = useState<GameType>(initialGameType || 'photo');
  const [mosaicEnabled, setMosaicEnabled] = useState(true);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  
  const isVideoMode = gameType === 'video';
  const mediaLabel = isVideoMode ? 'videos' : 'photos';
  
  const getRequiredPhotos = (rounds: number): number => {
    if (rounds >= 100) return 36;
    if (rounds >= 50) return 25;
    return 16;
  };
  
  const requiredPhotos = getRequiredPhotos(numRounds);

  useEffect(() => {
    if (params.selectedPhotos) {
      setMyPhotos(params.selectedPhotos);
    }
  }, [params.selectedPhotos]);

  // Use ref for photos so socket callback always has current value
  const myPhotosRef = useRef<string[]>(initialPhotos || []);
  
  useEffect(() => {
    myPhotosRef.current = myPhotos;
  }, [myPhotos]);

  // Setup Socket.IO connection for real-time game start
  useEffect(() => {
    const socket = io('https://photo-roulette-production-b12d.up.railway.app', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join the room on socket
      socket.emit('joinRoom', {
        roomId: room.id,
        playerId: currentPlayer.id,
      });
      console.log('Emitted joinRoom for', room.id, currentPlayer.id);
    });

    // Listen for game start event - this is emitted by host
    socket.on('gameStarted', async (data: any) => {
      console.log('Game started event received:', data);
      
      // Use photos from server (already shuffled, same for all players)
      const serverPhotos = data.photos;
      
      if (!serverPhotos || serverPhotos.length === 0) {
        Alert.alert('Error', 'No photos available. All players need to upload photos first.');
        return;
      }
      
      console.log('Received shared photos from server:', serverPhotos.length);
      
      // Transform photos to game format (already shuffled by server)
      const gamePhotos = serverPhotos.map((photo: any) => ({
        photoUri: photo.url,
        ownerId: photo.ownerId,
        ownerName: photo.ownerName || 'Unknown',
      })).slice(0, numRounds);
      
      if (gameType === 'video') {
        navigation.replace('VideoGame', {
          room,
          player: currentPlayer,
          allPhotos: gamePhotos,
          numRounds,
          gameType,
        });
      } else {
        navigation.replace('Game', {
          room,
          player: currentPlayer,
          allPhotos: gamePhotos,
          numRounds,
          gameType,
          mosaicEnabled,
        });
      }
    });

    socket.on('playerLeft', (data: any) => {
      console.log('Player left event received:', data);
      // Immediately fetch updated room data
      fetchRoomData();
    });

    socket.on('playerJoined', (data: any) => {
      console.log('Player joined:', data);
      fetchRoomData();
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      console.log('Cleanup: disconnecting socket');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room.id, currentPlayer.id, numRounds, gameType, mosaicEnabled, navigation, room, currentPlayer]);

  // Regular polling to update room data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRoomData();
    }, 3000);
    return () => clearInterval(interval);
  }, [room.id]);

  const fetchRoomData = async () => {
    try {
      const response = await fetch(
        `https://photo-roulette-production-b12d.up.railway.app/api/rooms/${room.id}`
      );
      const data = await response.json();
      if (data.room) {
        const transformedRoom = {
          ...data.room,
          players: data.room.players.map((p: any) => ({
            ...p,
            isHost: p.is_host,
            photosLocked: p.photos_locked,
          })),
        };
        setRoom(transformedRoom);
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const handleExitRoom = async () => {
    Alert.alert(
      'Exit Room',
      'Are you sure you want to leave?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              // Disconnect socket first
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
              
              // Call API to remove from database
              await fetch(
                `https://photo-roulette-production-b12d.up.railway.app/api/rooms/${room.id}/leave`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ playerId: currentPlayer.id }),
                }
              );
            } catch (error) {
              console.error('Error leaving room:', error);
            }
            navigation.navigate('Welcome');
          },
        },
      ]
    );
  };

  const handleChoosePictures = () => {
    if (isVideoMode) {
      navigation.navigate('VideoSelection', { room, player: currentPlayer, numRounds, requiredPhotos, gameType });
    } else {
      navigation.navigate('PhotoSelection', { room, player: currentPlayer, numRounds, requiredPhotos, gameType });
    }
  };

  const handleStartGame = async () => {
    if (!myPhotos || myPhotos.length < requiredPhotos) {
      Alert.alert('Select Media First', `Please choose your ${requiredPhotos} ${mediaLabel} before starting.`);
      return;
    }

    // Emit socket event to notify all players
    // The gameStarted event handler will handle navigation for all players (including host)
    if (socketRef.current) {
      console.log('Start game - emitting startGame event');
      socketRef.current.emit('startGame', {
        roomId: room.id,
        playerId: currentPlayer.id,
      });
      console.log('Start game event emitted');
      // Navigation will be handled by the gameStarted event listener
    } else {
      console.warn('Socket not connected, cannot start multiplayer game');
      Alert.alert('Connection Error', 'Not connected to server. Please wait and try again.');
    }
  };

  const photosSelected = myPhotos && myPhotos.length >= requiredPhotos;
  const canStart = room.players.length >= 1 && photosSelected;

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        {/* Header with Exit and Room Code */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitRoom}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.roomCodeContainer}
            onPress={() => {
              Clipboard.setString(room.code);
              Alert.alert('Copied!', 'Room code copied to clipboard');
            }}
            onLongPress={() => {
              Share.share({
                message: `Join my Photo Roulette game! Room code: ${room.code}`,
                title: 'Photo Roulette',
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.roomCodeLabel}>Room Code (tap to copy)</Text>
            <View style={styles.roomCodeRow}>
              <Text style={styles.roomCodeText}>{room.code}</Text>
              <Text style={styles.shareIcon}>📋</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={() => {
              Share.share({
                message: `Join my Photo Roulette game! Room code: ${room.code}`,
                title: 'Photo Roulette',
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.shareButtonText}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Players Area - Spawn Pattern */}
        <View style={styles.playersArea}>
          {room.players.map((player, index) => {
            const position = PLAYER_POSITIONS[index % PLAYER_POSITIONS.length];
            const colors = [Colors.pink, Colors.purple, Colors.blue, Colors.cyan, Colors.darkPurple];
            const bgColor = colors[index % colors.length];
            
            return (
              <View
                key={player.id}
                style={[
                  styles.playerBubble,
                  { 
                    top: position.top as any, 
                    left: position.left as any,
                    backgroundColor: bgColor,
                  },
                ]}
              >
                <Text style={styles.playerInitial}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.name}
                </Text>
                {player.isHost && (
                  <View style={styles.hostIndicator}>
                    <Text style={styles.hostText}>HOST</Text>
                  </View>
                )}
                {player.photosLocked && (
                  <View style={styles.readyIndicator} />
                )}
              </View>
            );
          })}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomContainer}>
          {/* Choose Pictures/Videos Button */}
          <TouchableOpacity
            style={styles.choosePicturesButton}
            onPress={handleChoosePictures}
            activeOpacity={0.8}
          >
            <Text style={styles.choosePicturesText}>
              {photosSelected ? 'Change Selection' : isVideoMode ? 'Choose Videos' : 'Choose Pictures'}
            </Text>
          </TouchableOpacity>

          {/* Start Game Row */}
          <View style={styles.startRow}>
            <TouchableOpacity
              style={[styles.startButton, !canStart && styles.buttonDisabled]}
              disabled={!canStart || !currentPlayer.isHost}
              onPress={handleStartGame}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                {currentPlayer.isHost ? 'Start Game' : 'Waiting for Host...'}
              </Text>
            </TouchableOpacity>
            
          </View>
          
          {/* Blur Toggle Slider */}
          {!isVideoMode && (
            <View style={styles.blurToggleContainer}>
              <View style={styles.blurToggleLabelRow}>
                <Text style={styles.blurToggleLabel}>Blurry Pictures</Text>
                <Text style={styles.adBadgeSmall}>🎬</Text>
              </View>
              {isLoadingAd ? (
                <ActivityIndicator color={Colors.pink} size="small" />
              ) : (
                <Switch
                  value={mosaicEnabled}
                  onValueChange={async (value) => {
                    if (value && !mosaicEnabled) {
                      // Show ad when enabling blur
                      setIsLoadingAd(true);
                      try {
                        await adService.showRewardedAd();
                      } catch (error) {
                        console.log('Ad error:', error);
                      }
                      setIsLoadingAd(false);
                    }
                    setMosaicEnabled(value);
                  }}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: Colors.purple }}
                  thumbColor={mosaicEnabled ? Colors.pink : Colors.white}
                  ios_backgroundColor="rgba(255, 255, 255, 0.3)"
                />
              )}
            </View>
          )}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
  },
  
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: Colors.pink,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  roomCodeContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roomCodeLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCodeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 4,
  },
  shareIcon: {
    fontSize: 16,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: Colors.white,
    fontSize: 18,
  },
  
  // Players Area
  playersArea: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 20,
  },
  playerBubble: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playerInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  playerName: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 70,
    textAlign: 'center',
  },
  hostIndicator: {
    position: 'absolute',
    top: -8,
    backgroundColor: Colors.cyan,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hostText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.white,
  },
  readyIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  
  // Bottom Actions
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  choosePicturesButton: {
    backgroundColor: Colors.blue,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  choosePicturesText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  startRow: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: Colors.pink,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },
  blurToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  blurToggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blurToggleLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  adBadgeSmall: {
    fontSize: 12,
  },
});
