import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { formatCurrency } from '../../utils/format';
import api from '../../api/client';

const BANK_TYPES = ['savings', 'current', 'salary', 'credit_card', 'loan'];

const TYPE_COLORS: Record<string, string> = {
  savings: '#10B981',
  current: '#3B82F6',
  salary: '#8B5CF6',
  credit_card: '#F59E0B',
  loan: '#EF4444',
};

export default function BankAccountsSettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formBank, setFormBank] = useState('');
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formType, setFormType] = useState('savings');
  const [formIfsc, setFormIfsc] = useState('');
  const [formBalance, setFormBalance] = useState('');

  const fetchAccounts = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/bank-accounts');
      setAccounts(res.data?.accounts || []);
    } catch { setError('Failed to load bank accounts'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSave = async () => {
    if (!formBank.trim()) { Alert.alert('Validation', 'Bank name is required'); return; }
    try {
      await api.post('/api/bank-accounts', {
        bankName: formBank,
        name: formName || formBank,
        accountNumber: formNumber,
        type: formType,
        ifscCode: formIfsc,
        balance: parseFloat(formBalance) || 0,
      });
      setShowForm(false);
      setFormBank(''); setFormName(''); setFormNumber(''); setFormType('savings'); setFormIfsc(''); setFormBalance('');
      fetchAccounts();
    } catch { Alert.alert('Error', 'Failed to save account'); }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Bank Account', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/api/bank-accounts/${id}`); fetchAccounts(); }
          catch { Alert.alert('Error', 'Failed to delete account'); }
        },
      },
    ]);
  };

  const maskNumber = (num: string) => {
    if (!num || num.length < 4) return num || '';
    return '••••' + num.slice(-4);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>Bank Accounts</Text>
        <TouchableOpacity onPress={() => setShowForm(true)} style={[styles.addBtn, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={fetchAccounts} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surface }]}
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: (TYPE_COLORS[item.type] || theme.primary) + '20' }]}>
                  <Ionicons name="business" size={18} color={TYPE_COLORS[item.type] || theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.bankName}</Text>
                  <Text style={[styles.cardSubtext, { color: theme.textTertiary }]}>
                    {item.name} · {maskNumber(item.accountNumber)}
                  </Text>
                  <View style={styles.cardBottomRow}>
                    <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + '20' }]}>
                      <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[item.type] || theme.primary }]}>
                        {item.type.replace('_', ' ')}
                      </Text>
                    </View>
                    <Text style={[styles.balanceText, { color: theme.text }]}>{formatCurrency(item.balance)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAccounts(); }} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No bank accounts configured</Text>
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Bank Account</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formBank} onChangeText={setFormBank} placeholder="Bank Name *" placeholderTextColor={theme.textTertiary} />
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="Account Name" placeholderTextColor={theme.textTertiary} />
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formNumber} onChangeText={setFormNumber} placeholder="Account Number" placeholderTextColor={theme.textTertiary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>Account Type</Text>
            <View style={styles.typeRow}>
              {BANK_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFormType(t)}
                  style={[styles.typeBtn, { backgroundColor: formType === t ? theme.primary : theme.background }]}
                >
                  <Text style={{ color: formType === t ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formIfsc} onChangeText={setFormIfsc} placeholder="IFSC Code" placeholderTextColor={theme.textTertiary} />
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text }]} value={formBalance} onChangeText={setFormBalance} keyboardType="numeric" placeholder="Balance (₹)" placeholderTextColor={theme.textTertiary} />
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.saveBtnText}>Save Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtext: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  balanceText: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 12 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
