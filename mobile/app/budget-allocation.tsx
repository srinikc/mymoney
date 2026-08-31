import { useEffect, useState } from 'react';
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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency } from '../../utils/format';
import api from '../../api/client';

interface AllocationResult {
  ageBucket: { label: string; rationale: string } | null;
  split: { needs: number; wants: number; savings: number };
  totalNeeds: number;
  totalWants: number;
  totalSavings: number;
  totalSuggested: number;
  monthlyIncome: number;
  usingOverride: boolean;
  appliedSplit: { needs: number; wants: number; savings: number } | null;
  allocations: Array<{
    categoryId: number;
    categoryName: string;
    bucket: 'needs' | 'wants' | 'savings';
    amount: number;
    rationale: string;
  }>;
  notes: string[];
}

const BUCKET_COLORS: Record<string, string> = {
  needs: '#3b82f6',
  wants: '#f59e0b',
  savings: '#10b981',
};

const BUCKET_LABELS: Record<string, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings & Investments',
};

const BUCKET_DESCRIPTIONS: Record<string, string> = {
  needs: 'Rent, groceries, utilities, commute, insurance, EMIs',
  wants: 'Dining, shopping, leisure, gifting, festive',
  savings: 'SIPs, equity, learning, gold, emergency fund',
};

const PRESETS: Array<{ label: string; split: { needs: number; wants: number; savings: number } }> = [
  { label: '50/30/20 Standard', split: { needs: 50, wants: 30, savings: 20 } },
  { label: '40/30/30 Aggressive', split: { needs: 40, wants: 30, savings: 30 } },
  { label: '60/25/15 Conservative', split: { needs: 60, wants: 25, savings: 15 } },
  { label: '70/20/10 Heavy EMI', split: { needs: 70, wants: 20, savings: 10 } },
];

