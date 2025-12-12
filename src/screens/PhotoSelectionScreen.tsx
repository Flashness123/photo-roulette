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
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
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

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 4; // 4 columns with padding

export const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  // Get required photos from route params (defaults: 16 photos, based on round count)
  const { numRounds = 20, requiredPhotos = 16 } = route.params || {};
  
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading random photos...');
  const [loadingProgress, setLoadingProgress] = useState(0); // 0-100
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
            message: 'Photo Roulette needs access to your photos to select 16 random images for the game.',
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
      // iOS doesn't need explicit runtime permission for read access
      setHasPermission(true);
      loadRandomPhotos();
    }
  };

  const loadRandomPhotos = async () => {
    setLoading(true);
    setLoadingMessage('Loading random photos...');
    try {
      // Get all photos from camera roll
      const photos = await CameraRoll.getPhotos({
        first: 1000, // Load up to 1000 photos
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

      // Cache all photos for face detection later
      setAllPhotosCache(allPhotos);

      // Randomly select required number of photos based on round count
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

  // Detect people in a photo using ML Kit Image Labeling
  // This detects "Person", "People", "Human", "Man", "Woman", "Child", etc.
  const detectPeopleInPhoto = async (uri: string): Promise<{ hasPeople: boolean; confidence: number }> => {
    try {
      const labels = await ImageLabeling.label(uri);
      
      // Look for person-related labels
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

  // Load photos prioritizing those with people
  const loadPhotosWithPeople = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Scanning for photos with people...');
    
    try {
      let photosToScan = allPhotosCache;
      
      // If cache is empty, load photos first
      if (photosToScan.length === 0) {
        const photos = await CameraRoll.getPhotos({
          first: 500, // Load up to 500 photos to sample from
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

      // Randomly select 200 photos from the gallery to scan
      const shuffled = [...photosToScan].sort(() => Math.random() - 0.5);
      const maxToScan = 200;
      const photosToCheck = shuffled.slice(0, Math.min(maxToScan, shuffled.length));
      const photosWithPeople: PhotoAsset[] = [];
      const photosWithoutPeople: PhotoAsset[] = [];
      
      // Scan until we find enough photos with people OR we've checked all 200
      for (let i = 0; i < photosToCheck.length; i++) {
        const photo = photosToCheck[i];
        
        // Update progress based on how many we've scanned
        const progress = Math.round(((i + 1) / photosToCheck.length) * 100);
        setLoadingProgress(progress);
        setLoadingMessage(`Found ${photosWithPeople.length}/${requiredPhotos} • Scanning ${i + 1}/${photosToCheck.length}`);
        
        const result = await detectPeopleInPhoto(photo.uri);
        
        if (result.hasPeople) {
          photosWithPeople.push({ ...photo, hasPeople: true, personConfidence: result.confidence });
          
          // Stop scanning once we have enough photos with people
          if (photosWithPeople.length >= requiredPhotos) {
            setLoadingProgress(100);
            setLoadingMessage(`Found ${requiredPhotos} photos with people!`);
            break;
          }
        } else {
          photosWithoutPeople.push({ ...photo, hasPeople: false, personConfidence: 0 });
        }
      }

      // Combine: prioritize photos with people, fill remaining with others
      let selected: PhotoAsset[] = [];
      
      if (photosWithPeople.length >= requiredPhotos) {
        // Sort by confidence (higher confidence = clearer person detection)
        selected = photosWithPeople
          .sort((a, b) => (b.personConfidence || 0) - (a.personConfidence || 0))
          .slice(0, requiredPhotos);
      } else {
        // Use all photos with people + fill with random others
        selected = [
          ...photosWithPeople,
          ...photosWithoutPeople.slice(0, requiredPhotos - photosWithPeople.length),
        ];
      }

      setSelectedPhotos(selected);
      
      const peoplePhotoCount = selected.filter(p => p.hasPeople).length;
      Alert.alert(
        'Scan Complete',
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
      
      // Call API to lock photos
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
        // Navigate directly without alert
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

  const renderPhoto = ({ item }: { item: PhotoAsset }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </View>
  );

  if (!hasPermission && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷</Text>
          <Text style={styles.permissionTitle}>Gallery Permission Needed</Text>
          <Text style={styles.permissionSubtext}>
            We need access to your photos to select 16 random images.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={requestPermission}
          >
            <Text style={styles.confirmButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your {requiredPhotos} Photos</Text>
        <TouchableOpacity onPress={loadRandomPhotos}>
          <Text style={styles.shuffleButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingEmoji}>🔍</Text>
            <Text style={styles.loadingTitle}>Scanning Photos</Text>
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            
            {/* Nice Progress Bar */}
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
          <FlatList
            data={selectedPhotos}
            renderItem={renderPhoto}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            numColumns={4}
            contentContainerStyle={styles.photoGrid}
            ListHeaderComponent={
              <Text style={styles.gridHeader}>
                {selectedPhotos.length} of {requiredPhotos} photos selected
              </Text>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.faceDetectionButton}
              onPress={loadPhotosWithPeople}
            >
              <Text style={styles.faceDetectionButtonText}>
                👤 Prioritize Photos with People
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedPhotos.length < requiredPhotos && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedPhotos.length < requiredPhotos}
            >
              <Text style={styles.confirmButtonText}>
                ✓ Lock In Photos ({selectedPhotos.length}/{requiredPhotos})
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  shuffleButton: {
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 6,
  },
  progressText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  photoGrid: {
    padding: 10,
  },
  gridHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    padding: 5,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  faceDetectionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  faceDetectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
