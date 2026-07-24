import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

const SCENARIOS = [
  { id: 'save-more', name: 'Save More', description: 'Increase savings rate by 10%', icon: 'wallet-outline' as const, params: { savingsRateChange: 10 } },
  { id: 'reduce-dining', name: 'Reduce Dining Out', description: 'Reduce dining by 30%', icon: 'fast-food-outline' as const, params: { expenseReduction: { 'food-dining': 30 } } },
  { id: 'invest-more', name: 'Invest More', description: 'Add ₹5,000/month', icon: 'trending-up-outline' as const, params: { investmentIncrease: 5000 } },
  { id: 'pay-debt', name: 'Pay Off Debt', description: 'Pay off ₹50,000 of debt', icon: 'card-outline' as const, params: { debtPayoff: 50_000 } },
  { id: 'aggressive-save', name: 'Aggressive Savings', description: 'Save 15% more + cut expenses 10%', icon: 'flash-outline' as const, params: { savingsRateChange: 15, expenseReduction: { all: 10 } } },
];

export default function WhatIfScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<'scenarios' | 'custom' | 'results'>('scenarios');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [savingsRateChange, setSavingsRateChange] = useState('5');
  const [expenseReduction, setExpenseReduction] = useState('10');
  const [investmentIncrease, setInvestmentIncrease] = useState('2000');
  const [debtPayoff, setDebtPayoff] = useState('10000');
  const [months, setMonths] = useState('12');

  const run = useCallback(async (params: Record<string, any>) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/what-if', { ...params, months: params.months || 12 });
      setResult(res.data);
      setTab('results');
    } catch { setError('Simulation failed.'); }
    finally { setLoading(false); }
  }, []);

  const customRun = () => run({
    savingsRateChange: parseFloat(savingsRateChange) || 0,
    expenseReduction: parseFloat(expenseReduction) > 0 ? { all: parseFloat(expenseReduction) } : {},
    investmentIncrease: parseFloat(investmentIncrease) || 0,
    debtPayoff: parseFloat(debtPayoff) || 0,
    months: parseInt(months) || 12,
  });

  const reset = () => { setResult(null); setError(''); setTab('scenarios'); };

  function sc(score: number) { return score < 40 ? '#EF4444' : score < 70 ? '#F59E0B' : '#10B981'; }
  function sb(score: number) { return score < 40 ? '#EF4444' : score < 70 ? '#F59E0B' : '#10B981'; }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>What-If Simulator</Text>
      </View>

      <View style={styles.tabRow}>
        {(['scenarios', 'custom', 'results'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => { if (t !== 'results' || result) setTab(t); }}
            disabled={t === 'results' && !result}
          >
            <Text style={[styles.tabText, { color: tab === t ? theme.primary : theme.textTertiary }]}>
              {t === 'scenarios' ? 'Pre-built' : t === 'custom' ? 'Custom' : 'Results'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'scenarios' && (
          <View style={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.scenarioCard, { backgroundColor: theme.surface }]}
                onPress={() => run({ ...s.params, months: 12 })}
                disabled={loading}
              >
                <View style={[styles.scenarioIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={s.icon} size={22} color={theme.primary} />
                </View>
                <Text style={[styles.scenarioName, { color: theme.text }]}>{s.name}</Text>
                <Text style={[styles.scenarioDesc, { color: theme.textTertiary }]}>{s.description}</Text>
                <TouchableOpacity style={[styles.simulateBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.simulateBtnText}>{loading ? 'Running...' : 'Simulate'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'custom' && (
          <View style={[styles.customCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.customTitle, { color: theme.text }]}>Custom Scenario</Text>
            {[
              { label: 'Savings Rate Change', key: 'savingsRateChange', value: savingsRateChange, setter: setSavingsRateChange, unit: '%', color: theme.income },
              { label: 'Expense Reduction', key: 'expenseReduction', value: expenseReduction, setter: setExpenseReduction, unit: '%', color: theme.warning },
              { label: 'Monthly Investment', key: 'investmentIncrease', value: investmentIncrease, setter: setInvestmentIncrease, unit: '₹', color: '#3B82F6' },
              { label: 'Debt Payoff', key: 'debtPayoff', value: debtPayoff, setter: setDebtPayoff, unit: '₹', color: '#EF4444' },
              { label: 'Projection Period', key: 'months', value: months, setter: setMonths, unit: 'mo', color: '#8B5CF6' },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <View style={[styles.fieldInput, { borderColor: theme.border }]}>
                  <Text style={[styles.fieldUnit, { color: f.color }]}>{f.unit}</Text>
                  <TextInput
                    style={[styles.fieldText, { color: theme.text }]}
                    value={f.value}
                    onChangeText={f.setter}
                    keyboardType="numeric"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.runBtn, { backgroundColor: theme.primary }]} onPress={customRun} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <><Ionicons name="play" size={18} color="white" /><Text style={styles.runBtnText}>Run Simulation</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {tab === 'results' && result && (
          <>
            <View style={styles.resultGrid}>
              <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.resultLabel, { color: theme.textTertiary }]}>Starting</Text>
                <Text style={[styles.resultValue, { color: theme.text }]}>{result.summary.initialOverall}/100</Text>
                <View style={[styles.miniBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.miniFill, { width: `${result.summary.initialOverall}%`, backgroundColor: theme.primary }]} />
                </View>
              </View>
              <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.resultLabel, { color: theme.textTertiary }]}>Final</Text>
                <Text style={[styles.resultValue, { color: sc(result.summary.finalOverall) }]}>{result.summary.finalOverall}/100</Text>
                <View style={[styles.miniBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.miniFill, { width: `${result.summary.finalOverall}%`, backgroundColor: sb(result.summary.finalOverall) }]} />
                </View>
              </View>
              <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.resultLabel, { color: theme.textTertiary }]}>Improvement</Text>
                <Text style={[styles.resultValue, { color: result.summary.improvement >= 0 ? theme.income : theme.expense }]}>
                  {result.summary.improvement >= 0 ? '+' : ''}{result.summary.improvement}
                </Text>
                <Text style={[styles.resultSub, { color: theme.textTertiary }]}>points gained</Text>
              </View>
              <View style={[styles.resultCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.resultLabel, { color: theme.textTertiary }]}>Total Savings</Text>
                <Text style={[styles.resultValue, { color: theme.income }]}>{formatCurrency(result.summary.totalSavingsAccumulated)}</Text>
                <Text style={[styles.resultSub, { color: theme.textTertiary }]}>accumulated</Text>
              </View>
            </View>

            {result.projection && result.projection.length > 0 && (
              <View style={[styles.projectionCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.projectionTitle, { color: theme.text }]}>Score Projection</Text>
                <Text style={[styles.projectionSub, { color: theme.textTertiary }]}>Over {result.projection.length} months</Text>
                <View style={styles.barChart}>
                  {result.projection.map((p: any, i: number) => (
                    <View key={i} style={styles.barCol}>
                      <View style={[styles.bar, { height: `${p.overall}%`, backgroundColor: sb(p.overall), minHeight: 3 }]} />
                    </View>
                  ))}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text style={[styles.tableCell, styles.cellBold, { color: theme.textTertiary }]}>Month</Text>
                      <Text style={[styles.tableCell, styles.cellRight, { color: theme.textTertiary }]}>Score</Text>
                      <Text style={[styles.tableCell, styles.cellRight, { color: theme.textTertiary }]}>Saved</Text>
                    </View>
                    {result.projection.filter((_: any, i: number) => i % Math.max(1, Math.floor(result.projection.length / 6)) === 0 || i === result.projection.length - 1).map((p: any) => (
                      <View key={p.month} style={[styles.tableRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
                        <Text style={[styles.tableCell, styles.cellBold, { color: theme.text }]}>{p.date}</Text>
                        <Text style={[styles.tableCell, styles.cellRight, { color: sc(p.overall), fontWeight: '700' }]}>{p.overall}</Text>
                        <Text style={[styles.tableCell, styles.cellRight, { color: theme.text }]}>{formatCurrency(p.totalSavings)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={[styles.resetBtn, { borderColor: theme.border }]} onPress={reset}>
              <Ionicons name="refresh" size={18} color={theme.text} />
              <Text style={[styles.resetBtnText, { color: theme.text }]}>Try Another Scenario</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.expenseLight }]}>
            <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 0 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, marginRight: 4 },
  tabText: { fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  scenarioGrid: { gap: 12 },
  scenarioCard: { borderRadius: 16, padding: 16, gap: 8 },
  scenarioIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scenarioName: { fontSize: 16, fontWeight: '700' },
  scenarioDesc: { fontSize: 13 },
  simulateBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  simulateBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  customCard: { borderRadius: 16, padding: 20 },
  customTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  fieldUnit: { fontSize: 15, fontWeight: '700', marginRight: 8 },
  fieldText: { flex: 1, fontSize: 15, paddingVertical: 10 },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, marginTop: 8 },
  runBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultCard: { width: '48%', borderRadius: 14, padding: 14, marginBottom: 4 },
  resultLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  resultValue: { fontSize: 20, fontWeight: '800' },
  resultSub: { fontSize: 11, marginTop: 2 },
  miniBar: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  projectionCard: { borderRadius: 16, padding: 16, marginTop: 16 },
  projectionTitle: { fontSize: 16, fontWeight: '700' },
  projectionSub: { fontSize: 12, marginTop: 2, marginBottom: 16 },
  barChart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 1, marginBottom: 16 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: 2, minHeight: 3 },
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableCell: { flex: 1, fontSize: 12 },
  cellBold: { fontWeight: '600' },
  cellRight: { textAlign: 'right' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  resetBtnText: { fontSize: 14, fontWeight: '600' },
  errorCard: { borderRadius: 12, padding: 12, marginTop: 12 },
  errorText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
