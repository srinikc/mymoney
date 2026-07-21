import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency, formatDate } from '../utils/format';
import api from '../api/client';

const billingCycles = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Weekly', value: 'weekly' },
];

export default function SubscriptionsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCycle, setFormCycle] = useState('monthly');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/subscriptions');
      const d = res.data;
      setData(Array.isArray(d?.subscriptions) ? d.subscriptions : Array.isArray(d) ? d : []);
    } catch { setError('Failed to load subscriptions'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const monthlyTotal = data.reduce((s, i) => {
    const amt = i.amount || i.price || 0;
    const freq = (i.frequency || i.billingCycle || 'monthly').toLowerCase();
    if (freq === 'yearly' || freq === 'annual') return s + amt / 12;
    if (freq === 'quarterly') return s + amt / 3;
    if (freq === 'weekly') return s + amt * 4.33;
    return s + amt;
  }, 0);

  const handleSave = async () => {
    if (!formName.trim() || !formAmount || isNaN(parseFloat(formAmount))) {
      setFormError('Please fill name and amount');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      await api.post('/api/subscriptions', {
        name: formName.trim(),
        amount: parseFloat(formAmount),
        billingCycle: formCycle,
      });
      setShowForm(false);
      resetForm();
      fetch();
    } catch (err: any) { setFormError(err.response?.data?.message || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Subscription', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/subscriptions/${id}`); fetch(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  const resetForm = () => {
    setFormName(''); setFormAmount(''); setFormCycle('monthly'); setFormError(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Subscriptions</Text>
        <TouchableOpacity onPress={() => { resetForm(); setShowForm(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}><Ionicons name="add" size={22} color={theme.primary} /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14, fontWeight: '500' }}>{error}</Text></View>
      : <FlatList data={data} keyExtractor={(i, idx) => i.id || i._id || String(idx)}
          ListHeaderComponent={<View style={[styles.summary, { backgroundColor: theme.primary }]}><Text style={styles.summaryLabel}>Monthly Spend</Text><Text style={styles.summaryAmount}>{formatCurrency(monthlyTotal)}</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onLongPress={() => handleDelete(item.id || item._id)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}><Ionicons name="refresh" size={18} color={theme.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name || item.service || 'Subscription'}</Text>
                  <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{(item.frequency || item.billingCycle || 'Monthly')} · Next: {formatDate(item.nextBilling || item.nextDate || item.startDate || new Date().toISOString())}</Text>
                </View>
                <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(item.amount || item.price || 0)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="refresh-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '500' }}>No subscriptions</Text></View>}
        />
      }

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Subscription</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
            </View>
            {formError ? <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}><Text style={{ color: theme.expense, fontSize: 13 }}>{formError}</Text></View> : null}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} onChangeText={setFormName} placeholder="e.g. Netflix" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formAmount} onChangeText={setFormAmount} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Billing Cycle</Text>
            <View style={styles.cycleRow}>
              {billingCycles.map((c) => (
                <TouchableOpacity key={c.value} style={[styles.cyclePill, formCycle === c.value && { backgroundColor: theme.primary }]} onPress={() => setFormCycle(c.value)}>
                  <Text style={{ color: formCycle === c.value ? '#fff' : theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Add Subscription</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  summary: { margin: 20, marginBottom: 4, borderRadius: 16, padding: 20 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  summaryAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  cycleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cyclePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
