// screens/main/CreateWorkoutScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  LayoutAnimation, 
  UIManager,   
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  IconButton,
  Divider,
  Chip,
  Surface,
  ProgressBar,
  Portal,
  Modal,
  Searchbar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


/* ──────────────────────────────────────────────────────────
   Exercise catalogue with categories
   ────────────────────────────────────────────────────────── */
const EXERCISE_CATEGORIES = {
  'Chest': {
    icon: 'arm-flex',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF5252'],
    exercises: [
      { name: 'Bench Press', icon: 'weight-lifter', description: 'Compound chest exercise' },
      { name: 'Incline Bench Press', icon: 'trending-up', description: 'Upper chest focus' },
      { name: 'Decline Bench Press', icon: 'trending-down', description: 'Lower chest focus' },
      { name: 'Dumbbell Fly', icon: 'arrow-expand-horizontal', description: 'Chest isolation' },
      { name: 'Push-Up', icon: 'arrow-collapse-down', description: 'Bodyweight exercise' },
      { name: 'Cable Fly', icon: 'vector-combine', description: 'Cable isolation' },
      { name: 'Dips', icon: 'arrow-down-bold', description: 'Compound movement' },
      { name: 'Chest Press Machine', icon: 'dumbbell', description: 'Machine exercise' },
      { name: 'Cable Crossover', icon: 'arrow-expand-all', description: 'Cable exercise' },
      { name: 'Pec Deck', icon: 'butterfly', description: 'Machine isolation' },
    ]
  },
  'Back': {
    icon: 'human-handsdown',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A3AA'],
    exercises: [
      { name: 'Pull-Up', icon: 'arrow-up-bold', description: 'Compound back exercise' },
      { name: 'Deadlift', icon: 'weight-pound', description: 'Full body compound' },
      { name: 'Lat Pulldown', icon: 'arrow-down-thick', description: 'Lat focused' },
      { name: 'Bent Over Row', icon: 'rowing', description: 'Middle back exercise' },
      { name: 'T-Bar Row', icon: 'format-align-center', description: 'Back thickness' },
      { name: 'Cable Row', icon: 'arrow-left-thick', description: 'Seated cable row' },
      { name: 'Face Pulls', icon: 'account-arrow-right', description: 'Rear delts' },
      { name: 'Shrugs', icon: 'shoulder-purse', description: 'Trap exercise' },
      { name: 'Chin-Up', icon: 'arrow-up', description: 'Underhand pull-up' },
      { name: 'Single Arm Row', icon: 'arm-flex-outline', description: 'Unilateral row' },
    ]
  },
  'Legs': {
    icon: 'run-fast',
    color: '#45B7D1',
    gradient: ['#45B7D1', '#3498DB'],
    exercises: [
      { name: 'Squat', icon: 'arrow-down-bold-circle', description: 'King of leg exercises' },
      { name: 'Leg Press', icon: 'slope-downhill', description: 'Machine exercise' },
      { name: 'Lunge', icon: 'walk', description: 'Unilateral exercise' },
      { name: 'Leg Curl', icon: 'sync', description: 'Hamstring isolation' },
      { name: 'Leg Extension', icon: 'angle-right', description: 'Quad isolation' },
      { name: 'Calf Raise', icon: 'stairs-up', description: 'Calf isolation' },
      { name: 'Romanian Deadlift', icon: 'human-handsdown', description: 'Hamstring focus' },
      { name: 'Bulgarian Split Squat', icon: 'human', description: 'Single leg exercise' },
      { name: 'Goblet Squat', icon: 'cup', description: 'Front-loaded squat' },
      { name: 'Hack Squat', icon: 'slope-uphill', description: 'Machine squat' },
    ]
  },
  'Shoulders': {
    icon: 'arm-flex-outline',
    color: '#F39C12',
    gradient: ['#F39C12', '#E67E22'],
    exercises: [
      { name: 'Overhead Press', icon: 'arrow-up-bold-circle', description: 'Compound shoulder' },
      { name: 'Lateral Raise', icon: 'arrow-expand-horizontal', description: 'Side delts' },
      { name: 'Front Raise', icon: 'arrow-up', description: 'Front delts' },
      { name: 'Rear Delt Fly', icon: 'arrow-expand', description: 'Rear delts' },
      { name: 'Arnold Press', icon: 'rotate-3d-variant', description: 'Full shoulder' },
      { name: 'Upright Row', icon: 'arrow-up-thick', description: 'Traps and delts' },
      { name: 'Cable Lateral Raise', icon: 'cable-data', description: 'Cable variation' },
      { name: 'Face Pulls', icon: 'arrow-split-horizontal', description: 'Rear delts' },
      { name: 'Shrugs', icon: 'arrow-up-box', description: 'Trap exercise' },
      { name: 'Machine Press', icon: 'cog', description: 'Machine variation' },
    ]
  },
  'Arms': {
    icon: 'arm-flex',
    color: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
    exercises: [
      { name: 'Barbell Curl', icon: 'weight', description: 'Bicep mass builder' },
      { name: 'Hammer Curl', icon: 'hammer', description: 'Brachialis focus' },
      { name: 'Preacher Curl', icon: 'seat', description: 'Isolated bicep' },
      { name: 'Cable Curl', icon: 'cable-data', description: 'Constant tension' },
      { name: 'Concentration Curl', icon: 'target', description: 'Peak contraction' },
      { name: 'Tricep Dip', icon: 'arrow-down-bold-outline', description: 'Compound tricep' },
      { name: 'Tricep Extension', icon: 'arrow-up-bold-outline', description: 'Overhead tricep' },
      { name: 'Tricep Pushdown', icon: 'arrow-down', description: 'Cable tricep' },
      { name: 'Close-Grip Bench', icon: 'arrow-collapse-horizontal', description: 'Tricep compound' },
      { name: 'Skull Crusher', icon: 'skull-outline', description: 'Lying tricep extension' },
    ]
  },
  'Core': {
    icon: 'circle-slice-6',
    color: '#E74C3C',
    gradient: ['#E74C3C', '#C0392B'],
    exercises: [
      { name: 'Plank', icon: 'minus', description: 'Isometric core' },
      { name: 'Crunches', icon: 'arrow-up-thin', description: 'Upper abs' },
      { name: 'Russian Twist', icon: 'rotate-left', description: 'Obliques' },
      { name: 'Leg Raise', icon: 'arrow-up', description: 'Lower abs' },
      { name: 'Ab Wheel', icon: 'circle-outline', description: 'Full core' },
      { name: 'Mountain Climbers', icon: 'run', description: 'Dynamic core' },
      { name: 'Side Plank', icon: 'arrow-left-right', description: 'Obliques' },
      { name: 'Dead Bug', icon: 'bug', description: 'Core stability' },
      { name: 'Cable Crunch', icon: 'arrow-down-thin', description: 'Weighted abs' },
      { name: 'Bicycle Crunch', icon: 'bike', description: 'Rotational abs' },
    ]
  },
};

