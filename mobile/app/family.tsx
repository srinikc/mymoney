import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

interface SharedMember {
  id: number;
  profileId: number;
  profile: { name: string };
  invitedEmail: string;
  invitedUser?: { name: string; email: string };
  inviter: { name: string; email: string };
  role: string;
  status: string;
  createdAt: string;
}

export default function FamilyScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [sent, setSent] = useState<SharedMember[]>([]);
  const [received, setReceived] = useState<SharedMember[]>([]);
  const [profiles, setProfiles] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [profileId, setProfileId] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [membersRes, profilesRes] = await Promise.all([
        api.get('/api/family/members'),
        api.get('/api/profiles'),
      ]);
      const members = membersRes.data;
      const pData = profilesRes.data;
      setSent(members?.sent || []);
      setReceived(members?.received || []);
      const profileList = Array.isArray(pData) ? pData : pData?.profiles || [];
      setProfiles(profileList);
      if (!profileId && profileList.length > 0) setProfileId(String(profileList[0].id));
    } catch {
      setError('Failed to load family data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!email.trim() || !profileId) {
      Alert.alert('Error', 'Email and profile are required');
      return;
    }
    setInviting(true);
    try {
      await api.post('/api/family/invite', { profileId: Number(profileId), email: email.trim(), role });
      Alert.alert('Success', 'Invitation sent!');
      setEmail('');
      setRole('viewer');
      fetchData();
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleAccept = async (inviteId: number) => {
    try {
      await api.post('/api/family/accept', { inviteId });
      Alert.alert('Success', 'Invitation accepted!');
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRevoke = (inviteId: number) => {
    Alert.alert('Revoke Access', 'Are you sure you want to revoke access?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/api/family/revoke', { data: { inviteId } });
            Alert.alert('Success', 'Access revoked');
            fetchData();
          } catch {
            Alert.alert('Error', 'Failed to revoke');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Family Sharing</Text>
        </View>
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Family Sharing</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Family Sharing</Text>
      </View>

      <FlatList
        data={sent}
        keyExtractor={(item, i) => String(item.id || i)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={theme.primary} />}
        ListHeaderComponent={() => (
          <View>
            {/* Invite Section */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Invite a Family Member</Text>
              <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>Share access to a profile</Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Profile</Text>
              <View style={styles.row}>
                {profiles.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      String(p.id) === profileId && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setProfileId(String(p.id))}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, String(p.id) === profileId && { color: theme.primary }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="family@example.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Role</Text>
              <View style={styles.row}>
                {['viewer', 'editor'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.chip,
                      { borderColor: theme.border },
                      role === r && { borderColor: theme.primary, backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, role === r && { color: theme.primary }]}>
                      {r === 'viewer' ? 'Viewer (read-only)' : 'Editor (can add/edit)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.inviteBtn, { backgroundColor: theme.primary }]}
                onPress={handleInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.inviteBtnText}>Send Invitation</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Received Section */}
            {received.length > 0 && (
              <View style={styles.sectionWrapper}>
                <Text style={[styles.sectionHeader, { color: theme.textTertiary }]}>Invitations Received</Text>
                {received.map((inv) => (
                  <View key={inv.id} style={[styles.memberCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.memberInfo}>
                      <View style={[styles.memberIcon, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="people" size={18} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberName, { color: theme.text }]}>{inv.profile.name}</Text>
                        <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>
                          From: {inv.inviter.name} ({inv.inviter.email})
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: inv.status === 'pending' ? theme.warningLight : theme.incomeLight }]}>
                          <Text style={[styles.statusText, { color: inv.status === 'pending' ? theme.warning : theme.income }]}>{inv.status}</Text>
                        </View>
                      </View>
                    </View>
                    {inv.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: theme.incomeLight }]}
                        onPress={() => handleAccept(inv.id)}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={theme.income} />
                        <Text style={[styles.acceptBtnText, { color: theme.income }]}>Accept</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionHeader, { color: theme.textTertiary }]}>Shared by You</Text>
          </View>
        )}
        renderItem={({ item: inv }) => (
          <View style={[styles.memberCard, { backgroundColor: theme.surface }]}>
            <View style={styles.memberInfo}>
              <View style={[styles.memberIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="mail" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: theme.text }]}>{inv.invitedEmail}</Text>
                <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>
                  {inv.profile.name} — {inv.role}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        inv.status === 'accepted' ? theme.incomeLight : inv.status === 'pending' ? theme.warningLight : theme.expenseLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: inv.status === 'accepted' ? theme.income : inv.status === 'pending' ? theme.warning : theme.expense },
                    ]}
                  >
                    {inv.status}
                  </Text>
                </View>
              </View>
            </View>
            {inv.status !== 'revoked' && (
              <TouchableOpacity
                style={[styles.revokeBtn, { backgroundColor: theme.expenseLight }]}
                onPress={() => handleRevoke(inv.id)}
              >
                <Ionicons name="person-remove" size={18} color={theme.expense} />
                <Text style={[styles.revokeBtnText, { color: theme.expense }]}>Revoke</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No profiles shared yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 40 },
  sectionWrapper: { marginBottom: 20 },
  sectionHeader: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4, marginTop: 20 },
  sectionCard: { borderRadius: 14, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  sectionDesc: { fontSize: 13, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '500' },
  inviteBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  inviteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  memberCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberMeta: { fontSize: 12, marginTop: 1 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8, gap: 4 },
  acceptBtnText: { fontSize: 13, fontWeight: '600' },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8, gap: 4 },
  revokeBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
});
