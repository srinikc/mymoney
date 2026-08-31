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
import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency } from '../../utils/format';
import api from '../../api/client';

interface Breakdown {
  monthlyEssentials: number;
  sampleCount: number;
  monthsAnalyzed: number;
  liquidSavings: number;
  cashTotal: number;
  bankSavingsTotal: number;
  dependents: number;
  jobType: string;
  monthlyIncome: number;
  recommendedMonths: number;
}

interface EFundResponse {
  months: number;
  target: number;
  existing: number;
  gap: number;
  runUpMonths: number;
  monthlyRunUp: number;
  rationale: string;
  warnings: string[];
  tips: string[];
  breakdown: Breakdown;
}

const JOB_OPTIONS: Array<{ value: string; label: string; months: number }> = [
  { value: 'government', label: 'Govt / PSU', months: 3 },
  { value: 'private', label: 'Private Sector', months: 6 },
  { value: 'self_employed', label: 'Self-Employed', months: 9 },
  { value: 'freelance', label: 'Freelancer', months: 9 },
  { value: 'business', label: 'Business', months: 12 },
  { value: 'retired', label: 'Retired', months: 6 },
  { value: 'student', label: 'Student', months: 3 },
  { value: 'homemaker', label: 'Homemaker', months: 3 },
  { value: 'other', label: 'Other', months: 6 },
];

