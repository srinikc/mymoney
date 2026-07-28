import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency, formatDate } from '../../utils/format';
import api from '../../api/client';

interface ArchiveExpense {
  id: number;
  vendor?: string;
  amount: number;
  date: string;
  category?: { name: string } | string;
  archivedAt?: string;
}

export default function ArchiveScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [expenses, setExpenses] = useState<ArchiveExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [autoPurged, setAutoPurged] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArchive = useCallback(async () => {
    try {
      const res = await api.get('/api/expenses', { params: { archived: 'true', pageSize: '200' } });
      const d = res.data;
      setExpenses(d.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
    api.post('/api/expenses/archive', { action: 'purge-expired' }).then((r) => {
      if (r.data?.autoPurged) setAutoPurged(r.data.autoPurged);
    }).catch(() => {});
  }, [fetchArchive]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async (ids: number[]) => {
    setActionLoading(true);
    try {
      await api.post('/api/expenses/archive', { action: 'restore', ids });
      setSelectedIds(new Set());
      fetchArchive();
    } catch {
      Alert.alert('Error', 'Failed to restore');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurge = async (ids: number[]) => {
    Alert.alert('Purge Expenses', `Permanently delete ${ids.length} expense(s)? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Purge', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.post('/api/expenses/archive', { action: 'purge', ids });
            setSelectedIds(new Set());
            fetchArchive();
          } catch {
            Alert.alert('Error', 'Failed to purge');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handlePurgeAll = () => {
    Alert.alert('Purge All', 'Permanently delete all archived expenses? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Purge All', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.post('/api/expenses/archive', { action: 'purge-all' });
            setSelectedIds(new Set());
            setExpenses([]);
          } catch {
            Alert.alert('Error', 'Failed to purge all');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleLongPress = (item: ArchiveExpense) => {
    Alert.alert('Restore Expense', `Restore "${item.vendor || 'this expense'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: () => handleRestore([item.id]),
      },
    ]);
  };

  const renderItem = ({ item }: { item: ArchiveExpense }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleSelect(item.id)}
        onLongPress={() => handleLongPress(item)}
      >
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
                    <Text style={[styles.catBadgeText, { color: theme.primary }]}>{typeof item.category === 'string' ? item.category : item.category.name}</Text>
                  </View>
                )}
                {item.archivedAt && (
                  <Text style={[styles.archiveDate, { color: theme.textTertiary }]}>Archived: {formatDate(item.archivedAt)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Archived Expenses</Text>
        {expenses.length > 0 && (
          <Text style={[styles.headerCount, { color: theme.textTertiary }]}>{expenses.length}</Text>
        )}
      </View>

      {autoPurged > 0 && (
        <View style={[styles.purgeBanner, { backgroundColor: theme.warningLight }]}>
          <Ionicons name="alert-circle" size={16} color={theme.warning} />
          <Text style={[styles.purgeBannerText, { color: theme.warning }]}>{autoPurged} expense(s) auto-purged</Text>
        </View>
      )}

      {selectedIds.size > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.actionBarText, { color: theme.text }]}>{selectedIds.size} selected</Text>
          <View style={styles.actionBtns}>
            <TouchableOpacity
              onPress={() => handleRestore([...selectedIds])}
              disabled={actionLoading}
              style={[styles.actionBtn, { backgroundColor: theme.incomeLight }]}
            >
              <Ionicons name="refresh" size={16} color={theme.income} />
              <Text style={{ color: theme.income, fontWeight: '600', fontSize: 12 }}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handlePurge([...selectedIds])}
              disabled={actionLoading}
              style={[styles.actionBtn, { backgroundColor: theme.expenseLight }]}
            >
              <Ionicons name="trash" size={16} color={theme.expense} />
              <Text style={{ color: theme.expense, fontWeight: '600', fontSize: 12 }}>Purge</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, expenses.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchArchive(); }} tintColor={theme.primary} />}
          ListHeaderComponent={
            expenses.length > 0 && selectedIds.size === 0 ? (
              <TouchableOpacity onPress={handlePurgeAll} disabled={actionLoading} style={[styles.purgeAllBtn, { backgroundColor: theme.expenseLight }]}>
                <Ionicons name="trash-outline" size={16} color={theme.expense} />
                <Text style={{ color: theme.expense, fontWeight: '600', fontSize: 13 }}>Purge All</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No archived expenses</Text>
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
  headerCount: { fontSize: 14, fontWeight: '600' },
  purgeBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, borderRadius: 10 },
  purgeBannerText: { fontSize: 12, fontWeight: '500' },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  actionBarText: { fontSize: 13, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  listEmpty: { flex: 1 },
  purgeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, marginBottom: 12 },
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
  archiveDate: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
});
