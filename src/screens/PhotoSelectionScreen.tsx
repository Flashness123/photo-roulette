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

interface PhotoSelectionScreenProps {
  route: any;
  navigation: any;
}

interface PhotoAsset {
  uri: string;
  timestamp: number;
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 4; // 4 columns with padding

export const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

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

      // Randomly select 16 photos
      const shuffled = [...allPhotos].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(16, allPhotos.length));
      
      setSelectedPhotos(selected);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos from gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedPhotos.length < 16) {
      Alert.alert(
        'Not Enough Photos',
        `You need 16 photos but only ${selectedPhotos.length} were found. Please add more photos to your gallery.`
      );
      return;
    }

    try {
      const { room, player } = route.params;
      
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
        Alert.alert(
          'Photos Locked In! ✓',
          `Successfully selected ${selectedPhotos.length} random photos.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Pass photos back to room screen
                navigation.navigate('Room', {
                  room,
                  player,
                  selectedPhotos: selectedPhotos.map(p => p.uri),
                });
              },
            },
          ]
        );
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
        <Text style={styles.title}>Your 16 Photos</Text>
        <TouchableOpacity onPress={loadRandomPhotos}>
          <Text style={styles.shuffleButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Loading random photos...</Text>
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
                {selectedPhotos.length} of 16 photos selected
              </Text>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                selectedPhotos.length < 16 && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedPhotos.length < 16}
            >
              <Text style={styles.confirmButtonText}>
                ✓ Lock In Photos ({selectedPhotos.length}/16)
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  confirmButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginVertical: 20,
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
