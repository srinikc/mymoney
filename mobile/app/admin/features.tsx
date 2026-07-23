import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatDate } from '../../utils/format';
import api from '../../api/client';

interface FeatureFlag {
  id: number;
  name: string;
  enabled: boolean;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

const TIERS = ['free', 'pro', 'premium'];

export default function AdminFeaturesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState('free');
  const [createError, setCreateError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/admin/features');
      const data = res.data;
      setFeatures(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err.response?.status === 403) setError('Admin access required');
      else setError('Failed to load features');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleFeature = async (featureId: number, currentEnabled: boolean) => {
    try {
      await api.put(`/api/admin/features/${featureId}`, { enabled: !currentEnabled });
      fetch();
    } catch { /* silently fail */ }
  };

  const updateTier = async (featureId: number, tier: string) => {
    try {
      await api.put(`/api/admin/features/${featureId}`, { tier });
      fetch();
    } catch { /* silently fail */ }
  };

  const deleteFeature = (featureId: number) => {
    Alert.alert('Delete Feature', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/admin/features/${featureId}`); fetch(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const createFeature = async () => {
    setCreateError(null);
    if (!newName.trim()) { setCreateError('Feature name is required'); return; }
    try {
      const res = await api.post('/api/admin/features', { name: newName.trim(), tier: newTier });
      setShowCreate(false);
      setNewName('');
      setNewTier('free');
      fetch();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create feature');
    }
  };

  const bulkToggle = async (enable: boolean) => {
    const promises = features
      .filter((f) => f.enabled !== enable)
      .map((f) => api.put(`/api/admin/features/${f.id}`, { enabled: enable }));
    await Promise.all(promises);
    fetch();
  };

  const filteredFeatures = useMemo(
    () => features.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.tier.toLowerCase().includes(searchQuery.toLowerCase())),
    [features, searchQuery]
  );

  const renderFeatureItem = ({ item }: { item: FeatureFlag }) => (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, { backgroundColor: item.enabled ? theme.incomeLight : theme.surfaceSecondary }]}>
          <Ionicons name="flag" size={18} color={item.enabled ? theme.income : theme.textTertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: theme.surfaceSecondary, alignSelf: 'flex-start', marginTop: 4 }]}>
            <Text style={[styles.badgeText, { color: theme.textTertiary }]}>{item.tier}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => toggleFeature(item.id, item.enabled)}
            style={[styles.toggleBtn, { backgroundColor: item.enabled ? theme.incomeLight : theme.surfaceSecondary }]}
          >
            <Ionicons name={item.enabled ? 'toggle' : 'toggle-outline'} size={22} color={item.enabled ? theme.income : theme.textTertiary} />
            <Text style={[styles.toggleText, { color: item.enabled ? theme.income : theme.textTertiary }]}>
              {item.enabled ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteFeature(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={theme.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tierRow}>
        <Text style={[styles.tierLabel, { color: theme.textTertiary }]}>Tier:</Text>
        {TIERS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tierChip, { backgroundColor: item.tier === t ? theme.primary : 'transparent', borderColor: item.tier === t ? theme.primary : theme.border }]}
            onPress={() => updateTier(item.id, t)}
          >
            <Text style={[styles.tierChipText, { color: item.tier === t ? 'white' : theme.textSecondary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.dateText, { color: theme.textTertiary }]}>Updated {formatDate(item.updatedAt)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin — Features</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Manage feature flags and toggles</Text>
        </View>
        <TouchableOpacity onPress={() => { setNewName(''); setNewTier('free'); setCreateError(null); setShowCreate(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search & Bulk Actions */}
      <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchInput, { borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchText, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search features..."
            placeholderTextColor={theme.textTertiary}
          />
        </View>
        <View style={styles.bulkRow}>
          <TouchableOpacity onPress={() => bulkToggle(true)} style={[styles.bulkBtn, { backgroundColor: theme.incomeLight }]}>
            <Text style={[styles.bulkBtnText, { color: theme.income }]}>Enable All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bulkToggle(false)} style={[styles.bulkBtn, { backgroundColor: theme.expenseLight }]}>
            <Text style={[styles.bulkBtnText, { color: theme.expense }]}>Disable All</Text>
          </TouchableOpacity>
        </View>
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
          data={filteredFeatures}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFeatureItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flag-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery ? 'No features match your search' : 'No features yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Feature Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Feature Flag</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>Create a new feature flag with tier access</Text>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Feature Name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newName} onChangeText={setNewName} placeholder="e.g., dark-mode" placeholderTextColor={theme.textTertiary} />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Minimum Tier</Text>
            <View style={styles.tierRow}>
              {TIERS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierChip, { backgroundColor: newTier === t ? theme.primary : 'transparent', borderColor: newTier === t ? theme.primary : theme.border }]}
                  onPress={() => setNewTier(t)}
                >
                  <Text style={[styles.tierChipText, { color: newTier === t ? 'white' : theme.textSecondary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {createError && <Text style={[styles.errorMsg, { color: theme.expense }]}>{createError}</Text>}

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: theme.border }]}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createFeature} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
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
  searchRow: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 36, gap: 6 },
  searchText: { flex: 1, fontSize: 13, paddingVertical: 0 },
  bulkRow: { flexDirection: 'row', gap: 6 },
  bulkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  bulkBtnText: { fontSize: 11, fontWeight: '700' },
  listContent: { padding: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'monospace' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  toggleText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tierLabel: { fontSize: 11, fontWeight: '600', marginRight: 4 },
  tierChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tierChipText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dateText: { fontSize: 11, marginTop: 8 },
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