export default function BudgetAllocationScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [data, setData] = useState<AllocationResult | null>(null);
  const [needs, setNeeds] = useState('50');
  const [wants, setWants] = useState('30');
  const [savings, setSavings] = useState('20');
  const [bucketsOn, setBucketsOn] = useState<Record<string, boolean>>({
    needs: true,
    wants: true,
    savings: true,
  });

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    void fetchRecommendation(null);
  }, []);

  async function fetchRecommendation(split: { needs: number; wants: number; savings: number } | null) {
    setLoading(true);
    try {
      const res = await api.post('/api/budgets/recommend', split ? { split } : {});
      const json: AllocationResult = res.data;
      setData(json);
      setNeeds(String(json.appliedSplit?.needs ?? 50));
      setWants(String(json.appliedSplit?.wants ?? 30));
      setSavings(String(json.appliedSplit?.savings ?? 20));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  }

  function applyCustomSplit() {
    const n = Number(needs);
    const w = Number(wants);
    const s = Number(savings);
    if (!Number.isFinite(n) || !Number.isFinite(w) || !Number.isFinite(s)) {
      Alert.alert('Validation', 'All split values must be numbers');
      return;
    }
    if (n + w + s !== 100) {
      Alert.alert('Validation', `Split must total 100 (currently ${n + w + s})`);
      return;
    }
    void fetchRecommendation({ needs: n, wants: w, savings: s });
  }

  async function applySelected() {
    if (!data) return;
    const chosen = data.allocations.filter((a) => bucketsOn[a.bucket]);
    if (chosen.length === 0) {
      Alert.alert('Nothing to apply', 'Pick at least one bucket');
      return;
    }
    setApplying(true);
    try {
      const promises = chosen.map((a) =>
        api.post('/api/budgets', {
          categoryId: a.categoryId,
          subCategory: null,
          month,
          year,
          amount: a.amount,
        }).catch(() => null),
      );
      await Promise.all(promises);
      Alert.alert('Done', `Applied ${chosen.length} suggested budget${chosen.length === 1 ? '' : 's'}`);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to apply suggestions');
    } finally {
      setApplying(false);
    }
  }

  const splitSum = (Number(needs) || 0) + (Number(wants) || 0) + (Number(savings) || 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Budget Wizard',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.heroHeader}>
            <Ionicons name="sparkles" size={20} color={theme.primary} />
            <Text style={[styles.heroTitle, { color: theme.text }]}>50/30/20 Allocation</Text>
          </View>
          {data?.ageBucket && (
            <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{data.ageBucket.label}</Text>
            </View>
          )}
          {data?.usingOverride && (
            <Text style={{ fontSize: 11, color: theme.textTertiary, marginTop: 4 }}>Custom split active</Text>
          )}
        </View>

        {loading && !data ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : data ? (
          <>
            <View style={styles.statRow}>
              <StatCard label="Income / mo" value={formatCurrency(data.monthlyIncome)} theme={theme} />
              <StatCard label="Suggested" value={formatCurrency(data.totalSuggested)} theme={theme} />
            </View>

            {(['needs', 'wants', 'savings'] as const).map((b) => {
              const on = bucketsOn[b];
              const amount = b === 'needs' ? data.totalNeeds : b === 'wants' ? data.totalWants : data.totalSavings;
              return (
                <TouchableOpacity
                  key={b}
                  activeOpacity={0.8}
                  onPress={() => setBucketsOn((p) => ({ ...p, [b]: !p[b] }))}
                  style={[
                    styles.bucketCard,
                    {
                      backgroundColor: on ? theme.card : theme.background,
                      borderColor: on ? theme.primary : theme.border,
                      opacity: on ? 1 : 0.6,
                    },
                  ]}
                >
                  <View style={styles.bucketHeader}>
                    <View style={[styles.bucketDot, { backgroundColor: BUCKET_COLORS[b] }]} />
                    <Text style={[styles.bucketLabel, { color: theme.text }]}>{BUCKET_LABELS[b]}</Text>
                    {on && <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={{ marginLeft: 'auto' }} />}
                  </View>
                  <Text style={[styles.bucketDesc, { color: theme.textSecondary }]}>{BUCKET_DESCRIPTIONS[b]}</Text>
                  <View style={styles.bucketFooter}>
                    <Text style={[styles.bucketAmount, { color: theme.text }]}>{formatCurrency(amount)}</Text>
                    <Text style={[styles.bucketPct, { color: theme.textTertiary }]}>{data.appliedSplit?.[b]}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>QUICK PRESETS</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => void fetchRecommendation(p.split)}
                  style={[styles.presetBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                  disabled={loading}
                >
                  <Text style={[styles.presetLabel, { color: theme.text }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>CUSTOM SPLIT (must total 100)</Text>
            <View style={[styles.customCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.customRow}>
                <CustomInput label="Needs" value={needs} onChangeText={setNeeds} theme={theme} />
                <CustomInput label="Wants" value={wants} onChangeText={setWants} theme={theme} />
                <CustomInput label="Savings" value={savings} onChangeText={setSavings} theme={theme} />
              </View>
              <View style={styles.customFooter}>
                <Text style={{ color: splitSum === 100 ? theme.primary : '#F59E0B', fontSize: 13, fontWeight: '600' }}>
                  Sum: {splitSum}/100
                </Text>
                <TouchableOpacity
                  onPress={applyCustomSplit}
                  style={[styles.applyBtnSmall, { backgroundColor: theme.primary }]}
                  disabled={loading}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              PER-CATEGORY SUGGESTIONS ({data.allocations.filter((a) => bucketsOn[a.bucket]).length})
            </Text>
            <View style={[styles.suggestionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {data.allocations
                .filter((a) => bucketsOn[a.bucket])
                .sort((a, b) => b.amount - a.amount)
                .map((a) => (
                  <View key={a.categoryId} style={[styles.suggestionRow, { borderBottomColor: theme.borderLight }]}>
                    <View style={[styles.suggestionDot, { backgroundColor: BUCKET_COLORS[a.bucket] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{a.categoryName}</Text>
                      <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{a.rationale}</Text>
                    </View>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                      {formatCurrency(a.amount)}
                    </Text>
                  </View>
                ))}
              {data.allocations.filter((a) => bucketsOn[a.bucket]).length === 0 && (
                <Text style={{ color: theme.textTertiary, padding: 16, textAlign: 'center', fontSize: 13 }}>
                  Select at least one bucket above
                </Text>
              )}
            </View>

            {data.notes.length > 0 && (
              <View style={[styles.notesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Ionicons name="bulb-outline" size={14} color="#F59E0B" />
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Why this split?</Text>
                </View>
                {data.notes.map((n, i) => (
                  <Text key={i} style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{n}</Text>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: theme.primary, opacity: applying ? 0.6 : 1 }]}
          onPress={applySelected}
          disabled={applying || !data}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.applyBtnText}>
              Apply {data?.allocations.filter((a) => bucketsOn[a.bucket]).length ?? 0} suggestions
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatCard({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function CustomInput({ label, value, onChangeText, theme }: { label: string; value: string; onChangeText: (v: string) => void; theme: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.textTertiary, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={[styles.customInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={theme.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 18, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  bucketCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  bucketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bucketDot: { width: 10, height: 10, borderRadius: 5 },
  bucketLabel: { fontSize: 15, fontWeight: '600' },
  bucketDesc: { fontSize: 12, marginTop: 4 },
  bucketFooter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  bucketAmount: { fontSize: 18, fontWeight: '700' },
  bucketPct: { fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 12, marginBottom: 8, marginLeft: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  presetBtn: { flexBasis: '48%', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  presetLabel: { fontSize: 13, fontWeight: '500' },
  customCard: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  customFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  applyBtnSmall: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  suggestionsCard: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 16 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  suggestionDot: { width: 8, height: 8, borderRadius: 4 },
  notesCard: { padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  applyBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
