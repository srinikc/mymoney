
import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface IntelligenceItem {
  id: string;
  kind: 'anomaly' | 'velocity' | 'subscription' | 'tax-optimization' | 'lifestyle-creep' | 'seasonal' | 
'weekend-effect';
  title: string;
  description: string;
  metric: string;
  severity: 'info' | 'warn' | 'alert';
  actionable: string;
}

interface Recommendation {
  id: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  estimatedSavings?: number;
}

interface IntelligenceResponse {
  items: IntelligenceItem[];
  total: number;
  counts: { info: number; warn: number; alert: number };
}

const KIND_META: Record<string, { label: string; icon: any }> = {
  anomaly: { label: 'Anomaly', icon: 'alert-circle' },
  velocity: { label: 'Pace', icon: 'speedometer' },
  subscription: { label: 'Subscription', icon: 'refresh-circle' },
  'tax-optimization': { label: 'Tax', icon: 'document-text' },
  'lifestyle-creep': { label: 'Lifestyle', icon: 'trending-up' },
  seasonal: { label: 'Seasonal', icon: 'calendar' },
  'weekend-effect': { label: 'Weekend', icon: 'calendar' },
};

const SEVERITY_META: Record<string, { bg: string; border: string; text: string }> = {
  alert: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
  warn: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
};

