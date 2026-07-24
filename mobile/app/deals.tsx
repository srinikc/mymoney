import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { formatDate } from '../utils/format';
import api from '../api/client';

export default function DealsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ merchant: '', title: '', description: '', discount: '', couponCode: '', url: '', validUntil: '', category: '' });
  const [formLoading, setFormLoading] = useState(false);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/deals');
      setDeals(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Failed to load deals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openAdd = () => {
    setForm({ merchant: '', title: '', description: '', discount: '', couponCode: '', url: '', validUntil: '', category: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.merchant.trim() || !form.title.trim()) {
      Alert.alert('Validation', 'Merchant and Title are required');
      return;
    }
    setFormLoading(true);
    try {
      await api.post('/api/deals', form);
      setShowForm(false);
      fetch();
    } catch {
      Alert.alert('Error', 'Failed to save deal');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Deal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/api/deals', { data: { id } });
            fetch();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const categoryColors: Record<string, string> = {
    food: '#F59E0B', shopping: '#8B5CF6', travel: '#3B82F6',
    entertainment: '#EC4899', electronics: '#10B981',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Deals</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetch} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.cardMerchant, { color: theme.textSecondary }]}>{item.merchant}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={theme.expense} />
                </TouchableOpacity>
              </View>
              {item.description ? (
                <Text style={[styles.description, { color: theme.textSecondary }]}>{item.description}</Text>
              ) : null}
              <View style={styles.badges}>
                {item.discount ? (
                  <View style={[styles.badge, { backgroundColor: theme.warningLight }]}>
                    <Text style={[styles.badgeText, { color: theme.warning }]}>{item.discount} OFF</Text>
                  </View>
                ) : null}
                {item.couponCode ? (
                  <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{item.couponCode}</Text>
                  </View>
                ) : null}
                {item.category ? (
                  <View style={[styles.badge, { backgroundColor: categoryColors[item.category] + '20' }]}>
                    <Text style={[styles.badgeText, { color: categoryColors[item.category] || theme.primary }]}>{item.category}</Text>
                  </View>
                ) : null}
              </View>
              {item.validUntil ? (
                <Text style={[styles.validity, { color: theme.textTertiary }]}>Valid till {formatDate(item.validUntil)}</Text>
              ) : null}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No deals yet</Text>
              <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.emptyBtnText}>Add Deal</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Deal</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.merchant} onChangeText={(v) => setForm({ ...form, merchant: v })} placeholder="Merchant" placeholderTextColor={theme.textTertiary} />
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Title" placeholderTextColor={theme.textTertiary} />
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Description" placeholderTextColor={theme.textTertiary} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border }]} value={form.discount} onChangeText={(v) => setForm({ ...form, discount: v })} placeholder="Discount" placeholderTextColor={theme.textTertiary} />
              <View style={{ width: 10 }} />
              <TextInput style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border }]} value={form.couponCode} onChangeText={(v) => setForm({ ...form, couponCode: v })} placeholder="Coupon Code" placeholderTextColor={theme.textTertiary} />
            </View>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={form.url} onChangeText={(v) => setForm({ ...form, url: v })} placeholder="URL" placeholderTextColor={theme.textTertiary} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border }]} value={form.validUntil} onChangeText={(v) => setForm({ ...form, validUntil: v })} placeholder="Valid until (YYYY-MM-DD)" placeholderTextColor={theme.textTertiary} />
              <View style={{ width: 10 }} />
              <TextInput style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border }]} value={form.category} onChangeText={(v) => setForm({ ...form, category: v })} placeholder="Category" placeholderTextColor={theme.textTertiary} />
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={formLoading}>
              {formLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Deal</Text>}
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
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  listContent: { padding: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMerchant: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  deleteBtn: { padding: 4 },
  description: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  validity: { fontSize: 11, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
