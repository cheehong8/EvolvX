import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WorkoutDetailScreen({ route }) {
  const { workoutId } = route.params;
  return (
    <View style={styles.container}>
      <Text>Workout Detail: {workoutId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'center' }
});