export default function InsightsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'alerts' | 'all' | 'recs'>('alerts');
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [i, r] = await Promise.all([
        api.get<IntelligenceResponse>('/api/intelligence'),
        api.get<Recommendation[]>('/api/recommendations'),
      ]);
      setIntelligence(i.data);
      setRecs(r.data);
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const highCount = useMemo(() => {
    const i = (intelligence?.items ?? []).filter((x) => x.severity !== 'info').length;
    const r = recs.filter((x) => x.priority !== 'low').length;
    return i + r;
  }, [intelligence, recs]);

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
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} 
tintColor={theme.primary} />}
      >
        {highCount > 0 && tab === 'alerts' && (
          <View style={[styles.banner, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="alert-circle" size={20} color="#92400E" />
            <Text style={{ flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
              {highCount} item{highCount === 1 ? '' : 's'} need your attention
            </Text>
          </View>
        )}

        <View style={styles.tabBar}>
          <TabButton active={tab === 'alerts'} label={`Alerts${highCount > 0 ? ` (${highCount})` : ''}`} onPress={() 
=> setTab('alerts')} color={theme.primary} />
          <TabButton active={tab === 'all'} label={`All (${intelligence?.total ?? 0})`} onPress={() => setTab('all')} 
color={theme.primary} />
          <TabButton active={tab === 'recs'} label={`Tips (${recs.length})`} onPress={() => setTab('recs')} 
color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); 
}} tintColor={theme.primary} />}
        >
          {data.monthlyTrend && data.monthlyTrend.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Trend</Text>
              <View style={styles.barChart}>
                {data.monthlyTrend.map((m: MonthlyTrend, i: number) => {
                  const max = Math.max(...data.monthlyTrend.map((x: MonthlyTrend) => x.amount));
                  const pct = max > 0 ? (m.amount / max) * 100 : 0;
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={[styles.barValue, { color: theme.textTertiary }]}>{Math.round(m.amount / 
1000)}k</Text>
                      <View style={[styles.bar, { height: `${pct}%`, backgroundColor: COLORS[i % COLORS.length], 
minHeight: 3 }]} />
                      <Text style={[styles.barLabel, { color: theme.textTertiary }]}>{m.month.slice(0, 3)}</Text>
                    </View>
                  );
                })}

        {tab === 'alerts' && (
          <>
            {(intelligence?.items ?? []).filter((i) => i.severity !== 'info').map((i) => <IntelCard key={i.id} 
item={i} theme={theme} />)}
            {recs.filter((r) => r.priority !== 'low').map((r) => <RecCard key={r.id} item={r} theme={theme} />)}
            {highCount === 0 && (
              <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', marginTop: 8 }}>All clear</Text>
              </View>
            )}
          </>
        )}

        {tab === 'all' && (
          <>
            {(intelligence?.items ?? []).map((i) => <IntelCard key={i.id} item={i} theme={theme} />)}
            {(!intelligence || intelligence.items.length === 0) && (
              <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="bulb" size={48} color={theme.textTertiary} />
                <Text style={{ color: theme.text, fontSize: 14, marginTop: 8 }}>Add more expenses to unlock 
insights</Text>
                <TouchableOpacity onPress={() => router.push('/expenses' as never)} style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>Add expenses ΓåÆ</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {tab === 'recs' && (
          <>
            {recs.map((r) => <RecCard key={r.id} item={r} theme={theme} />)}
            {recs.length === 0 && (
              <View style={[styles.empty, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="flag" size={48} color={theme.textTertiary} />
                <Text style={{ color: theme.text, fontSize: 14, marginTop: 8 }}>No recommendations right now</Text>
              </View>
            )}
          </>
        )}

          {data.topMerchants && data.topMerchants.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Top Merchants</Text>
              {data.topMerchants.map((m: TopMerchant) => (
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
              {data.optimization.map((o: Optimization) => (
                <View key={o.category} style={styles.optRow}>
                  <View style={styles.optHeader}>
                    <Text style={[styles.optCategory, { color: theme.text }]}>{o.category}</Text>
                    <Text style={[styles.optPct, { color: o.percentage > 20 ? theme.expense : theme.income 
}]}>{o.percentage}%</Text>
                  </View>
                  <View style={[styles.optBar, { backgroundColor: theme.border }]}>
                    <View style={[styles.optFill, { width: `${Math.min(100, o.percentage)}%`, backgroundColor: 
o.percentage > 20 ? theme.expense : theme.income }]} />
                  </View>
                  <Text style={[styles.optSavings, { color: theme.income }]}>Potential savings: 
{formatCurrency(o.potentialSavings)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
        <View style={{ marginTop: 20, gap: 8 }}>
          <QuickLink label="Unusual Expenses" href="/expenses/unusual" icon="alert-circle-outline" theme={theme} />
          <QuickLink label="Emergency Fund Planner" href="/emergency-fund" icon="medkit-outline" theme={theme} />
          <QuickLink label="Budget Wizard" href="/budgets" icon="wallet-outline" theme={theme} />
          <QuickLink label="Learn" href="/learn" icon="book-outline" theme={theme} />
        </View>
      </ScrollView>
    </View>
  );
}

function TabButton({ active, label, onPress, color }: { active: boolean; label: string; onPress: () => void; color: 
string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: active ? color : 'transparent',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function IntelCard({ item, theme }: { item: IntelligenceItem; theme: any }) {
  const sev = SEVERITY_META[item.severity];
  const meta = KIND_META[item.kind] || KIND_META.anomaly;
  return (
    <View style={[styles.card, { backgroundColor: sev.bg, borderColor: sev.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.iconBox, { backgroundColor: '#fff' }]}>
          <Ionicons name={meta.icon as any} size={18} color={sev.text} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: sev.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{item.title}</Text>
            <Text style={{ color: sev.text, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' 
}}>{item.severity}</Text>
          </View>
          <Text style={{ color: sev.text, fontSize: 12, marginTop: 4, lineHeight: 17 }}>{item.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={{ color: sev.text, fontSize: 12, fontFamily: 'monospace' }}>{item.metric}</Text>
          </View>
          <Text style={{ color: sev.text, fontSize: 11, marginTop: 6, fontWeight: '600' }}>ΓåÆ {item.actionable}</Text>
        </View>
      </View>
    </View>
  );
}

function RecCard({ item, theme }: { item: Recommendation; theme: any }) {
  const priorityColor = item.priority === 'high' ? '#EF4444' : item.priority === 'medium' ? '#F59E0B' : 
theme.textTertiary;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="bulb" size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{item.title}</Text>
            <Text style={{ color: priorityColor, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' 
}}>{item.priority}</Text>
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>{item.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
            <Ionicons name="arrow-forward" size={12} color={theme.primary} style={{ marginTop: 2 }} />
            <Text style={{ color: theme.text, fontSize: 12, flex: 1 }}>{item.action}</Text>
          </View>
          {item.estimatedSavings != null && item.estimatedSavings > 0 && (
            <Text style={{ color: '#10B981', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
              Est. annual savings: {formatCurrency(item.estimatedSavings * 12)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function QuickLink({ label, href, icon, theme }: { label: string; href: string; icon: any; theme: any }) {
  return (
    <TouchableOpacity
      onPress={() => {/* navigation handled in pages */}}
      style={[styles.quickLink, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Ionicons name={icon as any} size={18} color={theme.primary} />
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500', flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 
12 },
  tabBar: { flexDirection: 'row', gap: 4, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, 
padding: 4 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 32, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 
StyleSheet.hairlineWidth },
});


