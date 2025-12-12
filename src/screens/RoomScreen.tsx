import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ImageBackground,
  StatusBar,
  Dimensions,
} from 'react-native';
import { GameRoom, Player } from '../types/game';
import { gameService } from '../services/gameService';

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/friends2.jpg');

interface RoomScreenProps {
  route: any;
  navigation: any;
}

export const RoomScreen: React.FC<RoomScreenProps> = ({ route, navigation }) => {
  console.log('RoomScreen route params:', route?.params);
  
  // Safe parameter extraction
  const params = route?.params;
  if (!params || !params.room || !params.player) {
    console.error('Missing room parameters:', params);
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        blurRadius={8}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.overlay} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Room data is missing</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={styles.errorButtonText}>🏠  Go Back</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }
  
  const { room: initialRoom, player: currentPlayer, selectedPhotos: initialPhotos, numRounds: initialNumRounds } = params;
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [refreshing, setRefreshing] = useState(false);
  const [myPhotos, setMyPhotos] = useState<string[]>(initialPhotos || []);
  const [numRounds, setNumRounds] = useState(initialNumRounds || 20);
  
  // Calculate required photos based on number of rounds
  const getRequiredPhotos = (rounds: number): number => {
    if (rounds >= 100) return 36;
    if (rounds >= 50) return 25;
    return 16;
  };
  
  const requiredPhotos = getRequiredPhotos(numRounds);

  // Update photos when coming back from photo selection
  useEffect(() => {
    if (params.selectedPhotos) {
      setMyPhotos(params.selectedPhotos);
    }
  }, [params.selectedPhotos]);

  // Auto-refresh player list every 3 seconds
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

  const refreshRoom = async () => {
    setRefreshing(true);
    await fetchRoomData();
    setRefreshing(false);
  };

  const handleExitRoom = async () => {
    Alert.alert(
      '👋 Exit Room',
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
    navigation.navigate('PhotoSelection', { room, player: currentPlayer, numRounds, requiredPhotos });
  };

  const handleAddFakePlayer = async () => {
    try {
      const response = await fetch(
        `https://photo-roulette-production-b12d.up.railway.app/debug/add-fake-player`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            roomId: room.id,
            playerName: `Bot ${Math.floor(Math.random() * 1000)}`
          }),
        }
      );

      if (response.ok) {
        await fetchRoomData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.hint || 'Failed to add fake player');
      }
    } catch (error) {
      console.error('Error adding fake player:', error);
      Alert.alert('Error', 'Failed to add fake player');
    }
  };

  const handleStartGame = () => {
    if (!myPhotos || myPhotos.length < requiredPhotos) {
      Alert.alert('📸 Select Photos First', `Please choose your ${requiredPhotos} photos before starting the game.`);
      return;
    }

    const allPhotos = myPhotos.map((uri, index) => ({
      photoUri: uri,
      ownerId: currentPlayer.id,
      ownerName: currentPlayer.name,
    }));

    const shuffled = allPhotos.sort(() => Math.random() - 0.5).slice(0, numRounds);

    navigation.navigate('Game', {
      room,
      player: currentPlayer,
      allPhotos: shuffled,
      numRounds,
    });
  };

  const photosSelected = myPhotos && myPhotos.length >= requiredPhotos;
  const canStart = room.players.length >= 2 && photosSelected;

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      blurRadius={8}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Game Room</Text>
            <Text style={styles.headerTitle}>Pic Roulette</Text>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={handleExitRoom}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Room Code Card */}
        <View style={styles.roomCodeCard}>
          <View style={styles.roomCodeInner}>
            <Text style={styles.roomCodeLabel}>📍 ROOM CODE</Text>
            <Text style={styles.roomCodeText}>{room.code}</Text>
            <Text style={styles.roomCodeSubtext}>Share this code with friends to join!</Text>
          </View>
          <View style={styles.roundsBadge}>
            <Text style={styles.roundsBadgeText}>{numRounds} rounds</Text>
          </View>
        </View>

        {/* Players Section */}
        <View style={styles.playersCard}>
          <View style={styles.playersHeader}>
            <Text style={styles.playersTitle}>👥 Players</Text>
            <View style={styles.playerCountBadge}>
              <Text style={styles.playerCountText}>{room.players.length}/8</Text>
            </View>
          </View>
          
          <ScrollView
            style={styles.playersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={refreshRoom}
                tintColor="#fff"
                colors={['#E91E63']}
              />
            }
          >
            {room.players.map((player, index) => (
              <View key={player.id} style={[
                styles.playerItem,
                index === room.players.length - 1 && styles.playerItemLast
              ]}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {player.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {player.isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>👑 HOST</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerStatus}>
                    {player.photosLocked ? '✅ Ready' : '⏳ Selecting photos...'}
                  </Text>
                </View>
                <Text style={styles.playerScore}>{player.score} pts</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Photo Status */}
          <View style={styles.photoStatus}>
            <Text style={styles.photoStatusIcon}>{photosSelected ? '✅' : '📸'}</Text>
            <Text style={styles.photoStatusText}>
              {photosSelected 
                ? `${myPhotos.length} photos selected` 
                : `Select ${requiredPhotos} photos to play`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.choosePicturesButton]}
            onPress={handleChoosePictures}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>
              {photosSelected ? '🔄  Change Pictures' : '📷  Choose Pictures'}
            </Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.actionButton, styles.debugButton]}
              onPress={handleAddFakePlayer}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>🤖  Add Bot (Debug)</Text>
            </TouchableOpacity>
          )}

          {currentPlayer.isHost && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.startGameButton,
                !canStart && styles.buttonDisabled,
              ]}
              disabled={!canStart}
              onPress={handleStartGame}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                {room.players.length < 2 
                  ? '⏳  Waiting for players...' 
                  : !photosSelected
                    ? `📸  Select ${requiredPhotos} photos first`
                    : `🚀  Start Game (${numRounds} rounds)`}
              </Text>
            </TouchableOpacity>
          )}

          {!currentPlayer.isHost && (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingIcon}>⏳</Text>
              <Text style={styles.waitingText}>Waiting for host to start...</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Room Code Card
  roomCodeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  roomCodeInner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  roomCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    letterSpacing: 2,
  },
  roomCodeText: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 12,
    fontFamily: 'monospace',
    textShadowColor: 'rgba(233, 30, 99, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  roomCodeSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  roundsBadge: {
    backgroundColor: 'rgba(233, 30, 99, 0.9)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  roundsBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Players Card
  playersCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playerCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerItemLast: {
    borderBottomWidth: 0,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  hostBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  hostBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD54F',
  },
  playerStatus: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  
  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 10,
  },
  photoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 4,
  },
  photoStatusIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  photoStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  choosePicturesButton: {
    backgroundColor: '#2196F3',
  },
  debugButton: {
    backgroundColor: '#FF9800',
  },
  startGameButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 22,
    marginTop: 4,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  waitingIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  waitingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
