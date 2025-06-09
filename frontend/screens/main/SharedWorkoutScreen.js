import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SharedWorkoutScreen({ route }) {
  const { workoutId } = route.params;
  return (
    <View style={styles.container}>
      <Text>Shared Workout: {workoutId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center' }
});
