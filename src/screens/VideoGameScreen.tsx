import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Player } from '../types/game';

interface VideoGameScreenProps {
  route: any;
  navigation: any;
}

interface VideoRound {
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
const VIDEO_SIZE = width - 40;

export const VideoGameScreen: React.FC<VideoGameScreenProps> = ({ route, navigation }) => {
  const { room, player, allPhotos } = route.params || {};
  
  console.log('VideoGameScreen params:', { room: !!room, player: !!player, allPhotos: allPhotos?.length });
  
  // Safety check for missing params
  if (!room || !player || !allPhotos || allPhotos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: '#fff', fontSize: 18}}>Missing game data</Text>
          <TouchableOpacity 
            style={{marginTop: 20, padding: 15, backgroundColor: '#E91E63', borderRadius: 10}}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={{color: '#fff'}}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const [currentRound, setCurrentRound] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(Date.now());
  const [hasGuessed, setHasGuessed] = useState(false);
  const [guessedPlayerId, setGuessedPlayerId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [roundResults, setRoundResults] = useState<GuessResult[]>([]);
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [previousScores, setPreviousScores] = useState<{ [playerId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(6);
  
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

  // Timer for 6 seconds
  useEffect(() => {
    if (!showResults && currentRound < allPhotos.length) {
      setTimeLeft(6);
      setRoundStartTime(Date.now());
      setGuessedPlayerId(null);

      const timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (!hasGuessed) {
              handleTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timerInterval);
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
    
    resultTimerRef.current = setTimeout(() => {
      setShowResults(true);
    }, 1000);
  };

  const handleGuess = (guessedPlayer: Player) => {
    if (hasGuessed) return;

    const timeElapsed = Date.now() - roundStartTime;
    const currentVideo = allPhotos[currentRound];
    const isCorrect = guessedPlayer.id === currentVideo.ownerId;
    
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
    setGuessedPlayerId(guessedPlayer.id);
    setRoundResults([result]);
    
    setPreviousScores({ ...scores });
    
    setScores(prev => ({
      ...prev,
      [player.id]: prev[player.id] + points,
    }));

    resultTimerRef.current = setTimeout(() => {
      setShowResults(true);
    }, 1000);
  };

  const handleNextRound = () => {
    if (currentRound + 1 < allPhotos.length) {
      setCurrentRound(currentRound + 1);
      setHasGuessed(false);
      setGuessedPlayerId(null);
      setShowResults(false);
      setRoundStartTime(Date.now());
      setRoundResults([]);
      setTimeLeft(6);
    } else {
      navigation.replace('FinalResults', { room, player, scores, allPhotos });
    }
  };

  // Auto-advance after 6 seconds on results
  useEffect(() => {
    if (showResults) {
      resultTimerRef.current = setTimeout(() => {
        handleNextRound();
      }, 6000);

      return () => {
        if (resultTimerRef.current) {
          clearTimeout(resultTimerRef.current);
        }
      };
    }
  }, [showResults]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

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

  const currentVideo = allPhotos[currentRound];

  if (showResults) {
    const myResult = roundResults.find(r => r.playerId === player.id);
    
    return (
      <View style={styles.container}>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Round {currentRound + 1} Results</Text>
          
          <View style={styles.videoReveal}>
            <Image
              source={{ uri: currentVideo.photoUri }}
              style={styles.revealedVideo}
              resizeMode="cover"
            />
            <Text style={styles.videoOwner}>Video by: {currentVideo.ownerName}</Text>
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
              .map(([playerId, score]) => {
                const p = room.players.find((pl: Player) => pl.id === playerId);
                const rankChange = getRankChange(playerId);
                const playerResult = roundResults.find(r => r.playerId === playerId);
                return (
                  <View key={playerId} style={[
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
                  </View>
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

      {/* Time Progress Bar */}
      <View style={styles.timeProgressContainer}>
        <View style={styles.timeProgressBackground}>
          <View
            style={[
              styles.timeProgressBar,
              { width: `${(timeLeft / 6) * 100}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.videoContainer}>
        <Video 
          key={`video-round-${currentRound}`}
          source={{ uri: currentVideo.photoUri }} 
          style={styles.video}
          resizeMode="cover"
          repeat={true}
          muted={false}
          paused={showResults}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          bufferConfig={{
            minBufferMs: 2000,
            maxBufferMs: 5000,
            bufferForPlaybackMs: 1000,
            bufferForPlaybackAfterRebufferMs: 2000,
          }}
          onError={(error) => console.log('Video error:', error)}
        />
        <View style={styles.videoPlayingBadge}>
          <Text style={styles.videoPlayingText}>🎬 Playing</Text>
        </View>
      </View>

      <View style={styles.guessSection}>
        <Text style={styles.guessTitle}>Whose video is this?</Text>
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
  videoContainer: {
    alignItems: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  video: {
    width: VIDEO_SIZE,
    height: VIDEO_SIZE,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  videoPlayingBadge: {
    position: 'absolute',
    top: 12,
    left: 32,
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  videoPlayingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  videoErrorText: {
    position: 'absolute',
    zIndex: 1,
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: '#9C27B0',
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
    backgroundColor: '#9C27B0',
    borderColor: '#BA68C8',
    borderWidth: 3,
    shadowColor: '#9C27B0',
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
  videoReveal: {
    alignItems: 'center',
    marginBottom: 24,
  },
  revealedVideo: {
    width: VIDEO_SIZE * 0.6,
    height: VIDEO_SIZE * 0.6,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#000',
  },
  videoOwner: {
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
    backgroundColor: '#9C27B0',
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
