import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

interface HealthComponent {
  score: number;
  status: string;
  value: number | string;
  target: number | string;
}

interface HealthData {
  overall: number;
  components: Record<string, HealthComponent>;
}

interface GapItem {
  category?: string;
  title: string;
  status: string;
  currentValue: string;
  targetValue: string;
  gapAmount: number;
  gap: string;
}

interface RecItem {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings?: number;
}

function scColor(s: string): string {
  switch (s) {
    case 'good': return '#10B981';
    case 'warning': return '#F59E0B';
    default: return '#EF4444';
  }
}

const LABELS: Record<string, string> = {
  savingsRate: 'Savings Rate', budgetAdherence: 'Budget Adherence', diversification: 'Diversification',
  emergencyFund: 'Emergency Fund', debtToIncome: 'Debt-to-Income', investmentRatio: 'Investment Ratio',
};

export default function HealthScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [healthScore, setHealthScore] = useState<HealthData | null>(null);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setError('');
    try {
      const [hr, gr, rr] = await Promise.allSettled([
        api.get('/api/health-score'),
        api.get('/api/gap-analysis'),
        api.get('/api/recommendations'),
      ]);
      if (hr.status === 'fulfilled') setHealthScore(hr.value.data);
      if (gr.status === 'fulfilled') setGaps(gr.value.data?.gaps || []);
      if (rr.status === 'fulfilled') setRecommendations(rr.value.data?.recommendations || []);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const overall = healthScore?.overall ?? 0;
  const components = healthScore?.components || {};
  const topRecs = recommendations.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Financial Health</Text>
        <TouchableOpacity onPress={fetchAll} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="refresh" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetchAll} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={theme.primary} />}
        >
          <View style={[styles.gaugeCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.gaugeOuter, { borderColor: scColor(overall >= 70 ? 'good' : overall >= 40 ? 'warning' : 'critical') }]}>
              <Text style={[styles.gaugeScore, { color: scColor(overall >= 70 ? 'good' : overall >= 40 ? 'warning' : 'critical') }]}>{overall}</Text>
              <Text style={[styles.gaugeLabel, { color: theme.textSecondary }]}>out of 100</Text>
            </View>
            <Text style={[styles.gaugeTitle, { color: theme.text }]}>Overall Health Score</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Score Components</Text>
          {Object.entries(components).map(([k, c]) => {
            return (
              <View key={k} style={[styles.compCard, { backgroundColor: theme.surface, borderLeftColor: scColor(c.status), borderLeftWidth: 3 }]}>
                <View style={styles.compRow}>
                  <Text style={[styles.compLabel, { color: theme.text }]}>{LABELS[k] || k}</Text>
                  <View style={[styles.compBadge, { backgroundColor: scColor(c.status) + '20' }]}>
                    <Text style={[styles.compScore, { color: scColor(c.status) }]}>{c.score}/100</Text>
                  </View>
                </View>
                <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { width: `${c.score}%`, backgroundColor: scColor(c.status) }]} />
                </View>
                <View style={styles.compDetails}>
                  <Text style={[styles.compDetail, { color: theme.textTertiary }]}>Current: {typeof c.value === 'number' ? c.value.toFixed(1) : c.value}</Text>
                  <Text style={[styles.compDetail, { color: theme.textTertiary }]}>Target: {c.target}</Text>
                </View>
              </View>
            );
          })}

          {topRecs.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommendations</Text>
              {topRecs.map((r: RecItem) => (
                <View key={r.id} style={[styles.recCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.recHeader}>
                    <View style={[styles.priorityDot, { backgroundColor: r.priority === 'high' ? '#EF4444' : r.priority === 'medium' ? '#F59E0B' : '#3B82F6' }]} />
                    <Text style={[styles.recTitle, { color: theme.text }]}>{r.title}</Text>
                  </View>
                  <Text style={[styles.recDesc, { color: theme.textSecondary }]}>{r.description}</Text>
                  {r.estimatedSavings ? (
                    <Text style={[styles.recSavings, { color: theme.income }]}>Savings: ₹{r.estimatedSavings.toLocaleString()}/mo</Text>
                  ) : null}
                </View>
              ))}
            </>
          )}

          {gaps.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Gap Analysis</Text>
              {gaps.map((g: GapItem, i: number) => (
                <View key={g.category || i} style={[styles.gapCard, { backgroundColor: theme.surface, borderLeftColor: scColor(g.status), borderLeftWidth: 3 }]}>
                  <View style={styles.gapHeader}>
                    <Text style={[styles.gapTitle, { color: theme.text }]}>{g.title}</Text>
                    <View style={[styles.gapBadge, { backgroundColor: scColor(g.status) + '20' }]}>
                      <Text style={[styles.gapBadgeText, { color: scColor(g.status) }]}>{g.status}</Text>
                    </View>
                  </View>
                  <View style={styles.gapRow}>
                    <Text style={[styles.gapLabel, { color: theme.textTertiary }]}>Current: <Text style={{ fontWeight: '600', color: theme.text }}>{g.currentValue}</Text></Text>
                    <Text style={[styles.gapLabel, { color: theme.textTertiary }]}>Target: <Text style={{ fontWeight: '600', color: theme.text }}>{g.targetValue}</Text></Text>
                  </View>
                  {g.gapAmount > 0 && <Text style={[styles.gapAmount, { color: theme.expense }]}>Gap: {g.gap}</Text>}
                </View>
              ))}
            </>
          )}

          <View style={styles.quickLinks}>
            <TouchableOpacity style={[styles.quickLink, { backgroundColor: theme.surface }]} onPress={() => router.push('/risk-profile')}>
              <View style={[styles.qlIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.qlTitle, { color: theme.text }]}>Risk Profile</Text>
                <Text style={[styles.qlSub, { color: theme.textTertiary }]}>Retake assessment</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickLink, { backgroundColor: theme.surface }]} onPress={() => router.push('/what-if')}>
              <View style={[styles.qlIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Ionicons name="trending-up" size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.qlTitle, { color: theme.text }]}>What-If Simulator</Text>
                <Text style={[styles.qlSub, { color: theme.textTertiary }]}>Test scenarios</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
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
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  gaugeCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  gaugeOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gaugeScore: { fontSize: 36, fontWeight: '800' },
  gaugeLabel: { fontSize: 11, fontWeight: '500' },
  gaugeTitle: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  compCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  compLabel: { fontSize: 14, fontWeight: '600' },
  compBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  compScore: { fontSize: 12, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  compDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  compDetail: { fontSize: 11, fontWeight: '500' },
  recCard: { borderRadius: 14, padding: 14, marginBottom: 8 },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  recTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  recDesc: { fontSize: 12, lineHeight: 18, marginLeft: 16 },
  recSavings: { fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 16 },
  gapCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gapTitle: { fontSize: 14, fontWeight: '600' },
  gapBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  gapBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  gapRow: { gap: 4 },
  gapLabel: { fontSize: 12 },
  gapAmount: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  quickLinks: { gap: 8, marginTop: 16 },
  quickLink: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qlIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qlTitle: { fontSize: 14, fontWeight: '600' },
  qlSub: { fontSize: 12, marginTop: 2 },
});
