import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';
import { useBudgetOverview, useBudgetCategoryTree, type BudgetRow } from '../hooks/use-budgets';

function getCurrentMonth() { return new Date().getMonth() + 1; }
function getCurrentYear() { return new Date().getFullYear(); }
function monthName(m: number) { return new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' }); }
function rowKey(c: { categoryId: number; subCategory: string | null }) { return `${c.categoryId}::${c.subCategory || ''}`; }

export default function BudgetsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [repeating, setRepeating] = useState(false);

  // Add-category state
  const [adding, setAdding] = useState(false);
  const [useCustomCat, setUseCustomCat] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [customCatName, setCustomCatName] = useState('');
  const [newSubCat, setNewSubCat] = useState('');
  const [newAmount, setNewAmount] = useState('');

  // Repeat months selection
  const [repeatMonths, setRepeatMonths] = useState<number[]>([]);

  const overviewQuery = useBudgetOverview(month, year);
  const overview = overviewQuery.data ?? null;
  const loading = overviewQuery.isLoading;

  const categoriesQuery = useBudgetCategoryTree();
  const categories = categoriesQuery.data?.categories ?? [];
  const subCategories = categoriesQuery.data?.subCategories ?? [];
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Initialize row amounts once per month/year (never clobber in-progress edits).
  const initedRef = useRef('');
  useEffect(() => {
    const key = `${month}:${year}`;
    if (!overview || initedRef.current === key) return;
    initedRef.current = key;
    const init: Record<string, string> = {};
    for (const row of overview.commonCategories) {
      init[rowKey(row)] = row.currentBudget != null ? String(row.currentBudget) : '';
    }
    setAmounts(init);
  }, [overview, month, year]);

  const remainingMonths = (() => {
    const start = month + 1;
    const arr: number[] = [];
    for (let m = start; m <= 12; m++) arr.push(m);
    return arr;
  })();

  useEffect(() => {
    if (repeatMonths.length === 0) setRepeatMonths(remainingMonths);
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRepeatMonth = (m: number) => {
    setRepeatMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const reload = () => {
    queryClient.invalidateQueries({ queryKey: ['budgets-overview'] });
    queryClient.invalidateQueries({ queryKey: ['budget-category-tree'] });
  };

  const saveAll = async () => {
    const valid = (overview?.commonCategories || [])
      .map((row) => ({ row, amt: parseFloat(amounts[rowKey(row)] || '') }))
      .filter((e) => !isNaN(e.amt) && e.amt > 0);
    if (valid.length === 0) {
      Alert.alert('Enter a valid amount for at least one category');
      return;
    }
    setSaving(true);
    try {
      for (const { row, amt } of valid) {
        if (row.budgetId != null) {
          await api.put('/api/budgets', { id: row.budgetId, amount: amt });
        } else {
          await api.post('/api/budgets', { categoryId: row.categoryId, subCategory: row.subCategory, month, year, amount: amt });
        }
      }
      Alert.alert(`Saved ${valid.length} budget${valid.length === 1 ? '' : 's'}`);
      reload();
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to save budgets');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (useCustomCat) {
      if (!customCatName.trim()) { Alert.alert('Enter a category name'); return; }
      try {
        const catRes = await api.post('/api/categories', { name: customCatName.trim(), type: 'expense' });
        await api.post('/api/budgets', { categoryId: catRes.data.id, subCategory: newSubCat.trim() || null, month, year, amount: parseFloat(newAmount) || 0 });
        setUseCustomCat(false); setCustomCatName(''); setNewSubCat(''); setNewAmount(''); setAdding(false);
        reload();
        return;
      } catch { Alert.alert('Error', 'Failed to create category'); return; }
    }
    if (!newCatId) { Alert.alert('Select a category'); return; }
    try {
      const amount = parseFloat(newAmount || '');
      if (amount > 0) {
        await api.post('/api/budgets', { categoryId: Number(newCatId), subCategory: newSubCat.trim() || null, month, year, amount });
      }
      setAdding(false); setNewCatId(''); setNewSubCat(''); setNewAmount('');
      reload();
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to add category');
    }
  };

  const handleRepeat = async () => {
    const months = [...repeatMonths].sort((a, b) => a - b);
    if (months.length === 0) { Alert.alert('Select at least one month'); return; }
    const entries = (overview?.commonCategories || [])
      .map((row) => {
        const amt = parseFloat(amounts[rowKey(row)] || '');
        if (isNaN(amt) || amt <= 0) return null;
        return { categoryId: row.categoryId, subCategory: row.subCategory, amount: amt, months };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    if (entries.length === 0) { Alert.alert('Set budget amounts for at least one category first'); return; }
    setRepeating(true);
    try {
      const res = await api.post('/api/budgets/repeat', { year, entries });
      Alert.alert('Success', `Created ${res.data.created} budgets, skipped ${res.data.skipped} existing`);
      reload();
    } catch { Alert.alert('Error', 'Failed to repeat budgets'); } finally { setRepeating(false); }
  };

  const prevDate = new Date(year, month - 2, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const totalCurrentBudget = overview?.totals.current.budget ?? 0;
  const totalCurrentSpent = overview?.totals.current.spent ?? 0;
  const totalLastBudget = overview?.totals.lastMonth.budget ?? 0;
  const totalLastSpent = overview?.totals.lastMonth.spent ?? 0;
  const income = overview?.income ?? 0;
  const currentPct = totalCurrentBudget > 0 ? Math.round((totalCurrentSpent / totalCurrentBudget) * 100) : 0;
  const lastPct = totalLastBudget > 0 ? Math.round((totalLastSpent / totalLastBudget) * 100) : 0;

  const statusInfo = (spent: number, budget: number | null): { label: string; color: string } => {
    if (!budget || budget <= 0) return { label: 'No budget', color: theme.textTertiary };
    const pct = spent / budget;
    if (pct > 1) return { label: 'Over', color: theme.expense };
    if (pct >= 0.8) return { label: 'On track', color: theme.warning };
    return { label: 'Under', color: theme.income };
  };

  const renderTotalsCard = (title: string, budget: number, spent: number, pct: number) => {
    const over = budget > 0 && spent > budget;
    return (
      <View style={[styles.totalsCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.totalsTitle, { color: theme.textSecondary }]}>{title}</Text>
        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Budgeted</Text>
          <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(budget)}</Text>
        </View>
        <View style={[styles.totalsRow, { marginBottom: 8 }]}>
          <Text style={[styles.totalsLabel, { color: theme.textTertiary }]}>Spent</Text>
          <Text style={[styles.totalsValue, { color: theme.text }]}>{formatCurrency(spent)}</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: theme.borderLight }]}>
          <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: over ? theme.expense : theme.primary }]} />
        </View>
      </View>
    );
  };

  const renderRow = (row: BudgetRow) => {
    const key = rowKey(row);
    const spent = row.currentSpent || 0;
    const budget = parseFloat(amounts[key] || '');
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const status = statusInfo(spent, budget > 0 ? budget : null);
    return (
      <View key={key} style={[styles.rowCard, { backgroundColor: theme.surface }]}>
        <View style={styles.rowHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowName, { color: theme.text }]}>{row.category.name}{row.subCategory ? ` · ${row.subCategory}` : ''}</Text>
            <Text style={[styles.rowMeta, { color: theme.textTertiary }]}>
              Spent {formatCurrency(spent)}{row.lastMonthSpend > 0 ? ` · Last ${formatCurrency(row.lastMonthSpend)}` : ''}
            </Text>
          </View>
          <Text style={[styles.statusChip, { color: status.color, backgroundColor: status.color + '1A' }]}>{status.label}</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: theme.borderLight }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: status.color }]} />
        </View>
        <View style={styles.rowFooter}>
          <Text style={[styles.rowMeta, { color: theme.textTertiary }]}>Budget</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.text, borderColor: theme.border }]}
            value={amounts[key] || ''}
            onChangeText={(v) => setAmounts((prev) => ({ ...prev, [key]: v }))}
            placeholder="0"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
          />
        </View>
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
        <TouchableOpacity onPress={() => router.push('/budget-allocation' as never)} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="sparkles" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month picker */}
        <View style={[styles.monthPicker, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => { const d = new Date(year, month - 2, 1); setMonth(d.getMonth() + 1); setYear(d.getFullYear()); }}>
            <Ionicons name="chevron-back" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthPickerText, { color: theme.text }]}>{monthName(month)} {year}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(year, month, 1); setMonth(d.getMonth() + 1); setYear(d.getFullYear()); }}>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
        ) : (
          <>
            {/* Income strip */}
            <View style={[styles.incomeCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.incomeIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="trending-up" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.incomeLabel, { color: theme.textSecondary }]}>Income · {monthName(month)} {year}</Text>
                <Text style={[styles.incomeValue, { color: theme.text }]}>{formatCurrency(income)}</Text>
              </View>
              {income > 0 && totalCurrentBudget > 0 && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.incomeLabel, { color: theme.textSecondary }]}>Budgeted</Text>
                  <Text style={[styles.incomeValue, { color: totalCurrentBudget > income ? theme.warning : theme.income }]}>
                    {Math.round((totalCurrentBudget / income) * 100)}% of income
                  </Text>
                </View>
              )}
            </View>

            {/* Totals */}
            <View style={styles.totalsRow2}>
              {renderTotalsCard(`${monthName(month)} ${year}`, totalCurrentBudget, totalCurrentSpent, currentPct)}
              {renderTotalsCard(`${monthName(prevMonth)} ${prevYear}`, totalLastBudget, totalLastSpent, lastPct)}
            </View>

            {/* Planner header */}
            <View style={styles.plannerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Budget Planner</Text>
                <Text style={[styles.sectionHint, { color: theme.textTertiary }]}>Set monthly budgets by category</Text>
              </View>
              <TouchableOpacity style={[styles.saveBtnSm, { backgroundColor: theme.primary }]} onPress={saveAll} disabled={saving || loading}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnSmText}>Save All</Text>}
              </TouchableOpacity>
            </View>

            {/* Repeat row */}
            {remainingMonths.length > 0 && (
              <View style={[styles.repeatCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.repeatLabel, { color: theme.textTertiary }]}>Repeat budget to:</Text>
                <View style={styles.repeatChips}>
                  {remainingMonths.map((m) => {
                    const active = repeatMonths.includes(m);
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => toggleRepeatMonth(m)}
                        style={[styles.repeatChip, { backgroundColor: active ? theme.primaryLight : theme.background, borderColor: active ? theme.primary : theme.border }]}
                      >
                        <Text style={[styles.repeatChipText, { color: active ? theme.primary : theme.textTertiary }]}>{monthName(m).slice(0, 3)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={[styles.repeatBtn, { backgroundColor: theme.primaryLight }]} onPress={handleRepeat} disabled={repeating || loading}>
                  {repeating ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.repeatBtnText, { color: theme.primary }]}>Repeat to {repeatMonths.length} month{repeatMonths.length === 1 ? '' : 's'}</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Category rows */}
            {(overview?.commonCategories || []).map((row) => renderRow(row))}

            {/* Add category */}
            {!adding ? (
              <TouchableOpacity style={[styles.addCatBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => { setAdding(true); setUseCustomCat(false); }}>
                <Ionicons name="add" size={18} color={theme.primary} />
                <Text style={[styles.addCatText, { color: theme.primary }]}>Add Category</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addCatCard, { backgroundColor: theme.surface }]}>
                {!useCustomCat ? (
                  <>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                    <View style={styles.catChips}>
                      {expenseCategories.slice(0, 20).map((c) => {
                        const active = newCatId === String(c.id);
                        return (
                          <TouchableOpacity key={c.id} onPress={() => setNewCatId(active ? '' : String(c.id))} style={[styles.catChip, { backgroundColor: active ? theme.primaryLight : theme.background, borderColor: active ? theme.primary : theme.border }]}>
                            <Text style={[styles.catChipText, { color: active ? theme.primary : theme.text }]}>{c.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <TouchableOpacity onPress={() => setUseCustomCat(true)}>
                      <Text style={[styles.customLink, { color: theme.primary }]}>➕ Add custom category...</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>New category name</Text>
                    <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={customCatName} onChangeText={setCustomCatName} placeholder="e.g. Groceries" placeholderTextColor={theme.textTertiary} />
                    <TouchableOpacity onPress={() => setUseCustomCat(false)}>
                      <Text style={[styles.customLink, { color: theme.primary }]}>← Choose existing category</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Sub-category (optional)</Text>
                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newSubCat} onChangeText={setNewSubCat} placeholder="e.g. Home" placeholderTextColor={theme.textTertiary} />
                <Text style={[styles.label, { color: theme.textSecondary }]}>Budget amount</Text>
                <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={newAmount} onChangeText={setNewAmount} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
                <View style={styles.addCatActions}>
                  <TouchableOpacity style={[styles.addBtnGhost, { borderColor: theme.border }]} onPress={() => setAdding(false)}>
                    <Text style={{ color: theme.textTertiary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addBtnSolid, { backgroundColor: theme.primary }]} onPress={addCategory}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  monthPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  monthPickerText: { fontSize: 16, fontWeight: '700' },
  incomeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, marginBottom: 12 },
  incomeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  incomeLabel: { fontSize: 12, fontWeight: '600' },
  incomeValue: { fontSize: 20, fontWeight: '700' },
  totalsRow2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  totalsCard: { flex: 1, borderRadius: 14, padding: 14 },
  totalsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 12 },
  totalsValue: { fontSize: 14, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  plannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionLabel: { fontSize: 16, fontWeight: '700' },
  sectionHint: { fontSize: 12, marginTop: 2 },
  saveBtnSm: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  saveBtnSmText: { color: '#fff', fontWeight: '700' },
  repeatCard: { padding: 12, borderRadius: 12, marginBottom: 12 },
  repeatLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  repeatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  repeatChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  repeatChipText: { fontSize: 11, fontWeight: '600' },
  repeatBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  repeatBtnText: { fontSize: 13, fontWeight: '700' },
  rowCard: { padding: 14, borderRadius: 12, marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 11, marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  amountInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, minWidth: 90, textAlign: 'right' },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  addCatText: { fontSize: 14, fontWeight: '600' },
  addCatCard: { padding: 14, borderRadius: 12, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 10 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '500' },
  customLink: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  addCatActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  addBtnGhost: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  addBtnSolid: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
});