export default function EmergencyFundScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<EFundResponse | null>(null);
  const [jobType, setJobType] = useState<string>('private');
  const [dependents, setDependents] = useState('0');
  const [essentials, setEssentials] = useState('');
  const [existing, setExisting] = useState('');
  const [jobPickerOpen, setJobPickerOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<EFundResponse>('/api/emergency-fund');
      setData(res.data);
      setJobType(res.data.breakdown.jobType);
      setDependents(String(res.data.breakdown.dependents));
      setEssentials(String(res.data.breakdown.monthlyEssentials));
      setExisting(String(res.data.breakdown.liquidSavings));
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Emergency Fund', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const jobEntry = JOB_OPTIONS.find((j) => j.value === jobType) ?? JOB_OPTIONS[1];
  const depNum = Math.max(0, Number(dependents) || 0);
  const depAdjustment = depNum >= 3 ? 3 : depNum >= 1 ? 1 : 0;
  const months = jobEntry.months + depAdjustment;
  const essNum = Math.max(0, Number(essentials) || 0);
  const existNum = Math.max(0, Number(existing) || 0);
  const target = Math.round(essNum * months);
  const gap = Math.max(0, target - existNum);
  const runUpMonths = gap > 0 && data.breakdown.monthlyIncome > 0 ? Math.max(1, Math.ceil(gap / (data.breakdown.monthlyIncome * 0.2))) : 12;
  const monthlyRunUp = Math.ceil(gap / Math.max(1, runUpMonths));
  const pct = target > 0 ? Math.min(100, (existNum / target) * 100) : 0;
  const isFunded = gap === 0 && target > 0;
  const selectedJob = JOB_OPTIONS.find((j) => j.value === jobType);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Emergency Fund',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={[styles.hero, { backgroundColor: isFunded ? '#D1FAE5' : '#DBEAFE', borderColor: isFunded ? '#10B981' : '#3B82F6' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name={isFunded ? 'checkmark-circle' : 'medkit'} size={20} color={isFunded ? '#065F46' : '#1E40AF'} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: isFunded ? '#065F46' : '#1E40AF', textTransform: 'uppercase', letterSpacing: 1 }}>
              {isFunded ? 'Fully funded' : 'Building'}
            </Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: isFunded ? '#065F46' : '#1E40AF' }}>{formatCurrency(existNum)}</Text>
          <Text style={{ fontSize: 13, color: isFunded ? '#065F46' : '#1E40AF', marginTop: 2 }}>of {formatCurrency(target)} target</Text>
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3, marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: isFunded ? '#10B981' : '#3B82F6' }} />
          </View>
          <Text style={{ fontSize: 11, color: isFunded ? '#065F46' : '#1E40AF', marginTop: 6 }}>{pct.toFixed(0)}% of target · {months} months</Text>
        </View>

        <View style={styles.statRow}>
          <StatTile label="Essentials/mo" value={formatCurrency(essNum)} icon="wallet" theme={theme} />
          <StatTile label="Liquid savings" value={formatCurrency(existNum)} icon="cash" theme={theme} />
        </View>
        <View style={styles.statRow}>
          <StatTile label="Gap" value={formatCurrency(gap)} icon="trending-up" color="#F59E0B" theme={theme} />
          <StatTile label="Monthly run-up" value={gap > 0 ? formatCurrency(monthlyRunUp) : 'Done'} icon="calendar" color="#10B981" theme={theme} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>CUSTOMIZE</Text>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Job type</Text>
          <TouchableOpacity
            onPress={() => setJobPickerOpen(!jobPickerOpen)}
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>{selectedJob?.label} ({selectedJob?.months} mo baseline)</Text>
            <Ionicons name={jobPickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
          </TouchableOpacity>
          {jobPickerOpen && (
            <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.border }]}>
              {JOB_OPTIONS.map((j) => (
                <TouchableOpacity
                  key={j.value}
                  onPress={() => { setJobType(j.value); setJobPickerOpen(false); }}
                  style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontSize: 14 }}>{j.label}</Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 12 }}>{j.months} mo</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Dependents</Text>
          <TextInput
            value={dependents}
            onChangeText={setDependents}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Monthly essentials (₹)</Text>
          <TextInput
            value={essentials}
            onChangeText={setEssentials}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 12 }]}>Existing savings (₹)</Text>
          <TextInput
            value={existing}
            onChangeText={setExisting}
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          />
        </View>

        {!isFunded && gap > 0 && (
          <View style={[styles.plan, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="flag" size={16} color="#92400E" />
              <Text style={{ color: '#92400E', fontSize: 14, fontWeight: '700' }}>Your run-up plan</Text>
            </View>
            <Text style={{ color: '#92400E', fontSize: 13, marginBottom: 12 }}>
              Save {formatCurrency(monthlyRunUp)}/month for {runUpMonths} months to hit the target.
            </Text>
            <PlanStep n={1} text="Open a separate high-yield savings account (Fi, Niyo, Jupiter, IDFC First)" />
            <PlanStep n={2} text={`Auto-debit ${formatCurrency(monthlyRunUp)} on salary day — 1 hour after credit`} />
            <PlanStep n={3} text="Don't touch for non-emergencies. Real emergencies only." />
            <PlanStep n={4} text="Review and top up every January for inflation" />
          </View>
        )}

        {isFunded && (
          <View style={[styles.plan, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={18} color="#065F46" />
              <Text style={{ color: '#065F46', fontSize: 14, fontWeight: '700' }}>You're fully funded</Text>
            </View>
            <Text style={{ color: '#065F46', fontSize: 13, marginTop: 4 }}>
              Keep this money in a high-yield savings or liquid fund. Re-evaluate every January.
            </Text>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>WHY {months} MONTHS?</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="briefcase-outline" size={16} color={theme.textTertiary} />
            <Text style={{ color: theme.text, fontSize: 13 }}>
              <Text style={{ fontWeight: '600' }}>Job type:</Text> {selectedJob?.label} = {jobEntry.months} mo
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Ionicons name="people-outline" size={16} color={theme.textTertiary} />
            <Text style={{ color: theme.text, fontSize: 13 }}>
              <Text style={{ fontWeight: '600' }}>Dependents:</Text> {depNum} → +{depAdjustment} months
            </Text>
          </View>
          <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
            {selectedJob?.label === 'Govt / PSU' && 'Stable public-sector role — 3 months is enough.'}
            {selectedJob?.label === 'Private Sector' && 'Standard private-sector role — 6 months is the safe baseline.'}
            {selectedJob?.label === 'Self-Employed' && 'Self-employed income is variable — keep 9 months for slow quarters.'}
            {selectedJob?.label === 'Freelancer' && 'Freelance income is variable — keep 9 months for slow months.'}
            {selectedJob?.label === 'Business' && 'Business owners face cash-flow gaps — keep 12 months.'}
            {selectedJob?.label === 'Retired' && 'Pension is usually stable — 6 months for medical surprises.'}
            {selectedJob?.label === 'Student' && 'Students have low fixed costs — 3 months covers the gap year.'}
            {selectedJob?.label === 'Homemaker' && 'Homemaker with no dependents — 3 months is sufficient.'}
            {selectedJob?.label === 'Other' && 'Default safe baseline — 6 months of essentials.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value, icon, color, theme }: { label: string; value: string; icon: any; color?: string; theme: any }) {
  const c = color || theme.primary;
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Ionicons name={icon} size={14} color={c} />
        <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function PlanStep({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#92400E', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  section: { padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  inputLabel: { fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dropdown: { borderWidth: 1, borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  plan: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16 },
});
