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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface SeedFund {
  code: string;
  name: string;
  category: string;
  amc: string;
  nav: number;
  navDate: string;
  aum: number;
  riskLevel: 'low' | 'moderate' | 'high';
  benchmark: string;
  expenseRatio: number;
  cagr3y: number;
  cagr5y: number;
  minimumSIP: number;
  minimumLumpsum: number;
  returnSinceInception: number;
  inceptionDate: string;
}

interface SearchResponse {
  total: number;
  filters: { categories: string[]; amcs: string[]; riskLevels: string[] };
  results: SeedFund[];
}

interface ProjectResponse {
  type: string;
  nominal: any;
  inflation: { pct: number; realValue: number; realReturn: number };
  message: string;
}

const RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#EF4444',
};

const CATEGORY_ICONS: Record<string, any> = {
  'Large Cap': 'trending-up',
  'Mid Cap': 'bar-chart',
  'Small Cap': 'rocket',
  'Flexi Cap': 'shuffle',
  'Index Fund': 'list',
  'ELSS': 'shield-checkmark',
  'Liquid': 'water',
  'Corporate Bond': 'business',
  'Sectoral - Banking': 'card',
  'Sectoral - Technology': 'hardware-chip',
  'Gold': 'diamond',
  'International - US': 'globe',
  'Balanced Advantage': 'analytics',
  'Aggressive Hybrid': 'pulse',
  'Multi Cap': 'grid',
  'Value': 'pricetag',
  'Large & Mid Cap': 'layers',
};

