import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Player } from '../types/game';
import Colors from '../theme/colors';

interface FinalResultsScreenProps {
  route: any;
  navigation: any;
}

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/background.png');

export const FinalResultsScreen: React.FC<FinalResultsScreenProps> = ({
  route,
  navigation,
}) => {
  const { room, player, scores, allPhotos, gameStats } = route.params;

  // Sort players by score
  const sortedPlayers = room.players
    .map((p: Player) => ({
      ...p,
      finalScore: scores[p.id] || 0,
    }))
    .sort((a: any, b: any) => b.finalScore - a.finalScore);

  const winner = sortedPlayers[0];
  const myRank = sortedPlayers.findIndex((p: any) => p.id === player.id) + 1;
  const myScore = scores[player.id] || 0;

  // Podium positions (1st, 2nd, 3rd)
  const podium = sortedPlayers.slice(0, 3);
  
  // Format time in seconds with 1 decimal
  const formatTime = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

  // Handle play again - go back to room screen
  const handlePlayAgain = () => {
    // Navigate back to room to start a new game
    navigation.replace('Room', { room, player });
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
      blurRadius={20}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy Header */}
        <View style={styles.trophyContainer}>
          <Text style={styles.title}>Game Over!</Text>
          <Text style={styles.subtitle}>{allPhotos.length} rounds completed</Text>
        </View>

        {/* Winner Card */}
        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>WINNER</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <View style={styles.winnerScoreBadge}>
            <Text style={styles.winnerScore}>{winner.finalScore}</Text>
            <Text style={styles.winnerScoreLabel}>points</Text>
          </View>
        </View>

        {/* Game Stats Card */}
        {gameStats && (
          <View style={styles.gameStatsCard}>
            <Text style={styles.gameStatsTitle}>Game Stats</Text>
            <View style={styles.gameStatsGrid}>
              {gameStats.fastestAnswer && (
                <View style={styles.gameStatItem}>
                  <Text style={styles.gameStatEmoji}>⚡</Text>
                  <Text style={styles.gameStatLabel}>Fastest Answer</Text>
                  <Text style={styles.gameStatValue}>{gameStats.fastestAnswer.playerName}</Text>
                  <Text style={styles.gameStatDetail}>{formatTime(gameStats.fastestAnswer.timeMs)}</Text>
                </View>
              )}
              {gameStats.longestStreak && gameStats.longestStreak.streak > 0 && (
                <View style={styles.gameStatItem}>
                  <Text style={styles.gameStatEmoji}>🔥</Text>
                  <Text style={styles.gameStatLabel}>Longest Streak</Text>
                  <Text style={styles.gameStatValue}>{gameStats.longestStreak.playerName}</Text>
                  <Text style={styles.gameStatDetail}>{gameStats.longestStreak.streak} in a row</Text>
                </View>
              )}
              {gameStats.highestScore && (
                <View style={styles.gameStatItem}>
                  <Text style={styles.gameStatEmoji}>🏆</Text>
                  <Text style={styles.gameStatLabel}>Highest Score</Text>
                  <Text style={styles.gameStatValue}>{gameStats.highestScore.playerName}</Text>
                  <Text style={styles.gameStatDetail}>{gameStats.highestScore.score} pts</Text>
                </View>
              )}
              {gameStats.lowestScore && sortedPlayers.length > 1 && (
                <View style={styles.gameStatItem}>
                  <Text style={styles.gameStatEmoji}>😅</Text>
                  <Text style={styles.gameStatLabel}>Lowest Score</Text>
                  <Text style={styles.gameStatValue}>{gameStats.lowestScore.playerName}</Text>
                  <Text style={styles.gameStatDetail}>{gameStats.lowestScore.score} pts</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Your Performance Card */}
        <View style={styles.myStatsCard}>
          <Text style={styles.myStatsTitle}>Your Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>#{myRank}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxCenter]}>
              <Text style={styles.statValue}>{myScore}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{allPhotos.length}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderboardTitle}>Final Leaderboard</Text>
          {sortedPlayers.map((p: any, index: number) => (
            <View
              key={p.id}
              style={[
                styles.leaderboardItem,
                p.id === player.id && styles.leaderboardItemMe,
                index === 0 && styles.leaderboardFirst,
              ]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>
                  #{index + 1}
                </Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{p.name}</Text>
                {p.id === player.id && (
                  <Text style={styles.youLabel}>YOU</Text>
                )}
              </View>
              <Text style={styles.leaderboardScore}>{p.finalScore} pts</Text>
            </View>
          ))}
        </View>

        {/* Play Again Button */}
        <TouchableOpacity
          style={styles.playAgainButton}
          onPress={handlePlayAgain}
          activeOpacity={0.8}
        >
          <Text style={styles.playAgainButtonText}>Play Again</Text>
        </TouchableOpacity>
        
        {/* Back to Home Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scrollContent: {
    padding: 20,
    paddingTop: (StatusBar.currentHeight || 44) + 20,
  },
  
  // Trophy Header
  trophyContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  
  // Winner Card
  winnerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: Colors.cyan,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cyan,
    letterSpacing: 3,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  winnerScoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(76, 201, 240, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  winnerScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  winnerScoreLabel: {
    fontSize: 14,
    color: Colors.cyan,
    marginLeft: 6,
  },
  
  // My Stats Card
  myStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  myStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBoxCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.pink,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  
  // Leaderboard
  leaderboardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  leaderboardItemMe: {
    borderWidth: 2,
    borderColor: Colors.pink,
    backgroundColor: 'rgba(247, 37, 133, 0.15)',
  },
  leaderboardFirst: {
    backgroundColor: 'rgba(76, 201, 240, 0.15)',
    borderWidth: 1,
    borderColor: Colors.cyan,
  },
  rankBadge: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  youLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.pink,
    marginTop: 2,
  },
  leaderboardScore: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  bottomSpacing: {
    height: 30,
  },
  
  // Game Stats Card
  gameStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  gameStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  gameStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameStatItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  gameStatEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  gameStatLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  gameStatDetail: {
    fontSize: 12,
    color: Colors.cyan,
    marginTop: 2,
  },
  
  // Buttons
  playAgainButton: {
    backgroundColor: Colors.pink,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  playAgainButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
