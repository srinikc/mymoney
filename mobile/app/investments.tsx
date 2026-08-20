import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface InvestmentItem {
  id: number;
  name: string;
  type: string;
  symbol?: string;
  amount: number;
  value?: number;
  currentValue?: number;
  purchaseDate?: string;
}

const INVESTMENT_TYPES = ['stocks', 'mutual_funds', 'fd', 'ppf', 'nps', 'gold', 'real_estate', 'crypto', 'bonds', 'other'];

export default function InvestmentsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<InvestmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<InvestmentItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('stocks');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrentValue, setFormCurrentValue] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/investments');
      const d = res.data;
      const list = Array.isArray(d?.investments) ? d.investments : Array.isArray(d) ? d : [];
      setData(list);
      setTotalValue(list.reduce((sum: number, i: InvestmentItem) => sum + (i.currentValue || i.value || 0), 0));
    } catch { setError('Failed to load investments'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditItem(null); setShowForm(false); setFormName(''); setFormType('stocks'); setFormAmount(''); setFormCurrentValue(''); setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormError(null); setShowAddForm(true);
  };

  const openEdit = (item: InvestmentItem) => {
    setShowAddForm(false);
    setEditItem(item); setFormName(item.name || ''); setFormType(item.type || 'stocks'); setFormAmount(String(item.amount || ''));
    setFormCurrentValue(String(item.currentValue || item.value || '')); setFormPurchaseDate(item.purchaseDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormError(null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formAmount || isNaN(parseFloat(formAmount))) { setFormError('Name and amount are required'); return; }
    setFormLoading(true); setFormError(null);
    try {
      const payload = { name: formName.trim(), type: formType, amount: parseFloat(formAmount), currentValue: parseFloat(formCurrentValue || formAmount), purchaseDate: formPurchaseDate };
      if (editItem) { await api.put(`/api/investments/${editItem.id}`, payload); }
      else { await api.post('/api/investments', payload); }
      setShowForm(false); setShowAddForm(false); fetch();
    } catch (err) { const apiErr = err as { response?: { data?: { error?: string } }; message?: string }; setFormError(apiErr?.response?.data?.error || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (item: InvestmentItem) => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/investments/${item.id}`); fetch(); } catch { Alert.alert('Error', 'Failed to delete'); } } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Investments</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14 }}>{error}</Text></View>
      : (
        <View style={{ flex: 1 }}>
          {showAddForm && (
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={[styles.inlineCardWrap, { backgroundColor: theme.surface }]}>
              <Text style={[styles.inlineTitle, { color: theme.text }]}>Add Investment</Text>
              {formError && <Text style={{ color: theme.expense, fontSize: 13, marginBottom: 12 }}>{formError}</Text>}
              <Text style={styles.label}>Name</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="Investment name" placeholderTextColor={theme.textTertiary} />
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>{INVESTMENT_TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                  <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 11 }}>{t.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}</View>
              <Text style={styles.label}>Invested Amount (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formAmount} onChangeText={setFormAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
              <Text style={styles.label}>Current Value (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formCurrentValue} onChangeText={setFormCurrentValue} keyboardType="numeric" placeholder="Same as invested" placeholderTextColor={theme.textTertiary} />
              <Text style={styles.label}>Purchase Date</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formPurchaseDate} onChangeText={setFormPurchaseDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textTertiary} />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setFormError(null); }} style={styles.cancelBtn}><Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={formLoading} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>{formLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          )}
        <FlatList data={data} keyExtractor={(i, idx) => String(i.id ?? idx)}
          ListHeaderComponent={
            <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
              <Text style={{ color: '#fff', opacity: 0.7, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Portfolio Value</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(totalValue)}</Text>
              <Text style={{ color: '#fff', opacity: 0.6, fontSize: 12, marginTop: 4 }}>{data.length} investment{data.length !== 1 ? 's' : ''}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cv = item.currentValue || item.value || 0;
            const inv = item.amount || 0;
            const gain = cv - inv;
            const gainPct = inv > 0 ? (gain / inv) * 100 : 0;
            return (
              <TouchableOpacity onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}><Ionicons name="trending-up" size={18} color={theme.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name || item.type}</Text>
                      <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.type} · {item.symbol || ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(cv)}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: gain >= 0 ? theme.income : theme.expense }}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="trending-up-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No investments yet</Text></View>}
        />
        </View>
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editItem ? 'Edit Investment' : 'Add Investment'}</Text>
            {formError && <Text style={{ color: theme.expense, fontSize: 13, marginBottom: 12 }}>{formError}</Text>}
            <Text style={styles.label}>Name</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="Investment name" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>{INVESTMENT_TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 11 }}>{t.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.label}>Invested Amount (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formAmount} onChangeText={setFormAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Current Value (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formCurrentValue} onChangeText={setFormCurrentValue} keyboardType="numeric" placeholder="Same as invested" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Purchase Date</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formPurchaseDate} onChangeText={setFormPurchaseDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textTertiary} />
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
  inlineCardWrap: { margin: 20, borderRadius: 16, padding: 20 },
  inlineTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  summaryCard: { margin: 20, marginBottom: 4, borderRadius: 16, padding: 20 },
  listContent: { paddingBottom: 20 }, card: { borderRadius: 14, padding: 16, marginHorizontal: 20, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
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
