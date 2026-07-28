import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatDate } from '../../utils/format';
import api from '../../api/client';

interface AdminProfile {
  id: number;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
  user: { id: number; email: string; name: string | null; role: string };
  expenseCount: number;
  budgetCount: number;
  goalCount: number;
}

export default function AdminProfilesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/admin/profiles');
      const data = res.data;
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      const error = err as { response?: { status?: number }; message?: string };
      if (error.response?.status === 403) setError('Admin access required');
      else setError('Failed to load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteProfile = (profileId: number) => {
    Alert.alert('Delete Profile', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/admin/profiles/${profileId}`); fetch(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const createProfile = async () => {
    setCreateError(null);
    const userId = Number.parseInt(newUserId);
    if (!newName.trim()) { setCreateError('Profile name is required'); return; }
    if (Number.isNaN(userId) || userId <= 0) { setCreateError('Valid user ID is required'); return; }
    try {
      await api.post('/api/admin/profiles', { name: newName.trim(), userId });
      setShowCreate(false);
      setNewName('');
      setNewUserId('');
      fetch();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setCreateError(error.response?.data?.error || 'Failed to create profile');
    }
  };

  const renderProfileItem = ({ item }: { item: AdminProfile }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface }]}
      onLongPress={() => deleteProfile(item.id)}
    >
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: item.isDefault ? theme.incomeLight : theme.primaryLight }]}>
          <Ionicons name="person-circle" size={22} color={item.isDefault ? theme.income : theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
            {item.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: theme.incomeLight }]}>
                <Text style={[styles.defaultBadgeText, { color: theme.income }]}>Default</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>
            {item.user.name || item.user.email} (#{item.user.id})
          </Text>
          <View style={styles.statsRow}>
            <Text style={[styles.stat, { color: theme.textTertiary }]}>{item.expenseCount} expenses</Text>
            <Text style={[styles.statDot, { color: theme.textTertiary }]}>&middot;</Text>
            <Text style={[styles.stat, { color: theme.textTertiary }]}>{item.budgetCount} budgets</Text>
            <Text style={[styles.statDot, { color: theme.textTertiary }]}>&middot;</Text>
            <Text style={[styles.stat, { color: theme.textTertiary }]}>{item.goalCount} goals</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.dateText, { color: theme.textTertiary }]}>{formatDate(item.createdAt)}</Text>
          <TouchableOpacity onPress={() => deleteProfile(item.id)} style={styles.deleteIcon}>
            <Ionicons name="trash-outline" size={16} color={theme.expense} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin — Profiles</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Manage all user profiles</Text>
        </View>
        <TouchableOpacity onPress={() => { setNewName(''); setNewUserId(''); setCreateError(null); setShowCreate(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="shield" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetch} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProfileItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-circle-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No profiles found</Text>
            </View>
          }
        />
      )}

      {/* Create Profile Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create Profile</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>Create a new profile for any user</Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Profile Name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newName} onChangeText={setNewName} placeholder="e.g., Personal" placeholderTextColor={theme.textTertiary} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>User ID</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newUserId} onChangeText={setNewUserId} placeholder="e.g., 1" placeholderTextColor={theme.textTertiary} keyboardType="number-pad" />

            {createError && <Text style={[styles.errorMsg, { color: theme.expense }]}>{createError}</Text>}

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createProfile} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.saveBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 9, fontWeight: '700' },
  cardSubtext: { fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  stat: { fontSize: 11 },
  statDot: { fontSize: 11 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  dateText: { fontSize: 11 },
  deleteIcon: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalDesc: { fontSize: 13, marginBottom: 16 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 24 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  errorMsg: { fontSize: 12, marginTop: 8 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
