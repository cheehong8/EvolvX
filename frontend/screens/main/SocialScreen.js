// screens/main/SocialScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  ActivityIndicator,
  Avatar,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

/* One-liner for Bearer header */
const authHdr = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export default function SocialScreen({ navigation }) {
  const { user, token, api, logout } = useAuth();

  const [loading, setLoading]            = useState(true);
  const [refreshing, setRefreshing]      = useState(false);
  const [sharedWorkouts, setSharedWorkouts] = useState([]);
  const [friends, setFriends]            = useState([]);
  const [activityFeed, setActivityFeed]  = useState([]);
  const [error, setError]                = useState(null);

  /* ---------- data fetch ---------- */
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      /* 1) shared workouts */
      try {
        const { data: sw } = await api.get(
          '/social/shared-workouts',
          authHdr(token)
        );
        setSharedWorkouts(Array.isArray(sw) ? sw : []);
      } catch (swErr) {
        console.log('Shared workouts endpoint not available:', swErr.response?.status);
        setSharedWorkouts([]); // Set empty array as fallback
      }

      /* 2) friends list */
      let friends = [];
      try {
        const { data: fr } = await api.get(
          '/social/friends',
          { ...authHdr(token), params: { status: 'accepted' } }
        );
        friends = Array.isArray(fr) ? fr : [];
        setFriends(friends);
      } catch (frErr) {
        console.log('Friends endpoint not available:', frErr.response?.status);
        setFriends([]); // Set empty array as fallback
      }

      /* 3) quick mock for recent activity */
      setActivityFeed(
        friends.slice(0, 5).map((f) => ({
          id: `act-${f.user_id}`,
          user_id: f.user_id,
          username: f.username,
          activity_type: Math.random() > 0.5 ? 'workout_completed' : 'rank_up',
          details: Math.random() > 0.5 ? 'Leg Day' : 'Reached Gold',
          timestamp: new Date(
            Date.now() - Math.floor(Math.random() * 86_400_000)
          ).toISOString(),
        }))
      );
    } catch (err) {
      console.error('Error loading social data:', err);
      setError('Some social features may not be available.');
      if (err.response?.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, token, logout, navigation]);

  /* ---------- initial + token-change fetch ---------- */
  useEffect(() => {
    if (token) loadData();
  }, [token, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoinWorkout = async (id) => {
    try {
      await api.post(`/social/shared-workouts/${id}/join`, null, authHdr(token));
      loadData();
    } catch (err) {
      console.error('Error joining workout:', err);
      Alert.alert('Error', 'Failed to join workout.');
      if (err.response && (err.response.status === 401 || err.response.status === 422)) {
        await logout();
        navigation.replace('Login');
      }
    }
  };

  const handleCreateSharedWorkout = async () => {
    try {
      await api.post(
        '/social/shared-workouts',
        { workout_name: 'New Shared Workout' },
        authHdr(token)
      );
      loadData();
    } catch (err) {
      console.error('Error creating shared workout:', err);
      Alert.alert('Error', 'Failed to create shared workout.');
      if (err.response && err.response.status === 401) {
        await logout();
        navigation.replace('Login');
      }
    }
  };

  /* ---------- helpers ---------- */
  const getInitials = (u = '?') => u.charAt(0).toUpperCase();
  const timeAgo = (ts) => {
    const now = new Date(),
      t = new Date(ts),
      d = Math.floor((now - t) / 86_400_000),
      h = Math.floor((now - t) / 3_600_000),
      m = Math.floor((now - t) / 60_000);
    return d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : 'Just now';
  };

  /* ---------- loading splash ---------- */
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0099cc" />
        <Text style={styles.loadingText}>Loading social data…</Text>
      </View>
    );
  }

  /* ---------- main UI ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* --- shared workouts --------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <SectionHeader title="Active Shared Workouts" />
            {sharedWorkouts.length === 0 ? (
              <Paragraph>No active shared workouts. Create one!</Paragraph>
            ) : (
              sharedWorkouts.slice(0, 3).map((sw) => (
                <Card key={sw.shared_workout_id} style={styles.workoutCard}>
                  <Card.Content>
                    <Title>{sw.workout_name}</Title>
                    <Paragraph>with {sw.creator_name}</Paragraph>
                    <Button
                      mode="contained"
                      style={styles.joinButton}
                      onPress={() =>
                        sw.is_participating
                          ? navigation.navigate('SharedWorkout', {
                              workoutId: sw.shared_workout_id,
                            })
                          : handleJoinWorkout(sw.shared_workout_id)
                      }
                    >
                      {sw.is_participating ? 'Continue' : 'Join'}
                    </Button>
                  </Card.Content>
                </Card>
              ))
            )}
            <Button
              mode="contained"
              icon="plus"
              style={styles.createButton}
              onPress={handleCreateSharedWorkout}
            >
              Create Shared Workout
            </Button>
          </Card.Content>
        </Card>

        {/* --- friends ---------------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <SectionHeader title="Your Friends" />
            {friends.length === 0 ? (
              <Paragraph>No friends yet. Add some!</Paragraph>
            ) : (
              friends.slice(0, 5).map((f) => (
                <View key={f.user_id} style={styles.friendItem}>
                  <View style={styles.friendInfo}>
                    <Avatar.Text
                      size={40}
                      label={getInitials(f.username)}
                      backgroundColor="#e0e0e0"
                    />
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{f.username}</Text>
                      <View style={styles.friendStatus}>
                        {f.online_status === 'online' && (
                          <View style={styles.onlineIndicator} />
                        )}
                        <Text style={styles.workoutCount}>
                          {f.workout_count} workouts
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
            <Button
              mode="outlined"
              icon="account-plus"
              style={styles.addFriendButton}
              onPress={() => {
                /* add-friend flow */
              }}
            >
              Add Friend
            </Button>
          </Card.Content>
        </Card>

        {/* --- activity feed ---------------------------------------- */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Activity</Title>
            {activityFeed.length === 0 ? (
              <Paragraph>No recent activity.</Paragraph>
            ) : (
              activityFeed.map((a, idx) => (
                <View key={a.id}>
                  <View style={styles.activityItem}>
                    <Avatar.Text
                      size={40}
                      label={getInitials(a.username)}
                      backgroundColor="#e0e0e0"
                    />
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityName}>{a.username}</Text>{' '}
                        {a.activity_type === 'workout_completed'
                          ? 'completed workout'
                          : 'reached new rank'}{' '}
                        <Text style={styles.activityHighlight}>{a.details}</Text>
                      </Text>
                      <Text style={styles.activityTime}>
                        {timeAgo(a.timestamp)}
                      </Text>
                    </View>
                  </View>
                  {idx < activityFeed.length - 1 && (
                    <Divider style={styles.divider} />
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="account-group-outline"
        onPress={handleCreateSharedWorkout}
      />
    </SafeAreaView>
  );
}

/* ---------- tiny reusable header ---------- */
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Title style={styles.sectionTitle}>{title}</Title>
    <Button mode="text" onPress={() => {}}>
      View all
    </Button>
  </View>
);

/* ---------- styles (unchanged visuals) ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },

  errorCard: { margin: 16, backgroundColor: '#ffebee' },
  errorText: { color: '#c62828' },

  card: { margin: 16, marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18 },

  workoutCard: { marginBottom: 12, backgroundColor: '#f9f9f9' },
  joinButton: { marginTop: 8, backgroundColor: '#0099cc' },
  createButton: { marginTop: 16, backgroundColor: '#0099cc' },

  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  friendInfo: { flexDirection: 'row', alignItems: 'center' },
  friendDetails: { marginLeft: 12 },
  friendName: { fontSize: 16, fontWeight: 'bold' },
  friendStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  workoutCount: { fontSize: 12, color: '#666' },
  addFriendButton: { marginTop: 8 },

  activityItem: { flexDirection: 'row', marginBottom: 12, marginTop: 12 },
  activityDetails: { marginLeft: 12, flex: 1 },
  activityText: { fontSize: 14, lineHeight: 20 },
  activityName: { fontWeight: 'bold' },
  activityHighlight: { fontWeight: 'bold', color: '#0099cc' },
  activityTime: { fontSize: 12, color: '#666', marginTop: 4 },
  divider: { marginVertical: 4 },

  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#0099cc' },
});

