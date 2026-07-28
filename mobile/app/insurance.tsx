import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency, formatDate } from '../utils/format';
import api from '../api/client';

interface InsuranceItem {
  id: number;
  name: string;
  type: string;
  provider?: string;
  premium: number;
  premiumFrequency: string;
  startDate?: string;
  renewalDate?: string;
}

const INSURANCE_TYPES = ['health', 'term_life', 'motor', 'other'];
const FREQUENCIES = ['monthly', 'quarterly', 'half_yearly', 'yearly'];

export default function InsuranceScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<InsuranceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('health');
  const [formProvider, setFormProvider] = useState('');
  const [formPremium, setFormPremium] = useState('');
  const [formFrequency, setFormFrequency] = useState('yearly');
  const [formStartDate, setFormStartDate] = useState('');

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/insurance');
      const d = res.data;
      setData(Array.isArray(d?.policies || d?.insurance) ? (d.policies || d.insurance) : Array.isArray(d) ? d : []);
    } catch { setError('Failed to load insurance'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setEditItem(null); setFormName(''); setFormType('health'); setFormProvider(''); setFormPremium(''); setFormFrequency('yearly');
    setFormStartDate(new Date().toISOString().split('T')[0]); setFormError(null); setShowForm(true);
  };

  const openEdit = (item: InsuranceItem) => {
    setEditItem(item); setFormName(item.name || ''); setFormType(item.type || 'health'); setFormProvider(item.provider || '');
    setFormPremium(String(item.premium || '')); setFormFrequency(item.premiumFrequency || 'yearly');
    setFormStartDate(item.startDate?.split('T')[0] || new Date().toISOString().split('T')[0]); setFormError(null); setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPremium || isNaN(parseFloat(formPremium))) { setFormError('Name and premium are required'); return; }
    setFormLoading(true); setFormError(null);
    try {
      const payload = { name: formName.trim(), type: formType, provider: formProvider.trim(), premium: parseFloat(formPremium), premiumFrequency: formFrequency, startDate: formStartDate };
      if (editItem) { await api.put(`/api/insurance/${editItem.id}`, payload); }
      else { await api.post('/api/insurance', payload); }
      setShowForm(false); fetch();
    } catch (err: unknown) { setFormError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (item: InsuranceItem) => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/insurance/${item.id}`); fetch(); } catch { Alert.alert('Error', 'Failed to delete'); } } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Insurance</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14 }}>{error}</Text></View>
      : (
        <FlatList data={data} keyExtractor={(i, idx) => i.id || String(idx)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.warningLight }]}><Ionicons name="shield-checkmark" size={18} color={theme.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>{item.provider || ''} · {item.type} · {item.premiumFrequency}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(item.premium || 0)}</Text>
                    {item.renewalDate ? <Text style={{ color: theme.textTertiary, fontSize: 11 }}>Renew: {formatDate(item.renewalDate)}</Text> : null}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="shield-checkmark-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15 }}>No insurance policies</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editItem ? 'Edit Policy' : 'Add Insurance Policy'}</Text>
            {formError && <Text style={{ color: theme.expense, fontSize: 13, marginBottom: 12 }}>{formError}</Text>}
            <Text style={styles.label}>Policy Name</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="e.g. Health Insurance" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>{INSURANCE_TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setFormType(t)} style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}>
                <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 12 }}>{t.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.label}>Provider</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formProvider} onChangeText={setFormProvider} placeholder="e.g. HDFC Ergo" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Premium (₹)</Text><TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formPremium} onChangeText={setFormPremium} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.textTertiary} />
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.typeRow}>{FREQUENCIES.map((f) => (
              <TouchableOpacity key={f} onPress={() => setFormFrequency(f)} style={[styles.typeBtn, { backgroundColor: formFrequency === f ? theme.primary : theme.background }]}>
                <Text style={{ color: formFrequency === f ? '#fff' : theme.text, fontSize: 11 }}>{f.replace('_', ' ')}</Text>
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
