import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, DataTable, FAB, ActivityIndicator, IconButton, Searchbar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const WorkoutScreen = ({ navigation }) => {
  const { api } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWorkouts, setFilteredWorkouts] = useState([]);
  const [error, setError] = useState(null);
  
  // Load initial data
  useEffect(() => {
    loadWorkouts();
  }, []);
  
  // Filter workouts when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWorkouts(workouts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = workouts.filter(workout => 
        workout.workout_name.toLowerCase().includes(query) ||
        new Date(workout.workout_date).toLocaleDateString().includes(query) ||
        workout.exercises.some(ex => ex.name.toLowerCase().includes(query))
      );
      setFilteredWorkouts(filtered);
    }
  }, [searchQuery, workouts]);
  
  const loadWorkouts = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await api.get('/workouts', {
        params: { page: 1, per_page: 50 }
      });
      
      setWorkouts(response.data.workouts);
      setFilteredWorkouts(response.data.workouts);
      
    } catch (err) {
      console.error('Error loading workouts:', err);
      setError('Failed to load workouts. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };
  
  const handleDeleteWorkout = (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/workouts/${workoutId}`);
              // Remove workout from state
              const updatedWorkouts = workouts.filter(w => w.workout_id !== workoutId);
              setWorkouts(updatedWorkouts);
              setFilteredWorkouts(updatedWorkouts);
            } catch (err) {
              console.error('Error deleting workout:', err);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const renderWorkoutCard = (workout) => {
    const date = new Date(workout.workout_date).toLocaleDateString();
    const exerciseCount = workout.exercises.length;
    
    // Group exercises by muscle group
    const muscleGroups = {};
    workout.exercises.forEach(exercise => {
      if (!muscleGroups[exercise.muscle_group]) {
        muscleGroups[exercise.muscle_group] = 0;
      }
      muscleGroups[exercise.muscle_group]++;
    });
    
    return (
      <Card 
        key={workout.workout_id} 
        style={styles.workoutCard}
        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.workout_id })}
      >
        <Card.Content>
          <View style={styles.workoutHeader}>
            <Title>{workout.workout_name}</Title>
            <View style={styles.workoutActions}>
              <IconButton 
                icon="pencil" 
                size={20} 
                onPress={() => navigation.navigate('CreateWorkout', { workoutId: workout.workout_id })} 
              />
              <IconButton 
                icon="delete" 
                size={20} 
                onPress={() => handleDeleteWorkout(workout.workout_id)} 
              />
            </View>
          </View>
          
          <Paragraph style={styles.dateText}>{date}</Paragraph>
          
          <View style={styles.workoutStats}>
            <Text>{exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''}</Text>
            {workout.duration && <Text>{workout.duration} min</Text>}
          </View>
          
          <View style={styles.muscleGroupsContainer}>
            {Object.entries(muscleGroups).map(([group, count], index) => (
              <Chip key={index} style={styles.muscleChip}>
                {group} ({count})
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading your workouts...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Search workouts"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
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
        
        {/* Workouts List */}
        <View style={styles.workoutsContainer}>
          {filteredWorkouts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title style={styles.emptyTitle}>No Workouts Found</Title>
                {searchQuery ? (
                  <Paragraph>No workouts match your search. Try a different query.</Paragraph>
                ) : (
                  <Paragraph>Start your fitness journey by creating your first workout!</Paragraph>
                )}
                <Button 
                  mode="contained" 
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CreateWorkout')}
                >
                  Create Workout
                </Button>
              </Card.Content>
            </Card>
          ) : (
            filteredWorkouts.map(renderWorkoutCard)
          )}
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateWorkout')}
      />
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
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  workoutsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  workoutCard: {
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutActions: {
    flexDirection: 'row',
  },
  dateText: {
    color: '#666',
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  muscleGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  muscleChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#e0f2f7',
  },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  createButton: {
    marginTop: 16,
    backgroundColor: '#0099cc',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#0099cc',
  },
});

export default WorkoutScreen;
