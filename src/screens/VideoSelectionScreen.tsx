import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Dimensions,
  PermissionsAndroid,
  Platform,
  ImageBackground,
  StatusBar,
  InteractionManager,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import Colors from '../theme/colors';

interface VideoSelectionScreenProps {
  route: any;
  navigation: any;
}

interface VideoAsset {
  uri: string;
  timestamp: number;
  duration?: number;
}

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/background.png');

// Fixed 4x4 grid for 16 videos
const REQUIRED_VIDEOS = 16;
const COLUMNS = 4;
const GRID_PADDING = 16;
const PHOTO_SPACING = 6;
const TOTAL_SPACING = GRID_PADDING * 2 + PHOTO_SPACING * (COLUMNS - 1);
const PHOTO_SIZE = (width - TOTAL_SPACING - 16) / COLUMNS;

export const VideoSelectionScreen: React.FC<VideoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const { room, player } = route.params || {};
  
  console.log('VideoSelectionScreen params:', { room, player });
  
  const [selectedVideos, setSelectedVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading videos...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          {
            title: 'Video Gallery Permission',
            message: 'Video Roulette needs access to your videos to select random clips for the game.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadRandomVideos();
        } else {
          Alert.alert(
            'Permission Required',
            'We need gallery access to load videos for the game.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (err) {
        console.error('Permission error:', err);
        Alert.alert('Error', 'Failed to request permission');
      }
    } else {
      setHasPermission(true);
      loadRandomVideos();
    }
  };

  const loadRandomVideos = async () => {
    setLoading(true);
    setLoadingMessage('Scanning your videos...');
    setLoadingProgress(10);
    
    try {
      // Get videos from camera roll
      const result = await CameraRoll.getPhotos({
        first: 200,
        assetType: 'Videos',
        include: ['playableDuration'],
      });
      
      setLoadingProgress(40);
      setLoadingMessage('Selecting random videos...');
      
      const videos: VideoAsset[] = result.edges.map(edge => ({
        uri: edge.node.image.uri,
        timestamp: edge.node.timestamp || 0,
        duration: edge.node.image.playableDuration,
      }));
      
      if (videos.length < REQUIRED_VIDEOS) {
        Alert.alert(
          'Not Enough Videos',
          `You need at least ${REQUIRED_VIDEOS} videos in your gallery. Found: ${videos.length}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      setLoadingProgress(70);
      
      // Shuffle and select random videos
      const shuffled = [...videos].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, REQUIRED_VIDEOS);
      
      setLoadingProgress(100);
      setSelectedVideos(selected);
      
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos from gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedVideos.length < REQUIRED_VIDEOS) {
      Alert.alert('Not Enough Videos', `Please wait for ${REQUIRED_VIDEOS} videos to load.`);
      return;
    }

    try {
      const videoUris = selectedVideos.map(v => v.uri);
      console.log('Confirming videos:', videoUris.length, 'videos');
      
      // Call backend to lock videos (same as photos)
      const response = await fetch(
        `https://photo-roulette-production-b12d.up.railway.app/api/rooms/${room.id}/lock-photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerId: player.id,
            photoCount: videoUris.length 
          }),
        }
      );

      if (response.ok) {
        // Wait for interactions to complete before navigating
        InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            navigation.navigate('Room', {
              room,
              player,
              selectedPhotos: videoUris,
              numRounds: REQUIRED_VIDEOS,
              gameType: 'video',
            });
          }, 100);
        });
      } else {
        console.error('Backend response not OK:', response.status);
        Alert.alert('Error', 'Failed to lock in videos. Please try again.');
      }
    } catch (error) {
      console.error('Error confirming videos:', error);
      Alert.alert('Error', 'Failed to lock in videos. Please check your connection.');
    }
  };

  const renderVideo = ({ item, index }: { item: VideoAsset; index: number }) => (
    <View style={[styles.photoContainer, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}>
      <Image
        source={{ uri: item.uri }}
        style={[styles.photo, { width: PHOTO_SIZE - 6, height: PHOTO_SIZE - 6 }]}
        resizeMode="cover"
      />
      <View style={styles.videoBadge}>
        <Text style={styles.videoBadgeText}>V</Text>
      </View>
      {item.duration != null && item.duration > 0 && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Video Selection</Text>
            <Text style={styles.headerSubtitle}>Select {REQUIRED_VIDEOS} videos for the game</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingTitle}>Scanning Videos</Text>
              <Text style={styles.loadingText}>{loadingMessage}</Text>
              
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{loadingProgress}%</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Video Count Card */}
            <View style={styles.photoCountCard}>
              <Text style={styles.photoCountText}>
                {selectedVideos.length}/{REQUIRED_VIDEOS} videos ready
              </Text>
            </View>

            {/* Video Grid */}
            <View style={styles.gridContainer}>
              <FlatList
                data={selectedVideos}
                renderItem={renderVideo}
                keyExtractor={(item, index) => `video-${index}`}
                numColumns={COLUMNS}
                contentContainerStyle={[styles.photoGrid, { alignItems: 'center' }]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                initialNumToRender={16}
                maxToRenderPerBatch={16}
                windowSize={2}
              />
            </View>

            {/* Footer Actions - Yes/No buttons like PhotoSelectionScreen */}
            <View style={styles.footer}>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.noButton}
                  onPress={loadRandomVideos}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>No</Text>
                  <Text style={styles.buttonSubtext}>Reshuffle</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.yesButton,
                    selectedVideos.length < REQUIRED_VIDEOS && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={selectedVideos.length < REQUIRED_VIDEOS}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                  <Text style={styles.buttonSubtext}>Lock In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.purple,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
  },

  // Video Count Card
  photoCountCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  photoCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  
  // Grid Container
  gridContainer: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  photoGrid: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    padding: 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    borderRadius: 8,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.purple,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  noButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  yesButton: {
    flex: 1,
    backgroundColor: Colors.purple,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(114, 9, 183, 0.4)',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSubtext: {
    color: Colors.textLight,
    fontSize: 11,
    marginTop: 2,
  },
});
