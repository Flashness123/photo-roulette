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
const backgroundImage = require('../assets/friends2.jpg');

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
        <Text style={styles.videoBadgeText}>🎬</Text>
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
      blurRadius={8}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
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
            <Text style={styles.headerTitle}>🎬 Video Selection</Text>
            <Text style={styles.headerSubtitle}>Select {REQUIRED_VIDEOS} videos for the game</Text>
          </View>
          <TouchableOpacity 
            style={styles.shuffleButton}
            onPress={loadRandomVideos}
          >
            <Text style={styles.shuffleButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingEmoji}>🎬</Text>
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
              <Text style={styles.photoCountIcon}>🎬</Text>
              <Text style={styles.photoCountText}>
                {selectedVideos.length} of {REQUIRED_VIDEOS} videos ready
              </Text>
              {selectedVideos.length >= REQUIRED_VIDEOS && (
                <Text style={styles.photoCountCheck}>✓</Text>
              )}
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

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.shuffleVideosButton}
                onPress={loadRandomVideos}
                activeOpacity={0.8}
              >
                <Text style={styles.shuffleVideosButtonText}>🔄  Shuffle Videos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedVideos.length < REQUIRED_VIDEOS && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={selectedVideos.length < REQUIRED_VIDEOS}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  ✓  Lock In Videos ({selectedVideos.length}/{REQUIRED_VIDEOS})
                </Text>
              </TouchableOpacity>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  shuffleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButtonText: {
    fontSize: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9C27B0',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },

  // Video Count Card
  photoCountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoCountIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  photoCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  photoCountCheck: {
    marginLeft: 10,
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  
  // Grid Container
  gridContainer: {
    flexGrow: 0,
    flexShrink: 1,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    borderRadius: 10,
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadgeText: {
    fontSize: 12,
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
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
    gap: 10,
  },
  shuffleVideosButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shuffleVideosButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.6)',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