export default function CreateWorkoutScreen({ navigation }) {
  const { user, api } = useAuth();
  const scrollViewRef = useRef(null);

  /* ───────── state ───────── */
  const [workoutName, setWorkoutName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [unit, setUnit] = useState('lbs');
  const [selectedCategory, setSelectedCategory] = useState('Chest');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErr] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [expandedExercise, setExpandedExercise] = useState(null);

  //new
  const [buttonScale] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  // Workout templates
  const workoutTemplates = [
    { 
      id: 'push', 
      name: 'Push Day', 
      icon: 'arm-flex',  // Bicep flex icon
      categories: ['Chest', 'Shoulders'],
      color: '#FF6B6B'
    },
    { 
      id: 'pull', 
      name: 'Pull Day', 
      icon: 'arrow-down-bold',  // Pull down motion
      categories: ['Back', 'Arms'],
      color: '#4ECDC4'
    },
    { 
      id: 'legs', 
      name: 'Leg Day', 
      icon: 'human-handsdown',  // Standing figure
      categories: ['Legs'],
      color: '#45B7D1'
    },
    { 
      id: 'full', 
      name: 'Full Body', 
      icon: 'weight-lifter',  // Person lifting weights
      categories: ['Chest', 'Back', 'Legs'],
      color: '#F39C12'
    },
    { 
      id: 'custom', 
      name: 'Custom', 
      icon: 'pencil-ruler',  // Design/custom icon
      categories: [],
      color: '#9B59B6'
    },
  ];

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Progress calculation
  const calculateProgress = () => {
    let progress = 0;
    if (workoutName) progress += 0.25;
    if (selectedTemplate) progress += 0.25;
    if (exercises.length > 0) progress += 0.25;
    if (exercises.some(e => e.sets.some(s => s.weight && s.reps))) progress += 0.25;
    return progress;
  };

  /* ───────── handlers ───────── */
  const handleTemplateSelect = (template) => {
    console.log('Template selected:', template);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);

    setSelectedTemplate(template.id);
    console.log('Selected template ID:', template.id);

    if (template.id !== 'custom') {
      // Pre-populate with template exercises
      const templateExercises = [];
      template.categories.forEach(cat => {
        const categoryExercises = EXERCISE_CATEGORIES[cat]?.exercises?.slice(0, 2) || [];
        categoryExercises.forEach(ex => {
          templateExercises.push({
            id: Date.now() + Math.random(),
            name: ex.name,
            icon: ex.icon,
            category: cat,
            sets: [{ weight: '', reps: '', completed: false }]
          });
        });
      });
      setExercises(templateExercises);
    } else {
      setExercises([]);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const addExercise = (exercise, category) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);

    const newExercise = {
      id: Date.now().toString(),
      name: exercise.name,
      icon: exercise.icon,
      category: category,
      sets: [{ weight: '', reps: '', completed: false }]
    };
    setExercises([...exercises, newExercise]);
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const toggleExerciseExpansion = (exerciseId) => {
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
  };

  const removeExercise = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExercises(exercises.filter(e => e.id !== id));
  };

  const addSet = (exerciseId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(ANIMATION_CONFIG);
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? { ...e, sets: [...e.sets, { weight: '', reps: '', completed: false }] }
        : e
    ));
  };

  const removeSet = (exerciseId, setIndex) => {
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
        : e
    ));
  };

  const updateSet = (exerciseId, setIndex, field, value) => {
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? {
            ...e,
            sets: e.sets.map((s, i) => 
              i === setIndex ? { ...s, [field]: value } : s
            )
          }
        : e
    ));
  };

  const toggleSetCompletion = (exerciseId, setIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExercises(exercises.map(e => 
      e.id === exerciseId 
        ? {
            ...e,
            sets: e.sets.map((s, i) => 
              i === setIndex ? { ...s, completed: !s.completed } : s
            )
          }
        : e
    ));
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setErr('Please enter a workout name');
      return;
    }
    if (!exercises.length) {
      setErr('Add at least one exercise');
      return;
    }
    
    setErr(null);
    setSaving(true);
    
    try {
      // First, get all exercises from the API to map names to IDs
      const { data: allExercises } = await api.get('/exercises');
      
      // Create a map of exercise names to IDs
      const exerciseMap = {};
      allExercises.forEach(ex => {
        exerciseMap[ex.name] = ex.exercise_id;
      });
      
      // Transform exercises to match API format
      const apiExercises = exercises.map(exercise => {
        const exerciseId = exerciseMap[exercise.name];
        if (!exerciseId) {
          throw new Error(`Exercise "${exercise.name}" not found in database`);
        }
        
        // Get the first set with valid data (API expects single set/rep/weight per exercise)
        const validSet = exercise.sets.find(s => s.weight && s.reps) || exercise.sets[0];
        
        return {
          exercise_id: exerciseId,
          sets: exercise.sets.length,
          reps: parseInt(validSet.reps, 10) || 10,
          weight: parseFloat(validSet.weight) || 0
        };
      });
      
      const workoutData = {
        user_id: user.user_id || user.id,
        workout_name: workoutName,
        workout_date: selectedDate.toISOString(),
        notes: notes,
        exercises: apiExercises
      };
      
      await api.post('/workouts', workoutData);
      navigation.goBack();
    } catch (e) {
      console.error('Save workout error:', e);
      setErr(e.response?.data?.error || e.message || 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  // Exercise search filter
  const getFilteredExercises = () => {
    if (!searchQuery) return EXERCISE_CATEGORIES[selectedCategory]?.exercises || [];
    
    const filtered = [];
    Object.entries(EXERCISE_CATEGORIES).forEach(([category, data]) => {
      const categoryFiltered = data.exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (categoryFiltered.length > 0) {
        filtered.push({ category, exercises: categoryFiltered });
      }
    });
    return filtered;
  };

  /* ───────── render components ───────── */
  const renderExerciseBlock = (exercise, index) => (
    
    <Card key={exercise.id} style={styles.exerciseCard}>
      <Card.Content>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseInfo}>
            <Icon name={exercise.icon} size={28} color={EXERCISE_CATEGORIES[exercise.category]?.color || '#0099cc'} />
            <View style={styles.exerciseDetails}>
              <Title style={styles.exerciseName}>{exercise.name}</Title>
              <Text style={styles.exerciseCategory}>{exercise.category}</Text>
            </View>
          </View>
          <IconButton
            icon="delete"
            size={24}
            onPress={() => removeExercise(exercise.id)}
          />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.setsContainer}>
          <View style={styles.setsHeaderRow}>
            <Text style={[styles.setHeaderText, { width: 40 }]}>Set</Text>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Weight</Text>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
            <View style={{ width: 40 }} />
          </View>

          {exercise.sets.map((set, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <Text style={styles.setNumber}>{setIndex + 1}</Text>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={set.weight}
                onChangeText={(v) => updateSet(exercise.id, setIndex, 'weight', v)}
                style={styles.setInput}
                dense
                placeholder={unit}
              />
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={set.reps}
                onChangeText={(v) => updateSet(exercise.id, setIndex, 'reps', v)}
                style={styles.setInput}
                dense
                placeholder="0"
              />
              <TouchableOpacity
                style={[styles.checkButton, set.completed && styles.checkedButton]}
                onPress={() => toggleSetCompletion(exercise.id, setIndex)}
              >
                <Icon 
                  name={set.completed ? "check" : "checkbox-blank-outline"} 
                  size={20} 
                  color={set.completed ? "#fff" : "#666"} 
                />
              </TouchableOpacity>
              {exercise.sets.length > 1 && (
                <IconButton
                  icon="minus-circle"
                  size={20}
                  onPress={() => removeSet(exercise.id, setIndex)}
                />
              )}
            </View>
          ))}

          <Button
            mode="text"
            icon="plus"
            onPress={() => addSet(exercise.id)}
            style={styles.addSetButton}
          >
            Add Set
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderExerciseModal = () => (
    <Portal>
      <Modal
        visible={showExerciseModal}
        onDismiss={() => {
          setShowExerciseModal(false);
          setSearchQuery('');
        }}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Title style={styles.modalTitle}>Add Exercise</Title>
          
          <Searchbar
            placeholder="Search exercises..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
            {Object.keys(EXERCISE_CATEGORIES).map((category) => (
              <Chip
                key={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && { backgroundColor: EXERCISE_CATEGORIES[category].color }
                ]}
                textStyle={selectedCategory === category && styles.selectedCategoryText}
              >
                {category}
              </Chip>
            ))}
          </ScrollView>

          <ScrollView style={styles.exerciseList}>
            {searchQuery ? (
              // Show search results
              getFilteredExercises().map(({ category, exercises }) => (
                <View key={category}>
                  <Text style={styles.searchCategoryTitle}>{category}</Text>
                  {exercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.name}
                      style={styles.exerciseItem}
                      onPress={() => addExercise(exercise, category)}
                    >
                      <Icon name={exercise.icon} size={24} color={EXERCISE_CATEGORIES[category].color} />
                      <View style={styles.exerciseItemInfo}>
                        <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                        <Text style={styles.exerciseItemDescription}>{exercise.description}</Text>
                      </View>
                      <Icon name="plus-circle" size={24} color="#0099cc" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              // Show selected category
              (EXERCISE_CATEGORIES[selectedCategory]?.exercises || []).map((exercise) => (
                <TouchableOpacity
                  key={exercise.name}
                  style={styles.exerciseItem}
                  onPress={() => addExercise(exercise, selectedCategory)}
                >
                  <Icon name={exercise.icon} size={24} color={EXERCISE_CATEGORIES[selectedCategory].color} />
                  <View style={styles.exerciseItemInfo}>
                    <Text style={styles.exerciseItemName}>{exercise.name}</Text>
                    <Text style={styles.exerciseItemDescription}>{exercise.description}</Text>
                  </View>
                  <Icon name="plus-circle" size={24} color="#0099cc" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <Button
            mode="contained"
            onPress={() => {
              setShowExerciseModal(false);
              setSearchQuery('');
            }}
            style={styles.modalCloseButton}
          >
            Close
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );

  /* ───────── main render ───────── */
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0099cc', '#0066aa']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={28}
            iconColor="#fff"
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>Create Workout</Title>
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={calculateProgress()}
                color="#fff"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>{Math.round(calculateProgress() * 100)}%</Text>
            </View>
          </View>
          <IconButton
            icon="calendar-check"
            size={28}
            iconColor="#fff"
            onPress={() => setShowDatePicker(true)}
          />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "web" ? undefined : "height"}
        style={[
          styles.keyboardAvoid,
          Platform.OS === 'web' && { 
            flex: 1, 
            height: 'calc(100vh - 120px)',
            overflow: 'hidden' // Prevent double scrollbars
          }
        ]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[
            styles.scrollView,
            Platform.OS === 'web' && { 
              height: '80vh', 
              overflow: 'scroll',
              overflowY: 'scroll', // Force vertical scrolling
              WebkitOverflowScrolling: 'touch', // Better iOS web scrolling
              maxHeight: '80vh' // Ensure height constraint
            }
          ]}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' && styles.webScrollContent
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
          {/* Workout Details */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Workout Details</Title>
                <Chip icon="numeric-1-circle" style={styles.stepChip}>Step 1 of 3</Chip>
              </View>

              <TextInput
                label="Workout Name"
                mode="outlined"
                value={workoutName}
                onChangeText={setWorkoutName}
                style={styles.input}
                placeholder="e.g., Monday Upper Body"
                left={<TextInput.Icon icon="pencil" />}
              />

              <View style={styles.dateSection}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar" size={24} color="#0099cc" />
                  <Text style={styles.dateText}>{selectedDate.toLocaleDateString()}</Text>
                  <Icon name="chevron-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                Platform.OS === 'web' ? (
                  // Web native date picker
                  <View style={styles.webDatePickerContainer}>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate)) {
                          setSelectedDate(newDate);
                          setShowDatePicker(false); // Auto-close after selection
                        }
                      }}
                      style={{
                        padding: '12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '16px',
                        width: '100%',
                        marginTop: '8px'
                      }}
                    />
                    <Button 
                      mode="text" 
                      onPress={() => setShowDatePicker(false)}
                      style={{ marginTop: 8 }}
                    >
                      Close
                    </Button>
                  </View>
                ) : (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                  />
                )
              )}

              <View style={styles.unitSection}>
                <Text style={styles.label}>Weight Unit</Text>
                <View style={styles.unitButtons}>
                  <Button
                    mode={unit === 'lbs' ? 'contained' : 'outlined'}
                    onPress={() => setUnit('lbs')}
                    style={[styles.unitButton, unit === 'lbs' && styles.selectedUnit]}
                  >
                    LBS
                  </Button>
                  <Button
                    mode={unit === 'kg' ? 'contained' : 'outlined'}
                    onPress={() => setUnit('kg')}
                    style={[styles.unitButton, unit === 'kg' && styles.selectedUnit]}
                  >
                    KG
                  </Button>
                </View>
              </View>

              <TextInput
                label="Notes (optional)"
                mode="outlined"
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                style={styles.notesInput}
                placeholder="How did you feel? Any PR's?"
                left={<TextInput.Icon icon="note-text" />}
              />
            </Card.Content>
          </Card>

          {/* Template Selection */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Choose Template</Title>
                <Chip icon="numeric-2-circle" style={styles.stepChip}>Step 2 of 3</Chip>
              </View>

              <View style={styles.templatesGrid}>
                {workoutTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateCard,
                      selectedTemplate === template.id && styles.selectedTemplate
                    ]}
                    onPress={() => handleTemplateSelect(template)}
                  >
                    <Icon 
                      name={template.icon} 
                      size={32} 
                      color={selectedTemplate === template.id ? '#fff' : '#0099cc'} 
                    />
                    <Text style={[
                      styles.templateText,
                      selectedTemplate === template.id && styles.selectedTemplateText
                    ]}>
                      {template.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Exercises Section */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.stepHeader}>
                <Title style={styles.stepTitle}>Exercises</Title>
                <Chip icon="numeric-3-circle" style={styles.stepChip}>Step 3 of 3</Chip>
              </View>

              {exercises.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="dumbbell" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No exercises added yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {selectedTemplate && selectedTemplate !== 'custom'
                      ? 'Template exercises will appear here'
                      : 'Tap the button below to add exercises'}
                  </Text>
                </View>
              ) : (
                <View style={styles.exerciseSummary}>
                  <Text style={styles.summaryText}>
                    {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} • {' '}
                    {exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} total sets
                  </Text>
                </View>
              )}

              <Button
                mode="contained"
                icon="plus"
                onPress={() => setShowExerciseModal(true)}
                style={styles.addExerciseButton}
              >
                Add Exercise
              </Button>
            </Card.Content>
          </Card>

          {/* Exercise blocks */}
          {exercises.map((exercise, index) => renderExerciseBlock(exercise, index))}

          {/* Error message */}
          {errMsg && (
            <Card style={styles.errorCard}>
              <Card.Content>
                <Text style={styles.errorText}>{errMsg}</Text>
              </Card.Content>
            </Card>
          )}

          {/* Save button */}
          {exercises.length > 0 && (
            <View style={styles.saveSection}>
              <Button
                mode="contained"
                loading={saving}
                disabled={saving}
                onPress={saveWorkout}
                style={styles.saveButton}
                labelStyle={styles.saveButtonLabel}
              >
                Save Workout
              </Button>
              <Button
                mode="text"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          )}

          <View style={{ height: 100 }} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderExerciseModal()}
    </SafeAreaView>
  );
}

/* ──────────────────────────────────────────────────────────
   styles
   ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    height: '100vh',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
    height: '100%'
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1, 
    minHeight: '100vh',
    flexGrow: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepChip: {
    backgroundColor: '#e3f2fd',
  },
  input: {
    marginBottom: 16,
  },
  dateSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  unitSection: {
    marginBottom: 16,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
  },
  selectedUnit: {
    backgroundColor: '#0099cc',
  },
  notesInput: {
    marginBottom: 8,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 100,
  },
  templateCard: {
    width: (width - 48 - 16) / 3,
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
  },
  selectedTemplate: {
    backgroundColor: '#0099cc',
  },
  templateText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  selectedTemplateText: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  exerciseSummary: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#0099cc',
    fontWeight: '600',
  },
  addExerciseButton: {
    backgroundColor: '#0099cc',
  },
  exerciseCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseDetails: {
    marginLeft: 12,
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  setsContainer: {
    marginTop: 8,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : 25,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  webScrollContent: {
    minHeight: '100%',
    flexGrow: 1,
    paddingBottom: 100, // Extra space at bottom for scrolling
  },
  collapsedSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  collapsedSummaryText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  webDatePickerContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
})