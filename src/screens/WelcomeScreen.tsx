import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  Image,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { gameService } from '../services/gameService';
import Colors from '../theme/colors';

const {width, height} = Dimensions.get('window');

// Import new assets
const backgroundImage = require('../assets/background.png');
const logoImage = require('../assets/logo.png');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGameTypeSelection, setShowGameTypeSelection] = useState(false);
  const [showRoundSelection, setShowRoundSelection] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [selectedGameType, setSelectedGameType] = useState<'photo' | 'video'>('photo');

  const handleGameTypeSelect = (gameType: 'photo' | 'video') => {
    setSelectedGameType(gameType);
    setShowGameTypeSelection(false);
    if (gameType === 'photo') {
      setShowRoundSelection(true);
    } else {
      handleCreateGame(16, 'video');
    }
  };

  const handleCreateGame = async (numRounds: number, gameType: 'photo' | 'video' = selectedGameType) => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setShowRoundSelection(false);
    setIsLoading(true);
    try {
      const result = await gameService.createRoom(playerName);
      
      if (result && result.room && result.player) {
        navigation.navigate('Room', {
          room: result.room,
          player: result.player,
          numRounds: numRounds,
          gameType: gameType,
        });
      } else {
        Alert.alert('Error', 'Failed to create room. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create room. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGamePress = () => {
    if (!playerName.trim()) {
      Alert.alert('Enter Name', 'Please enter your name first');
      return;
    }
    setShowGameTypeSelection(true);
  };

  const handleJoinGamePress = () => {
    if (!playerName.trim()) {
      Alert.alert('Enter Name', 'Please enter your name first');
      return;
    }
    setShowJoinModal(true);
  };

  const handleJoinGame = async () => {
    if (!roomCode || roomCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit room code');
      return;
    }
    
    setShowJoinModal(false);
    setIsLoading(true);
    try {
      const result = await gameService.joinRoom(roomCode.trim(), playerName);
      
      if (result && result.room && result.player) {
        navigation.navigate('Room', {
          room: result.room,
          player: result.player,
          numRounds: result.room.numRounds || 20,
          gameType: result.room.gameType || 'photo',
        });
      } else {
        Alert.alert('Error', 'Failed to join room. Please check the code and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join room. Please check your connection.');
    } finally {
      setIsLoading(false);
      setRoomCode('');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={logoImage} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Player Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              maxLength={20}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.createButton, isLoading && styles.disabledButton]}
              onPress={handleCreateGamePress}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating...' : 'Create Game'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.joinButton, isLoading && styles.disabledButton]}
              onPress={handleJoinGamePress}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Joining...' : 'Join Game'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Game Type Selection Modal - Keep emojis here */}
      <Modal
        visible={showGameTypeSelection}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGameTypeSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Game Type</Text>
            <View style={styles.gameTypeContainer}>
              <TouchableOpacity
                style={[styles.gameTypeButton, styles.photoGameType]}
                onPress={() => handleGameTypeSelect('photo')}
                activeOpacity={0.8}
              >
                <Text style={styles.gameTypeIcon}>📷</Text>
                <Text style={styles.gameTypeTitle}>Photo Roulette</Text>
                <Text style={styles.gameTypeDesc}>Pixelated photos reveal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameTypeButton, styles.videoGameType]}
                onPress={() => handleGameTypeSelect('video')}
                activeOpacity={0.8}
              >
                <Text style={styles.gameTypeIcon}>🎬</Text>
                <Text style={styles.gameTypeTitle}>Video Roulette</Text>
                <Text style={styles.gameTypeDesc}>6-second video clips</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGameTypeSelection(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Round Selection Modal */}
      <Modal
        visible={showRoundSelection}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoundSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How Many Rounds?</Text>
            <View style={styles.roundButtonsContainer}>
              {[
                { rounds: 10, label: 'Quick' },
                { rounds: 20, label: 'Short' },
                { rounds: 50, label: 'Medium' },
                { rounds: 100, label: 'Epic' },
              ].map((option, index) => {
                const colors = [Colors.cyan, Colors.blue, Colors.purple, Colors.pink];
                return (
                  <TouchableOpacity
                    key={option.rounds}
                    style={[styles.roundButton, { backgroundColor: colors[index] }]}
                    onPress={() => handleCreateGame(option.rounds)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.roundButtonNumber}>{option.rounds}</Text>
                    <Text style={styles.roundButtonLabel}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
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

      {/* Join Game Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Room Code</Text>
            <TextInput
              style={styles.codeInput}
              value={roomCode}
              onChangeText={setRoomCode}
              placeholder="000000"
              placeholderTextColor="rgba(0,0,0,0.3)"
              maxLength={6}
              keyboardType="number-pad"
              autoFocus
            />
            <View style={styles.joinModalButtons}>
              <TouchableOpacity
                style={styles.joinModalCancel}
                onPress={() => {
                  setShowJoinModal(false);
                  setRoomCode('');
                }}
              >
                <Text style={styles.joinModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinModalConfirm}
                onPress={handleJoinGame}
              >
                <Text style={styles.joinModalConfirmText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 200,
    height: 200,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: Colors.white,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButton: {
    backgroundColor: Colors.pink,
  },
  joinButton: {
    backgroundColor: Colors.blue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.darkPurple,
    borderRadius: 24,
    padding: 28,
    width: width - 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 24,
  },
  roundButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  gameTypeContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  gameTypeButton: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  photoGameType: {
    backgroundColor: Colors.pink,
  },
  videoGameType: {
    backgroundColor: Colors.purple,
  },
  gameTypeIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  gameTypeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  gameTypeDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  roundButton: {
    width: (width - 120) / 2,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  roundButtonNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
  },
  roundButtonLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: 24,
  },
  joinModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  joinModalCancel: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinModalCancelText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  joinModalConfirm: {
    flex: 1,
    backgroundColor: Colors.cyan,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinModalConfirmText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700',
  },
});
