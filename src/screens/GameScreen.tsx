import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { WebView } from 'react-native-webview';
import RNFS from 'react-native-fs';
import { GameRoom, Player } from '../types/game';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mosaic Pixelated Photo Component
// Uses WebView canvas for TRUE mosaic pixelation (uniform color blocks)
interface PixelatedPhotoProps {
  uri: string;
  pixelLevel: number; // 0-4: 0=clear, 4=most pixelated
  size: number;
}

const PixelatedPhoto: React.FC<PixelatedPhotoProps> = ({ uri, pixelLevel, size }) => {
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showClearImage, setShowClearImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load image as base64 for WebView
  useEffect(() => {
    let cancelled = false;
    
    const loadImage = async () => {
      try {
        console.log('PixelatedPhoto loading URI:', uri);
        
        // For content:// URIs, read directly (RNFS supports this on Android)
        // For file:// URIs, strip the prefix
        let readPath = uri;
        if (uri.startsWith('file://')) {
          readPath = uri.replace('file://', '');
        }
        
        // Read the file as base64
        const base64 = await RNFS.readFile(readPath, 'base64');
        console.log('Base64 loaded, length:', base64.length);
        
        if (!cancelled) {
          setBase64Image(base64);
          setError(null);
        }
      } catch (err: any) {
        console.error('Failed to load image as base64:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load image');
        }
      }
    };
    
    loadImage();
    return () => { cancelled = true; };
  }, [uri]);

  // Map pixelLevel to block size (3 phases: 4 → 2 → 1)
  const getBlockSize = (level: number): number => {
    if (level >= 4) return 4;
    if (level >= 2) return 2;
    return 1;
  };

  // Send new blockSize to WebView when pixelLevel changes
  useEffect(() => {
    if (pixelLevel === 0) {
      // Smoothly transition to clear image
      setShowClearImage(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setShowClearImage(false);
      fadeAnim.setValue(0);
      // Send updated blockSize to WebView
      if (webViewRef.current && base64Image) {
        const blockSize = getBlockSize(pixelLevel);
        webViewRef.current.injectJavaScript(`
          window.updateBlockSize(${blockSize});
          true;
        `);
      }
    }
  }, [pixelLevel, base64Image]);

  const blockSize = getBlockSize(pixelLevel);

  // Show loading or error state
  if (!base64Image) {
    return (
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: 12, 
        overflow: 'hidden', 
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{ color: '#888', fontSize: 16 }}>
          {error ? `Error: ${error}` : 'Loading...'}
        </Text>
      </View>
    );
  }

  // HTML for true mosaic pixelation using canvas
  // Now supports dynamic blockSize updates without remounting
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=${size}, height=${size}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          width: ${size}px;
          height: ${size}px;
          overflow: hidden;
          background: #1a1a2e;
        }
        body { 
          display: flex; 
          justify-content: center; 
          align-items: center;
        }
        canvas { 
          display: block;
          width: ${size}px;
          height: ${size}px;
        }
      </style>
    </head>
    <body>
      <canvas id="canvas" width="${size}" height="${size}"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let currentBlockSize = ${blockSize};
        const size = ${size};
        let cachedImageData = null;
        
        function drawMosaic(blockSize) {
          if (!cachedImageData) return;
          
          const data = cachedImageData.data;
          
          // Clear main canvas
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, size, size);
          
          // Draw mosaic blocks
          for (let y = 0; y < size; y += blockSize) {
            for (let x = 0; x < size; x += blockSize) {
              // Sample color from center of block
              const sampleX = Math.min(x + Math.floor(blockSize / 2), size - 1);
              const sampleY = Math.min(y + Math.floor(blockSize / 2), size - 1);
              const idx = (sampleY * size + sampleX) * 4;
              
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              
              // Draw solid color block
              ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
              ctx.fillRect(x, y, blockSize, blockSize);
            }
          }
        }
        
        window.updateBlockSize = function(newBlockSize) {
          currentBlockSize = newBlockSize;
          drawMosaic(currentBlockSize);
        };
        
        window.renderMosaic = function(base64Data) {
          const img = new Image();
          img.onload = function() {
            // First draw the image scaled to fit (cover)
            const scale = Math.max(size / img.width, size / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = (size - scaledWidth) / 2;
            const offsetY = (size - scaledHeight) / 2;
            
            // Draw to a temporary canvas first
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            
            // Cache image data for reuse
            cachedImageData = tempCtx.getImageData(0, 0, size, size);
            
            // Draw initial mosaic
            drawMosaic(currentBlockSize);
            
            // Signal that we're done
            window.ReactNativeWebView.postMessage('loaded');
          };
          img.onerror = function(e) {
            window.ReactNativeWebView.postMessage('error: ' + e);
          };
          img.src = 'data:image/jpeg;base64,' + base64Data;
        };
        
        // Signal ready to receive data
        window.ReactNativeWebView.postMessage('ready');
      </script>
    </body>
    </html>
  `;

  // JavaScript to inject the base64 data after WebView is ready
  const injectedJS = `
    window.renderMosaic('${base64Image}');
    true;
  `;

  return (
    <View style={{ 
      width: size, 
      height: size, 
      borderRadius: 12, 
      overflow: 'hidden',
      backgroundColor: '#1a1a2e',
    }}>
      {/* Mosaic WebView - always rendered to avoid blinking */}
      <WebView
        ref={webViewRef}
        source={{ html }}
        injectedJavaScript={injectedJS}
        style={{ 
          width: size, 
          height: size,
          backgroundColor: 'transparent',
          opacity: imageLoaded ? 1 : 0,
        }}
        scrollEnabled={false}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={(event) => {
          const msg = event.nativeEvent.data;
          if (msg === 'loaded') {
            setImageLoaded(true);
          } else if (msg.startsWith('error')) {
            console.error('WebView error:', msg);
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
      />
      
      {/* Clear image overlay - fades in when pixelLevel reaches 0 */}
      {showClearImage && (
        <Animated.View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: fadeAnim,
        }}>
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        </Animated.View>
      )}
      
      {!imageLoaded && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1a1a2e',
        }}>
          <Text style={{ color: '#888', fontSize: 16 }}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

interface GameScreenProps {
  route: any;
  navigation: any;
}

interface PhotoRound {
  photoUri: string;
  ownerId: string;
  ownerName: string;
}

interface GuessResult {
  playerId: string;
  playerName: string;
  guessedPlayerId: string;
  isCorrect: boolean;
  timeMs: number;
  points: number;
}

const { width, height } = Dimensions.get('window');
const PHOTO_SIZE = width - 40;
const ROUND_DURATION = 6000; // 6 seconds in ms

export const GameScreen: React.FC<GameScreenProps> = ({ route, navigation }) => {
  const { room, player, allPhotos, mosaicEnabled = true } = route.params;
  
  const [currentRound, setCurrentRound] = useState(0);
  const [pixelLevel, setPixelLevel] = useState(mosaicEnabled ? 4 : 0); // 3 phases: 4=most pixelated, 2=medium, 0=clear
  const [roundStartTime, setRoundStartTime] = useState(Date.now());
  const [hasGuessed, setHasGuessed] = useState(false);
  const [guessedPlayerId, setGuessedPlayerId] = useState<string | null>(null); // Track which player was guessed
  const [showResults, setShowResults] = useState(false);
  const [roundResults, setRoundResults] = useState<GuessResult[]>([]);
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [previousScores, setPreviousScores] = useState<{ [playerId: string]: number }>({}); // For animation
  const [timeLeft, setTimeLeft] = useState(6); // 6 seconds per round
  
  // Smooth animated progress bar
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize scores
  useEffect(() => {
    const initialScores: { [key: string]: number } = {};
    room.players.forEach((p: Player) => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
    setPreviousScores(initialScores);
  }, []);

  // 3 phases over 6 seconds: blocksize 4 (2s) → 2 (2s) → 1 (2s)
  useEffect(() => {
    if (!showResults && currentRound < allPhotos.length) {
      setPixelLevel(mosaicEnabled ? 4 : 0);
      setTimeLeft(6);
      setRoundStartTime(Date.now());
      setGuessedPlayerId(null); // Reset guessed player for new round

      // Start smooth progress bar animation
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: ROUND_DURATION,
        useNativeDriver: false,
      }).start();

      // Phase transitions: 4 → 2 → 0 every 2 seconds (only if mosaic enabled)
      let pixelInterval: NodeJS.Timeout | null = null;
      if (mosaicEnabled) {
        pixelInterval = setInterval(() => {
          setPixelLevel(prev => {
            if (prev >= 4) return 2;
            if (prev >= 2) return 0;
            return 0;
          });
        }, 2000);
      }

      // Update countdown timer
      const timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - auto-submit if not guessed
            if (!hasGuessed) {
              handleTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (pixelInterval) clearInterval(pixelInterval);
        clearInterval(timerInterval);
        progressAnim.stopAnimation();
      };
    }
  }, [currentRound, showResults]);

  const handleTimeout = () => {
    if (hasGuessed) return;

    const result: GuessResult = {
      playerId: player.id,
      playerName: player.name,
      guessedPlayerId: '',
      isCorrect: false,
      timeMs: 6000,
      points: 0,
    };

    setHasGuessed(true);
    setRoundResults([result]);
    
    // Show results after 1 second
    resultTimerRef.current = setTimeout(() => {
      setShowResults(true);
    }, 1000);
  };

  const handleGuess = (guessedPlayer: Player) => {
    if (hasGuessed) return;

    const timeElapsed = Date.now() - roundStartTime;
    const currentPhoto = allPhotos[currentRound];
    const isCorrect = guessedPlayer.id === currentPhoto.ownerId;
    
    // Calculate points: 1000 base points for correct, bonus for speed
    let points = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, 500 - Math.floor(timeElapsed / 30));
      points = 1000 + speedBonus;
    }

    const result: GuessResult = {
      playerId: player.id,
      playerName: player.name,
      guessedPlayerId: guessedPlayer.id,
      isCorrect,
      timeMs: timeElapsed,
      points,
    };

    setHasGuessed(true);
    setGuessedPlayerId(guessedPlayer.id); // Mark which player was selected
    setRoundResults([result]); // In multiplayer, this would collect all players' results
    
    // Save previous scores for animation comparison
    setPreviousScores({ ...scores });
    
    // Trigger layout animation for score changes
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Update scores
    setScores(prev => ({
      ...prev,
      [player.id]: prev[player.id] + points,
    }));

    // Show results after 1 second
    resultTimerRef.current = setTimeout(() => {
      setShowResults(true);
    }, 1000);
  };

  const handleNextRound = () => {
    if (currentRound + 1 < allPhotos.length) {
      // Reset for next round
      setCurrentRound(currentRound + 1);
      setPixelLevel(4);
      setHasGuessed(false);
      setGuessedPlayerId(null);
      setShowResults(false);
      setRoundStartTime(Date.now());
      setRoundResults([]);
      setTimeLeft(6);
    } else {
      // Game finished - show final results
      navigation.replace('FinalResults', { room, player, scores, allPhotos });
    }
  };

  // Auto-advance to next round after 8 seconds on results screen
  useEffect(() => {
    if (showResults) {
      resultTimerRef.current = setTimeout(() => {
        handleNextRound();
      }, 6000); // Changed from 8s to 6s

      return () => {
        if (resultTimerRef.current) {
          clearTimeout(resultTimerRef.current);
        }
      };
    }
  }, [showResults]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  // Helper to get rank change indicator
  const getRankChange = (playerId: string): 'up' | 'down' | 'same' => {
    const currentSorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const previousSorted = Object.entries(previousScores).sort(([, a], [, b]) => b - a);
    const currentRank = currentSorted.findIndex(([id]) => id === playerId);
    const previousRank = previousSorted.findIndex(([id]) => id === playerId);
    if (currentRank < previousRank) return 'up';
    if (currentRank > previousRank) return 'down';
    return 'same';
  };

  if (currentRound >= allPhotos.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.resultsTitle}>Game Complete!</Text>
      </View>
    );
  }

  const currentPhoto = allPhotos[currentRound];

  if (showResults) {
    const myResult = roundResults.find(r => r.playerId === player.id);
    
    return (
      <View style={styles.container}>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Round {currentRound + 1} Results</Text>
          
          <View style={styles.photoReveal}>
            <Image
              source={{ uri: currentPhoto.photoUri }}
              style={styles.revealedPhoto}
            />
            <Text style={styles.photoOwner}>Photo by: {currentPhoto.ownerName}</Text>
          </View>

          {myResult && (
            <View style={styles.myResultCard}>
              {myResult.isCorrect ? (
                <>
                  <Text style={styles.correctText}>✓ CORRECT!</Text>
                  <Text style={styles.pointsText}>+{myResult.points} points</Text>
                  <Text style={styles.timeText}>
                    Time: {(myResult.timeMs / 1000).toFixed(2)}s
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.wrongText}>✗ Wrong</Text>
                  <Text style={styles.noPointsText}>0 points</Text>
                </>
              )}
            </View>
          )}

          <View style={styles.scoresContainer}>
            <Text style={styles.scoresTitle}>Current Scores</Text>
            {Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .map(([playerId, score], index) => {
                const p = room.players.find((pl: Player) => pl.id === playerId);
                const rankChange = getRankChange(playerId);
                const playerResult = roundResults.find(r => r.playerId === playerId);
                return (
                  <Animated.View key={playerId} style={[
                    styles.scoreItem,
                    rankChange === 'up' && styles.scoreItemUp,
                  ]}>
                    <View style={styles.scoreRankContainer}>
                      {rankChange === 'up' && <Text style={styles.rankUpIcon}>⬆️</Text>}
                      {rankChange === 'down' && <Text style={styles.rankDownIcon}>⬇️</Text>}
                      <Text style={styles.scoreName}>{p?.name}</Text>
                    </View>
                    <View style={styles.scoreDetails}>
                      {playerResult && (
                        <Text style={styles.responseTime}>
                          ⏱️ {(playerResult.timeMs / 1000).toFixed(1)}s
                        </Text>
                      )}
                      <Text style={styles.scorePoints}>{score} pts</Text>
                    </View>
                  </Animated.View>
                );
              })}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextRound}
          >
            <Text style={styles.nextButtonText}>
              {currentRound + 1 < allPhotos.length ? 'Next Round → (Auto in 6s)' : 'Final Results → (Auto in 6s)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.roundText}>Round {currentRound + 1} of {allPhotos.length}</Text>
        <Text style={styles.timerText}>⏱️ {timeLeft}s</Text>
        <Text style={styles.scoreText}>Score: {scores[player.id] || 0}</Text>
      </View>

      {/* Smooth Animated Time Progress Bar */}
      <View style={styles.timeProgressContainer}>
        <View style={styles.timeProgressBackground}>
          <Animated.View
            style={[
              styles.timeProgressBar,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.photoContainer}>
        {mosaicEnabled ? (
          <PixelatedPhoto
            uri={currentPhoto.photoUri}
            pixelLevel={pixelLevel}
            size={PHOTO_SIZE}
          />
        ) : (
          <Image
            source={{ uri: currentPhoto.photoUri }}
            style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 12 }}
            resizeMode="cover"
          />
        )}
      </View>

      <View style={styles.guessSection}>
        <Text style={styles.guessTitle}>Whose photo is this?</Text>
        <ScrollView style={styles.playersList}>
          {room.players.map((p: Player) => {
            const isSelected = guessedPlayerId === p.id;
            const isOtherWhenGuessed = hasGuessed && !isSelected;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.playerButton,
                  isSelected && styles.playerButtonSelected,
                  isOtherWhenGuessed && styles.playerButtonDisabled,
                ]}
                onPress={() => handleGuess(p)}
                disabled={hasGuessed}
              >
                <View style={styles.playerButtonContent}>
                  {isSelected && <Text style={styles.selectedIcon}>✓</Text>}
                  <Text style={[
                    styles.playerButtonText,
                    isSelected && styles.playerButtonTextSelected,
                  ]}>{p.name}</Text>
                </View>
                {isSelected && (
                  <Text style={styles.selectedLabel}>YOUR GUESS</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
  },
  roundText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginHorizontal: 12,
  },
  scoreText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timeProgressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  timeProgressBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timeProgressBar: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 4,
  },
  guessSection: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  guessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  playersList: {
    flex: 1,
  },
  playerButton: {
    backgroundColor: '#3a3a3a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#4a4a4a',
  },
  playerButtonSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#FF4081',
    borderWidth: 3,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  playerButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#2a2a2a',
  },
  playerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 10,
  },
  playerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  playerButtonTextSelected: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 1,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoReveal: {
    alignItems: 'center',
    marginBottom: 24,
  },
  revealedPhoto: {
    width: PHOTO_SIZE * 0.6,
    height: PHOTO_SIZE * 0.6,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoOwner: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  myResultCard: {
    backgroundColor: '#2a2a2a',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  correctText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  wrongText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  noPointsText: {
    fontSize: 24,
    color: '#999',
  },
  timeText: {
    fontSize: 16,
    color: '#999',
  },
  scoresContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  scoresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreItemUp: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  scoreRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankUpIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  rankDownIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  scoreName: {
    fontSize: 16,
    color: '#fff',
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  responseTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  scorePoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nextButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
