import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { GameRoom, Player } from '../types/game';
import { gameService } from '../services/gameService';
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
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>Room data is missing</Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#E91E63', padding: 15, borderRadius: 8, minWidth: 120 }}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const { room: initialRoom, player: currentPlayer } = params;
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [refreshing, setRefreshing] = useState(false);

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
        // Transform snake_case to camelCase
        const transformedRoom = {
          ...data.room,
          players: data.room.players.map((p: any) => ({
            ...p,
            isHost: p.is_host,
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
      'Exit Room',
      'Are you sure you want to leave the room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to remove player from room
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
    navigation.navigate('PhotoSelection', { room, player: currentPlayer });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Room {room.code}</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExitRoom}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Room Code Display */}
      <View style={styles.roomCodeContainer}>
        <Text style={styles.roomCodeLabel}>Room Code</Text>
        <Text style={styles.roomCodeText}>{room.code}</Text>
        <Text style={styles.roomCodeSubtext}>Share this code with friends</Text>
      </View>

      {/* Players List */}
      <View style={styles.playersContainer}>
        <Text style={styles.playersTitle}>
          Players ({room.players.length}/8)
        </Text>
        <ScrollView
          style={styles.playersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshRoom} />
          }
        >
          {room.players.map((player) => (
            <View key={player.id} style={styles.playerItem}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.isHost && (
                  <Text style={styles.hostBadge}>HOST</Text>
                )}
              </View>
              <Text style={styles.playerScore}>Score: {player.score}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.choosePicturesButton}
          onPress={handleChoosePictures}
        >
          <Text style={styles.choosePicturesButtonText}>Choose Pictures</Text>
        </TouchableOpacity>

        {currentPlayer.isHost && (
          <TouchableOpacity
            style={[
              styles.startGameButton,
              room.players.length < 2 && styles.startGameButtonDisabled,
            ]}
            disabled={room.players.length < 2}
            onPress={() => {
              Alert.alert('Coming Soon', 'Game start feature will be available soon!');
            }}
          >
            <Text style={styles.startGameButtonText}>
              {room.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  exitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  roomCodeContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roomCodeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  roomCodeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E91E63',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  roomCodeSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  playersContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playersList: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  hostBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E91E63',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  playerScore: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  choosePicturesButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  choosePicturesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startGameButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startGameButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startGameButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});