
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface BudgetItem {
  id?: string;
  _id?: string;
  name?: string;
  category?: string;
  amount?: number;
  limit?: number;
  spent?: number;
}

export default function BudgetsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/budgets');
      const data = res.data;
      setBudgets(Array.isArray(data?.budgets) ? data.budgets : Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditItem(null);
    setFormName('');
    setFormAmount('');
    setFormCategory('');
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formAmount || isNaN(parseFloat(formAmount))) {
      setFormError('Please fill all required fields');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const payload = {
        name: formName.trim(),
        amount: parseFloat(formAmount),
        category: formCategory.trim() || 'general',
      };
      if (editItem?.id || editItem?._id) {
        await api.put(`/api/budgets/${editItem.id || editItem._id}`, payload);
      } else {
        await api.post('/api/budgets', payload);
      }
      setShowForm(false);
      fetch();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to 
save');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/budgets/${id}`);
            fetch();
          } catch {
            Alert.alert('Error', 'Failed to delete');
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
        await api.post('/api/budgets', { categoryId: cat.id, subCategory: newSubCat.trim() || null, month, year, 
amount });
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
    setRepeatMonths([]);
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

  const renderTotalsCard = (title: string, budget: number, spent: number, pct: number, status: { label: string; color: 
string }) => {
    const util = budget > 0 ? (spent / budget) * 100 : 0;
    const over = budget > 0 && spent > budget;
    const deviation = budget > 0 ? Math.abs(util - 100) : 0;
    const badgeColor = budget > 0 ? (over ? theme.expense : theme.income) : theme.textTertiary;
    return (
      <View style={[styles.totalsCard, { backgroundColor: theme.surface }]}>
        <View style={styles.totalsTitleRow}>
          <Text style={[styles.totalsTitle, { color: theme.textSecondary }]}>{title}</Text>
          {budget > 0 && (
            <View style={[styles.totalsBadge, { backgroundColor: badgeColor + '1A' }]}>
              <Ionicons name={over ? 'trending-up' : 'trending-down'} size={11} color={badgeColor} />
              <Text style={[styles.totalsBadgeText, { color: badgeColor }]}>
                {over ? 'Over' : 'Under'} {Math.round(deviation)}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Budgeted</Text>
          <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(budget)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Spent</Text>
          <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(spent)}</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: theme.borderLight }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: over ? theme.expense : theme.primary 
}]} />
        </View>
        <Text style={[styles.statusChip, { color: status.color, backgroundColor: status.color + '1A' 
}]}>{status.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Budgets</Text>
        <TouchableOpacity
          onPress={() => router.push('/budget-allocation' as never)}
          style={[styles.addBtn, { backgroundColor: theme.primaryLight, marginRight: 8 }]}
        >
          <Ionicons name="sparkles" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetch} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item, i) => item.id || item._id || String(i)}
          renderItem={({ item }) => {
            const spent = item.spent || 0;
            const total = item.amount || item.limit || 0;
            const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface }]}
                onLongPress={() => handleDelete(item.id || item._id)}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="wallet-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name || item.category}</Text>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct > 80 ? theme.expense 
: theme.income }]} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(spent)}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>of {formatCurrency(total)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} 
tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No budgets yet</Text>
              <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.emptyBtnText}>Create Budget</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editItem ? 'Edit Budget' : 'New Budget'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            {formError ? (
              <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}>
                <Text style={{ color: theme.expense, fontSize: 13 }}>{formError}</Text>
              </View>
            ) : null}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} 
onChangeText={setFormName} placeholder="e.g. Groceries" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Budget Amount</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formAmount} 
onChangeText={setFormAmount} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formCategory} 
onChangeText={setFormCategory} placeholder="e.g. food" placeholderTextColor={theme.textTertiary} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} 
disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editItem ? 
'Update' : 'Create'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, 
borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 20 },
  listContent: { padding: 20, paddingBottom: 40 },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 12, 
justifyContent: 'center' },
  monthPickerText: { fontSize: 16, fontWeight: '600' },
  incomeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, marginBottom: 12 },
  incomeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  incomeLabel: { fontSize: 12 },
  incomeValue: { fontSize: 20, fontWeight: '700' },
  totalsRow2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  totalsCard: { flex: 1, borderRadius: 14, padding: 14 },
  totalsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  totalsTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  totalsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, 
borderRadius: 10 },
  totalsBadgeText: { fontSize: 10, fontWeight: '700' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 12 },
  totalsValue: { fontSize: 14, fontWeight: '600' },
  statusChip: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, 
fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  repeatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, 
borderRadius: 12, marginBottom: 16 },
  repeatBtnText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sectionHint: { fontSize: 12, marginBottom: 12 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  cardSubtext: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, 
marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});


