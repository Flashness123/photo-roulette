import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { gameService } from '../services/gameService';
const {width, height} = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Creating game for player:', playerName);
      const result = await gameService.createRoom(playerName);
      
      if (result && result.room && result.player) {
        console.log('Room created successfully:', result);
        console.log('Navigating with room:', result.room.code, 'player:', result.player.name);
        // Navigate to Room screen with a small delay to ensure navigation is ready
        setTimeout(() => {
          try {
            console.log('About to navigate to Room with:', { room: result.room, player: result.player });
            navigation.navigate('Room', {
              room: result.room,
              player: result.player,
            });
          } catch (navError) {
            console.error('Navigation error:', navError);
            Alert.alert('Error', 'Failed to navigate to room: ' + String(navError));
          }
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to create room. Please try again.');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      Alert.alert('Error', 'Failed to create room. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit room code');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Joining game:', roomCode, 'as player:', playerName);
      const result = await gameService.joinRoom(roomCode, playerName);
      
      if (result && result.room && result.player) {
        console.log('Joined room successfully:', result);
        console.log('Navigating with room:', result.room.code, 'player:', result.player.name);
        // Navigate to Room screen with a small delay
        setTimeout(() => {
          try {
            console.log('About to navigate to Room with:', { room: result.room, player: result.player });
            navigation.navigate('Room', {
              room: result.room,
              player: result.player,
            });
          } catch (navError) {
            console.error('Navigation error:', navError);
            Alert.alert('Error', 'Failed to navigate to room: ' + String(navError));
          }
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to join room. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      Alert.alert('Error', 'Failed to join room. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundOverlay} />
      
      {/* Logo/Title */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>📸</Text>
        </View>
        <Text style={styles.title}>Photo</Text>
        <Text style={styles.title}>Roulette</Text>
      </View>

      {/* Player Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Player Name</Text>
        <TextInput
          style={styles.input}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Enter your name"
          placeholderTextColor="#FFB6C1"
          maxLength={20}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.createButton, isLoading && styles.disabledButton]}
          onPress={handleCreateGame}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating...' : 'Create game'}
          </Text>
        </TouchableOpacity>

        {/* Join Game Section */}
        <View style={styles.joinSection}>
          <TextInput
            style={styles.codeInput}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="6-digit code"
            placeholderTextColor="#FFB6C1"
            maxLength={6}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.button, styles.joinButton, isLoading && styles.disabledButton]}
            onPress={handleJoinGame}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Joining...' : 'Join game'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Icons */}
      <View style={styles.bottomIcons}>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={styles.iconText}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 45,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 4,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    color: 'white',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  joinButton: {
    backgroundColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  joinSection: {
    gap: 15,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    letterSpacing: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomIcons: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 40,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconText: {
    fontSize: 24,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

