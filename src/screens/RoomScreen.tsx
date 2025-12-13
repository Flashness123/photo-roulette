import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';
import { GameRoom, Player, GameType } from '../types/game';
import Colors from '../theme/colors';

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

  const handleStartGame = () => {
    if (!myPhotos || myPhotos.length < requiredPhotos) {
      Alert.alert('Select Media First', `Please choose your ${requiredPhotos} ${mediaLabel} before starting.`);
      return;
    }

    const allMedia = myPhotos.map((uri) => ({
      photoUri: uri,
      ownerId: currentPlayer.id,
      ownerName: currentPlayer.name,
    }));

    const shuffled = allMedia.sort(() => Math.random() - 0.5).slice(0, numRounds);

    if (isVideoMode) {
      navigation.navigate('VideoGame', {
        room,
        player: currentPlayer,
        allPhotos: shuffled,
        numRounds,
        gameType,
      });
    } else {
      navigation.navigate('Game', {
        room,
        player: currentPlayer,
        allPhotos: shuffled,
        numRounds,
        gameType,
        mosaicEnabled,
      });
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
          
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>Room Code</Text>
            <Text style={styles.roomCodeText}>{room.code}</Text>
          </View>
          
          <View style={styles.headerSpacer} />
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
          {/* Choose Pictures Button */}
          <TouchableOpacity
            style={styles.choosePicturesButton}
            onPress={handleChoosePictures}
            activeOpacity={0.8}
          >
            <Text style={styles.choosePicturesText}>
              {photosSelected ? 'Change Selection' : 'Choose Pictures'}
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
            
            {/* Blur Toggle - Small */}
            {!isVideoMode && (
              <TouchableOpacity
                style={[styles.blurToggle, mosaicEnabled && styles.blurToggleActive]}
                onPress={() => setMosaicEnabled(!mosaicEnabled)}
              >
                <Text style={styles.blurToggleText}>Blur</Text>
              </TouchableOpacity>
            )}
          </View>
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
  },
  roomCodeLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  roomCodeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 6,
  },
  headerSpacer: {
    width: 44,
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
  blurToggle: {
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurToggleActive: {
    backgroundColor: Colors.purple,
  },
  blurToggleText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
