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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface NpsFundManager {
  code: string;
  name: string;
  category: 'public' | 'private';
  historical3yCagr: number;
  historical5yCagr: number;
  sinceInceptionCagr: number;
  aumCr: number;
  description: string;
  pros: string[];
  cons: string[];
}

interface RetirementResult {
  yearsToRetirement: number;
  nominalCorpus: number;
  realCorpusAtRetirement: number;
  targetCorpusToday: number;
  isOnTrack: boolean;
  surplus: number;
  monthlyIncomeAtRetirement: number;
  monthlyIncomeShortfall: number;
  recommendations: string[];
}

export default function RetirementScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [tab, setTab] = useState<'calc' | 'nps'>('calc');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fundManagers, setFundManagers] = useState<NpsFundManager[]>([]);

  // Calculator state
  const [currentAge, setCurrentAge] = useState('30');
  const [retirementAge, setRetirementAge] = useState('60');
  const [lifeExpectancy, setLifeExpectancy] = useState('85');
  const [currentExpense, setCurrentExpense] = useState('50000');
  const [currentCorpus, setCurrentCorpus] = useState('500000');
  const [monthlyInvestment, setMonthlyInvestment] = useState('25000');
  const [preReturn, setPreReturn] = useState('11');
  const [postReturn, setPostReturn] = useState('7');
  const [inflation, setInflation] = useState('6');
  const [stepUp, setStepUp] = useState('10');
  const [result, setResult] = useState<RetirementResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ fundManagers: NpsFundManager[] }>('/api/nps');
      setFundManagers(res.data.fundManagers);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function calculate() {
    setCalculating(true);
    setResult(null);
    try {
      const res = await api.post<RetirementResult>('/api/retirement', {
        currentAge: Number(currentAge),
        retirementAge: Number(retirementAge),
        lifeExpectancy: Number(lifeExpectancy),
        currentMonthlyExpense: Number(currentExpense),
        currentCorpus: Number(currentCorpus),
        monthlyInvestment: Number(monthlyInvestment),
        preRetirementReturn: Number(preReturn),
        postRetirementReturn: Number(postReturn),
        inflation: Number(inflation),
        stepUpPct: Number(stepUp),
      });
      setResult(res.data);
    } catch (e: any) {
      // noop
    } finally {
      setCalculating(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Retirement & NPS',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={styles.tabBar}>
          <TabButton active={tab === 'calc'} label="Calculator" onPress={() => setTab('calc')} color={theme.primary} />
          <TabButton active={tab === 'nps'} label="NPS Funds" onPress={() => setTab('nps')} color={theme.primary} />
        </View>

        {tab === 'calc' && (
          <View style={{ padding: 16 }}>
            <View style={[styles.calcCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Field label="Current age" value={currentAge} onChangeText={setCurrentAge} theme={theme} half />
                <Field label="Retire at" value={retirementAge} onChangeText={setRetirementAge} theme={theme} half />
              </View>
              <Field label="Plan until age" value={lifeExpectancy} onChangeText={setLifeExpectancy} theme={theme} />
              <Field label="Current monthly expense" value={currentExpense} onChangeText={setCurrentExpense} theme={theme} />
              <Field label="Current corpus" value={currentCorpus} onChangeText={setCurrentCorpus} theme={theme} />
              <Field label="Monthly SIP" value={monthlyInvestment} onChangeText={setMonthlyInvestment} theme={theme} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Field label="Pre-return %" value={preReturn} onChangeText={setPreReturn} theme={theme} half />
                <Field label="Post-return %" value={postReturn} onChangeText={setPostReturn} theme={theme} half />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Field label="Inflation %" value={inflation} onChangeText={setInflation} theme={theme} half />
                <Field label="Step-up %" value={stepUp} onChangeText={setStepUp} theme={theme} half />
              </View>
              <TouchableOpacity
                onPress={calculate}
                disabled={calculating}
                style={[styles.calcBtn, { backgroundColor: theme.primary }]}
              >
                {calculating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Calculate</Text>}
              </TouchableOpacity>
            </View>

            {result && (
              <View style={{ marginTop: 16 }}>
                <View style={[styles.resultHero, { backgroundColor: result.isOnTrack ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: result.isOnTrack ? '#065F46' : '#92400E' }}>
                    Nominal corpus
                  </Text>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: result.isOnTrack ? '#065F46' : '#92400E', marginTop: 4 }}>
                    ₹{result.nominalCorpus.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 12, color: result.isOnTrack ? '#065F46' : '#92400E', marginTop: 4 }}>
                    {result.yearsToRetirement} years to retirement
                  </Text>
                  <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: result.isOnTrack ? '#10B981' : '#F59E0B', alignSelf: 'flex-start' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {result.isOnTrack ? '✓ ON TRACK' : '⚠ SHORTFALL'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <MiniStat label="Target (today)" value={`₹${result.targetCorpusToday.toLocaleString('en-IN')}`} theme={theme} />
                  <MiniStat label="Real value" value={`₹${result.realCorpusAtRetirement.toLocaleString('en-IN')}`} theme={theme} />
                </View>

                <View style={[styles.incomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, fontWeight: '600' }}>Monthly income (4% rule)</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 4 }}>
                    ₹{result.monthlyIncomeAtRetirement.toLocaleString('en-IN')}/mo
                  </Text>
                  {result.monthlyIncomeShortfall > 0 && (
                    <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      Shortfall: ₹{result.monthlyIncomeShortfall.toLocaleString('en-IN')}/mo
                    </Text>
                  )}
                </View>

                {result.recommendations.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 12, color: theme.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                      Recommendations
                    </Text>
                    {result.recommendations.map((r, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="chevron-forward" size={14} color={theme.primary} style={{ marginTop: 2 }} />
                        <Text style={{ color: theme.text, fontSize: 13, flex: 1, lineHeight: 19 }}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {tab === 'nps' && (
          <View style={{ padding: 16 }}>
            <View style={[styles.taxCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 }}>NPS Tax Benefits</Text>
              <Bullet icon="shield-checkmark" color="#10B981" text="Section 80CCD(1B): Extra ₹50K deduction above 80C" theme={theme} />
              <Bullet icon="business" color="#3B82F6" text="Section 80CCD(2): Up to 10% of basic salary (employer)" theme={theme} />
              <Bullet icon="cash" color="#F59E0B" text="60% of corpus at retirement is tax-free" theme={theme} />
              <Bullet icon="wallet" color="#8B5CF6" text="Min 40% must be annuitized (taxable as income)" theme={theme} />
            </View>

            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            ) : (
              fundManagers.map((fm) => (
                <View key={fm.code} style={[styles.fundCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{fm.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: theme.primaryLight }}>
                          <Text style={{ fontSize: 9, color: theme.primary, fontWeight: '600', textTransform: 'capitalize' }}>{fm.category}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: theme.textTertiary }}>AUM ₹{fm.aumCr.toLocaleString('en-IN')}Cr</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, color: theme.textTertiary }}>5Y CAGR</Text>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>{fm.historical5yCagr}%</Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 17 }}>{fm.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: theme.textTertiary }}>3Y: <Text style={{ color: theme.text, fontWeight: '600' }}>{fm.historical3yCagr}%</Text></Text>
                    <Text style={{ fontSize: 11, color: theme.textTertiary }}>Inception: <Text style={{ color: theme.text, fontWeight: '600' }}>{fm.sinceInceptionCagr}%</Text></Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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

function Field({ label, value, onChangeText, theme, half }: { label: string; value: string; onChangeText: (v: string) => void; theme: any; half?: boolean }) {
  return (
    <View style={{ flex: half ? 1 : undefined, marginBottom: 10 }}>
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

function MiniStat({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.miniStat, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ fontSize: 10, color: theme.textTertiary, fontWeight: '600', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Bullet({ icon, color, text, theme }: { icon: any; color: string; text: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon as any} size={16} color={color} style={{ marginTop: 2 }} />
      <Text style={{ color: theme.text, fontSize: 13, flex: 1, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', gap: 4, margin: 16, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 },
  calcCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  calcBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  resultHero: { padding: 16, borderRadius: 12, alignItems: 'center' },
  miniStat: { flex: 1, padding: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  incomeCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  taxCard: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  fundCard: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
});
