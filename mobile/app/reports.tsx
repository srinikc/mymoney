import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface TrendItem {
  month: string;
  amount: number;
}

interface CategoryItem {
  name: string;
  percentage: number;
}

interface InsightsData {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  goalProgress: number;
  monthlyTrend: TrendItem[];
  incomeTrend: TrendItem[];
  topCategories: CategoryItem[];
}

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('overview');

  const fetch = useCallback(async () => {
    try {
      const res = await api.get(`/api/insights?year=${new Date().getFullYear()}`);
      setInsights(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const maxTrend = Math.max(1, ...(insights?.monthlyTrend || []).map((m: TrendItem) => m.amount));
  const maxIncome = Math.max(1, ...(insights?.incomeTrend || []).map((m: TrendItem) => m.amount));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Reports</Text>
      </View>

      <View style={styles.tabRow}>
        {['overview', 'income', 'expenses'].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, { backgroundColor: tab === t ? theme.primary : theme.surface }]}>
            <Text style={{ color: tab === t ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
        : !insights ? <Text style={{ textAlign: 'center', color: theme.textTertiary, marginTop: 60 }}>No data</Text>
        : tab === 'overview' ? (
          <>
            <View style={styles.statGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total Income</Text>
                <Text style={[styles.statValue, { color: theme.income }]}>{formatCurrency(insights.totalIncome || 0)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total Expenses</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(insights.totalExpenses || 0)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Investments</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(insights.totalInvestments || 0)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Goals Progress</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{Math.round(insights.goalProgress || 0)}%</Text>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Expense Trend</Text>
              {insights.monthlyTrend?.map((m: TrendItem, i: number) => (
                <View key={i} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{m.month}</Text>
                  <View style={styles.barBg}><View style={[styles.barFill, { width: `${(m.amount / maxTrend) * 100}%`, backgroundColor: theme.primary }]} /></View>
                  <Text style={[styles.barValue, { color: theme.textTertiary }]}>{formatCurrency(m.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : tab === 'income' ? (
          <>
            <View style={styles.statGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total Income</Text>
                <Text style={[styles.statValue, { color: theme.income }]}>{formatCurrency(insights.totalIncome || 0)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Monthly Avg</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{formatCurrency(Math.round((insights.totalIncome || 0) / 12))}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Net Balance</Text>
                <Text style={[styles.statValue, { color: (insights.totalIncome || 0) - (insights.totalExpenses || 0) >= 0 ? theme.income : theme.expense }]}>{formatCurrency((insights.totalIncome || 0) - (insights.totalExpenses || 0))}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Savings Rate</Text>
                <Text style={[styles.statValue, { color: insights.totalIncome > 0 ? theme.income : theme.textTertiary }]}>
                  {insights.totalIncome > 0 ? `${(((insights.totalIncome - insights.totalExpenses) / insights.totalIncome) * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Income Trend</Text>
              {insights.incomeTrend?.map((m: TrendItem, i: number) => (
                <View key={i} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{m.month}</Text>
                  <View style={styles.barBg}><View style={[styles.barFill, { width: `${(m.amount / maxIncome) * 100}%`, backgroundColor: theme.income }]} /></View>
                  <Text style={[styles.barValue, { color: theme.textTertiary }]}>{formatCurrency(m.amount)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Income vs Expenses</Text>
              {insights.incomeTrend?.map((m: TrendItem, i: number) => {
                const exp = insights.monthlyTrend?.[i]?.amount || 0;
                return (
                  <View key={i} style={styles.compRow}>
                    <Text style={[styles.barLabel, { color: theme.textSecondary, width: 36 }]}>{m.month}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.compBar}><View style={[styles.compFill, { width: `${(m.amount / Math.max(maxIncome, maxTrend)) * 100}%`, backgroundColor: theme.income }]} /></View>
                      <View style={styles.compBar}><View style={[styles.compFill, { width: `${(exp / Math.max(maxIncome, maxTrend)) * 100}%`, backgroundColor: theme.expense }]} /></View>
                    </View>
                    <View style={{ alignItems: 'flex-end', width: 80 }}>
                      <Text style={{ fontSize: 10, color: theme.income }}>{formatCurrency(m.amount)}</Text>
                      <Text style={{ fontSize: 10, color: theme.expense }}>{formatCurrency(exp)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Expense Analysis</Text>
            {insights.monthlyTrend?.map((m: TrendItem, i: number) => (
              <View key={i} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{m.month}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${(m.amount / maxTrend) * 100}%`, backgroundColor: theme.expense }]} /></View>
                <Text style={[styles.barValue, { color: theme.textTertiary }]}>{formatCurrency(m.amount)}</Text>
              </View>
            ))}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Top Categories</Text>
            {insights.topCategories?.map((cat: CategoryItem, i: number) => (
              <View key={i} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{cat.name}</Text>
                <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: `hsl(${i * 50}, 70%, 55%)` }]} /></View>
                <Text style={[styles.barValue, { color: theme.textTertiary }]}>{cat.percentage.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 14, padding: 16 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  sectionCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { width: 32, fontSize: 11, fontWeight: '600' },
  barBg: { flex: 1, height: 20, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { width: 72, fontSize: 10, textAlign: 'right' },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  compBar: { height: 12, marginBottom: 2 },
  compFill: { height: '100%', borderRadius: 4 },
});
