// screens/main/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ProgressBar, Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, token, api, logout } = useAuth();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts]     = useState([]);
  const [rankings, setRankings]     = useState([]);
  const [streak,   setStreak]       = useState(0);
  const [error,    setError]        = useState(null);

  /* first load */
  useEffect(() => {
    if (token && user?.id) loadData();
  }, [token, user?.id]);   

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const loadData = useCallback(async () => {
    try {
      setError(null); setLoading(true);

      /* recent workouts */
      try {
        const { data: wData } = await api.get('/workouts', { params: { page:1, per_page:5 } });
        const recent = wData.workouts || [];
        setWorkouts(recent);
        calcStreak(recent);
      } catch (workoutErr) {
        console.log('Workouts endpoint not available:', workoutErr.response?.status);
        setWorkouts([]); // Set empty array as fallback
      }

      /* rankings */
      try {
        const { data: rData } = await api.get(`/rankings/user/${user.id}`);
        setRankings(Array.isArray(rData) ? rData : []);
      } catch (rankingErr) {
        console.log('Rankings endpoint not available:', rankingErr.response?.status);
        setRankings([]); // Set empty array as fallback
      }
    } catch (err) {
      console.error('HomeScreen load error:', err);
      setError('Failed to load data. Pull down to refresh.');
      if (err.response?.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [api, token, user?.id, logout, navigation]); 

  /* ───────── helpers ───────── */
  const calcStreak = (list) => {
    if (!list.length) return setStreak(0);
    const sorted = [...list].sort((a,b)=>new Date(b.workout_date)-new Date(a.workout_date));
    const today  = new Date(); today.setHours(0,0,0,0);
    let cursor   = new Date(today); let days=0;

    const first = new Date(sorted[0].workout_date); first.setHours(0,0,0,0);
    if (first.getTime()===today.getTime()) { days++; cursor.setDate(cursor.getDate()-1); }
    for (const w of sorted) {
      const d=new Date(w.workout_date); d.setHours(0,0,0,0);
      if (d.getTime()===cursor.getTime()) { days++; cursor.setDate(cursor.getDate()-1); }
    }
    setStreak(days);
  };

  const rankColor = (t)=>({Gold:'#FFD700',Silver:'#C0C0C0',Bronze:'#CD7F32'}[t]||'#0099cc');
  const progress  = (mmr)=>Math.max(0,Math.min(1,mmr/1000));
  const muscleIcon=(m='')=>({chest:'pectoral-muscle',back:'human-handsdown',legs:'human-male-height',shoulders:'human-male',arms:'arm-flex'}[m.toLowerCase()]||'dumbbell');

  if (loading && !refreshing) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0099cc" />
      <Text style={styles.loadingText}>Loading your fitness data…</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}>
        {/* welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>{user?.username?`Welcome back, ${user.username}!`:'Welcome!'}</Text>
          <View style={styles.statsRow}>
            <Stat icon="fire" label="Day Streak" value={streak}/>
            <Stat icon="dumbbell" label="Workouts"   value={workouts.length}/>
          </View>
        </View>

        {/* quick actions */}
        <View style={styles.actionsContainer}>
          <Button mode="contained" icon="plus" style={styles.actionButton} onPress={()=>navigation.navigate('CreateWorkout')}>New Workout</Button>
          <Button mode="contained" icon="account-group" style={styles.actionButton} onPress={()=>navigation.navigate('Social')}>Join Friends</Button>
        </View>

        {/* error */}
        {error&&(<Card style={styles.errorCard}><Card.Content><Text style={styles.errorText}>{error}</Text></Card.Content></Card>)}

        {/* rankings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Muscle Group Rankings</Title>
            {rankings.length===0?
              <Paragraph>Complete workouts to earn rankings!</Paragraph>:
              rankings.sort((a,b)=>b.mmr_score-a.mmr_score).map((r,i)=>(
                <View key={i} style={styles.rankingItem}>
                  <View style={styles.rankingHeader}>
                    <View style={styles.muscleGroup}>
                      <Icon name={muscleIcon(r.muscle_group)} size={24} color="#0099cc" />
                      <Text style={styles.muscleText}>{r.muscle_group}</Text>
                    </View>
                    <Chip style={[styles.rankChip,{backgroundColor:rankColor(r.rank_tier)}]}>{r.rank_tier}</Chip>
                  </View>
                  <ProgressBar progress={progress(r.mmr_score)} color="#0099cc" style={styles.progressBar}/>
                </View>))}
          </Card.Content>
        </Card>

        {/* recent workouts */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Recent Workouts</Title>
            {workouts.length===0?
              <Paragraph>No workouts yet. Start today!</Paragraph>:
              workouts.slice(0,3).map((w,i)=>(
                <Card key={i} style={styles.workoutCard} onPress={()=>navigation.navigate('WorkoutDetail',{workoutId:w.workout_id})}>
                  <Card.Content>
                    <Title>{w.workout_name}</Title>
                    <Paragraph>{new Date(w.workout_date).toLocaleDateString()}</Paragraph>
                    <View style={styles.workoutStats}>
                      <Text>{w.exercises.length} Exercises</Text>
                      {w.duration&&<Text>{w.duration} min</Text>}
                    </View>
                  </Card.Content>
                </Card>))}
            {workouts.length>0&&(
              <Button mode="text" style={styles.viewAllButton} onPress={()=>navigation.navigate('Workout')}>View All Workouts</Button>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* floating action */}
      <FAB style={styles.fab} icon="plus" onPress={()=>navigation.navigate('CreateWorkout')}/>
    </SafeAreaView>
  );
}

/* small stat card */
const Stat = ({ icon, value, label }) => (
  <View style={styles.statCard}>
    <Icon name={icon} size={24} color="#0099cc" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/* styles – visuals unchanged */
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f5f5f5'},
  loadingContainer:{flex:1,justifyContent:'center',alignItems:'center'},
  loadingText:{marginTop:10,fontSize:16},
  welcomeSection:{padding:16,backgroundColor:'#fff'},
  welcomeText:{fontSize:24,fontWeight:'bold',color:'#0099cc',marginBottom:16},
  statsRow:{flexDirection:'row',justifyContent:'space-around',marginVertical:8},
  statCard:{alignItems:'center',backgroundColor:'#f0f9ff',padding:16,borderRadius:8,width:'45%'},
  statValue:{fontSize:24,fontWeight:'bold',color:'#0099cc',marginVertical:4},
  statLabel:{fontSize:14,color:'#666'},
  actionsContainer:{flexDirection:'row',justifyContent:'space-between',padding:16},
  actionButton:{flex:1,marginHorizontal:4,backgroundColor:'#0099cc'},
  errorCard:{margin:16,backgroundColor:'#ffebee'},
  errorText:{color:'#c62828'},
  card:{margin:16,marginTop:8},
  cardTitle:{fontSize:18,marginBottom:16},
  rankingItem:{marginBottom:16},
  rankingHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
  muscleGroup:{flexDirection:'row',alignItems:'center'},
  muscleText:{fontSize:16,marginLeft:8},
  rankChip:{height:24},
  progressBar:{height:8,borderRadius:4},
  workoutCard:{marginBottom:8},
  workoutStats:{flexDirection:'row',justifyContent:'space-between',marginTop:8},
  viewAllButton:{marginTop:8},
  fab:{position:'absolute',margin:16,right:0,bottom:0,backgroundColor:'#0099cc'},
});
