import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Player } from '../types/game';

interface FinalResultsScreenProps {
  route: any;
  navigation: any;
}

const { width } = Dimensions.get('window');

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🎉 Game Over! 🎉</Text>

        <View style={styles.winnerCard}>
          <Text style={styles.winnerLabel}>Winner</Text>
          <Text style={styles.winnerName}>👑 {winner.name}</Text>
          <Text style={styles.winnerScore}>{winner.finalScore} points</Text>
        </View>

        <View style={styles.myStatsCard}>
          <Text style={styles.myStatsTitle}>Your Performance</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Rank:</Text>
            <Text style={styles.statValue}>#{myRank}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Score:</Text>
            <Text style={styles.statValue}>{myScore} pts</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Rounds:</Text>
            <Text style={styles.statValue}>{allPhotos.length}</Text>
          </View>
        </View>

        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderboardTitle}>Final Leaderboard</Text>
          {sortedPlayers.map((p: any, index: number) => (
            <View
              key={p.id}
              style={[
                styles.leaderboardItem,
                p.id === player.id && styles.leaderboardItemMe,
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <Text style={styles.leaderboardName}>{p.name}</Text>
              <Text style={styles.leaderboardScore}>{p.finalScore} pts</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  winnerCard: {
    backgroundColor: '#FFD700',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  winnerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  winnerScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  myStatsCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  myStatsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#999',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  leaderboardCard: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#3a3a3a',
  },
  leaderboardItemMe: {
    backgroundColor: '#E91E63',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  backButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
