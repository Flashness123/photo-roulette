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

interface FinalResultsScreenProps {
  route: any;
  navigation: any;
}

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/friends2.jpg');

export const FinalResultsScreen: React.FC<FinalResultsScreenProps> = ({
  route,
  navigation,
}) => {
  const { room, player, scores, allPhotos } = route.params;

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

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      blurRadius={10}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy Header */}
        <View style={styles.trophyContainer}>
          <Text style={styles.trophyIcon}>🏆</Text>
          <Text style={styles.title}>Game Over!</Text>
          <Text style={styles.subtitle}>{allPhotos.length} rounds completed</Text>
        </View>

        {/* Winner Card */}
        <View style={styles.winnerCard}>
          <View style={styles.crownContainer}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
          <Text style={styles.winnerLabel}>WINNER</Text>
          <Text style={styles.winnerName}>{winner.name}</Text>
          <View style={styles.winnerScoreBadge}>
            <Text style={styles.winnerScore}>{winner.finalScore}</Text>
            <Text style={styles.winnerScoreLabel}>points</Text>
          </View>
        </View>

        {/* Your Performance Card */}
        <View style={styles.myStatsCard}>
          <Text style={styles.myStatsTitle}>🎯 Your Performance</Text>
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
          <Text style={styles.leaderboardTitle}>📊 Final Leaderboard</Text>
          {sortedPlayers.map((p: any, index: number) => (
            <View
              key={p.id}
              style={[
                styles.leaderboardItem,
                p.id === player.id && styles.leaderboardItemMe,
                index === 0 && styles.leaderboardFirst,
                index === 1 && styles.leaderboardSecond,
                index === 2 && styles.leaderboardThird,
              ]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
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
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>🏠  Back to Home</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  trophyIcon: {
    fontSize: 72,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  
  // Winner Card
  winnerCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  crownContainer: {
    marginBottom: 8,
  },
  crownEmoji: {
    fontSize: 48,
  },
  winnerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 3,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  winnerScoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  winnerScore: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  winnerScoreLabel: {
    fontSize: 16,
    color: '#FFD700',
    marginLeft: 6,
  },
  
  // My Stats Card
  myStatsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  myStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  
  // Leaderboard
  leaderboardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  leaderboardItemMe: {
    borderWidth: 2,
    borderColor: '#E91E63',
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
  },
  leaderboardFirst: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  leaderboardSecond: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
  },
  leaderboardThird: {
    backgroundColor: 'rgba(205, 127, 50, 0.1)',
  },
  rankBadge: {
    width: 44,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  youLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E91E63',
    marginTop: 2,
  },
  leaderboardScore: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  
  // Back Button
  backButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});
