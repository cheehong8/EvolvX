import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Chip, Searchbar, SegmentedButtons, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useFirebase } from '../../contexts/FirebaseContext';

const LeaderboardScreen = ({ navigation }) => {
  const { user, api } = useAuth();
  const { getUserRankings } = useFirebase();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  
  // Filter options
  const [userFilter, setUserFilter] = useState('all'); // 'all' or 'friends'
  const [muscleGroup, setMuscleGroup] = useState('overall');
  const [ageRange, setAgeRange] = useState(null); // { min: 18, max: 30 } or null for all
  
  // Load initial data
  useEffect(() => {
    loadLeaderboard();
  }, [userFilter, muscleGroup, ageRange]);
  
  // Filter leaderboard when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLeaderboard(leaderboard);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = leaderboard.filter(entry => 
        entry.username.toLowerCase().includes(query)
      );
      setFilteredLeaderboard(filtered);
    }
  }, [searchQuery, leaderboard]);
  
  const loadLeaderboard = async () => {
    try {
      setError(null);
      setLoading(true);
      
      let endpoint = '/rankings/leaderboard';
      let params = { muscle_group: muscleGroup };
      
      // Add age range if specified
      if (ageRange) {
        params.min_age = ageRange.min;
        params.max_age = ageRange.max;
      }
      
      // Use friends endpoint if selected
      if (userFilter === 'friends') {
        endpoint = '/rankings/leaderboard/friends';
      }
      
      const response = await api.get(endpoint, { params });
      
      setLeaderboard(response.data.leaderboard);
      setFilteredLeaderboard(response.data.leaderboard);
      
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard();
  };
  
  const getRankColor = (tier) => {
    switch (tier) {
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      case 'Bronze':
        return '#CD7F32';
      default:
        return '#0099cc';
    }
  };
  
  const getInitials = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };
  
  const renderLeaderboardEntry = (entry, index) => {
    const isCurrentUser = entry.user_id === user.id;
    const rankColor = getRankColor(entry.rank_tier);
    
    return (
      <Card 
        key={entry.user_id} 
        style={[
          styles.entryCard,
          isCurrentUser && styles.currentUserCard
        ]}
      >
        <Card.Content style={styles.entryContent}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          
          <Avatar.Text 
            size={40} 
            label={getInitials(entry.username)} 
            backgroundColor={isCurrentUser ? '#0099cc' : '#e0e0e0'}
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {entry.username} {isCurrentUser && '(You)'}
            </Text>
            <Text style={styles.ageText}>Age: {entry.age}</Text>
          </View>
          
          <View style={styles.rankInfo}>
            <Text style={styles.mmrScore}>{Math.round(entry.mmr_score)}</Text>
            <Chip 
              style={[styles.rankChip, { backgroundColor: rankColor }]}
              textStyle={styles.rankChipText}
            >
              {entry.rank_tier}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  const renderMuscleGroupFilters = () => {
    const muscleGroups = ['overall', 'chest', 'back', 'legs', 'shoulders', 'arms'];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.muscleFiltersContainer}
      >
        {muscleGroups.map((group) => (
          <Chip
            key={group}
            selected={muscleGroup === group}
            onPress={() => setMuscleGroup(group)}
            style={[
              styles.filterChip,
              muscleGroup === group && styles.selectedFilterChip
            ]}
          >
            {group.charAt(0).toUpperCase() + group.slice(1)}
          </Chip>
        ))}
      </ScrollView>
    );
  };
  
  const renderAgeFilters = () => {
    const ageRanges = [
      { label: 'All Ages', value: null },
      { label: '18-30', value: { min: 18, max: 30 } },
      { label: '31-45', value: { min: 31, max: 45 } },
      { label: '46+', value: { min: 46, max: null } }
    ];
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ageFiltersContainer}
      >
        {ageRanges.map((range, index) => (
          <Chip
            key={index}
            selected={JSON.stringify(ageRange) === JSON.stringify(range.value)}
            onPress={() => setAgeRange(range.value)}
            style={[
              styles.filterChip,
              JSON.stringify(ageRange) === JSON.stringify(range.value) && styles.selectedFilterChip
            ]}
          >
            {range.label}
          </Chip>
        ))}
      </ScrollView>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Leaderboard</Title>
        <Text style={styles.headerSubtitle}>
          See how you rank against other athletes
        </Text>
      </View>
      
      <Searchbar
        placeholder="Search users"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filtersContainer}>
        <SegmentedButtons
          value={userFilter}
          onValueChange={setUserFilter}
          buttons={[
            { value: 'all', label: 'All Users' },
            { value: 'friends', label: 'Friends' }
          ]}
          style={styles.segmentedButtons}
        />
        
        {renderMuscleGroupFilters()}
        {renderAgeFilters()}
      </View>
      
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
        
        {/* Leaderboard List */}
        <View style={styles.leaderboardContainer}>
          {filteredLeaderboard.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Results Found</Title>
                {searchQuery ? (
                  <Paragraph>No users match your search. Try a different query.</Paragraph>
                ) : (
                  <Paragraph>No users found with the current filters.</Paragraph>
                )}
              </Card.Content>
            </Card>
          ) : (
            filteredLeaderboard.map(renderLeaderboardEntry)
          )}
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
  header: {
    padding: 16,
    backgroundColor: '#0099cc',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
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
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  muscleFiltersContainer: {
    paddingVertical: 8,
  },
  ageFiltersContainer: {
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  selectedFilterChip: {
    backgroundColor: '#0099cc',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  leaderboardContainer: {
    padding: 16,
    paddingTop: 8,
  },
  entryCard: {
    marginBottom: 8,
  },
  currentUserCard: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#0099cc',
  },
  entryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 30,
    marginRight: 8,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ageText: {
    fontSize: 12,
    color: '#666',
  },
  rankInfo: {
    alignItems: 'flex-end',
  },
  mmrScore: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rankChip: {
    height: 24,
  },
  rankChipText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default LeaderboardScreen;
