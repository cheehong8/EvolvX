import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, Avatar, TextInput, Switch, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { user, getProfile, updateProfile, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    gender: '',
    height: '',
    weight: ''
  });
  const [notifications, setNotifications] = useState({
    workoutReminders: true,
    friendRequests: true,
    rankChanges: true
  });
  const [error, setError] = useState(null);
  
  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);
  
  const loadProfile = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await getProfile();
      
      if (result.success) {
        setProfileData(result.data);
        setFormData({
          username: result.data.username || '',
          gender: result.data.gender || '',
          height: result.data.height ? result.data.height.toString() : '',
          weight: result.data.weight ? result.data.weight.toString() : ''
        });
      } else {
        setError('Failed to load profile data. Pull down to refresh.');
      }
      
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };
  
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      const updatedData = {
        username: formData.username,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null
      };
      
      const result = await updateProfile(updatedData);
      
      if (result.success) {
        setEditMode(false);
        await loadProfile();
      } else {
        setError('Failed to update profile. Please try again.');
      }
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      console.error('Error logging out:', err);
      setError('Failed to logout. Please try again.');
    }
  };
  
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };
  
  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Avatar.Text 
            size={80} 
            label={getInitials(profileData?.username)} 
            backgroundColor="#0099cc"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData?.username}</Text>
            <Text style={styles.profileEmail}>{profileData?.email}</Text>
            <Button 
              mode="contained" 
              style={styles.avatarButton}
              onPress={() => navigation.navigate('Avatar')}
            >
              Customize Avatar
            </Button>
          </View>
        </View>
        
        {/* Profile Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Profile Details</Title>
              <Button 
                mode="text" 
                onPress={() => setEditMode(!editMode)}
              >
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
            </View>
            
            {editMode ? (
              // Edit Mode
              <View style={styles.editForm}>
                <TextInput
                  label="Username"
                  value={formData.username}
                  onChangeText={(text) => setFormData({...formData, username: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Gender"
                  value={formData.gender}
                  onChangeText={(text) => setFormData({...formData, gender: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <View style={styles.row}>
                  <TextInput
                    label="Height (cm)"
                    value={formData.height}
                    onChangeText={(text) => setFormData({...formData, height: text})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                  
                  <TextInput
                    label="Weight (kg)"
                    value={formData.weight}
                    onChangeText={(text) => setFormData({...formData, weight: text})}
                    mode="outlined"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfInput]}
                  />
                </View>
                
                <Button 
                  mode="contained" 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  loading={loading}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </View>
            ) : (
              // View Mode
              <View style={styles.profileDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>
                    {calculateAge(profileData?.date_of_birth) || 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.gender || 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Height</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.height ? `${profileData.height} cm` : 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.weight ? `${profileData.weight} kg` : 'Not set'}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Member Since</Text>
                  <Text style={styles.detailValue}>
                    {profileData?.created_at 
                      ? new Date(profileData.created_at).toLocaleDateString() 
                      : 'Unknown'}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Notification Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notification Settings</Title>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Workout Reminders</Text>
                <Text style={styles.settingDescription}>
                  Receive reminders for scheduled workouts
                </Text>
              </View>
              <Switch
                value={notifications.workoutReminders}
                onValueChange={(value) => 
                  setNotifications({...notifications, workoutReminders: value})
                }
                color="#0099cc"
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Friend Requests</Text>
                <Text style={styles.settingDescription}>
                  Notifications for new friend requests
                </Text>
              </View>
              <Switch
                value={notifications.friendRequests}
                onValueChange={(value) => 
                  setNotifications({...notifications, friendRequests: value})
                }
                color="#0099cc"
              />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Rank Changes</Text>
                <Text style={styles.settingDescription}>
                  Get notified when your rank changes
                </Text>
              </View>
              <Switch
                value={notifications.rankChanges}
                onValueChange={(value) => 
                  setNotifications({...notifications, rankChanges: value})
                }
                color="#0099cc"
              />
            </View>
          </Card.Content>
        </Card>
        
        {/* Account Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Account</Title>
            
            <Button 
              mode="outlined" 
              style={styles.accountButton}
              icon="lock-reset"
              onPress={() => {/* Change password */}}
            >
              Change Password
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.accountButton}
              icon="export"
              onPress={() => {/* Export data */}}
            >
              Export Workout Data
            </Button>
            
            <Button 
              mode="outlined" 
              style={[styles.accountButton, styles.logoutButton]}
              icon="logout"
              onPress={handleLogout}
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>EvolvX v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 EvolvX Team</Text>
        </View>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  avatarButton: {
    marginTop: 8,
    backgroundColor: '#0099cc',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
  },
  profileDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  editForm: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#0099cc',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    backgroundColor: '#e0e0e0',
  },
  accountButton: {
    marginBottom: 12,
  },
  logoutButton: {
    borderColor: '#f44336',
    color: '#f44336',
  },
  appInfo: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
  },
  appCopyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default ProfileScreen;