export default function MutualFundsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<'research' | 'calculator'>('research');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [activeFund, setActiveFund] = useState<SeedFund | null>(null);

  // Calculator
  const [calcType, setCalcType] = useState<'sip' | 'lumpsum' | 'reverse'>('sip');
  const [sipAmount, setSipAmount] = useState('10000');
  const [lumpsumAmount, setLumpsumAmount] = useState('100000');
  const [targetCorpus, setTargetCorpus] = useState('10000000');
  const [expectedReturn, setExpectedReturn] = useState('12');
  const [years, setYears] = useState('20');
  const [stepUp, setStepUp] = useState('10');
  const [inflation, setInflation] = useState('6');
  const [projection, setProjection] = useState<ProjectResponse | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    void load();
  }, [category]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category !== 'all') params.set('category', category);
      const res = await api.get<SearchResponse>(`/api/mf/search?${params}`);
      setData(res.data);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function calculate() {
    setCalculating(true);
    setProjection(null);
    try {
      const body: any = {
        type: calcType === 'reverse' ? 'reverse-sip' : calcType,
        expectedReturnPct: Number(expectedReturn),
        years: Number(years),
        inflationPct: Number(inflation),
      };
      if (calcType === 'sip') {
        body.monthlyAmount = Number(sipAmount);
        body.annualStepUpPct = Number(stepUp);
      } else if (calcType === 'lumpsum') {
        body.lumpsumAmount = Number(lumpsumAmount);
      } else {
        body.targetCorpus = Number(targetCorpus);
      }
      const res = await api.post<ProjectResponse>('/api/mf/project', body);
      setProjection(res.data);
    } catch (e) {
      // noop
    } finally {
      setCalculating(false);
    }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!query) return data.results;
    const q = query.toLowerCase();
    return data.results.filter(
      (f) => f.name.toLowerCase().includes(q) || f.amc.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Mutual Funds', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Mutual Funds',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={styles.tabBar}>
          <TabButton active={tab === 'research'} label="Research" onPress={() => setTab('research')} color={theme.primary} />
          <TabButton active={tab === 'calculator'} label="Calculator" onPress={() => setTab('calculator')} color={theme.primary} />
        </View>

        {tab === 'research' && (
          <View style={{ padding: 16 }}>
            <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search" size={16} color={theme.textTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search funds..."
                placeholderTextColor={theme.textTertiary}
                onSubmitEditing={() => load()}
                style={{ flex: 1, color: theme.text, fontSize: 14 }}
                returnKeyType="search"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
              <CategoryChip label="All" active={category === 'all'} onPress={() => setCategory('all')} theme={theme} />
              {data?.filters.categories.map((c) => (
                <CategoryChip key={c} label={c} active={category === c} onPress={() => setCategory(c)} theme={theme} />
              ))}
            </ScrollView>

            {data && (
              <Text style={{ color: theme.textTertiary, fontSize: 11, marginVertical: 8 }}>
                {filtered.length} of {data.total} funds
              </Text>
            )}

            {filtered.map((f) => (
              <TouchableOpacity
                key={f.code}
                onPress={() => setActiveFund(f)}
                style={[styles.fundCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={[styles.iconBox, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name={CATEGORY_ICONS[f.category] || 'trending-up'} size={18} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>
                      {f.name}
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 2 }}>
                      {f.amc} · {f.category}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                      <View>
                        <Text style={{ color: theme.textTertiary, fontSize: 10 }}>NAV</Text>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>₹{f.nav.toFixed(2)}</Text>
                      </View>
                      <View>
                        <Text style={{ color: theme.textTertiary, fontSize: 10 }}>3Y CAGR</Text>
                        <Text style={{ color: f.cagr3y >= 12 ? '#10B981' : f.cagr3y >= 8 ? '#F59E0B' : theme.text, fontSize: 13, fontWeight: '600' }}>
                          {f.cagr3y}%
                        </Text>
                      </View>
                      <View>
                        <Text style={{ color: theme.textTertiary, fontSize: 10 }}>AUM</Text>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>₹{f.aum.toLocaleString('en-IN')}Cr</Text>
                      </View>
                      <View style={{ marginLeft: 'auto' }}>
                        <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[f.riskLevel] + '20' }]}>
                          <Text style={{ color: RISK_COLORS[f.riskLevel], fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                            {f.riskLevel}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'calculator' && (
          <View style={{ padding: 16 }}>
            <View style={styles.tabBar2}>
              <TabButton2 active={calcType === 'sip'} label="SIP" onPress={() => setCalcType('sip')} color={theme.primary} theme={theme} />
              <TabButton2 active={calcType === 'lumpsum'} label="Lumpsum" onPress={() => setCalcType('lumpsum')} color={theme.primary} theme={theme} />
              <TabButton2 active={calcType === 'reverse'} label="Goal" onPress={() => setCalcType('reverse')} color={theme.primary} theme={theme} />
            </View>

            <View style={[styles.calcCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {calcType === 'sip' && (
                <Field label="Monthly amount (₹)" value={sipAmount} onChangeText={setSipAmount} theme={theme} />
              )}
              {calcType === 'sip' && (
                <Field label="Annual step-up %" value={stepUp} onChangeText={setStepUp} theme={theme} />
              )}
              {calcType === 'lumpsum' && (
                <Field label="One-time amount (₹)" value={lumpsumAmount} onChangeText={setLumpsumAmount} theme={theme} />
              )}
              {calcType === 'reverse' && (
                <Field label="Target corpus (₹)" value={targetCorpus} onChangeText={setTargetCorpus} theme={theme} />
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Return %" value={expectedReturn} onChangeText={setExpectedReturn} theme={theme} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Years" value={years} onChangeText={setYears} theme={theme} />
                </View>
              </View>
              <Field label="Inflation %" value={inflation} onChangeText={setInflation} theme={theme} />
              <TouchableOpacity
                onPress={calculate}
                disabled={calculating}
                style={[styles.calcBtn, { backgroundColor: theme.primary }]}
              >
                {calculating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Calculate</Text>
                )}
              </TouchableOpacity>
            </View>

            {projection && (
              <View style={[styles.resultCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                {projection.type === 'reverse-sip' ? (
                  <View>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>REQUIRED MONTHLY SIP</Text>
                    <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '700', marginTop: 4 }}>
                      ₹{(projection as any).required.monthly.toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6 }}>
                      With {projection.inflation.pct}% inflation: ₹{(projection as any).required.realPower.toLocaleString('en-IN')}/month
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>FINAL CORPUS</Text>
                    <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '700', marginTop: 4 }}>
                      ₹{(projection.nominal.totalCorpus || projection.nominal.corpus).toLocaleString('en-IN')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        Invested: ₹{(projection.nominal.totalInvested || projection.nominal.invested).toLocaleString('en-IN')}
                      </Text>
                      <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>
                        Gains: ₹{(projection.nominal.totalGains || projection.nominal.gains).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 6 }}>
                      Real value (today's money): ₹{projection.inflation.realValue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!activeFund} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setActiveFund(null)}>
        {activeFund && (
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setActiveFund(null)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 15, fontWeight: '600', color: theme.text }} numberOfLines={2}>
                {activeFund.name}
              </Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <DetailRow label="AMC" value={activeFund.amc} theme={theme} />
                <DetailRow label="Category" value={activeFund.category} theme={theme} />
                <DetailRow label="Risk" value={activeFund.riskLevel} theme={theme} />
                <DetailRow label="NAV" value={`₹${activeFund.nav.toFixed(2)}`} theme={theme} />
                <DetailRow label="AUM" value={`₹${activeFund.aum.toLocaleString('en-IN')} Cr`} theme={theme} />
                <DetailRow label="Benchmark" value={activeFund.benchmark} theme={theme} />
                <DetailRow label="Expense" value={`${activeFund.expenseRatio}%`} theme={theme} />
                <DetailRow label="3Y CAGR" value={`${activeFund.cagr3y}%`} theme={theme} highlight />
                <DetailRow label="5Y CAGR" value={`${activeFund.cagr5y}%`} theme={theme} />
                <DetailRow label="Since Inception" value={`${activeFund.returnSinceInception}%`} theme={theme} />
                <DetailRow label="Min SIP" value={`₹${activeFund.minimumSIP}`} theme={theme} />
                <DetailRow label="Inception" value={activeFund.inceptionDate} theme={theme} />
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function TabButton({ active, label, onPress, color }: { active: boolean; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: active ? color : 'transparent',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton2({ active, label, onPress, color, theme }: { active: boolean; label: string; onPress: () => void; color: string; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: active ? color : theme.surface,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : color }}>{label}</Text>
    </TouchableOpacity>
  );
}

function CategoryChip({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: active ? theme.primary : theme.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? theme.primary : theme.border,
      }}
    >
      <Text style={{ fontSize: 12, color: active ? '#fff' : theme.text, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, theme }: { label: string; value: string; onChangeText: (v: string) => void; theme: any }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: theme.textTertiary, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
      />
    </View>
  );
}

function DetailRow({ label, value, theme, highlight }: { label: string; value: string; theme: any; highlight?: boolean }) {
  return (
    <View style={{ width: '47%' }}>
      <Text style={{ color: theme.textTertiary, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: highlight ? '#10B981' : theme.text, fontSize: 14, fontWeight: '600', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', gap: 4, margin: 16, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 },
  tabBar2: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  fundCard: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  calcCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  calcBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  resultCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
