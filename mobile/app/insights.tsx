import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

const COLORS = ['#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

type PeriodType = 'all' | 'year' | 'quarter' | 'month';

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (period !== 'all') params.set(period, 'true');
    try {
      const res = await api.get(`/api/insights/deep${params.toString() ? `?${params.toString()}` : ''}`);
      setData(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const periods = [
    { key: 'all', label: 'All' }, { key: 'year', label: 'Year' },
    { key: 'quarter', label: 'Quarter' }, { key: 'month', label: 'Month' },
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Insights</Text>
      </View>

      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setPeriod(p.key)}>
            <Text style={[styles.periodText, { color: period === p.key ? 'white' : theme.textSecondary }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : !data ? (
        <View style={styles.center}>
          <Ionicons name="analytics-outline" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data available</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={theme.primary} />}
        >
          {data.monthlyTrend && data.monthlyTrend.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Trend</Text>
              <View style={styles.barChart}>
                {data.monthlyTrend.map((m: any, i: number) => {
                  const max = Math.max(...data.monthlyTrend.map((x: any) => x.amount));
                  const pct = max > 0 ? (m.amount / max) * 100 : 0;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={[styles.barValue, { color: theme.textTertiary }]}>{Math.round(m.amount / 1000)}k</Text>
                      <View style={[styles.bar, { height: `${pct}%`, backgroundColor: COLORS[i % COLORS.length], minHeight: 3 }]} />
                      <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{m.month.slice(0, 3)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Category Breakdown</Text>
              {data.categoryBreakdown.map((c: any, i: number) => {
                const isSelected = selectedCategory === c.name;
                const subs = c.subCategories || [];
                return (
                  <TouchableOpacity key={c.name} onPress={() => setSelectedCategory(isSelected ? null : c.name)}>
                    <View style={[styles.categoryRow, isSelected && { backgroundColor: theme.primaryLight, borderRadius: 8 }]}>
                      <View style={[styles.categoryDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                      <Text style={[styles.categoryName, { color: theme.text, fontWeight: isSelected ? '700' : '500' }]}>{c.name}</Text>
                      <Text style={[styles.categoryAmount, { color: theme.text }]}>{formatCurrency(c.amount)}</Text>
                      <Text style={[styles.categoryCount, { color: theme.textTertiary }]}>({c.count})</Text>
                    </View>
                    {isSelected && subs.length > 0 && (
                      <View style={[styles.subList, { borderLeftColor: COLORS[i % COLORS.length], borderLeftWidth: 2 }]}>
                        {subs.map((s: any) => (
                          <View key={s.name} style={styles.subRow}>
                            <Text style={[styles.subName, { color: theme.textSecondary }]}>{s.name}</Text>
                            <Text style={[styles.subAmount, { color: theme.text }]}>{formatCurrency(s.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {data.personWise && data.personWise.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Person-wise</Text>
              {data.personWise.map((p: any) => (
                <View key={p.name} style={styles.personRow}>
                  <View style={[styles.personDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.personName, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.personAmount, { color: theme.text }]}>{formatCurrency(p.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {data.topMerchants && data.topMerchants.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Top Merchants</Text>
              {data.topMerchants.map((m: any) => (
                <View key={m.name} style={styles.merchantRow}>
                  <Ionicons name="storefront-outline" size={16} color={theme.textTertiary} />
                  <Text style={[styles.merchantName, { color: theme.text }]}>{m.name}</Text>
                  <Text style={[styles.merchantAmount, { color: theme.text }]}>{formatCurrency(m.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {data.optimization && data.optimization.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Optimization Suggestions</Text>
              {data.optimization.map((o: any) => (
                <View key={o.category} style={styles.optRow}>
                  <View style={styles.optHeader}>
                    <Text style={[styles.optCategory, { color: theme.text }]}>{o.category}</Text>
                    <Text style={[styles.optPct, { color: o.percentage > 20 ? theme.expense : theme.income }]}>{o.percentage}%</Text>
                  </View>
                  <View style={[styles.optBar, { backgroundColor: theme.border }]}>
                    <View style={[styles.optFill, { width: `${Math.min(100, o.percentage)}%`, backgroundColor: o.percentage > 20 ? theme.expense : theme.income }]} />
                  </View>
                  <Text style={[styles.optSavings, { color: theme.income }]}>Potential savings: {formatCurrency(o.potentialSavings)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  periodRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  periodText: { fontSize: 13, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  barChart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barValue: { fontSize: 8, marginBottom: 2 },
  bar: { width: '80%', borderRadius: 3, minHeight: 3 },
  barLabel: { fontSize: 9, marginTop: 4 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 13 },
  categoryAmount: { fontSize: 13, fontWeight: '600', marginRight: 4 },
  categoryCount: { fontSize: 11 },
  subList: { marginLeft: 18, paddingLeft: 10, marginBottom: 8 },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  subName: { fontSize: 12 },
  subAmount: { fontSize: 12, fontWeight: '600' },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  personDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  personName: { flex: 1, fontSize: 13 },
  personAmount: { fontSize: 13, fontWeight: '600' },
  merchantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  merchantName: { flex: 1, fontSize: 13 },
  merchantAmount: { fontSize: 13, fontWeight: '600' },
  optRow: { marginBottom: 14 },
  optHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  optCategory: { fontSize: 13, fontWeight: '600' },
  optPct: { fontSize: 13, fontWeight: '700' },
  optBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  optFill: { height: '100%', borderRadius: 3 },
  optSavings: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});
