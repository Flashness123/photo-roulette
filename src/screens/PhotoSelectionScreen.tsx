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
  Switch,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import ImageLabeling from '@react-native-ml-kit/image-labeling';
import Colors from '../theme/colors';

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
const backgroundImage = require('../assets/background.png');

const getGridLayout = (requiredPhotos: number) => {
  if (requiredPhotos >= 36) return { columns: 6, rows: 6 };
  if (requiredPhotos >= 25) return { columns: 5, rows: 5 };
  return { columns: 4, rows: 4 };
};

export const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const { numRounds = 20, requiredPhotos = 16 } = route.params || {};
  
  const gridLayout = getGridLayout(requiredPhotos);
  const GRID_PADDING = 16;
  const PHOTO_SPACING = 6;
  const TOTAL_SPACING = GRID_PADDING * 2 + PHOTO_SPACING * (gridLayout.columns - 1);
  const PHOTO_SIZE = (width - TOTAL_SPACING - 16) / gridLayout.columns;
  
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [allPhotosCache, setAllPhotosCache] = useState<PhotoAsset[]>([]);
  const [prioritizePeople, setPrioritizePeople] = useState(false);

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
            message: 'Pic Roulette needs access to your photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          loadRandomPhotos();
        } else {
          Alert.alert('Permission Required', 'We need gallery access to load photos.', 
            [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to request permission');
      }
    } else {
      setHasPermission(true);
      loadRandomPhotos();
    }
  };

  const loadRandomPhotos = async () => {
    setLoading(true);
    setLoadingMessage('Loading photos...');
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
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const detectPeopleInPhoto = async (uri: string): Promise<{ hasPeople: boolean; confidence: number }> => {
    try {
      const labels = await ImageLabeling.label(uri);
      const personLabels = ['Person', 'People', 'Human', 'Man', 'Woman', 'Boy', 'Girl', 
                           'Child', 'Crowd', 'Portrait', 'Selfie', 'Face', 'Smile'];
      
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
      return { hasPeople: false, confidence: 0 };
    }
  };

  const loadPhotosWithPeople = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Scanning for people...');
    
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
        Alert.alert('No Photos', 'No photos found.');
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
        setLoadingMessage(`Found ${photosWithPeople.length}/${requiredPhotos}`);
        
        const result = await detectPeopleInPhoto(photo.uri);
        
        if (result.hasPeople) {
          photosWithPeople.push({ ...photo, hasPeople: true, personConfidence: result.confidence });
          
          if (photosWithPeople.length >= requiredPhotos) {
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
      
    } catch (error) {
      Alert.alert('Error', 'Scan failed. Loading random photos.');
      loadRandomPhotos();
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleReshuffle = () => {
    if (prioritizePeople) {
      loadPhotosWithPeople();
    } else {
      loadRandomPhotos();
    }
  };

  const handleConfirm = async () => {
    if (selectedPhotos.length < requiredPhotos) {
      Alert.alert('Not Enough Photos', `Need ${requiredPhotos} photos.`);
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
        Alert.alert('Error', 'Failed to lock photos.');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection error.');
    }
  };

  const renderPhoto = ({ item, index }: { item: PhotoAsset; index: number }) => (
    <View style={[styles.photoContainer, { width: PHOTO_SIZE + PHOTO_SPACING, height: PHOTO_SIZE + PHOTO_SPACING }]}>
      <Image source={{ uri: item.uri }} style={[styles.photo, { width: PHOTO_SIZE, height: PHOTO_SIZE }]} />
      {item.hasPeople && (
        <View style={styles.personBadge} />
      )}
    </View>
  );

  if (!hasPermission && !loading) {
    return (
      <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.overlay} />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Gallery Access Needed</Text>
          <Text style={styles.permissionSubtext}>We need access to your photos for the game.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{requiredPhotos} Photos</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <Text style={styles.loadingTitle}>Scanning</Text>
              <Text style={styles.loadingText}>{loadingMessage}</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Photo Grid */}
            <View style={styles.gridContainer}>
              <FlatList
                data={selectedPhotos}
                renderItem={renderPhoto}
                keyExtractor={(item, index) => `${item.uri}-${index}`}
                numColumns={gridLayout.columns}
                key={`grid-${gridLayout.columns}`}
                contentContainerStyle={styles.photoGrid}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Prioritize People Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Prioritize photos with people</Text>
              <Switch
                value={prioritizePeople}
                onValueChange={setPrioritizePeople}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.purple }}
                thumbColor={prioritizePeople ? Colors.pink : '#f4f3f4'}
              />
            </View>

            {/* Yes/No Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.noButton} onPress={handleReshuffle} activeOpacity={0.8}>
                <Text style={styles.buttonText}>No</Text>
                <Text style={styles.buttonSubtext}>Reshuffle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.yesButton, selectedPhotos.length < requiredPhotos && styles.buttonDisabled]} 
                onPress={handleConfirm}
                disabled={selectedPhotos.length < requiredPhotos}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Yes</Text>
                <Text style={styles.buttonSubtext}>Lock In</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 44,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    color: Colors.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSpacer: {
    width: 44,
  },
  
  // Grid Container
  gridContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  photoGrid: {
    padding: 8,
    alignItems: 'center',
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
  personBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.cyan,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  
  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  toggleLabel: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Button Row
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  noButton: {
    flex: 1,
    backgroundColor: Colors.blue,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  yesButton: {
    flex: 1,
    backgroundColor: Colors.pink,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(150, 150, 150, 0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    backgroundColor: Colors.darkPurple,
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    width: '90%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.purple,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textLight,
    marginBottom: 28,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.pink,
    borderRadius: 4,
  },
  
  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.pink,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
