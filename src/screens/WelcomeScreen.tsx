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

const {width, height} = Dimensions.get('window');

// Import assets
const backgroundImage = require('../assets/friends2.jpg');
const logoImage = require('../assets/Pic_Roulette_logo.png');

interface WelcomeScreenProps {
  navigation: any;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRoundSelection, setShowRoundSelection] = useState(false);
  const [showStorePopup, setShowStorePopup] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const handleCreateGame = async (numRounds: number) => {
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
      Alert.alert('Oops!', 'Please enter your name first');
      return;
    }
    setShowRoundSelection(true);
  };

  const handleJoinGamePress = () => {
    if (!playerName.trim()) {
      Alert.alert('Oops!', 'Please enter your name first');
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
          numRounds: 20,
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
      
      {/* Blurred Background Image */}
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        blurRadius={8}
      >
        {/* Dark overlay for better readability */}
        <View style={styles.overlay} />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={logoImage} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Pic Roulette</Text>
            <Text style={styles.subtitle}>Guess whose photo it is!</Text>
          </View>

          {/* Player Name Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Your nickname"
                placeholderTextColor="rgba(255,255,255,0.5)"
                maxLength={20}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.createButton, isLoading && styles.disabledButton]}
              onPress={handleCreateGamePress}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonIcon}>🎮</Text>
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
              <Text style={styles.buttonIcon}>🔗</Text>
              <Text style={styles.buttonText}>
                {isLoading ? 'Joining...' : 'Join Game'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Store Icon */}
          <TouchableOpacity 
            style={styles.storeButton} 
            onPress={() => setShowStorePopup(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.storeButtonIcon}>🛒</Text>
            <Text style={styles.storeButtonText}>Store</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Round Selection Modal */}
      <Modal
        visible={showRoundSelection}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoundSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🎯</Text>
            <Text style={styles.modalTitle}>How Many Rounds?</Text>
            <View style={styles.roundButtonsContainer}>
              {[
                { rounds: 10, label: 'Quick', color: '#4CAF50' },
                { rounds: 20, label: 'Short', color: '#2196F3' },
                { rounds: 50, label: 'Medium', color: '#FF9800' },
                { rounds: 100, label: 'Epic', color: '#E91E63' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.rounds}
                  style={[styles.roundButton, { backgroundColor: option.color }]}
                  onPress={() => handleCreateGame(option.rounds)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roundButtonNumber}>{option.rounds}</Text>
                  <Text style={styles.roundButtonLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
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
            <Text style={styles.modalEmoji}>🔑</Text>
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

      {/* Store Popup Modal */}
      <Modal
        visible={showStorePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStorePopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.storeModalContent}>
            <Text style={styles.storeModalIcon}>🛍️</Text>
            <Text style={styles.storeModalTitle}>Store</Text>
            <Text style={styles.storeModalMessage}>
              New features and customizations coming soon!
            </Text>
            <TouchableOpacity
              style={styles.storeModalButton}
              onPress={() => setShowStorePopup(false)}
            >
              <Text style={styles.storeModalButtonText}>Got it!</Text>
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
  },
  backgroundImage: {
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
  },
  inputIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
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
    backgroundColor: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  storeButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  storeButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  storeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: width - 48,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  roundButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
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
    color: 'white',
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
    color: '#999',
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinModalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  joinModalConfirm: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinModalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
  },
  storeModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: width - 64,
    alignItems: 'center',
  },
  storeModalIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  storeModalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  storeModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  storeModalButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 25,
  },
  storeModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
