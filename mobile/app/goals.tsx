import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatCurrency } from '../utils/format';
import api from '../api/client';

interface GoalItem {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  targetAmount?: number;
  target?: number;
  savedAmount?: number;
  saved?: number;
  currentAmount?: number;
}

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formSaved, setFormSaved] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/goals');
      const data = res.data;
      setGoals(Array.isArray(data?.goals) ? data.goals : Array.isArray(data) ? data : []);
    } catch { setError('Failed to load goals'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!formName.trim() || !formTarget) { setFormError('Please fill all fields'); return; }
    setFormLoading(true);
    try {
      await api.post('/api/goals', {
        name: formName.trim(),
        targetAmount: parseFloat(formTarget),
        savedAmount: parseFloat(formSaved || '0'),
      });
      setShowForm(false);
      fetch();
    } catch (err: unknown) { setFormError((err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/goals/${id}`); fetch(); } catch { Alert.alert('Error', 'Failed to delete'); } } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Goals</Text>
        <TouchableOpacity onPress={() => { setFormName(''); setFormTarget(''); setFormSaved(''); setFormError(null); setShowForm(true); }} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}><Ionicons name="add" size={22} color={theme.primary} /></TouchableOpacity>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      : error ? <View style={styles.center}><Ionicons name="alert-circle" size={40} color={theme.expense} /><Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text></View>
      : <FlatList data={goals} keyExtractor={(i, idx) => i.id || i._id || String(idx)}
          renderItem={({ item }) => {
            const saved = item.savedAmount || item.saved || item.currentAmount || 0;
            const target = item.targetAmount || item.target || 0;
            const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            return (
              <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface }]} onLongPress={() => handleDelete(item.id || item._id)}>
                <View style={styles.cardRow}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.incomeLight }]}><Ionicons name="flag" size={18} color={theme.income} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name || item.title || 'Goal'}</Text>
                    <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.income }]} /></View>
                    <Text style={[styles.progressText, { color: theme.textTertiary }]}>{pct.toFixed(0)}% completed</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: theme.text }]}>{formatCurrency(saved)}</Text>
                    <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>of {formatCurrency(target)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="flag-outline" size={48} color={theme.textTertiary} /><Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '500' }}>No goals yet</Text></View>}
        />
      }

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>New Goal</Text><TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity></View>
            {formError ? <View style={[styles.formError, { backgroundColor: theme.expenseLight }]}><Text style={{ color: theme.expense, fontSize: 13 }}>{formError}</Text></View> : null}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formName} onChangeText={setFormName} placeholder="e.g. Vacation Fund" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Target Amount</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formTarget} onChangeText={setFormTarget} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Saved So Far</Text>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={formSaved} onChangeText={setFormSaved} placeholder="0.00" placeholderTextColor={theme.textTertiary} keyboardType="decimal-pad" />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Create Goal</Text>}
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
  errorText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '500' },
  cardAmount: { fontSize: 15, fontWeight: '700' },
  cardSubtext: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  formError: { padding: 10, borderRadius: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
