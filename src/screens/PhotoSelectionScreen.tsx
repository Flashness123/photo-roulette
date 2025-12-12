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
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import ImageLabeling from '@react-native-ml-kit/image-labeling';

interface PhotoSelectionScreenProps {
  route: any;
  navigation: any;
}

interface PhotoAsset {
  uri: string;
  timestamp: number;
  hasPeople?: boolean;
  personConfidence?: number;
}

const { width, height } = Dimensions.get('window');
const backgroundImage = require('../assets/friends2.jpg');

// Calculate columns and photo size based on required photos
const getGridLayout = (requiredPhotos: number) => {
  // 16 photos = 4x4, 25 photos = 5x5, 36 photos = 6x6
  if (requiredPhotos >= 36) return { columns: 6, rows: 6 };
  if (requiredPhotos >= 25) return { columns: 5, rows: 5 };
  return { columns: 4, rows: 4 };
};

export const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const { numRounds = 20, requiredPhotos = 16 } = route.params || {};
  
  // Calculate grid layout
  const gridLayout = getGridLayout(requiredPhotos);
  const GRID_PADDING = 16;
  const PHOTO_SPACING = 6;
  const TOTAL_SPACING = GRID_PADDING * 2 + PHOTO_SPACING * (gridLayout.columns - 1);
  const PHOTO_SIZE = (width - TOTAL_SPACING - 16) / gridLayout.columns;
  
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading random photos...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [allPhotosCache, setAllPhotosCache] = useState<PhotoAsset[]>([]);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Gallery Permission',
            message: 'Pic Roulette needs access to your photos to select random images for the game.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadRandomPhotos();
        } else {
          Alert.alert(
            'Permission Required',
            'We need gallery access to load photos for the game.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (err) {
        console.error('Permission error:', err);
        Alert.alert('Error', 'Failed to request permission');
      }
    } else {
      setHasPermission(true);
      loadRandomPhotos();
    }
  };

  const loadRandomPhotos = async () => {
    setLoading(true);
    setLoadingMessage('Loading random photos...');
    try {
      const photos = await CameraRoll.getPhotos({
        first: 1000,
        assetType: 'Photos',
      });

      const allPhotos = photos.edges.map(edge => ({
        uri: edge.node.image.uri,
        timestamp: edge.node.timestamp,
      }));

      if (allPhotos.length === 0) {
        Alert.alert('No Photos', 'No photos found in your gallery.');
        setLoading(false);
        return;
      }

      setAllPhotosCache(allPhotos);

      const shuffled = [...allPhotos].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(requiredPhotos, allPhotos.length));
      
      setSelectedPhotos(selected);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos from gallery');
    } finally {
      setLoading(false);
    }
  };

  const detectPeopleInPhoto = async (uri: string): Promise<{ hasPeople: boolean; confidence: number }> => {
    try {
      const labels = await ImageLabeling.label(uri);
      
      const personLabels = ['Person', 'People', 'Human', 'Man', 'Woman', 'Boy', 'Girl', 
                           'Child', 'Crowd', 'Portrait', 'Selfie', 'Face', 'Smile',
                           'Human body', 'Human face', 'Human head'];
      
      let maxConfidence = 0;
      let foundPerson = false;
      
      for (const label of labels) {
        const labelText = label.text.toLowerCase();
        for (const personLabel of personLabels) {
          if (labelText.includes(personLabel.toLowerCase())) {
            foundPerson = true;
            maxConfidence = Math.max(maxConfidence, label.confidence);
          }
        }
      }
      
      return { hasPeople: foundPerson, confidence: maxConfidence };
    } catch (error) {
      console.log('Label detection failed for:', uri, error);
      return { hasPeople: false, confidence: 0 };
    }
  };

  const loadPhotosWithPeople = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Scanning for photos with people...');
    
    try {
      let photosToScan = allPhotosCache;
      
      if (photosToScan.length === 0) {
        const photos = await CameraRoll.getPhotos({
          first: 500,
          assetType: 'Photos',
        });
        
        photosToScan = photos.edges.map(edge => ({
          uri: edge.node.image.uri,
          timestamp: edge.node.timestamp,
        }));
        
        setAllPhotosCache(photosToScan);
      }

      if (photosToScan.length === 0) {
        Alert.alert('No Photos', 'No photos found in your gallery.');
        setLoading(false);
        return;
      }

      const shuffled = [...photosToScan].sort(() => Math.random() - 0.5);
      const maxToScan = 200;
      const photosToCheck = shuffled.slice(0, Math.min(maxToScan, shuffled.length));
      const photosWithPeople: PhotoAsset[] = [];
      const photosWithoutPeople: PhotoAsset[] = [];
      
      for (let i = 0; i < photosToCheck.length; i++) {
        const photo = photosToCheck[i];
        
        const progress = Math.round(((i + 1) / photosToCheck.length) * 100);
        setLoadingProgress(progress);
        setLoadingMessage(`Found ${photosWithPeople.length}/${requiredPhotos} • Scanning ${i + 1}/${photosToCheck.length}`);
        
        const result = await detectPeopleInPhoto(photo.uri);
        
        if (result.hasPeople) {
          photosWithPeople.push({ ...photo, hasPeople: true, personConfidence: result.confidence });
          
          if (photosWithPeople.length >= requiredPhotos) {
            setLoadingProgress(100);
            setLoadingMessage(`Found ${requiredPhotos} photos with people!`);
            break;
          }
        } else {
          photosWithoutPeople.push({ ...photo, hasPeople: false, personConfidence: 0 });
        }
      }

      let selected: PhotoAsset[] = [];
      
      if (photosWithPeople.length >= requiredPhotos) {
        selected = photosWithPeople
          .sort((a, b) => (b.personConfidence || 0) - (a.personConfidence || 0))
          .slice(0, requiredPhotos);
      } else {
        selected = [
          ...photosWithPeople,
          ...photosWithoutPeople.slice(0, requiredPhotos - photosWithPeople.length),
        ];
      }

      setSelectedPhotos(selected);
      
      const peoplePhotoCount = selected.filter(p => p.hasPeople).length;
      Alert.alert(
        '✅ Scan Complete',
        `Found ${peoplePhotoCount} photos with people out of ${requiredPhotos} selected.`
      );
      
    } catch (error) {
      console.error('Error during people detection:', error);
      Alert.alert('Error', 'People detection failed. Loading random photos instead.');
      loadRandomPhotos();
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleConfirm = async () => {
    if (selectedPhotos.length < requiredPhotos) {
      Alert.alert(
        'Not Enough Photos',
        `You need ${requiredPhotos} photos but only ${selectedPhotos.length} were found. Please add more photos to your gallery.`
      );
      return;
    }

    try {
      const { room, player, numRounds } = route.params;
      
      const response = await fetch(
        `https://photo-roulette-production-b12d.up.railway.app/api/rooms/${room.id}/lock-photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerId: player.id,
            photoCount: selectedPhotos.length 
          }),
        }
      );

      if (response.ok) {
        navigation.navigate('Room', {
          room,
          player,
          selectedPhotos: selectedPhotos.map(p => p.uri),
          numRounds,
        });
      } else {
        Alert.alert('Error', 'Failed to lock in photos. Please try again.');
      }
    } catch (error) {
      console.error('Error locking photos:', error);
      Alert.alert('Error', 'Failed to lock in photos. Please check your connection.');
    }
  };

  const renderPhoto = ({ item, index }: { item: PhotoAsset; index: number }) => (
    <View style={[styles.photoContainer, { width: PHOTO_SIZE + PHOTO_SPACING, height: PHOTO_SIZE + PHOTO_SPACING }]}>
      <Image source={{ uri: item.uri }} style={[styles.photo, { width: PHOTO_SIZE, height: PHOTO_SIZE }]} />
      {item.hasPeople && (
        <View style={styles.personBadge}>
          <Text style={styles.personBadgeText}>👤</Text>
        </View>
      )}
    </View>
  );

  if (!hasPermission && !loading) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        blurRadius={8}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.overlay} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Gallery Access Needed</Text>
          <Text style={styles.permissionSubtext}>
            We need access to your photos to select images for the game.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>🔓  Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

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
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Select Your</Text>
            <Text style={styles.headerTitle}>{requiredPhotos} Photos</Text>
          </View>
          <TouchableOpacity 
            style={styles.shuffleButton}
            onPress={loadRandomPhotos}
          >
            <Text style={styles.shuffleButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingEmoji}>🔍</Text>
              <Text style={styles.loadingTitle}>Scanning Photos</Text>
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
            {/* Photo Count Card */}
            <View style={styles.photoCountCard}>
              <Text style={styles.photoCountIcon}>📸</Text>
              <Text style={styles.photoCountText}>
                {selectedPhotos.length} of {requiredPhotos} photos ready
              </Text>
              {selectedPhotos.length >= requiredPhotos && (
                <Text style={styles.photoCountCheck}>✓</Text>
              )}
            </View>

            {/* Photo Grid */}
            <View style={styles.gridContainer}>
              <FlatList
                data={selectedPhotos}
                renderItem={renderPhoto}
                keyExtractor={(item, index) => `${item.uri}-${index}`}
                numColumns={gridLayout.columns}
                key={`grid-${gridLayout.columns}`}
                contentContainerStyle={[styles.photoGrid, { alignItems: 'center' }]}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.peopleButton}
                onPress={loadPhotosWithPeople}
                activeOpacity={0.8}
              >
                <Text style={styles.peopleButtonText}>👤  Prioritize Photos with People</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  selectedPhotos.length < requiredPhotos && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={selectedPhotos.length < requiredPhotos}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  ✓  Lock In Photos ({selectedPhotos.length}/{requiredPhotos})
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  shuffleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButtonText: {
    fontSize: 22,
  },
  
  // Photo Count Card
  photoCountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  photoCountIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 10,
  },
  personBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personBadgeText: {
    fontSize: 12,
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
    gap: 10,
  },
  peopleButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  peopleButtonText: {
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
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingEmoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 7,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 7,
  },
  progressText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  
  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
