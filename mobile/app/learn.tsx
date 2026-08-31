import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface WorkflowStep {
  title: string;
  detail: string;
}

interface Workflow {
  title: string;
  steps: WorkflowStep[];
  estimatedTime: string;
}

interface LearnTip {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  ageBuckets: string[];
  readMinutes: number;
  workflow?: Workflow;
  ctaLabel?: string;
  ctaHref?: string;
}

interface TipsResponse {
  age: number | null;
  ageBucket: string | null;
  hasDob: boolean;
  hasIncome: boolean;
  totalAvailable: number;
  tips: LearnTip[];
}

const CATEGORY_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  budgeting: { label: 'Budgeting', icon: 'wallet-outline', color: '#3b82f6' },
  investing: { label: 'Investing', icon: 'trending-up-outline', color: '#10b981' },
  savings: { label: 'Savings', icon: 'cash-outline', color: '#06b6d4' },
  tax: { label: 'Tax', icon: 'document-text-outline', color: '#8b5cf6' },
  insurance: { label: 'Insurance', icon: 'shield-outline', color: '#0ea5e9' },
  debt: { label: 'Debt', icon: 'card-outline', color: '#ef4444' },
  retirement: { label: 'Retirement', icon: 'umbrella-outline', color: '#f59e0b' },
  home: { label: 'Home', icon: 'home-outline', color: '#14b8a6' },
  emergency: { label: 'Emergency', icon: 'medkit-outline', color: '#f97316' },
  family: { label: 'Family', icon: 'people-outline', color: '#ec4899' },
  mindset: { label: 'Mindset', icon: 'bulb-outline', color: '#eab308' },
};

const TOOLS = [
  { href: '/budgets', label: 'Budget Wizard', desc: '50/30/20 allocation', icon: 'wallet-outline' },
  { href: '/budget-allocation', label: 'Allocation Wizard', desc: 'Auto-suggest budgets', icon: 'sparkles-outline' },
  { href: '/emergency-fund', label: 'Emergency Fund', desc: 'Plan your safety net', icon: 'medkit-outline' },
  { href: '/goals', label: 'Goal Tracker', desc: 'Track every goal', icon: 'flag-outline' },
  { href: '/loans', label: 'Loan Manager', desc: 'EMI + prepayment', icon: 'card-outline' },
  { href: '/learn/mutual-funds', label: 'Mutual Funds', desc: 'Research + SIP calculator', icon: 'trending-up-outline' },
  { href: '/learn/commodities', label: 'Commodities & ETFs', desc: 'Gold, silver, ETF prices', icon: 'diamond-outline' },
  { href: '/learn/retirement', label: 'Retirement', desc: '4% rule + NPS funds', icon: 'umbrella-outline' },
  { href: '/learn/books', label: 'Books', desc: 'Top 10 Indian finance books', icon: 'book-outline' },
];

