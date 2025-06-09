import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, Button, RadioButton, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AvatarScreen = ({ navigation }) => {
  const { user, api } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    body_type: 'athletic',
    hair_style: 'short',
    hair_color: 'brown',
    skin_tone: 'medium',
    outfit: 'casual',
    accessories: []
  });
  const [error, setError] = useState(null);
  
  // Avatar customization options
  const avatarOptions = {
    body_type: ['slim', 'athletic', 'muscular', 'heavy'],
    hair_style: ['short', 'medium', 'long', 'bald', 'ponytail'],
    hair_color: ['black', 'brown', 'blonde', 'red', 'gray', 'blue'],
    skin_tone: ['light', 'medium', 'tan', 'dark'],
    outfit: ['casual', 'athletic', 'formal', 'swimwear'],
    accessories: ['glasses', 'hat', 'watch', 'necklace', 'earrings', 'tattoo']
  };
  
  // Load avatar data
  useEffect(() => {
    loadAvatar();
  }, []);
  
  const loadAvatar = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await api.get(`/avatar/${user.id}`);
      
      if (response.data) {
        setAvatar(response.data);
        setSelectedOptions({
          body_type: response.data.body_type || 'athletic',
          hair_style: response.data.hair_style || 'short',
          hair_color: response.data.hair_color || 'brown',
          skin_tone: response.data.skin_tone || 'medium',
          outfit: response.data.outfit || 'casual',
          accessories: response.data.accessories || []
        });
      }
      
    } catch (err) {
      // If avatar doesn't exist yet, that's okay
      if (err.response && err.response.status === 404) {
        // Use default options
      } else {
        console.error('Error loading avatar:', err);
        setError('Failed to load avatar. Pull down to refresh.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadAvatar();
  };
  
  const handleSaveAvatar = async () => {
    try {
      setLoading(true);
      
      await api.put(`/avatar/${user.id}`, selectedOptions);
      
      // Refresh avatar data
      await loadAvatar();
      
      // Navigate back to profile
      navigation.goBack();
      
    } catch (err) {
      console.error('Error saving avatar:', err);
      setError('Failed to save avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptionSelect = (category, value) => {
    setSelectedOptions({
      ...selectedOptions,
      [category]: value
    });
  };
  
  const handleAccessoryToggle = (accessory) => {
    const currentAccessories = [...selectedOptions.accessories];
    
    if (currentAccessories.includes(accessory)) {
      // Remove accessory
      const updatedAccessories = currentAccessories.filter(item => item !== accessory);
      setSelectedOptions({
        ...selectedOptions,
        accessories: updatedAccessories
      });
    } else {
      // Add accessory
      setSelectedOptions({
        ...selectedOptions,
        accessories: [...currentAccessories, accessory]
      });
    }
  };
  
  const renderOptionSelector = (title, category, options) => {
    return (
      <Card style={styles.optionCard}>
        <Card.Content>
          <Title style={styles.optionTitle}>{title}</Title>
          
          <RadioButton.Group
            onValueChange={value => handleOptionSelect(category, value)}
            value={selectedOptions[category]}
          >
            <View style={styles.optionsGrid}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionItem}
                  onPress={() => handleOptionSelect(category, option)}
                >
                  <RadioButton.Android value={option} />
                  <Text style={styles.optionText}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>
    );
  };
  
  const renderAccessories = () => {
    return (
      <Card style={styles.optionCard}>
        <Card.Content>
          <Title style={styles.optionTitle}>Accessories</Title>
          
          <View style={styles.accessoriesContainer}>
            {avatarOptions.accessories.map((accessory) => (
              <Chip
                key={accessory}
                selected={selectedOptions.accessories.includes(accessory)}
                onPress={() => handleAccessoryToggle(accessory)}
                style={[
                  styles.accessoryChip,
                  selectedOptions.accessories.includes(accessory) && styles.selectedAccessory
                ]}
                selectedColor="#ffffff"
              >
                {accessory.charAt(0).toUpperCase() + accessory.slice(1)}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderAvatarPreview = () => {
    // In a real app, this would render an actual avatar preview
    // For this implementation, we'll use a placeholder
    return (
      <Card style={styles.previewCard}>
        <Card.Content style={styles.previewContent}>
          <Title style={styles.previewTitle}>Avatar Preview</Title>
          
          <View style={styles.avatarPreview}>
            <Icon name="account" size={120} color="#0099cc" />
            
            <View style={styles.previewDetails}>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Body: </Text>
                {selectedOptions.body_type.charAt(0).toUpperCase() + selectedOptions.body_type.slice(1)}
              </Text>
              
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Hair: </Text>
                {selectedOptions.hair_style.charAt(0).toUpperCase() + selectedOptions.hair_style.slice(1)}, 
                {selectedOptions.hair_color.charAt(0).toUpperCase() + selectedOptions.hair_color.slice(1)}
              </Text>
              
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Skin: </Text>
                {selectedOptions.skin_tone.charAt(0).toUpperCase() + selectedOptions.skin_tone.slice(1)}
              </Text>
              
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Outfit: </Text>
                {selectedOptions.outfit.charAt(0).toUpperCase() + selectedOptions.outfit.slice(1)}
              </Text>
              
              {selectedOptions.accessories.length > 0 && (
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Accessories: </Text>
                  {selectedOptions.accessories.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
                </Text>
              )}
            </View>
          </View>
          
          <Paragraph style={styles.previewNote}>
            Your avatar will be visible to friends and on the leaderboard.
          </Paragraph>
        </Card.Content>
      </Card>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading avatar customization...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Error Message */}
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}
        
        {/* Avatar Preview */}
        {renderAvatarPreview()}
        
        {/* Customization Options */}
        {renderOptionSelector('Body Type', 'body_type', avatarOptions.body_type)}
        {renderOptionSelector('Hair Style', 'hair_style', avatarOptions.hair_style)}
        {renderOptionSelector('Hair Color', 'hair_color', avatarOptions.hair_color)}
        {renderOptionSelector('Skin Tone', 'skin_tone', avatarOptions.skin_tone)}
        {renderOptionSelector('Outfit', 'outfit', avatarOptions.outfit)}
        {renderAccessories()}
        
        {/* Save Button */}
        <Button 
          mode="contained" 
          style={styles.saveButton}
          onPress={handleSaveAvatar}
          loading={loading}
          disabled={loading}
        >
          Save Avatar
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  previewCard: {
    margin: 16,
    marginBottom: 8,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  avatarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  previewDetails: {
    marginLeft: 16,
    flex: 1,
  },
  previewText: {
    fontSize: 14,
    marginBottom: 4,
  },
  previewLabel: {
    fontWeight: 'bold',
  },
  previewNote: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
  optionCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  optionText: {
    marginLeft: 8,
  },
  accessoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accessoryChip: {
    margin: 4,
  },
  selectedAccessory: {
    backgroundColor: '#0099cc',
  },
  saveButton: {
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#0099cc',
    paddingVertical: 8,
  },
});

export default AvatarScreen;
