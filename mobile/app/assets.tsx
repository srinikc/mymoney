import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme, RefreshControl, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

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
  const [formValue, setFormValue] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/assets');
      const d = res.data;
      setData(Array.isArray(d?.assets) ? d.assets : Array.isArray(d) ? d : []);
    } catch { setError('Failed to load assets'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!formName.trim() || !formValue) { setFormError('Please fill all fields'); return; }
    setFormLoading(true);
    try {
      await api.post('/api/assets', { name: formName.trim(), value: parseFloat(formValue) });
      setShowForm(false);
      fetch();
    } catch (err: unknown) { setFormError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Asset', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/assets/${id}`); fetch(); } catch { Alert.alert('Error', 'Failed to delete'); } } },
    ]);
  };

  const total = data.reduce((s, i) => s + (i.value || i.amount || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Assets</Text>
        <TouchableOpacity onPress={() => { setFormName(''); setFormValue(''); setFormError(null); setShowForm(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}><Ionicons name="add" size={22} color={theme.primary} /></TouchableOpacity>
      </View>

      {showForm && (
        <View style={[styles.formCard, { backgroundColor: theme.surface }]}>
          <View style={styles.formHeader}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Add Asset</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={22} color={theme.textTertiary} /></TouchableOpacity>
          </View>
          {formError ? <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}><Text style={{ color: theme.expense, fontSize: 13 }}>{formError}</Text></View> : null}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} onChangeText={setFormName} placeholder="e.g. House" placeholderTextColor={theme.textTertiary} />
          <Text style={[styles.label, { color: theme.textSecondary }]}>Value</Text>
          <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formValue} onChangeText={setFormValue} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowForm(false)}>
              <Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={{ color: theme.expense, fontSize: 14, fontWeight: '500' }}>{error}</Text></View>
      : <FlatList data={data} keyExtractor={(i, idx) => i.id || i._id || String(idx)}
          ListHeaderComponent={total > 0 ? <View style={[styles.summary, { backgroundColor: theme.primary }]}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Total Assets</Text><Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{formatCurrency(total)}</Text></View> : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onLongPress={() => handleDelete(item.id || item._id || '')}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: theme.incomeLight }]}><Ionicons name="diamond" size={18} color={theme.income} /></View>
                <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{item.name || item.title || 'Asset'}</Text>
                <Text style={[styles.cardAmount, { color: theme.income }]}>{formatCurrency(item.value || item.amount || 0)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="diamond-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '500' }}>No assets yet</Text></View>}
        />
      }

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 }, addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  summary: { margin: 20, marginBottom: 4, borderRadius: 16, padding: 20 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' }, cardAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  formCard: { margin: 20, marginBottom: 4, borderRadius: 16, padding: 20 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
