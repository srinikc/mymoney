import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface SourceItem {
  id: number;
  name: string;
  type: string;
  amount: number;
  sourceCategory?: string;
  category?: string;
  paymentMode?: string;
  startDate?: string;
}

interface SummaryData {
  totalMonthly?: number;
  totalYearly?: number;
  currentMonth?: number;
}

const SOURCE_TYPES = ['monthly', 'yearly', 'onetime', 'variable'];
const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'];

export default function IncomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SourceItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('monthly');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('Bank Transfer');
  const [formStartDate, setFormStartDate] = useState('');

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const [sRes, sumRes] = await Promise.all([
        api.get('/api/income/sources'),
        api.get('/api/income/summary'),
      ]);
      setSources(Array.isArray(sRes.data?.sources) ? sRes.data.sources : Array.isArray(sRes.data) ? sRes.data : []);
      setSummary(sumRes.data || null);
    } catch { setError('Failed to load income data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditItem(null);
    setFormName(''); setFormType('monthly'); setFormAmount(''); setFormCategory(''); setFormPaymentMode('Bank Transfer');
    setFormStartDate(new Date().toISOString().split('T')[0]); setFormError(null); setShowForm(true);
  };

  const openEdit = (item: SourceItem) => {
    setEditItem(item);
    setFormName(item.name || '');
    setFormType(item.type || 'monthly');
    setFormAmount(String(item.amount || ''));
    setFormCategory(item.sourceCategory || item.category || '');
    setFormPaymentMode(item.paymentMode || 'Bank Transfer');
    setFormStartDate(item.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormError(null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formAmount || isNaN(parseFloat(formAmount)) || !formCategory.trim()) {
      setFormError('Name, amount, and source category are required'); return;
    }
    setFormLoading(true); setFormError(null);
    try {
      const payload = { name: formName.trim(), type: formType, amount: parseFloat(formAmount), sourceCategory: formCategory.trim(), paymentMode: formPaymentMode, startDate: formStartDate };
      if (editItem) {
        await api.put(`/api/income/sources/${editItem.id}`, payload);
      } else {
        await api.post('/api/income/sources', payload);
      }
      setShowForm(false); fetch();
    } catch (err: unknown) { setFormError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (item: SourceItem) => {
    Alert.alert('Delete Source', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/income/sources/${item.id}`); fetch(); }
        catch { Alert.alert('Error', 'Failed to delete'); }
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Income Sources</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14 }}>{error}</Text></View>
      : (
        <FlatList data={sources} keyExtractor={(i, idx) => i.id || String(idx)}
          ListHeaderComponent={summary ? (
            <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
              <Text style={{ color: '#fff', opacity: 0.7, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Income Summary</Text>
              <View style={styles.summaryRow}>
                <View><Text style={{ color: '#fff', opacity: 0.6, fontSize: 11 }}>Monthly</Text><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{formatCurrency(summary.totalMonthly || 0)}</Text></View>
                <View><Text style={{ color: '#fff', opacity: 0.6, fontSize: 11 }}>Yearly</Text><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{formatCurrency(summary.totalYearly || 0)}</Text></View>
                <View><Text style={{ color: '#fff', opacity: 0.6, fontSize: 11 }}>This Month</Text><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{formatCurrency(summary.currentMonth || 0)}</Text></View>
              </View>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}><Ionicons name="cash" size={18} color={theme.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.sourceCategory || item.category || ''} · {item.type}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.income }]}>{formatCurrency(item.amount || 0)}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>/ {item.type === 'yearly' ? 'yr' : item.type === 'onetime' ? 'once' : item.type === 'variable' ? 'mo' : 'mo'}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cash-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No income sources</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editItem ? 'Edit Income Source' : 'Add Income Source'}</Text>
            {formError && <Text style={{ color: theme.expense, fontSize: 13, marginBottom: 12 }}>{formError}</Text>}
            <Text style={styles.label}>Name</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="e.g. Salary" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>{SOURCE_TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{t}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.label}>Amount (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formAmount} onChangeText={setFormAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Source Category</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formCategory} onChangeText={setFormCategory} placeholder="e.g. Salary, Rental" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Payment Mode</Text>
            <View style={styles.typeRow}>{PAYMENT_MODES.map((m) => (
              <TouchableOpacity key={m} onPress={() => setFormPaymentMode(m)} style={[styles.typeBtn, { backgroundColor: formPaymentMode === m ? theme.primary : theme.background }]}>
                <Text style={{ color: formPaymentMode === m ? '#fff' : theme.text, fontSize: 11 }}>{m}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.label}>Start Date</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formStartDate} onChangeText={setFormStartDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textTertiary} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.cancelBtn}><Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={formLoading} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>{formLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{editItem ? 'Update' : 'Add'}</Text>}</TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 }, addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  summaryCard: { margin: 20, marginBottom: 4, borderRadius: 16, padding: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  listContent: { paddingBottom: 20 }, card: { borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2, textTransform: 'capitalize' },
  cardAmount: { fontSize: 15, fontWeight: '700' }, empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 }, label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8, color: '#666' },
  input: { borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  saveBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12 },
});
