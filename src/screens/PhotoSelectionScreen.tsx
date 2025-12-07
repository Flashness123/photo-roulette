import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 4; // 4 photos per row with padding

interface PhotoSelectionScreenProps {
  route: any;
  navigation: any;
}

export const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
  route,
  navigation,
}) => {
  const { room, player } = route.params;
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRandomPhotos();
  }, []);

  const requestPermissions = async () => {
    const result = await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
    if (result !== RESULTS.GRANTED) {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access photos'
      );
      return false;
    }
    return true;
  };

  const loadRandomPhotos = async () => {
    setIsLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      // Use image picker to access gallery
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 0, // Allow multiple selection
        quality: 0.8,
      });

      if (result.assets && result.assets.length > 0) {
        // Randomly sample up to 16 photos
        const allPhotos = result.assets.map((asset) => asset.uri || '');
        const shuffled = allPhotos.sort(() => Math.random() - 0.5);
        const sampled = shuffled.slice(0, 16);
        setPhotos(sampled);
        setSelectedPhotos([]);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoPress = (uri: string) => {
    if (selectedPhotos.includes(uri)) {
      setSelectedPhotos(selectedPhotos.filter((p) => p !== uri));
    } else {
      if (selectedPhotos.length < 16) {
        setSelectedPhotos([...selectedPhotos, uri]);
      }
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedPhotos.length !== 16) {
      Alert.alert(
        'Selection Required',
        `Please select exactly 16 photos (currently ${selectedPhotos.length})`
      );
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Upload photos to backend
      // For now, just navigate back with success
      Alert.alert('Success', 'Photos locked in!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error confirming photos:', error);
      Alert.alert('Error', 'Failed to save photos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select 16 Photos</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Selection Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {selectedPhotos.length} / 16 selected
        </Text>
        <TouchableOpacity
          style={styles.reshuffleButton}
          onPress={loadRandomPhotos}
          disabled={isLoading}
        >
          <Text style={styles.reshuffleText}>🔄 Resample</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item, index) => `${item}-${index}`}
          numColumns={4}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item }) => {
            const isSelected = selectedPhotos.includes(item);
            return (
              <TouchableOpacity
                style={[
                  styles.photoContainer,
                  isSelected && styles.selectedPhotoContainer,
                ]}
                onPress={() => handlePhotoPress(item)}
              >
                <Image source={{ uri: item }} style={styles.photo} />
                {isSelected && (
                  <View style={styles.selectedOverlay}>
                    <Text style={styles.selectedNumber}>
                      {selectedPhotos.indexOf(item) + 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Confirm Button */}
      {selectedPhotos.length === 16 && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmSelection}
          disabled={isLoading}
        >
          <Text style={styles.confirmButtonText}>
            ✓ Confirm Selection
          </Text>
        </TouchableOpacity>
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
  },
  backButton: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reshuffleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reshuffleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  gridContainer: {
    padding: 10,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedPhotoContainer: {
    borderColor: '#E91E63',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E91E63',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  selectedNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
