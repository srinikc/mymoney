import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

const STEPS = [
  { title: 'Welcome & Profile', icon: 'sparkles' as const },
  { title: 'Connect Bank', icon: 'business' as const },
  { title: 'Budgets', icon: 'wallet' as const },
  { title: 'Goals', icon: 'flag' as const },
  { title: 'Risk Profile', icon: 'shield-checkmark' as const },
  { title: 'Done!', icon: 'checkmark-circle' as const },
];

const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Groceries',
];

const CURRENCIES = ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'];

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Profile
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR (₹)');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CATEGORIES.slice(0, 4));
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Step 3: Budgets
  const [budgets, setBudgets] = useState<Record<string, string>>({});

  // Step 4: Goals
  const [emergencyFund, setEmergencyFund] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');

  // Step 5: Risk profile
  const [riskScore] = useState<number | null>(null);

  useEffect(() => {
    api
      .get('/api/onboarding/status')
      .then((res) => {
        const data = res.data;
        if (data.completed) {
          setCompleted(true);
          router.replace('/');
        } else {
          if (data.hasName) setName(data.hasName);
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleNext = async () => {
    setSubmitting(true);
    try {
      if (currentStep === 0) {
        await api.post('/api/onboarding/complete', {
          name,
          currency: currency.replaceAll(/[^A-Z]/g, '') || 'INR',
          profileName: name || 'Default',
        });
      }

      if (currentStep === 2) {
        const budgetEntries = Object.entries(budgets).filter(
          ([, v]) => v && Number.parseFloat(v) > 0
        );
        if (budgetEntries.length > 0) {
          const catsRes = await api.get('/api/categories');
          const cats = catsRes.data;
          for (const [catName, amount] of budgetEntries) {
            const cat = cats.find((c: { id: number; name: string }) => c.name === catName);
            if (cat) {
              await api.post('/api/budgets', {
                categoryId: cat.id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                amount: Number.parseFloat(amount),
              });
            }
          }
        }
      }

      if (currentStep === 3) {
        if (Number.parseFloat(emergencyFund) > 0) {
          await api.post('/api/goals', {
            name: 'Emergency Fund',
            targetAmount: Number.parseFloat(emergencyFund),
            category: 'emergency',
          });
        }
        if (Number.parseFloat(savingsTarget) > 0) {
          await api.post('/api/goals', {
            name: 'Savings Target',
            targetAmount: Number.parseFloat(savingsTarget),
            category: 'savings',
          });
        }
      }

      if (currentStep === 4) {
        router.push('/risk-profile');
        return;
      }

      if (currentStep === STEPS.length - 1) {
        await api.post('/api/onboarding/welcome');
        router.replace('/');
        return;
      }

      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    } catch {
      // continue anyway
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="sparkles" size={40} color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Setting things up...
          </Text>
        </View>
      </View>
    );
  }

  if (completed) {
    return null;
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorRow}>
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        return (
          <View key={i} style={styles.stepDotWrap}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isActive
                    ? theme.primary
                    : isCompleted
                    ? theme.primary + '40'
                    : theme.border,
                  borderColor: isActive ? theme.primary : 'transparent',
                  borderWidth: isActive ? 2 : 0,
                },
              ]}
            >
              {isCompleted ? (
                <Ionicons name="checkmark" size={12} color="white" />
              ) : (
                <Ionicons
                  name={step.icon}
                  size={12}
                  color={isActive ? 'white' : theme.textTertiary}
                />
              )}
            </View>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: i < currentStep ? theme.primary : theme.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Your Name
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={theme.textTertiary}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Currency
            </Text>
            <TouchableOpacity
              style={[styles.select, { borderColor: theme.border }]}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <Text style={[styles.selectText, { color: theme.text }]}>{currency}</Text>
              <Ionicons name="chevron-down" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
            {showCurrencyPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.pickerItem,
                      currency === c && { backgroundColor: theme.primaryLight },
                    ]}
                    onPress={() => {
                      setCurrency(c);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: theme.text },
                        currency === c && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Default Categories
            </Text>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              Select categories you want to track by default
            </Text>
            <View style={styles.chipRow}>
              {DEFAULT_CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : 'transparent',
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? 'white' : theme.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.connectCard, { borderColor: theme.border }]}>
              <Ionicons name="business" size={48} color={theme.textTertiary} />
              <Text style={[styles.connectText, { color: theme.textSecondary }]}>
                Upload your bank statement (CSV or PDF) to automatically import your expenses.
              </Text>
              <Text style={[styles.connectHint, { color: theme.textTertiary }]}>
                You can also skip this step and set up later.
              </Text>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: theme.primary }]}
                onPress={() => router.push('/expenses/import')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={theme.primary} />
                <Text style={[styles.outlineBtnText, { color: theme.primary }]}>
                  Upload Statement
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.infoBox, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                <Text style={{ fontWeight: '700' }}>Supported formats:</Text>{' '}
                CSV (HDFC, ICICI, SBI, Axis), PDF bank statements, GPay transaction history, and more.
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              Set monthly budgets for your top spending categories (optional)
            </Text>
            {selectedCategories.length === 0 ? (
              <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
                No categories selected. Go back to step 1 to select categories.
              </Text>
            ) : (
              selectedCategories.map((cat) => (
                <View key={cat} style={styles.budgetRow}>
                  <Text style={[styles.budgetLabel, { color: theme.text }]}>{cat}</Text>
                  <TextInput
                    style={[styles.input, styles.budgetInput, { color: theme.text, borderColor: theme.border }]}
                    value={budgets[cat] || ''}
                    onChangeText={(v) => setBudgets((prev) => ({ ...prev, [cat]: v }))}
                    placeholder="Amount"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Emergency Fund Target
            </Text>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              Aim for 3-6 months of living expenses
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={emergencyFund}
              onChangeText={setEmergencyFund}
              placeholder="e.g., 100000"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 20 }]}>
              Savings Target
            </Text>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              Set a savings goal for the year
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={savingsTarget}
              onChangeText={setSavingsTarget}
              placeholder="e.g., 50000"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.fieldHint, { color: theme.textTertiary }]}>
              Take a quick risk profiling questionnaire to get personalized investment recommendations.
            </Text>
            <View style={[styles.riskCard, { borderColor: theme.border }]}>
              <View style={styles.riskCardRow}>
                <View style={[styles.riskIconWrap, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.riskCardTitle, { color: theme.text }]}>
                    Risk Profile Questionnaire
                  </Text>
                  <Text style={[styles.riskCardSub, { color: theme.textTertiary }]}>
                    5 questions to assess your risk tolerance
                  </Text>
                </View>
              </View>
              {riskScore !== null && (
                <View style={[styles.riskBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.riskBadgeText, { color: theme.primary }]}>
                    Score: {riskScore}/10
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="checkmark-circle" size={48} color={theme.primary} />
              </View>
              <Text style={[styles.doneTitle, { color: theme.text }]}>You&apos;re All Set!</Text>
              <Text style={[styles.doneText, { color: theme.textSecondary }]}>
                Your MyMoney account is ready. Head to your dashboard to start managing your
                finances!
              </Text>
            </View>
            <View style={styles.doneGrid}>
              <View style={[styles.doneCard, { borderColor: theme.border }]}>
                <Text style={[styles.doneCardLabel, { color: theme.textTertiary }]}>Profile</Text>
                <Text style={[styles.doneCardValue, { color: theme.text }]}>
                  {name || 'Default'}
                </Text>
              </View>
              <View style={[styles.doneCard, { borderColor: theme.border }]}>
                <Text style={[styles.doneCardLabel, { color: theme.textTertiary }]}>
                  Categories
                </Text>
                <Text style={[styles.doneCardValue, { color: theme.text }]}>
                  {selectedCategories.length} selected
                </Text>
              </View>
              {emergencyFund ? (
                <View style={[styles.doneCard, { borderColor: theme.border }]}>
                  <Text style={[styles.doneCardLabel, { color: theme.textTertiary }]}>
                    Emergency Fund
                  </Text>
                  <Text style={[styles.doneCardValue, { color: theme.text }]}>
                    {'\u20B9'}{emergencyFund}
                  </Text>
                </View>
              ) : null}
              {savingsTarget ? (
                <View style={[styles.doneCard, { borderColor: theme.border }]}>
                  <Text style={[styles.doneCardLabel, { color: theme.textTertiary }]}>
                    Savings Goal
                  </Text>
                  <Text style={[styles.doneCardValue, { color: theme.text }]}>
                    {'\u20B9'}{savingsTarget}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              Step {currentStep + 1} of {STEPS.length}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              {STEPS[currentStep].title}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Step Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.primaryLight }]}>
              <Ionicons
                name={STEPS[currentStep].icon}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {STEPS[currentStep].title}
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {currentStep === 0 && 'Set up your profile and preferences'}
                {currentStep === 1 && 'Connect your bank account or import data'}
                {currentStep === 2 && 'Set up monthly budgets for key categories'}
                {currentStep === 3 && 'Define your financial goals'}
                {currentStep === 4 && 'Complete the risk profiling questionnaire'}
                {currentStep === 5 && "You're all set! Let's get started"}
              </Text>
            </View>
          </View>

          {/* Step Body */}
          {renderStepContent()}
        </View>
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.footerLeft}>
          {currentStep > 0 && (
            <TouchableOpacity onPress={handleBack} style={styles.footerBtn}>
              <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
              <Text style={[styles.footerBtnText, { color: theme.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.footerRight}>
          {currentStep < STEPS.length - 1 && (
            <TouchableOpacity onPress={handleSkip} style={[styles.skipBtn, { borderColor: theme.border }]}>
              <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip</Text>
              <Ionicons name="play-skip-forward-outline" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={submitting}
            style={[styles.nextBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : currentStep === STEPS.length - 1 ? (
              <>
                <Ionicons name="grid" size={16} color="white" />
                <Text style={styles.nextBtnText}>Go to Dashboard</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '500' },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Progress
  progressSection: { marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '500' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  // Step indicator
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  stepDotWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, height: 3, marginHorizontal: 4, borderRadius: 2 },

  // Card
  card: { borderRadius: 20, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Step content
  stepContent: { gap: 4 },

  // Form fields
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  fieldHint: { fontSize: 12, marginBottom: 8, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
  select: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontSize: 15 },
  pickerDropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 10 },
  pickerItemText: { fontSize: 14 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Connect bank
  connectCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12 },
  connectText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  connectHint: { fontSize: 12, textAlign: 'center' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
  infoBox: { padding: 14, borderRadius: 12, marginTop: 12 },
  infoText: { fontSize: 12, lineHeight: 18 },

  // Budgets
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  budgetLabel: { fontSize: 14, fontWeight: '600', width: 120 },
  budgetInput: { flex: 1 },

  // Risk
  riskCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 12 },
  riskCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riskIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  riskCardTitle: { fontSize: 15, fontWeight: '600' },
  riskCardSub: { fontSize: 12, marginTop: 2 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },

  // Done
  doneWrap: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 22, fontWeight: '700' },
  doneText: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  doneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  doneCard: { borderWidth: 1, borderRadius: 12, padding: 14, width: '47%' },
  doneCardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  doneCardValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },

  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { flex: 1 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  footerBtnText: { fontSize: 14, fontWeight: '600' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  skipBtnText: { fontSize: 13, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  nextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
