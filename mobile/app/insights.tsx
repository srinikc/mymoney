import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import { useDeepInsights, useYoy, type InsightPeriod, type DeepInsights } from '../hooks/use-insights';

const COLORS = ['#6366f1', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

const PERIODS: { key: InsightPeriod; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'year', label: 'Year' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month', label: 'Month' },
];

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [period, setPeriod] = useState<InsightPeriod>('all');
  const currentYear = new Date().getFullYear();
  const [yoyCategory, setYoyCategory] = useState('');

  const insightsQuery = useDeepInsights(period, currentYear);
  const data = insightsQuery.data;
  const loading = insightsQuery.isLoading;

  const yoyQuery = useYoy(yoyCategory);
  const yoy = yoyQuery.data?.data;

  const topCategories = useMemo(() => (data?.categoryBreakdown ?? []).slice(0, 10).map((c) => c.name), [data]);

  const maxMonth = useMemo(() => Math.max(1, ...(data?.monthlyTrend ?? []).map((m) => m.amount)), [data]);
  const maxYear = useMemo(() => Math.max(1, ...(data?.yearlyComparison ?? []).map((y) => y.amount)), [data]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Insights', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Insights',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.tabBar}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.tab, { backgroundColor: period === p.key ? theme.primary : 'transparent' }]}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: period === p.key ? '#fff' : theme.primary }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!data ? (
          <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="analytics-outline" size={40} color={theme.textTertiary} />
            <Text style={{ color: theme.text, fontSize: 14, marginTop: 8 }}>No insights available yet</Text>
          </View>
        ) : (
          <>
            {/* Monthly trend */}
            {data.monthlyTrend && data.monthlyTrend.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Trend</Text>
                <View style={styles.barChart}>
                  {data.monthlyTrend.map((m, i) => {
                    const pct = (m.amount / maxMonth) * 100;
                    return (
                      <View key={i} style={styles.barCol}>
                        <Text style={[styles.barValue, { color: theme.textTertiary }]}>{Math.round(m.amount / 1000)}k</Text>
                        <View style={[styles.bar, { height: `${Math.max(3, pct)}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                        <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{m.month.slice(0, 3)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Category breakdown */}
            {data.categoryBreakdown && data.categoryBreakdown.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>By Category</Text>
                {data.categoryBreakdown.slice(0, 10).map((c) => {
                  const totalCat = data.categoryBreakdown.reduce((s, x) => s + x.amount, 0);
                  const pct = totalCat > 0 ? (c.amount / totalCat) * 100 : 0;
                  return (
                    <View key={c.name} style={styles.catRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catName, { color: theme.text }]}>{c.name}</Text>
                        <View style={[styles.catBarBg, { backgroundColor: theme.borderLight }]}>
                          <View style={[styles.catBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: c.color || COLORS[0] }]} />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={[styles.catAmount, { color: theme.text }]}>{formatCurrency(c.amount)}</Text>
                        <Text style={[styles.catPct, { color: theme.textTertiary }]}>{Math.round(pct)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Top merchants */}
            {data.topMerchants && data.topMerchants.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Top Merchants</Text>
                {data.topMerchants.slice(0, 8).map((m) => (
                  <View key={m.name} style={styles.merchantRow}>
                    <Ionicons name="storefront-outline" size={16} color={theme.textTertiary} />
                    <Text style={[styles.merchantName, { color: theme.text }]}>{m.name}</Text>
                    <Text style={[styles.merchantAmount, { color: theme.text }]}>{formatCurrency(m.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Optimization */}
            {data.optimization && data.optimization.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Optimization Suggestions</Text>
                {data.optimization.slice(0, 6).map((o) => (
                  <View key={o.category} style={styles.optRow}>
                    <View style={styles.optHeader}>
                      <Text style={[styles.optCategory, { color: theme.text }]}>{o.category}</Text>
                      <Text style={[styles.optPct, { color: o.percentage > 20 ? theme.expense : theme.income }]}>{o.percentage}%</Text>
                    </View>
                    <View style={[styles.optBar, { backgroundColor: theme.borderLight }]}>
                      <View style={[styles.optFill, { width: `${Math.min(100, o.percentage)}%`, backgroundColor: o.percentage > 20 ? theme.expense : theme.income }]} />
                    </View>
                    <Text style={[styles.optSavings, { color: theme.income }]}>Potential savings: {formatCurrency(o.potentialSavings)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Yearly comparison */}
            {data.yearlyComparison && data.yearlyComparison.length > 1 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Yearly Comparison</Text>
                <View style={styles.barChart}>
                  {data.yearlyComparison.map((y, i) => {
                    const pct = (y.amount / maxYear) * 100;
                    return (
                      <View key={y.year} style={styles.barCol}>
                        <Text style={[styles.barValue, { color: theme.textTertiary }]}>{Math.round(y.amount / 1000)}k</Text>
                        <View style={[styles.bar, { height: `${Math.max(3, pct)}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                        <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{y.year}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* YoY by category */}
            {topCategories.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Year-over-Year</Text>
                <View style={styles.catChips}>
                  {topCategories.map((c) => {
                    const active = yoyCategory === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setYoyCategory(active ? '' : c)}
                        style={[styles.catChip, { backgroundColor: active ? theme.primaryLight : theme.background, borderColor: active ? theme.primary : theme.border }]}
                      >
                        <Text style={[styles.catChipText, { color: active ? theme.primary : theme.text }]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {yoyCategory && (
                  <View style={styles.barChart}>
                    {(yoy ?? []).map((y, i) => (
                      <View key={y.year} style={styles.barCol}>
                        <Text style={[styles.barValue, { color: theme.textTertiary }]}>{formatCurrency(y.amount)}</Text>
                        <View style={[styles.bar, { height: 80, backgroundColor: COLORS[i % COLORS.length] }]} />
                        <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{y.year}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Deals */}
            {data.deals && data.deals.length > 0 && (
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Deals & Discounts</Text>
                {data.deals.slice(0, 6).map((d, i) => (
                  <View key={i} style={styles.dealRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dealMerchant, { color: theme.text }]}>{d.merchant}</Text>
                      <Text style={[styles.dealTitle, { color: theme.textSecondary }]}>{d.title}</Text>
                    </View>
                    <Text style={[styles.dealDiscount, { color: theme.income }]}>{d.discount}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', gap: 4, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  card: { padding: 12, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  empty: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barValue: { fontSize: 9, marginBottom: 2 },
  bar: { width: '70%', borderRadius: 3, minHeight: 3 },
  barLabel: { fontSize: 9, marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  catName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  catBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catAmount: { fontSize: 13, fontWeight: '700' },
  catPct: { fontSize: 11 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  merchantName: { fontSize: 13, flex: 1 },
  merchantAmount: { fontSize: 13, fontWeight: '600' },
  optRow: { marginBottom: 10 },
  optHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  optCategory: { fontSize: 13, fontWeight: '600' },
  optPct: { fontSize: 13, fontWeight: '700' },
  optBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  optFill: { height: '100%', borderRadius: 3 },
  optSavings: { fontSize: 11, marginTop: 4 },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '500' },
  dealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  dealMerchant: { fontSize: 14, fontWeight: '600' },
  dealTitle: { fontSize: 12, marginTop: 2 },
  dealDiscount: { fontSize: 13, fontWeight: '700', marginLeft: 10 },
});