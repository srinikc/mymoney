import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_MODES,
  formatCurrency,
  formatFullDate,
} from '../../utils/format';
import api from '../../api/client';

export default function CreateScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categories = transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleDateChange = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) {
      setDate(d);
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedCategory(null);
    setSelectedMode(null);
    setNotes('');
    setName('');
    setDate(new Date());
    setError(null);
  };

  const handleSave = async () => {
    setError(null);

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: numericAmount,
        category: selectedCategory,
        name: name || categories.find((c) => c.value === selectedCategory)?.label || '',
        notes,
        date: date.toISOString(),
        paymentMode: selectedMode || 'cash',
        type: transactionType,
      };

      if (transactionType === 'expense') {
        await api.post('/api/expenses', payload);
      } else {
        await api.post('/api/income/sources', payload);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (digit === '.' && amount.includes('.')) return;
    if (amount.length >= 12) return;
    setAmount((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Quick Add</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                transactionType === 'expense' && { backgroundColor: theme.expense },
              ]}
              onPress={() => { setTransactionType('expense'); setSelectedCategory(null); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up-circle"
                size={18}
                color={transactionType === 'expense' ? theme.white : theme.expense}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: transactionType === 'expense' ? theme.white : theme.expense },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                transactionType === 'income' && { backgroundColor: theme.income },
              ]}
              onPress={() => { setTransactionType('income'); setSelectedCategory(null); }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down-circle"
                size={18}
                color={transactionType === 'income' ? theme.white : theme.income}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: transactionType === 'income' ? theme.white : theme.income },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.amountCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>Amount</Text>
            <Text
              style={[
                styles.amountDisplay,
                {
                  color: amount
                    ? transactionType === 'expense'
                      ? theme.expense
                      : theme.income
                    : theme.textTertiary,
                },
              ]}
            >
              {amount ? formatCurrency(parseFloat(amount)) : '₹0'}
            </Text>
            <View style={[styles.amountInputRow, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                value={amount}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9.]/g, '');
                  if ((cleaned.match(/\./g) || []).length <= 1) {
                    setAmount(cleaned);
                  }
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name (Optional)</Text>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Add a short description"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor:
                        selectedCategory === cat.value
                          ? transactionType === 'expense'
                            ? theme.expense
                            : theme.income
                          : theme.surface,
                      borderColor: selectedCategory === cat.value ? 'transparent' : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={
                      selectedCategory === cat.value ? theme.white : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selectedCategory === cat.value ? theme.white : theme.textSecondary,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Date</Text>
            <TouchableOpacity
              style={[styles.datePicker, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.primary} />
              <Text style={[styles.dateText, { color: theme.text }]}>
                {formatFullDate(date.toISOString())}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {PAYMENT_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor:
                        selectedMode === mode.value ? theme.primary : theme.surface,
                      borderColor: selectedMode === mode.value ? 'transparent' : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedMode(mode.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mode.icon as any}
                    size={16}
                    color={selectedMode === mode.value ? theme.white : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selectedMode === mode.value ? theme.white : theme.textSecondary,
                      },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { color: theme.text, borderColor: theme.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.expenseLight }]}>
          <Ionicons name="alert-circle" size={16} color={theme.expense} />
          <Text style={[styles.errorBannerText, { color: theme.expense }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={16} color={theme.expense} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: transactionType === 'expense' ? theme.expense : theme.income },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.white} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={theme.white} />
              <Text style={styles.saveButtonText}>
                Save {transactionType === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showSuccess ? (
        <View style={styles.successToast}>
          <View style={[styles.successToastCard, { backgroundColor: theme.income }]}>
            <Ionicons name="checkmark-circle" size={22} color={theme.white} />
            <Text style={styles.successToastText}>Saved successfully!</Text>
          </View>
        </View>
      ) : null}

      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={[styles.dateModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dateModalTitle, { color: theme.text }]}>Select Date</Text>
            <View style={styles.dateQuickRow}>
              <TouchableOpacity
                style={[styles.dateQuickBtn, { backgroundColor: theme.background }]}
                onPress={() => { setDate(new Date()); setShowDatePicker(false); }}
              >
                <Text style={[styles.dateQuickText, { color: theme.text }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateQuickBtn, { backgroundColor: theme.background }]}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setDate(d);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[styles.dateQuickText, { color: theme.text }]}>Yesterday</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateNav}>
              <TouchableOpacity onPress={() => handleDateChange(-1)}>
                <Ionicons name="chevron-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <Text style={[styles.dateNavText, { color: theme.text }]}>
                {formatFullDate(date.toISOString())}
              </Text>
              <TouchableOpacity onPress={() => handleDateChange(0)}>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={date.toDateString() === new Date().toDateString() ? theme.textTertiary : theme.primary}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.dateDoneBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 12,
  },
  amountInputRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    width: '100%',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
  },
  inputCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  successToast: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  successToastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModal: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateQuickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateQuickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateQuickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dateNavText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateDoneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  dateDoneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
