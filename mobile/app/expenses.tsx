import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, TextInput, Modal, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../constants/Colors';
import { formatCurrency, formatDate } from '../utils/format';
import api, { BASE_URL } from '../api/client';

interface ExpenseItem {
  id: number;
  vendor?: string;
  amount: number;
  date: string;
  category?: { id?: number; name: string; color?: string };
  paymentMode?: string;
  notes?: string;
  recurrenceType?: string;
  subCategory?: string;
  person?: string;
  bankAccount?: string;
  description?: string;
}

interface CatItem {
  id?: number;
  name: string;
  color?: string;
}

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [, setCategories] = useState<CatItem[]>([]);
  const formDefault = { date: new Date().toISOString().split('T')[0], amount: '', categoryId: '', vendor: '', description: '', paymentMode: 'UPI', notes: '', recurrenceType: 'onetime', subCategory: '', person: '', bankAccount: '' };
  const [form, setForm] = useState(formDefault);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatDay, setRepeatDay] = useState('1');
  const [repeatDirection, setRepeatDirection] = useState<'forward' | 'backward'>('forward');
  const [repeatCount, setRepeatCount] = useState('');
  const [filterDateFrom] = useState('');
  const [filterDateTo] = useState('');
  const [bankAnalysisReady, setBankAnalysisReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const openEdit = (item: ExpenseItem) => {
    setEditingItem(item);
    setForm({
      date: new Date(item.date).toISOString().split('T')[0],
      amount: String(item.amount ?? ''),
      categoryId: String(item.category?.id ?? ''),
      vendor: item.vendor || '',
      description: item.description || '',
      paymentMode: item.paymentMode || 'UPI',
      notes: item.notes || '',
      recurrenceType: item.recurrenceType || 'onetime',
      subCategory: item.subCategory || '',
      person: item.person || '',
      bankAccount: item.bankAccount || '',
    });
    setRepeatOpen(false);
    setRepeatCount('');
    setShowForm(true);
  };

  const fetchExpenses = useCallback(async (targetPage = 1, append = false) => {
    try {
      const params: Record<string, string | undefined> = { page: String(targetPage), pageSize: '50', sortField: 'date', sortDir: 'desc' };
      if (search) params.search = search;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      const res = await api.get('/api/expenses', { params });
      const d = res.data;
      if (append) {
        setExpenses((prev) => [...prev, ...(d.data || [])]);
      } else {
        setExpenses(d.data || []);
      }
      setTotalPages(d.totalPages || 1);
      setPage(targetPage);
    } catch {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    api.get('/api/categories').then((r) => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/bank-analysis/status').then((r) => setBankAnalysisReady(Boolean(r.data?.ready))).catch(() => {});
    api.get('/api/auth/status').then((r) => { if (r.data?.isAdmin) setIsAdmin(true); }).catch(() => {});
  }, []);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      fetchExpenses(page + 1, true);
    }
  };

  const handleAdd = async () => {
    if (!form.amount || !form.date) {
      Alert.alert('Validation', 'Amount and date are required');
      return;
    }
    setFormLoading(true);
    try {
      const count = Number.parseInt(repeatCount);
      const repeat = repeatOpen && Number.isFinite(count) && count >= 1
        ? { day: Number.parseInt(repeatDay) || 1, direction: repeatDirection, count }
        : undefined;
      const payload: Record<string, unknown> = { ...form };
      if (repeat) payload.repeat = repeat;
      if (editingItem) {
        await api.put(`/api/expenses/${editingItem.id}`, payload);
        Alert.alert('Success', 'Expense updated');
      } else {
        const res = await api.post('/api/expenses', payload);
        if (res.data?.recurring) {
          Alert.alert('Success', `Created ${res.data.created} entries, skipped ${res.data.skippedExisting} already entered this month`);
          if (res.data?.createdIds?.[0]) {
            setHighlightId(res.data.createdIds[0]);
            setTimeout(() => setHighlightId(null), 4000);
          }
        } else {
          Alert.alert('Success', 'Expense added');
          if (res.data?.id) {
            setHighlightId(res.data.id);
            setTimeout(() => setHighlightId(null), 4000);
          }
        }
      }
      setShowForm(false);
      setEditingItem(null);
      setForm(formDefault);
      setRepeatOpen(false);
      setRepeatCount('');
      fetchExpenses(1);
    } catch {
      Alert.alert('Error', editingItem ? 'Failed to update expense' : 'Failed to add expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Archive Expense', 'This expense will be archived. It can be restored later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await api.delete(`/api/expenses?id=${id}`);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
          } catch { Alert.alert('Error', 'Failed to archive'); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  const handleRangeDelete = (scope: string) => {
    Alert.alert(
      'Hard-delete expenses',
      `This PERMANENTLY deletes expenses for this profile (no restore). Continue with ${scope === 'all' ? 'ALL records' : `last ${scope} month(s)`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post('/api/expenses/bulk-delete-range', { scope });
              Alert.alert('Done', `Hard-deleted ${res.data?.count ?? 0} expenses`);
              setPage(1);
              fetchExpenses(1);
            } catch {
              Alert.alert('Error', 'Delete failed');
            }
          },
        },
      ],
    );
  };

  const showDeleteMenu = () => {
    Alert.alert('Delete Expenses (admin)', 'Hard-deletes data permanently. Choose a range:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'All records', style: 'destructive', onPress: () => handleRangeDelete('all') },
      { text: 'Last 1 month', style: 'destructive', onPress: () => handleRangeDelete('1') },
      { text: 'Last 2 months', style: 'destructive', onPress: () => handleRangeDelete('2') },
      { text: 'Last 3 months', style: 'destructive', onPress: () => handleRangeDelete('3') },
      { text: 'Last 6 months', style: 'destructive', onPress: () => handleRangeDelete('6') },
      { text: 'Last 12 months', style: 'destructive', onPress: () => handleRangeDelete('12') },
    ]);
  };

  const getCategoryColor = (cat: { color?: string } | undefined) => cat?.color || theme.primary;

  const handleBankAnalysis = () => {
    Alert.alert(
      'Bank Analysis',
      'Upload your bank statement on the web app to enrich expense descriptions with the note text from your statement.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Web App', onPress: () => Linking.openURL(`${BASE_URL}/expenses?bank=1`).catch(() => {}) },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Expenses</Text>
        {bankAnalysisReady && (
          <TouchableOpacity onPress={handleBankAnalysis} style={[styles.addBtn, { backgroundColor: theme.primaryLight, marginRight: 8 }]}>
            <Ionicons name="file-tray-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        )}
        {isAdmin && (
          <TouchableOpacity onPress={showDeleteMenu} style={[styles.addBtn, { backgroundColor: theme.primaryLight, marginRight: 8 }]}>
            <Ionicons name="trash" size={20} color="#dc2626" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => { setEditingItem(null); setForm(formDefault); setRepeatOpen(false); setRepeatCount(''); setShowForm(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={18} color={theme.textTertiary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search expenses..."
          placeholderTextColor={theme.textTertiary}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={() => fetchExpenses()} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surface }, highlightId === item.id && { borderColor: theme.primary, borderWidth: 2 }]}
              onPress={() => openEdit(item)}
              onLongPress={() => handleDelete(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <View style={[styles.cardDot, { backgroundColor: getCategoryColor(item.category) }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardVendor, { color: theme.text }]} numberOfLines={1}>{item.description || item.vendor || '—'}</Text>
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color={theme.expense} />
                    ) : (
                      <Text style={[styles.cardAmount, { color: theme.expense }]}>-{formatCurrency(item.amount)}</Text>
                    )}
                  </View>
                  {item.description && item.vendor && (
                    <Text style={[styles.cardVendorSub, { color: theme.textTertiary }]} numberOfLines={1}>{item.vendor}</Text>
                  )}
                  <View style={styles.cardBottom}>
                    {item.category && (
                      <View style={[styles.catBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                        <Text style={[styles.catBadgeText, { color: getCategoryColor(item.category) }]}>{item.category.name}</Text>
                      </View>
                    )}
                    <Text style={[styles.cardDate, { color: theme.textTertiary }]}>{formatDate(item.date)}</Text>
                    {item.paymentMode && <Text style={[styles.cardMode, { color: theme.textTertiary }]}>{item.paymentMode}</Text>}
                    {item.recurrenceType && item.recurrenceType !== 'onetime' && (
                      <Text style={[styles.catBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.catBadgeText, { color: theme.primary }]}>{item.recurrenceType}</Text>
                      </Text>
                    )}
                  </View>
                  {item.notes ? <Text style={[styles.cardNotes, { color: theme.textTertiary }]} numberOfLines={1}>{item.notes}</Text> : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchExpenses(1); }} tintColor={theme.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={theme.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No expenses found</Text>
              <TouchableOpacity onPress={() => setShowForm(true)} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.emptyBtnText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingItem ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); setEditingItem(null); }}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="Date (YYYY-MM-DD)" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} placeholder="Amount" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.vendor} onChangeText={(v) => setForm({ ...form, vendor: v })} placeholder="Vendor" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Description" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.categoryId} onChangeText={(v) => setForm({ ...form, categoryId: v })} placeholder="Category ID" placeholderTextColor={theme.textTertiary} keyboardType="number-pad" />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.subCategory} onChangeText={(v) => setForm({ ...form, subCategory: v })} placeholder="Sub Category" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.person} onChangeText={(v) => setForm({ ...form, person: v })} placeholder="Person" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.paymentMode} onChangeText={(v) => setForm({ ...form, paymentMode: v })} placeholder="Payment Mode (UPI/Cash/Card)" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.bankAccount} onChangeText={(v) => setForm({ ...form, bankAccount: v })} placeholder="Bank Account" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.recurrenceType} onChangeText={(v) => setForm({ ...form, recurrenceType: v })} placeholder="Recurrence (onetime/monthly/yearly/weekly/quarterly/recurring)" placeholderTextColor={theme.textTertiary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} placeholder="Notes" placeholderTextColor={theme.textTertiary} />

              {!editingItem && (
                <TouchableOpacity style={[styles.repeatToggle, { borderColor: repeatOpen ? theme.primary : theme.border, backgroundColor: repeatOpen ? theme.primaryLight : 'transparent' }]} onPress={() => setRepeatOpen(prev => !prev)}>
                  <Ionicons name={repeatOpen ? 'chevron-up' : 'repeat'} size={16} color={repeatOpen ? theme.primary : theme.text} />
                  <Text style={[styles.repeatToggleText, { color: repeatOpen ? theme.primary : theme.text }]}>Repeat monthly</Text>
                </TouchableOpacity>
              )}

              {repeatOpen && !editingItem && (
                <View style={styles.repeatBox}>
                  <View style={styles.repeatRow}>
                    <Text style={[styles.repeatLabel, { color: theme.textSecondary }]}>Day of month</Text>
                    <TextInput
                      style={[styles.repeatInput, { borderColor: theme.border, color: theme.text }]}
                      value={repeatDay}
                      onChangeText={setRepeatDay}
                      placeholder="1"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.repeatRow}>
                    <Text style={[styles.repeatLabel, { color: theme.textSecondary }]}>Direction</Text>
                    <View style={styles.repeatChips}>
                      {(['forward', 'backward'] as const).map((d) => {
                        const active = repeatDirection === d;
                        return (
                          <TouchableOpacity key={d} style={[styles.repeatChip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : 'transparent' }]} onPress={() => setRepeatDirection(d)}>
                            <Text style={[styles.repeatChipText, { color: active ? theme.primary : theme.text }]}>{d === 'forward' ? 'Forward' : 'Backward'}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.repeatRow}>
                    <Text style={[styles.repeatLabel, { color: theme.textSecondary }]}>Count (months)</Text>
                    <TextInput
                      style={[styles.repeatInput, { borderColor: theme.border, color: theme.text }]}
                      value={repeatCount}
                      onChangeText={setRepeatCount}
                      placeholder="e.g. 6"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="number-pad"
                    />
                  </View>
                  <Text style={[styles.repeatHint, { color: theme.textTertiary }]}>
                    Creates entries on the selected day of each month, skipping months already entered.
                  </Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleAdd} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Add Expense'}</Text>}
            </TouchableOpacity>
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
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardDot: { width: 4, borderRadius: 2, marginRight: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardVendor: { fontSize: 14, fontWeight: '600', flex: 1 },
  cardVendorSub: { fontSize: 11, marginTop: 1, fontWeight: '500' },
  cardAmount: { fontSize: 14, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  cardDate: { fontSize: 11, fontWeight: '500' },
  cardMode: { fontSize: 11, fontWeight: '500' },
  cardNotes: { fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  repeatToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  repeatToggleText: { fontSize: 14, fontWeight: '600' },
  repeatBox: { borderWidth: 1, borderRadius: 12, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  repeatLabel: { fontSize: 13, fontWeight: '600' },
  repeatInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, minWidth: 90, textAlign: 'right' },
  repeatChips: { flexDirection: 'row', gap: 6 },
  repeatChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  repeatChipText: { fontSize: 12, fontWeight: '600' },
  repeatHint: { fontSize: 11, fontStyle: 'italic' },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
