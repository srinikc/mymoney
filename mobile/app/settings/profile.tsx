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
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const OCCUPATIONS = [
  { value: 'student', label: 'Student' },
  { value: 'professional', label: 'Professional' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'business', label: 'Business Owner' },
  { value: 'retired', label: 'Retired' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

interface ProfileData {
  id: number;
  name: string;
  isDefault: boolean;
  dateOfBirth: string | null;
  annualIncome: number | null;
  occupation: string | null;
  language: string;
  age: number | null;
}

export default function ProfileSettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);
  const [incomeMode, setIncomeMode] = useState<'yearly' | 'monthly'>('yearly');
  const [incomeValue, setIncomeValue] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobYear, setDobYear] = useState<string>('');
  const [occPickerOpen, setOccPickerOpen] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const sessionProfileId = (user as unknown as { profileId?: number } | undefined)?.profileId;

  useEffect(() => {
    if (!sessionProfileId) return;
    void load();
  }, [sessionProfileId]);

  async function load() {
    if (!sessionProfileId) return;
    setLoading(true);
    try {
      const res = await api.get<ProfileData>(`/api/profiles/${sessionProfileId}`);
      const p = res.data;
      setData(p);
      setIncomeValue(p.annualIncome != null ? String(p.annualIncome) : '');
      if (p.dateOfBirth) {
        const d = new Date(p.dateOfBirth);
        if (!Number.isNaN(d.getTime())) {
          setDobMonth(String(d.getUTCMonth() + 1));
          setDobYear(String(d.getUTCFullYear()));
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  function toggleIncomeMode() {
    if (!incomeValue) {
      setIncomeMode(incomeMode === 'yearly' ? 'monthly' : 'yearly');
      return;
    }
    const v = Number(incomeValue);
    if (Number.isNaN(v)) {
      setIncomeMode(incomeMode === 'yearly' ? 'monthly' : 'yearly');
      return;
    }
    if (incomeMode === 'yearly') {
      setIncomeValue(String(Math.round((v / 12) * 100) / 100));
      setIncomeMode('monthly');
    } else {
      setIncomeValue(String(Math.round(v * 12 * 100) / 100));
      setIncomeMode('yearly');
    }
  }

  async function save() {
    if (!data || !sessionProfileId) return;
    setSaving(true);
    try {
      const v = incomeValue ? Number(incomeValue) : null;
      if (v != null && (Number.isNaN(v) || v < 0)) {
        Alert.alert('Validation', 'Income must be a positive number');
        setSaving(false);
        return;
      }
      const annualIncome = incomeMode === 'monthly' && v != null
        ? Math.round(v * 12 * 100) / 100
        : v;
      const dobPayload = dobMonth && dobYear
        ? { month: Number(dobMonth), year: Number(dobYear) }
        : null;
      await api.patch(`/api/profiles/${sessionProfileId}`, {
        name: data.name,
        isDefault: data.isDefault,
        annualIncome,
        occupation: data.occupation,
        language: data.language,
        dateOfBirth: dobPayload,
      });
      Alert.alert('Saved', 'Profile updated successfully');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to save';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Profile', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const selectedOccupation = OCCUPATIONS.find((o) => o.value === data.occupation)?.label || 'Select occupation';
  const selectedLanguage = LANGUAGES.find((l) => l.value === data.language)?.label || 'English';
  const selectedMonth = MONTHS[Number(dobMonth) - 1] || 'Month';
  const selectedYear = dobYear || 'Year';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: theme.text }]}>Profile Settings</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          Your personal info drives age-based tips, budget recommendations, and language preferences.
        </Text>

        {/* Basic Info */}
        <Section title="Basic Info" theme={theme}>
          <Field label="Profile Name" theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={data.name}
              onChangeText={(t) => setData({ ...data, name: t })}
              placeholder="e.g. Personal, Family, Business"
              placeholderTextColor={theme.textSecondary}
            />
          </Field>
        </Section>

        {/* DOB */}
        <Section title="Date of Birth" theme={theme}>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>Used to deliver age-appropriate money tips</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <PickerField
                label="Month"
                value={selectedMonth}
                open={monthPickerOpen}
                onToggle={() => setMonthPickerOpen(!monthPickerOpen)}
                options={MONTHS.map((m, i) => ({ label: m, value: String(i + 1) }))}
                onSelect={(v) => { setDobMonth(v); setMonthPickerOpen(false); }}
                theme={theme}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <PickerField
                label="Year"
                value={selectedYear}
                open={yearPickerOpen}
                onToggle={() => setYearPickerOpen(!yearPickerOpen)}
                options={yearOptions.map((y) => ({ label: String(y), value: String(y) }))}
                onSelect={(v) => { setDobYear(v); setYearPickerOpen(false); }}
                theme={theme}
              />
            </View>
          </View>
          {data.age != null && (
            <Text style={[styles.helper, { color: theme.textSecondary, marginTop: 8 }]}>
              Current age: <Text style={{ fontWeight: '600', color: theme.text }}>{data.age}</Text>
            </Text>
          )}
        </Section>

        {/* Income */}
        <Section title="Annual Income" theme={theme}>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            Used for budget allocation. Auto-syncs from your Income Sources.
          </Text>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: incomeMode === 'yearly' ? theme.text : theme.textSecondary }]}>Yearly</Text>
            <Switch
              value={incomeMode === 'monthly'}
              onValueChange={toggleIncomeMode}
              trackColor={{ false: theme.border, true: theme.tint }}
              thumbColor="#ffffff"
            />
            <Text style={[styles.toggleLabel, { color: incomeMode === 'monthly' ? theme.text : theme.textSecondary }]}>Monthly</Text>
          </View>
          <Field label={`${incomeMode === 'yearly' ? 'Annual' : 'Monthly'} Income (₹)`} theme={theme}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={incomeValue}
              onChangeText={setIncomeValue}
              keyboardType="numeric"
              placeholder={incomeMode === 'yearly' ? 'e.g. 1200000' : 'e.g. 100000'}
              placeholderTextColor={theme.textSecondary}
            />
          </Field>
          {incomeValue && (
            <Text style={[styles.helper, { color: theme.textSecondary }]}>
              ≈ ₹
              {incomeMode === 'yearly'
                ? `${Math.round((Number(incomeValue) / 12) * 100) / 100}/month`
                : `${Math.round(Number(incomeValue) * 12 * 100) / 100}/year`}
            </Text>
          )}
        </Section>

        {/* Occupation */}
        <Section title="Occupation" theme={theme}>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>Tailors tips to your work style</Text>
          <PickerField
            label="Occupation"
            value={selectedOccupation}
            open={occPickerOpen}
            onToggle={() => setOccPickerOpen(!occPickerOpen)}
            options={OCCUPATIONS}
            onSelect={(v) => { setData({ ...data, occupation: v || null }); setOccPickerOpen(false); }}
            theme={theme}
          />
        </Section>

        {/* Language */}
        <Section title="Language" theme={theme}>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            Interface language (English content shown for all in v1)
          </Text>
          <PickerField
            label="Language"
            value={selectedLanguage}
            open={langPickerOpen}
            onToggle={() => setLangPickerOpen(!langPickerOpen)}
            options={LANGUAGES}
            onSelect={(v) => { setData({ ...data, language: v }); setLangPickerOpen(false); }}
            theme={theme}
          />
        </Section>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.tint }]}
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children, theme }: { label: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function PickerField({
  label, value, open, onToggle, options, onSelect, theme,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  options: { label: string; value: string }[];
  onSelect: (v: string) => void;
  theme: any;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerTrigger, { backgroundColor: theme.background, borderColor: theme.border }]}
        onPress={onToggle}
        accessibilityRole="button"
      >
        <Text style={{ color: theme.text }}>{value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.pickerList, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
            {options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                onPress={() => onSelect(o.value)}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.text }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 14, marginBottom: 20 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  helper: { fontSize: 12, marginBottom: 8 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerList: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
