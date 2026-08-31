import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';
import PurposePicker from '../components/PurposePicker';

interface Asset {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  value?: number;
  amount?: number;
}

export default function AssetsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('other');
  const [formValue, setFormValue] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ASSET_TYPES = [
    { value: 'property', label: 'Property', desc: 'Physical property — houses, land, flats' },
    { value: 'building', label: 'Building', desc: 'Commercial buildings, offices, shops' },
    { value: 'gold', label: 'Gold', desc: 'Physical gold — bars, coins, jewelry' },
    { value: 'silver', label: 'Silver', desc: 'Physical silver — bars, coins' },
    { value: 'precious_metals', label: 'Precious Metals', desc: 'Platinum, palladium, rhodium' },
    { value: 'equipment', label: 'Equipment', desc: 'Machinery, tools, electronics' },
    { value: 'vehicle', label: 'Vehicle', desc: 'Cars, bikes, commercial vehicles' },
    { value: 'other', label: 'Other', desc: 'Other physical assets' },
  ];
  const isProperty = formType === 'property' || formType === 'building';
  const isPrecious = formType === 'gold' || formType === 'silver' || formType === 'precious_metals';
  const isEquipment = formType === 'equipment';
  const showQuantityUnit = isPrecious || isEquipment;
  const showLocation = isProperty;
  const activeTypeDesc = ASSET_TYPES.find((t) => t.value === formType)?.desc || '';

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const { data: res } = await api.get('/api/assets');
      setData(res.assets || res);
    } catch { setError('Failed to load'); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const total = data.reduce((s, a) => s + (a.value || a.amount || 0), 0);

  const handleSave = async () => {
    if (!formName.trim() || !formValue) { setFormError('Please fill all fields'); return; }
    setFormLoading(true);
    try {
      const payload: Record<string, unknown> = { name: formName.trim(), type: formType, currentValue: parseFloat(formValue), purpose: formPurpose };
      if (formPurchasePrice) payload.purchasePrice = parseFloat(formPurchasePrice);
      if (showQuantityUnit && formQuantity) payload.quantity = parseFloat(formQuantity);
      if (showQuantityUnit && formUnit) payload.unit = formUnit;
      if (showLocation && formLocation) payload.location = formLocation;
      await api.post('/api/assets', payload);
      setShowForm(false);
      fetch();
    } catch (err: unknown) { setFormError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save'); }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    Alert.alert('Delete', 'Remove this asset?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/api/assets/${id}`); fetch(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Assets</Text>
        <TouchableOpacity onPress={() => { setFormName(''); setFormType('other'); setFormValue(''); setFormPurchasePrice(''); setFormQuantity(''); setFormUnit(''); setFormLocation(''); setFormPurpose(''); setFormError(null); setShowForm(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}><Ionicons name="add" size={22} color={theme.primary} /></TouchableOpacity>
      </View>

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Add Asset</Text><TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity></View>
          {formError ? <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}><Text style={{ color: theme.expense, fontSize: 13 }}>{formError}</Text></View> : null}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} onChangeText={setFormName} placeholder="e.g. House" placeholderTextColor={theme.textTertiary} />
          <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {ASSET_TYPES.map((t) => (
              <TouchableOpacity key={t.value} onPress={() => setFormType(t.value)} style={[styles.typeChip, { backgroundColor: formType === t.value ? theme.primary : theme.background, borderColor: formType === t.value ? theme.primary : theme.border }]}>
                <Text style={{ color: formType === t.value ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {activeTypeDesc ? <Text style={{ fontSize: 11, color: theme.textTertiary, marginBottom: 8 }}>{activeTypeDesc}</Text> : null}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Current Value</Text>
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formValue} onChangeText={setFormValue} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
          <Text style={[styles.label, { color: theme.textSecondary }]}>Purchase Price</Text>
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formPurchasePrice} onChangeText={setFormPurchasePrice} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
          {showQuantityUnit && (<>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Quantity</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formQuantity} onChangeText={setFormQuantity} placeholder="e.g. 100" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Unit</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              {['grams', 'kg', 'tola', 'carats', 'units'].map((u) => (
                <TouchableOpacity key={u} onPress={() => setFormUnit(u)} style={[styles.typeChip, { backgroundColor: formUnit === u ? theme.primary : theme.background, borderColor: formUnit === u ? theme.primary : theme.border }]}>
                  <Text style={{ color: formUnit === u ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>)}
          {showLocation && (<>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Location</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formLocation} onChangeText={setFormLocation} placeholder="e.g. Mumbai, Dadar" placeholderTextColor={theme.textTertiary} />
          </>)}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Purpose</Text>
          <PurposePicker value={formPurpose} onChange={setFormPurpose} theme={theme} />
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowForm(false)}>
              <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14, fontWeight: '500' }}>{error}</Text></View>
      : <FlatList data={data} keyExtractor={(i, idx) => i.id || i._id || String(idx)}
          ListHeaderComponent={total > 0 ? <View style={[styles.summary, { backgroundColor: theme.primary }]}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Assets</Text><Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(total)}</Text></View> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onLongPress={() => handleDelete(item.id || item._id)}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: theme.incomeLight }]}><Ionicons name="diamond" size={18} color={theme.income} /></View>
                <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{item.name || item.title || 'Asset'}</Text>
                <Text style={[styles.cardAmount, { color: theme.income }]}>{formatCurrency(item.value || item.amount || 0)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="diamond-outline" size={40} color={theme.textTertiary} /><Text style={{ color: theme.textTertiary, fontSize: 14 }}>No assets yet</Text></View>}
        />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summary: { margin: 20, marginBottom: 8, borderRadius: 16, padding: 20 },
  list: { padding: 20, paddingTop: 8 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' }, formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
});