export default function LearnScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TipsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'forYou' | 'tools'>('forYou');
  const [activeTip, setActiveTip] = useState<LearnTip | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<TipsResponse>('/api/learn/tips');
      setData(res.data);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data.tips;
    const q = search.toLowerCase();
    return data.tips.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (loading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Learn', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Learn',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>Learn</Text>
          {data.ageBucket && (
            <View style={[styles.badge, { backgroundColor: theme.primaryLight, alignSelf: 'flex-start', marginTop: 6 }]}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>
                {data.ageBucket.replace(/-/g, ' ')}
              </Text>
            </View>
          )}
        </View>

        {!data.hasDob && (
          <TouchableOpacity
            onPress={() => router.push('/settings/profile' as never)}
            style={[styles.noticeCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
          >
            <Ionicons name="bulb-outline" size={20} color="#92400E" />
            <Text style={{ flex: 1, fontSize: 13, color: '#92400E' }}>
              Set your date of birth for age-specific tips
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#92400E" />
          </TouchableOpacity>
        )}

        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setTab('forYou')}
            style={[styles.tab, { backgroundColor: tab === 'forYou' ? theme.primary : 'transparent' }]}
          >
            <Ionicons name="sparkles-outline" size={16} color={tab === 'forYou' ? '#fff' : theme.text} />
            <Text style={{ color: tab === 'forYou' ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>
              For you ({data.tips.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('tools')}
            style={[styles.tab, { backgroundColor: tab === 'tools' ? theme.primary : 'transparent' }]}
          >
            <Ionicons name="construct-outline" size={16} color={tab === 'tools' ? '#fff' : theme.text} />
            <Text style={{ color: tab === 'tools' ? '#fff' : theme.text, fontSize: 13, fontWeight: '600' }}>Tools</Text>
          </TouchableOpacity>
        </View>

        {tab === 'forYou' ? (
          <>
            <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search tips..."
                placeholderTextColor={theme.textTertiary}
                style={{ flex: 1, color: theme.text, fontSize: 14 }}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {filtered.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.textTertiary, fontSize: 13 }}>No tips match your search</Text>
              </View>
            ) : (
              filtered.map((tip) => (
                <TipCard key={tip.id} tip={tip} theme={theme} onOpen={() => setActiveTip(tip)} />
              ))
            )}
          </>
        ) : (
          <View>
            {TOOLS.map((t) => (
              <TouchableOpacity
                key={t.href}
                onPress={() => router.push(t.href as never)}
                style={[styles.toolRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.toolIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name={t.icon as any} size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{t.label}</Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 12 }}>{t.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!activeTip} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveTip(null)}>
        {activeTip && (
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setActiveTip(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text, marginLeft: 8 }} numberOfLines={1}>
                {activeTip.title}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={[styles.toolIcon, { backgroundColor: CATEGORY_META[activeTip.category]?.color + '20' }]}>
                  <Ionicons
                    name={(CATEGORY_META[activeTip.category]?.icon as any) || 'bulb-outline'}
                    size={18}
                    color={CATEGORY_META[activeTip.category]?.color || theme.primary}
                  />
                </View>
                <Text style={{ color: CATEGORY_META[activeTip.category]?.color, fontSize: 12, fontWeight: '700' }}>
                  {CATEGORY_META[activeTip.category]?.label || activeTip.category}
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 11, marginLeft: 'auto' }}>{activeTip.readMinutes} min read</Text>
              </View>

              <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 8 }}>{activeTip.title}</Text>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 16, fontWeight: '500' }}>{activeTip.summary}</Text>
              <Text style={{ fontSize: 14, color: theme.text, lineHeight: 22, marginBottom: 20 }}>{activeTip.body}</Text>

              {activeTip.workflow && (
                <View style={[styles.workflowCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="flag-outline" size={16} color={theme.primary} />
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{activeTip.workflow.title}</Text>
                  </View>
                  <Text style={{ color: theme.textTertiary, fontSize: 12, marginBottom: 12 }}>
                    {activeTip.workflow.steps.length} steps · ~{activeTip.workflow.estimatedTime}
                  </Text>
                  {activeTip.workflow.steps.map((s, i) => (
                    <View key={i} style={[styles.stepRow, { borderBottomColor: theme.border }]}>
                      <View style={[styles.stepNum, { backgroundColor: theme.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{s.title}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{s.detail}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {activeTip.ctaHref && activeTip.ctaLabel && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveTip(null);
                    setTimeout(() => router.push(activeTip.ctaHref as never), 200);
                  }}
                  style={[styles.cta, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{activeTip.ctaLabel}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function TipCard({ tip, theme, onOpen }: { tip: LearnTip; theme: any; onOpen: () => void }) {
  const meta = CATEGORY_META[tip.category] || CATEGORY_META.mindset;
  return (
    <TouchableOpacity
      onPress={onOpen}
      style={[styles.tipCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.toolIcon, { backgroundColor: meta.color + '20' }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{tip.title}</Text>
          <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{tip.summary}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Text style={{ color: meta.color, fontSize: 10, fontWeight: '700' }}>{meta.label.toUpperCase()}</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 10 }}>·</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 10 }}>{tip.readMinutes} min</Text>
            {tip.workflow && (
              <>
                <Text style={{ color: theme.textTertiary, fontSize: 10 }}>·</Text>
                <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '600' }}>{tip.workflow.steps.length}-step workflow</Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  tipCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  workflowCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 10, marginTop: 8 },
});
