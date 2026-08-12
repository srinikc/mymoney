import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

interface FlaggedExpense {
  id: number;
  vendor?: string;
  amount: number;
  date: string;
  category?: { id?: number; name: string };
  description?: string;
}

export default function ReviewDuplicatesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [flagged, setFlagged] = useState<FlaggedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFlagged = useCallback(async (targetPage = 1, append = false) => {
    try {
      const params: Record<string, string | undefined> = { page: String(targetPage), pageSize: '50' };
      if (search) params.search = search;
      const res = await api.get('/api/expenses/flagged', { params });
      const d = res.data;
      const items = d.data || d.flagged || [];
      if (append) {
        setFlagged((prev) => [...prev, ...items]);
      } else {
        setFlagged(items);
      }
      setTotalPages(d.totalPages || 1);
      setTotalCount(d.total || d.totalCount || items.length);
      setPage(targetPage);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search]);

  useEffect(() => { fetchFlagged(); }, [fetchFlagged]);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      fetchFlagged(page + 1, true);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(flagged.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) {
      Alert.alert('Info', 'Select at least 2 expenses to merge');
      return;
    }
    Alert.alert('Merge', `Merge ${selectedIds.size} selected expenses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Merge',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.post('/api/expenses/flagged/merge', { ids: [...selectedIds] });
            setSelectedIds(new Set());
            fetchFlagged(1);
            Alert.alert('Success', 'Expenses merged');
          } catch {
            Alert.alert('Error', 'Failed to merge');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    Alert.alert('Delete', `Delete ${selectedIds.size} selected expense(s)? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await Promise.all([...selectedIds].map((id) => api.delete(`/api/expenses/flagged?id=${id}`)));
            setSelectedIds(new Set());
            fetchFlagged(1);
          } catch {
            Alert.alert('Error', 'Failed to delete');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: FlaggedExpense }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => toggleSelect(item.id)}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: selected ? theme.primary : 'transparent', borderWidth: selected ? 2 : 0 }]}>
          <View style={styles.cardRow}>
            <TouchableOpacity onPress={() => toggleSelect(item.id)} style={styles.checkbox}>
              <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={22} color={selected ? theme.primary : theme.textTertiary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardVendor, { color: theme.text }]} numberOfLines={1}>{item.vendor || '—'}</Text>
                <Text style={[styles.cardAmount, { color: theme.expense }]}>-{formatCurrency(item.amount)}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={[styles.cardDate, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
                {item.category && (
                  <View style={[styles.catBadge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.catBadgeText, { color: theme.primary }]}>{item.category?.name || ''}</Text>
                  </View>
                )}
              </View>
              {item.description ? (
                <Text style={[styles.cardDesc, { color: theme.textTertiary }]} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const allSelected = flagged.length > 0 && selectedIds.size === flagged.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Review Duplicates</Text>
        {totalCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.expenseLight }]}>
            <Text style={[styles.badgeText, { color: theme.expense }]}>{totalCount}</Text>
          </View>
        )}
      </View>

      <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search flagged expenses..."
          placeholderTextColor={theme.textTertiary}
        />
      </View>

      {flagged.length > 0 && (
        <View style={[styles.selectBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={allSelected ? deselectAll : selectAll} style={styles.selectAllBtn}>
            <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={20} color={allSelected ? theme.primary : theme.textTertiary} />
            <Text style={[styles.selectAllText, { color: theme.text }]}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
          </TouchableOpacity>
          <Text style={[styles.selectCount, { color: theme.textTertiary }]}>{selectedIds.size} selected</Text>
        </View>
      )}

      {selectedIds.size > 1 && (
        <View style={[styles.actionBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={handleMerge} disabled={actionLoading} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Merge Selected</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} disabled={actionLoading} style={[styles.actionBtn, { backgroundColor: theme.expense }]}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>Delete Selected</Text>}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={flagged}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, flagged.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFlagged(); }} tintColor={theme.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={56} color={theme.income} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No duplicate expenses found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  selectBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 13, fontWeight: '500' },
  selectCount: { fontSize: 13, fontWeight: '500' },
  actionBar: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8, padding: 8, borderRadius: 12, borderWidth: 1 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  checkbox: { padding: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardVendor: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardAmount: { fontSize: 14, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  cardDate: { fontSize: 11, fontWeight: '500' },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
});
