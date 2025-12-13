import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import { Player } from '../types/game';
import Colors from '../theme/colors';

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
const VIDEO_SIZE = width; // Full width video

export const VideoGameScreen: React.FC<VideoGameScreenProps> = ({ route, navigation }) => {
  const { room, player, allPhotos } = route.params || {};
  
  console.log('VideoGameScreen params:', { room: !!room, player: !!player, allPhotos: allPhotos?.length });
  
  // Safety check for missing params
  if (!room || !player || !allPhotos || allPhotos.length === 0) {
    return (
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.container}
        resizeMode="cover"
      >
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{color: Colors.white, fontSize: 18}}>Missing game data</Text>
          <TouchableOpacity 
            style={{marginTop: 20, padding: 15, backgroundColor: Colors.pink, borderRadius: 10}}
            onPress={() => navigation.navigate('Welcome')}
          >
            <Text style={{color: Colors.white}}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
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
  
  // Streak and stats tracking
  const [currentStreak, setCurrentStreak] = useState(0);
  const [gameStats, setGameStats] = useState<{
    fastestAnswer: { playerId: string; playerName: string; timeMs: number } | null;
    longestStreak: { playerId: string; playerName: string; streak: number };
    allAnswerTimes: { playerId: string; timeMs: number; isCorrect: boolean }[];
  }>({
    fastestAnswer: null,
    longestStreak: { playerId: '', playerName: '', streak: 0 },
    allAnswerTimes: [],
  });
  
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

    // Timeout breaks streak
    setCurrentStreak(0);
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
    
    // NEW POINT SYSTEM:
    // Base: 500 points for correct answer
    // Speed bonus: Up to 1000 extra points for fast answers (linear decay)
    // Streak bonus: +200 per consecutive correct answer
    let points = 0;
    let newStreak = currentStreak;
    
    if (isCorrect) {
      // Base points
      const basePoints = 500;
      
      // Speed bonus - decays linearly from 1000 to 0 over 6 seconds
      const speedBonus = Math.max(0, Math.floor(1000 * (1 - timeElapsed / 6000)));
      
      // Streak bonus
      newStreak = currentStreak + 1;
      const streakBonus = (newStreak - 1) * 200;
      
      points = basePoints + speedBonus + streakBonus;
      
      // Update fastest answer stat
      if (!gameStats.fastestAnswer || timeElapsed < gameStats.fastestAnswer.timeMs) {
        setGameStats(prev => ({
          ...prev,
          fastestAnswer: { playerId: player.id, playerName: player.name, timeMs: timeElapsed },
        }));
      }
      
      // Update longest streak stat
      if (newStreak > gameStats.longestStreak.streak) {
        setGameStats(prev => ({
          ...prev,
          longestStreak: { playerId: player.id, playerName: player.name, streak: newStreak },
        }));
      }
    } else {
      // Wrong answer breaks streak
      newStreak = 0;
    }
    
    setCurrentStreak(newStreak);
    
    // Track all answer times for stats
    setGameStats(prev => ({
      ...prev,
      allAnswerTimes: [...prev.allAnswerTimes, { playerId: player.id, timeMs: timeElapsed, isCorrect }],
    }));

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
      // Game finished - show final results with stats
      navigation.replace('FinalResults', { 
        room, 
        player, 
        scores, 
        allPhotos,
        gameStats: {
          fastestAnswer: gameStats.fastestAnswer,
          longestStreak: gameStats.longestStreak,
          highestScore: Object.entries(scores).reduce((best, [id, score]) => {
            const p = room.players.find((pl: Player) => pl.id === id);
            if (!best || score > best.score) {
              return { playerId: id, playerName: p?.name || 'Unknown', score };
            }
            return best;
          }, null as { playerId: string; playerName: string; score: number } | null),
          lowestScore: Object.entries(scores).reduce((worst, [id, score]) => {
            const p = room.players.find((pl: Player) => pl.id === id);
            if (!worst || score < worst.score) {
              return { playerId: id, playerName: p?.name || 'Unknown', score };
            }
            return worst;
          }, null as { playerId: string; playerName: string; score: number } | null),
        },
      });
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
      <ImageBackground 
        source={require('../assets/background.png')} 
        style={styles.container}
        resizeMode="cover"
      >
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
                  <Text style={styles.correctText}>CORRECT!</Text>
                  <Text style={styles.pointsText}>+{myResult.points} points</Text>
                  <Text style={styles.timeText}>
                    Time: {(myResult.timeMs / 1000).toFixed(2)}s
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.wrongText}>Wrong</Text>
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
                      <Text style={styles.scoreName}>{p?.name}</Text>
                    </View>
                    <View style={styles.scoreDetails}>
                      {playerResult && (
                        <Text style={styles.responseTime}>
                          {(playerResult.timeMs / 1000).toFixed(1)}s
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
              {currentRound + 1 < allPhotos.length ? 'Next Round' : 'Final Results'}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground 
      source={require('../assets/background.png')} 
      style={styles.container}
      resizeMode="cover"
      blurRadius={20}
    >
      <View style={styles.darkOverlay} />
      <View style={styles.header}>
        <Text style={styles.roundText}>Round {currentRound + 1}/{allPhotos.length}</Text>
        <Text style={styles.timerText}>{timeLeft}s</Text>
        <Text style={styles.scoreText}>{scores[player.id] || 0} pts</Text>
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
          <Text style={styles.videoPlayingText}>Playing</Text>
        </View>
      </View>

      <View style={styles.guessSection}>
        <Text style={styles.guessTitle}>Whose video?</Text>
        <View style={styles.playersGrid}>
          {(() => {
            const players = room.players;
            const isOdd = players.length % 2 !== 0;
            const pairedPlayers = isOdd ? players.slice(0, -1) : players;
            const lastPlayer = isOdd ? players[players.length - 1] : null;
            
            return (
              <>
                <View style={styles.playersRow}>
                  {pairedPlayers.map((p: Player) => {
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
                        <Text style={[
                          styles.playerButtonText,
                          isSelected && styles.playerButtonTextSelected,
                        ]}>{p.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {lastPlayer && (
                  <TouchableOpacity
                    key={lastPlayer.id}
                    style={[
                      styles.playerButtonFull,
                      guessedPlayerId === lastPlayer.id && styles.playerButtonSelected,
                      hasGuessed && guessedPlayerId !== lastPlayer.id && styles.playerButtonDisabled,
                    ]}
                    onPress={() => handleGuess(lastPlayer)}
                    disabled={hasGuessed}
                  >
                    <Text style={[
                      styles.playerButtonText,
                      guessedPlayerId === lastPlayer.id && styles.playerButtonTextSelected,
                    ]}>{lastPlayer.name}</Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 6,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  scoreText: {
    fontSize: 14,
    color: Colors.purple,
    fontWeight: '600',
  },
  videoContainer: {
    alignItems: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  video: {
    width: VIDEO_SIZE,
    height: VIDEO_SIZE,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  videoPlayingBadge: {
    position: 'absolute',
    top: 12,
    left: 22,
    backgroundColor: Colors.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  videoPlayingText: {
    color: Colors.white,
    fontSize: 12,
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
    color: Colors.white,
    fontSize: 14,
  },
  timeProgressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  timeProgressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timeProgressBar: {
    height: '100%',
    backgroundColor: Colors.purple,
    borderRadius: 2,
  },
  guessSection: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  guessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 10,
    textAlign: 'center',
  },
  playersList: {
    flex: 1,
  },
  playersGrid: {
    flex: 1,
  },
  playersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playersListHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  playerButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  playerButtonFull: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  playerButtonSelected: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  playerButtonDisabled: {
    opacity: 0.3,
  },
  playerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIcon: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: 'bold',
    marginRight: 6,
  },
  playerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  playerButtonTextSelected: {
    fontWeight: 'bold',
  },
  selectedLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 50,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  videoReveal: {
    alignItems: 'center',
    marginBottom: 16,
  },
  revealedVideo: {
    width: VIDEO_SIZE * 0.5,
    height: VIDEO_SIZE * 0.5,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#000',
  },
  videoOwner: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  myResultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  correctText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.cyan,
    marginBottom: 4,
  },
  wrongText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.pink,
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.cyan,
    marginBottom: 4,
  },
  noPointsText: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  scoresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  scoresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreItemUp: {
    backgroundColor: 'rgba(76, 201, 240, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 201, 240, 0.4)',
  },
  scoreRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankUpIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  rankDownIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  scoreName: {
    fontSize: 14,
    color: Colors.white,
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  responseTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  scorePoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  nextButton: {
    backgroundColor: Colors.purple,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
