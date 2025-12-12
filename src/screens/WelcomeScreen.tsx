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
  Modal,
} from 'react-native';
import { gameService } from '../services/gameService';
const {width, height} = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRoundSelection, setShowRoundSelection] = useState(false);
  const [showStorePopup, setShowStorePopup] = useState(false);

  const handleCreateGame = async (numRounds: number) => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setShowRoundSelection(false);
    setIsLoading(true);
    try {
      console.log('Creating game for player:', playerName, 'with', numRounds, 'rounds');
      const result = await gameService.createRoom(playerName);
      
      if (result && result.room && result.player) {
        console.log('Room created successfully:', result);
        navigation.navigate('Room', {
          room: result.room,
          player: result.player,
          numRounds: numRounds,
        });
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

  const handleCreateGamePress = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setShowRoundSelection(true);
  };

  const handleJoinGamePress = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    // Show prompt to enter room code
    Alert.prompt(
      'Join Game',
      'Enter the 6-digit room code',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Join',
          onPress: async (roomCode) => {
            if (!roomCode || roomCode.trim().length !== 6) {
              Alert.alert('Error', 'Please enter a valid 6-digit room code');
              return;
            }
            await handleJoinGame(roomCode.trim());
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  const handleJoinGame = async (roomCode: string) => {
    setIsLoading(true);
    try {
      console.log('Joining game:', roomCode, 'as player:', playerName);
      const result = await gameService.joinRoom(roomCode, playerName);
      
      if (result && result.room && result.player) {
        console.log('Joined room successfully:', result);
        // When joining, use default 20 rounds (host determines actual rounds)
        navigation.navigate('Room', {
          room: result.room,
          player: result.player,
          numRounds: 20,
        });
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
          onPress={handleCreateGamePress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Creating...' : 'Create Game'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.joinButton, isLoading && styles.disabledButton]}
          onPress={handleJoinGamePress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Joining...' : 'Join Game'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Icons - Only Store */}
      <View style={styles.bottomIcons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowStorePopup(true)}>
          <Text style={styles.iconText}>🛒</Text>
        </TouchableOpacity>
      </View>

      {/* Round Selection Modal */}
      <Modal
        visible={showRoundSelection}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoundSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Number of Rounds</Text>
            <View style={styles.roundButtonsContainer}>
              <TouchableOpacity 
                style={styles.roundButton} 
                onPress={() => handleCreateGame(10)}
              >
                <Text style={styles.roundButtonText}>10</Text>
                <Text style={styles.roundButtonSubtext}>Quick</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.roundButton} 
                onPress={() => handleCreateGame(20)}
              >
                <Text style={styles.roundButtonText}>20</Text>
                <Text style={styles.roundButtonSubtext}>Short</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.roundButton} 
                onPress={() => handleCreateGame(50)}
              >
                <Text style={styles.roundButtonText}>50</Text>
                <Text style={styles.roundButtonSubtext}>Medium</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.roundButton} 
                onPress={() => handleCreateGame(100)}
              >
                <Text style={styles.roundButtonText}>100</Text>
                <Text style={styles.roundButtonSubtext}>Long</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowRoundSelection(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Store Popup Modal */}
      <Modal
        visible={showStorePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStorePopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.storeModalContent}>
            <Text style={styles.storeIcon}>🛒</Text>
            <Text style={styles.storeTitle}>Store</Text>
            <Text style={styles.storeMessage}>
              Option to purchase new features coming soon!
            </Text>
            <TouchableOpacity 
              style={styles.storeOkButton}
              onPress={() => setShowStorePopup(false)}
            >
              <Text style={styles.storeOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: width - 60,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  roundButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  roundButton: {
    width: (width - 120) / 2,
    paddingVertical: 20,
    backgroundColor: '#E91E63',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  roundButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  roundButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  storeModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    width: width - 80,
    alignItems: 'center',
  },
  storeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  storeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  storeMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  storeOkButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 25,
  },
  storeOkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

