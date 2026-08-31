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
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency } from '../../utils/format';
import api from '../../api/client';

interface UnusualExpense {
  id: number;
  date: string;
  amount: number;
  vendor: string | null;
  description: string | null;
  purpose: string | null;
  category: { id: number; name: string; icon: string; color: string };
}

interface PurposeBreakdown {
  purpose: string;
  count: number;
  total: number;
}

interface UnusualResponse {
  data: UnusualExpense[];
  total: number;
  page: number;
  totalPages: number;
  totalAmount: number;
  threshold: number;
  purposeBreakdown: PurposeBreakdown[];
}

const PURPOSES = [
  'groceries', 'dining', 'transport', 'rent', 'utilities', 'medical', 'education',
  'wedding', 'festival', 'religious', 'gifting', 'travel', 'home-repair',
  'vehicle-maintenance', 'appliance', 'electronics', 'apparel', 'personal-care',
  'entertainment', 'subscription', 'insurance-premium', 'emi-payment', 'investment',
  'tax-payment', 'charity', 'childcare', 'pet-care', 'other',
];

export default function UnusualScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<UnusualResponse | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionOpen, setActionOpen] = useState(false);
  const [bulkPurpose, setBulkPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [purposeFilter, setPurposeFilter] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [purposeFilter]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (purposeFilter) params.set('purpose', purposeFilter);
      const res = await api.get<UnusualResponse>(`/api/expenses/unusual?${params}`);
      setData(res.data);
      setSelected(new Set());
    } catch (e) {
      Alert.alert('Error', 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function doBulkAction(action: 'dismiss' | 'categorize') {
    if (selected.size === 0) {
      Alert.alert('Select first', 'Pick at least one expense');
      return;
    }
    if (action === 'categorize' && !bulkPurpose) {
      Alert.alert('Pick purpose', 'Select a purpose to apply');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/api/expenses/unusual', {
        action,
        ids: Array.from(selected),
        ...(action === 'categorize' ? { purpose: bulkPurpose } : {}),
      });
      Alert.alert('Done', `Updated ${(res.data as any).updated} expense${(res.data as any).updated === 1 ? '' : 's'}`);
      setActionOpen(false);
      setBulkPurpose('');
      await load();
    } catch {
      Alert.alert('Error', 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const unpurposed = useMemo(() => {
    if (!data) return 0;
    return data.data.filter((e) => !e.purpose).length;
  }, [data]);

  if (loading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ title: 'Unusual', headerStyle: { backgroundColor: theme.card } }} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Unusual Expenses',
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.primary} />}
      >
        <View style={[styles.heroCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Ionicons name="alert-circle" size={20} color="#92400E" />
          <Text style={{ flex: 1, fontSize: 13, color: '#92400E', marginLeft: 8 }}>
            Transactions over ₹{data.threshold.toLocaleString('en-IN')} not in regular bills. Tag a purpose to get better insights.
          </Text>
        </View>

        <View style={styles.statRow}>
          <StatTile label="Flagged" value={String(data.total)} color="#F59E0B" theme={theme} />
          <StatTile label="Total" value={formatCurrency(data.totalAmount)} color={theme.primary} theme={theme} />
        </View>
        <View style={styles.statRow}>
          <StatTile label="Untagged" value={String(unpurposed)} color="#EF4444" theme={theme} />
          <StatTile label="Categories" value={String(data.purposeBreakdown.length)} color="#3B82F6" theme={theme} />
        </View>

        {data.purposeBreakdown.length > 0 && (
          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>BY PURPOSE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {data.purposeBreakdown.map((p) => (
                <TouchableOpacity
                  key={p.purpose}
                  onPress={() => setPurposeFilter(purposeFilter === p.purpose ? null : p.purpose)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: purposeFilter === p.purpose ? theme.primary : theme.card,
                      borderColor: purposeFilter === p.purpose ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: purposeFilter === p.purpose ? '#fff' : theme.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p.purpose.replace(/-/g, ' ')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: purposeFilter === p.purpose ? '#fff' : theme.textTertiary,
                      marginLeft: 6,
                    }}
                  >
                    {formatCurrency(p.total)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={16} color={theme.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search vendor..."
            placeholderTextColor={theme.textTertiary}
            onSubmitEditing={() => load()}
            style={{ flex: 1, color: theme.text, fontSize: 14 }}
            returnKeyType="search"
          />
        </View>

        {selected.size > 0 && (
          <TouchableOpacity
            onPress={() => setActionOpen(true)}
            style={[styles.actionBar, { backgroundColor: theme.primary }]}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{selected.size} selected</Text>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Act on them →</Text>
          </TouchableOpacity>
        )}

        {data.data.length === 0 ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', marginTop: 8 }}>All clear</Text>
            <Text style={{ color: theme.textTertiary, fontSize: 13, marginTop: 4 }}>No unusual expenses to review</Text>
          </View>
        ) : (
          data.data.map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => toggle(e.id)}
              style={[
                styles.expenseCard,
                {
                  backgroundColor: theme.card,
                  borderColor: selected.has(e.id) ? theme.primary : theme.border,
                  borderWidth: selected.has(e.id) ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                  {e.vendor || e.description || 'Expense'}
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 2 }}>
                  {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {e.category.name.replace(/-/g, ' ')}
                </Text>
                {e.purpose ? (
                  <View style={[styles.purposeTag, { backgroundColor: theme.primaryLight }]}>
                    <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                      {e.purpose.replace(/-/g, ' ')}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.purposeTag, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ color: '#92400E', fontSize: 10, fontWeight: '600' }}>UNTAGGED</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                {formatCurrency(e.amount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={actionOpen} animationType="slide" transparent onRequestClose={() => setActionOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Act on {selected.size}</Text>
              <TouchableOpacity onPress={() => setActionOpen(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              disabled={busy}
              onPress={() => doBulkAction('dismiss')}
              style={[styles.modalBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>Mark as not unusual</Text>
            </TouchableOpacity>

            <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 8, letterSpacing: 1 }}>
              TAG WITH PURPOSE
            </Text>
            <View style={styles.purposeGrid}>
              {PURPOSES.slice(0, 16).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setBulkPurpose(p)}
                  style={[
                    styles.purposeChip,
                    {
                      backgroundColor: bulkPurpose === p ? theme.primary : theme.background,
                      borderColor: bulkPurpose === p ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: bulkPurpose === p ? '#fff' : theme.text,
                      textTransform: 'capitalize',
                    }}
                  >
                    {p.replace(/-/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              disabled={busy || !bulkPurpose}
              onPress={() => doBulkAction('categorize')}
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary, opacity: !bulkPurpose ? 0.5 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Apply {bulkPurpose ? bulkPurpose.replace(/-/g, ' ') : '...'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatTile({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginVertical: 12 },
  actionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginBottom: 12 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  purposeTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  purposeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  modalPrimaryBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
});
