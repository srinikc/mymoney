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
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface CommonCategoryRow {
  categoryId: number;
  category: { id: number; name: string; icon: string; color: string };
  subCategory: string | null;
  lastMonthSpend: number;
  currentBudget: number | null;
  currentSpent: number;
  budgetId: number | null;
}

interface OverviewResponse {
  overview: boolean;
  month: number;
  year: number;
  income: number;
  commonCategories: CommonCategoryRow[];
  totals: {
    current: { budget: number; spent: number };
    lastMonth: { budget: number; spent: number };
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function statusInfo(spent: number, budget: number | null) {
  if (!budget || budget <= 0) return { label: 'No budget', color: '#6B7280' };
  const pct = spent / budget;
  if (pct > 1) return { label: 'Over budget', color: '#EF4444' };
  if (pct >= 0.8) return { label: 'On track', color: '#F59E0B' };
  return { label: 'Under budget', color: '#10B981' };
}

export default function BudgetsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Row amount inputs keyed by "categoryId::subCategory"
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Month picker modal
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Add category modal
  const [showAdd, setShowAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCat, setNewSubCat] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Repeat modal
  const [showRepeat, setShowRepeat] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState<number[]>([]);
  const [repeating, setRepeating] = useState(false);

  const rowKey = useCallback((row: CommonCategoryRow) => `${row.categoryId}::${row.subCategory || ''}`, []);

  const fetchOverview = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/budgets/overview', { params: { month, year } });
      const data = res.data as OverviewResponse;
      setOverview(data);
      const init: Record<string, string> = {};
      for (const row of data.commonCategories) {
        init[rowKey(row)] = row.currentBudget != null ? String(row.currentBudget) : '';
      }
      setAmounts(init);
    } catch {
      setError('Failed to load budget overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year, rowKey]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const openAdd = () => {
    setNewCatName('');
    setNewSubCat('');
    setNewAmount('');
    setShowAdd(true);
  };

  const saveRow = async (row: CommonCategoryRow) => {
    const key = rowKey(row);
    const value = parseFloat(amounts[key] || '');
    if (isNaN(value) || value <= 0) {
      Alert.alert('Error', 'Enter a valid amount greater than 0');
      return;
    }
    setSavingKey(key);
    try {
      if (row.budgetId != null) {
        await api.put('/api/budgets', { id: row.budgetId, amount: value });
      } else {
        await api.post('/api/budgets', { categoryId: row.categoryId, subCategory: row.subCategory, month, year, amount: value });
      }
      Alert.alert('Success', `Saved budget for ${row.category.name}`);
      await fetchOverview();
    } catch {
      Alert.alert('Error', 'Failed to save budget');
    } finally {
      setSavingKey(null);
    }
  };

  const deleteRow = (row: CommonCategoryRow) => {
    if (!row.budgetId) return;
    Alert.alert('Delete Budget', `Delete budget for ${row.category.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/budgets?id=${row.budgetId}`);
            await fetchOverview();
          } catch {
            Alert.alert('Error', 'Failed to delete budget');
          }
        },
      },
    ]);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    try {
      const catRes = await api.post('/api/categories', { name: newCatName.trim(), type: 'expense' });
      const cat = catRes.data;
      const amount = parseFloat(newAmount || '');
      if (amount > 0) {
        await api.post('/api/budgets', { categoryId: cat.id, subCategory: newSubCat.trim() || null, month, year, amount });
      }
      setShowAdd(false);
      await fetchOverview();
    } catch {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const remainingMonths = (() => {
    const start = year === now.getFullYear() ? now.getMonth() + 1 : 1;
    const arr: number[] = [];
    for (let m = start; m <= 12; m++) arr.push(m);
    return arr;
  })();

  const openRepeat = () => {
    setRepeatMonths([...remainingMonths]);
    setShowRepeat(true);
  };

  const toggleRepeatMonth = (m: number) => {
    setRepeatMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleRepeat = async () => {
    const months = [...repeatMonths].sort((a, b) => a - b);
    if (months.length === 0) {
      Alert.alert('Error', 'Select at least one month');
      return;
    }
    const entries = (overview?.commonCategories || [])
      .map((row) => {
        const amt = parseFloat(amounts[rowKey(row)] || '');
        if (isNaN(amt) || amt <= 0) return null;
        return { categoryId: row.categoryId, subCategory: row.subCategory, amount: amt, months };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    if (entries.length === 0) {
      Alert.alert('Error', 'Set budget amounts for at least one category first');
      return;
    }
    setRepeating(true);
    try {
      const res = await api.post('/api/budgets/repeat', { year, entries });
      Alert.alert('Success', `Created ${res.data.created} budgets, skipped ${res.data.skipped} existing`);
      setShowRepeat(false);
      await fetchOverview();
    } catch {
      Alert.alert('Error', 'Failed to repeat budgets');
    } finally {
      setRepeating(false);
    }
  };

  const totalBudget = overview?.totals.current.budget ?? 0;
  const totalSpent = overview?.totals.current.spent ?? 0;
  const lastBudget = overview?.totals.lastMonth.budget ?? 0;
  const lastSpent = overview?.totals.lastMonth.spent ?? 0;
  const income = overview?.income ?? 0;

  const totalStatus = statusInfo(totalSpent, totalBudget > 0 ? totalBudget : null);
  const lastStatus = statusInfo(lastSpent, lastBudget > 0 ? lastBudget : null);

  const totalPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;
  const lastPct = lastBudget > 0 ? Math.min(100, (lastSpent / lastBudget) * 100) : 0;

  const renderTotalsCard = (title: string, budget: number, spent: number, pct: number, status: { label: string; color: string }) => (
    <View style={[styles.totalsCard, { backgroundColor: theme.surface }]}>
      <Text style={[styles.totalsTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={styles.totalsRow}>
        <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Budgeted</Text>
        <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(budget)}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Spent</Text>
        <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(spent)}</Text>
      </View>
      <View style={[styles.progressBg, { backgroundColor: theme.borderLight }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 100 ? theme.expense : theme.primary }]} />
      </View>
      <Text style={[styles.statusChip, { color: status.color, backgroundColor: status.color + '1A' }]}>{status.label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Budgets</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={overview?.commonCategories || []}
        keyExtractor={(item, i) => rowKey(item) || String(i)}
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              style={[styles.monthPicker, { backgroundColor: theme.surface }]}
              onPress={() => setShowMonthPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.primary} />
              <Text style={[styles.monthPickerText, { color: theme.text }]}>{MONTHS[month - 1]} {year}</Text>
              <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
            </TouchableOpacity>

            {/* Income */}
            <View style={[styles.incomeCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.incomeIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="trending-up" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.incomeLabel, { color: theme.textTertiary }]}>Income · {MONTHS[month - 1]} {year}</Text>
                <Text style={[styles.incomeValue, { color: theme.text }]}>{formatCurrency(income)}</Text>
              </View>
            </View>

            {/* Totals */}
            <View style={styles.totalsRow2}>
              {renderTotalsCard('This Month', totalBudget, totalSpent, totalPct, totalStatus)}
              {renderTotalsCard('Last Month', lastBudget, lastSpent, lastPct, lastStatus)}
            </View>

            {/* Repeat button */}
            <TouchableOpacity
              style={[styles.repeatBtn, { backgroundColor: theme.primaryLight }]}
              onPress={openRepeat}
              disabled={loading}
            >
              <Ionicons name="repeat" size={16} color={theme.primary} />
              <Text style={[styles.repeatBtnText, { color: theme.primary }]}>Repeat for months of {year}</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Budget Planner</Text>
            <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>Amounts are monthly limits. Last month shows actual spend.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const key = rowKey(item);
          const status = statusInfo(item.currentSpent, item.currentBudget);
          const util = item.currentBudget && item.currentBudget > 0 ? Math.min(100, (item.currentSpent / item.currentBudget) * 100) : 0;
          const isSaving = savingKey === key;
          return (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.catDot, { backgroundColor: item.category.color }]} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.category.name}</Text>
                  </View>
                  {item.subCategory ? <Text style={[styles.cardSub, { color: theme.textTertiary }]}>/ {item.subCategory}</Text> : null}
                </View>
                <Text style={[styles.statusChip, { color: status.color, backgroundColor: status.color + '1A' }]}>
                  {status.label}{item.currentBudget ? ` · ${Math.round(item.currentBudget > 0 ? (item.currentSpent / item.currentBudget) * 100 : 0)}%` : ''}
                </Text>
              </View>

              <View style={styles.cardMetrics}>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>Last month</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{formatCurrency(item.lastMonthSpend)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>Spent</Text>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{formatCurrency(item.currentSpent)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>Budget (₹)</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.text, borderColor: theme.border }]}
                    value={amounts[key] ?? ''}
                    onChangeText={(v) => setAmounts((p) => ({ ...p, [key]: v }))}
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={[styles.progressBg, { backgroundColor: theme.borderLight }]}>
                <View style={[styles.progressFill, { width: `${util}%`, backgroundColor: item.currentBudget && item.currentSpent / item.currentBudget > 1 ? theme.expense : theme.primary }]} />
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primaryLight }]} onPress={() => saveRow(item)} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="save-outline" size={16} color={theme.primary} />}
                  <Text style={[styles.actionText, { color: theme.primary }]}>Save</Text>
                </TouchableOpacity>
                {item.budgetId != null && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.expenseLight }]} onPress={() => deleteRow(item)}>
                    <Ionicons name="trash-outline" size={16} color={theme.expense} />
                    <Text style={[styles.actionText, { color: theme.expense }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOverview(); }} tintColor={theme.primary} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle" size={40} color={theme.expense} />
              <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
              <TouchableOpacity onPress={fetchOverview} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.center}>
              <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No categories found. Add one below.</Text>
              <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.emptyBtnText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Month picker modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.yearBtn}>
                <Ionicons name="chevron-back" size={18} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>{year}</Text>
              <TouchableOpacity onPress={() => setYear((y) => y + 1)} style={styles.yearBtn}>
                <Ionicons name="chevron-forward" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => {
                const isSel = i + 1 === month;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthCell, isSel && { backgroundColor: theme.primary }]}
                    onPress={() => { setMonth(i + 1); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.monthCellText, { color: isSel ? '#fff' : theme.text }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Add category modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Category</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Category name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newCatName} onChangeText={setNewCatName} placeholder="e.g. Groceries" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Sub-category (optional)</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newSubCat} onChangeText={setNewSubCat} placeholder="e.g. Home" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Budget for {MONTHS[month - 1]} {year} (₹)</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newAmount} onChangeText={setNewAmount} placeholder="0" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={addCategory}>
              <Text style={styles.saveBtnText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Repeat modal */}
      <Modal visible={showRepeat} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Repeat for {year}</Text>
              <TouchableOpacity onPress={() => setShowRepeat(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.repeatHint, { color: theme.textTertiary }]}>Copy this month&apos;s amounts to the selected months. Existing budgets are skipped.</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {remainingMonths.map((m) => {
                const isSel = repeatMonths.includes(m);
                return (
                  <TouchableOpacity key={m} style={[styles.repeatItem, { borderColor: theme.border }]} onPress={() => toggleRepeatMonth(m)}>
                    <Ionicons name={isSel ? 'checkbox' : 'square-outline'} size={20} color={isSel ? theme.primary : theme.textTertiary} />
                    <Text style={[styles.repeatItemText, { color: theme.text }]}>{MONTHS[m - 1]} {year}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleRepeat} disabled={repeating}>
              {repeating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Repeat to {repeatMonths.length} month(s)</Text>}
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
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 40 },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 12, justifyContent: 'center' },
  monthPickerText: { fontSize: 16, fontWeight: '600' },
  incomeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, marginBottom: 12 },
  incomeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  incomeLabel: { fontSize: 12 },
  incomeValue: { fontSize: 20, fontWeight: '700' },
  totalsRow2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  totalsCard: { flex: 1, borderRadius: 14, padding: 14 },
  totalsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 12 },
  totalsValue: { fontSize: 14, fontWeight: '600' },
  statusChip: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  repeatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 16 },
  repeatBtnText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sectionHint: { fontSize: 12, marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2, marginLeft: 16 },
  cardMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  metric: { flex: 1 },
  metricLabel: { fontSize: 11, marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: '600' },
  amountInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, width: '100%' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 },
  yearBtn: { padding: 8 },
  yearText: { fontSize: 18, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthCell: { width: '28%', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  monthCellText: { fontSize: 14, fontWeight: '600' },
  repeatHint: { fontSize: 13, marginBottom: 16 },
  repeatItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  repeatItemText: { fontSize: 15, fontWeight: '500' },
});