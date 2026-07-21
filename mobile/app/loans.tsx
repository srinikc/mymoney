import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

const LOAN_TYPES = ['Home', 'Car', 'Vehicle', 'Electronics', 'Equipment', 'Other'];

export default function LoansScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Other');
  const [formPrincipal, setFormPrincipal] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formTenure, setFormTenure] = useState('');
  const [formLender, setFormLender] = useState('');
  const [formStartDate, setFormStartDate] = useState('');

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/loans');
      const d = res.data;
      setData(Array.isArray(d?.loans) ? d.loans : Array.isArray(d) ? d : []);
    } catch { setError('Failed to load loans'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditItem(null); setFormName(''); setFormType('Other'); setFormPrincipal(''); setFormInterest(''); setFormTenure(''); setFormLender(''); setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormError(null); setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item); setFormName(item.name || ''); setFormType(item.type || 'Other'); setFormPrincipal(String(item.principal || ''));
    setFormInterest(String(item.interestRate || '')); setFormTenure(String(item.tenureMonths || '')); setFormLender(item.lender || '');
    setFormStartDate(item.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]); setFormError(null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPrincipal || isNaN(parseFloat(formPrincipal))) { setFormError('Name and principal are required'); return; }
    setFormLoading(true); setFormError(null);
    try {
      const payload = { name: formName.trim(), type: formType, principal: parseFloat(formPrincipal), interestRate: parseFloat(formInterest || '0'), tenureMonths: parseInt(formTenure || '1'), lender: formLender.trim(), startDate: formStartDate };
      if (editItem) { await api.put(`/api/loans/${editItem.id}`, payload); }
      else { await api.post('/api/loans', payload); }
      setShowForm(false); fetch();
    } catch (err: any) { setFormError(err?.response?.data?.error || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/loans/${item.id}`); fetch(); } catch { Alert.alert('Error', 'Failed to delete'); } } },
    ]);
  };

  const totalOutstanding = data.reduce((s: number, i: any) => s + (i.outstanding || i.remaining || i.balance || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Loans</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14 }}>{error}</Text></View>
      : (
        <FlatList data={data} keyExtractor={(i, idx) => i.id || String(idx)}
          ListHeaderComponent={totalOutstanding > 0 ? <View style={[styles.summaryCard, { backgroundColor: theme.expense }]}><Text style={{ color: '#fff', opacity: 0.7, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Outstanding</Text><Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(totalOutstanding)}</Text></View> : null}
          renderItem={({ item }) => {
            const outstanding = item.outstanding || item.remaining || item.balance || 0;
            const total = item.principal || item.amount || 0;
            const paid = total - outstanding;
            const pct = total > 0 ? (paid / total) * 100 : 0;
            return (
              <TouchableOpacity onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: theme.expenseLight }]}><Ionicons name="card" size={18} color={theme.expense} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.type} · {item.lender || ''} · {item.interestRate || 0}% · {item.tenureMonths || 0}m</Text>
                      <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.income }]} /></View>
                      <Text style={[styles.progressText, { color: theme.textTertiary }]}>{pct.toFixed(0)}% paid</Text>
                    </View>
                    <Text style={[styles.cardAmount, { color: theme.expense }]}>{formatCurrency(outstanding)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="card-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No loans</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editItem ? 'Edit Loan' : 'Add Loan'}</Text>
            {formError && <Text style={{ color: theme.expense, fontSize: 13, marginBottom: 12 }}>{formError}</Text>}
            <Text style={styles.label}>Loan Name</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="e.g. Home Loan" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>{LOAN_TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 12 }}>{t}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.label}>Principal (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formPrincipal} onChangeText={setFormPrincipal} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Interest Rate (%)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formInterest} onChangeText={setFormInterest} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Tenure (months)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formTenure} onChangeText={setFormTenure} keyboardType="number-pad" placeholder="12" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Lender</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formLender} onChangeText={setFormLender} placeholder="Bank name" placeholderTextColor={theme.textTertiary} />
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
  listContent: { paddingBottom: 20 }, card: { borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  progressBg: { height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', borderRadius: 3 }, progressText: { fontSize: 11, fontWeight: '500' },
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
