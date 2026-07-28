import { useState } from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import api from '../api/client';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/format';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickCaptureModal({ visible, onClose, onSaved }: Props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [mode, setMode] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = mode === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Error', 'Please enter a valid amount'); return; }
    setSaving(true);
    try {
      if (mode === 'expense') {
        await api.post('/api/expenses', {
          amount: parseFloat(amount),
          category: category || 'Other',
          description: description || `${category || 'Other'} expense`,
          date: new Date().toISOString(),
          paymentMode: 'UPI',
        });
      } else {
        await api.post('/api/income/sources', {
          name: description || `${category || 'Income'} income`,
          amount: parseFloat(amount),
          type: 'monthly',
          sourceCategory: category || 'Other',
          paymentMode: 'Bank Transfer',
          startDate: new Date().toISOString().split('T')[0],
        });
      }
      setAmount(''); setCategory(''); setDescription('');
      onSaved();
      onClose();
    } catch { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Quick Capture</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.textTertiary} /></TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity onPress={() => setMode('expense')} style={[styles.modeBtn, mode === 'expense' && { backgroundColor: theme.expense }]}>
              <Ionicons name="arrow-down" size={16} color={mode === 'expense' ? '#fff' : theme.expense} />
              <Text style={[styles.modeText, { color: mode === 'expense' ? '#fff' : theme.expense }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('income')} style={[styles.modeBtn, mode === 'income' && { backgroundColor: theme.income }]}>
              <Ionicons name="arrow-up" size={16} color={mode === 'income' ? '#fff' : theme.income} />
              <Text style={[styles.modeText, { color: mode === 'income' ? '#fff' : theme.income }]}>Income</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.amountRow, { backgroundColor: theme.background }]}>
              <Text style={[styles.currency, { color: theme.text }]}>₹</Text>
              <TextInput
                value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0"
                placeholderTextColor={theme.textTertiary}
                style={[styles.amountInput, { color: theme.text }]}
                autoFocus
              />
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.slice(0, 8).map((cat) => (
                <TouchableOpacity
                  key={cat.value} onPress={() => setCategory(category === cat.value ? '' : cat.value)}
                  style={[styles.categoryBtn, { backgroundColor: category === cat.value ? theme.primary : theme.background }]}
                >
                  <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={18} color={category === cat.value ? '#fff' : theme.primary} />
                  <Text style={[styles.categoryLabel, { color: category === cat.value ? '#fff' : theme.text }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              value={description} onChangeText={setDescription} placeholder="Optional note"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />

            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: mode === 'expense' ? theme.expense : theme.income }]}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save {mode === 'expense' ? 'Expense' : 'Income'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  modeText: { fontSize: 14, fontWeight: '600' },
  amountRow: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  currency: { fontSize: 28, fontWeight: '300', marginRight: 8 },
  amountInput: { fontSize: 32, fontWeight: '800', flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '500' },
  input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
});
