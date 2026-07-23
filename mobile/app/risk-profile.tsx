import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

const CFG: Record<string, { label: string; color: string; icon: string }> = {
  conservative: { label: 'Conservative', color: '#3B82F6', icon: 'shield-checkmark' },
  moderate: { label: 'Moderate', color: '#F59E0B', icon: 'bar-chart' },
  aggressive: { label: 'Aggressive', color: '#10B981', icon: 'trending-up' },
};
const AC: Record<string, string> = { equity: '#6366f1', debt: '#f59e0b', gold: '#f97316', cash: '#22c55e' };

export default function RiskProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [questions, setQuestions] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchQ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/risk-profile');
      const data = res.data;
      const qs = data.questions || [];
      setQuestions(qs);
      setAnswers(Array.from({ length: qs.length }, () => 0));
    } catch { setError('Failed to load questions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQ(); }, [fetchQ]);

  const handleNext = () => {
    if (selected === null) return;
    const na = [...answers]; na[step] = selected; setAnswers(na);
    if (step < questions.length - 1) { setStep((s) => s + 1); setSelected(null); }
    else submitAnswers(na);
  };

  const handleBack = () => {
    if (step > 0) { setStep((s) => s - 1); setSelected(answers[step - 1] || null); }
  };

  const submitAnswers = async (fa: number[]) => {
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/api/risk-profile', { answers: fa });
      setResult(res.data);
    } catch { setError('Failed to calculate risk profile.'); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setResult(null); setStep(0); setAnswers(Array.from({ length: questions.length }, () => 0)); setSelected(null); setError('');
  };

  const progress = ((step + (result ? questions.length : 0)) / (questions.length || 1)) * 100;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      </View>
    );
  }

  if (result) {
    const c = CFG[result.profile] || CFG.conservative;
    const alloc = result.allocation || {};
    const allocItems = Object.entries(AC).filter(([k]) => alloc[k] !== undefined);

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Risk Profile</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: c.color + '40', borderWidth: 2 }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIcon, { backgroundColor: c.color + '20' }]}>
                <Ionicons name={c.icon as any} size={36} color={c.color} />
              </View>
              <View>
                <View style={[styles.profileBadge, { backgroundColor: c.color + '20' }]}>
                  <Text style={[styles.profileBadgeText, { color: c.color }]}>{c.label}</Text>
                </View>
                <Text style={[styles.scoreText, { color: theme.textSecondary }]}>Score: {result.totalScore} / {result.maxScore}</Text>
              </View>
            </View>
            <Text style={[styles.summary, { color: theme.textSecondary }]}>{result.summary}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Allocation</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{(alloc.description || '')}</Text>
            <View style={styles.barContainer}>
              <View style={styles.bar}>
                {allocItems.map(([k]) => (
                  <View key={k} style={[styles.barSegment, { flex: alloc[k], backgroundColor: AC[k] }]} />
                ))}
              </View>
            </View>
            <View style={styles.legend}>
              {allocItems.map(([k]) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: AC[k] }]} />
                  <Text style={[styles.legendLabel, { color: theme.textTertiary }]}>{k}</Text>
                  <Text style={[styles.legendValue, { color: theme.text }]}>{alloc[k]}%</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={reset} style={[styles.outlineBtn, { borderColor: theme.border }]}>
              <Ionicons name="refresh" size={18} color={theme.text} />
              <Text style={[styles.outlineBtnText, { color: theme.text }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/health')} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text style={styles.primaryBtnText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const q = questions[step];
  if (!q) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense }]}>No questions available</Text>
          <TouchableOpacity onPress={fetchQ} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Risk Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>Q{step + 1} of {questions.length}</Text>
          <Text style={[styles.progressPct, { color: theme.primary }]}>{Math.round(progress)}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
        </View>

        <Text style={[styles.question, { color: theme.text }]}>{q.question}</Text>
        <View style={styles.options}>
          {q.options.map((o: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                { borderColor: selected === o.score ? theme.primary : theme.border, backgroundColor: selected === o.score ? theme.primaryLight : 'transparent' },
              ]}
              onPress={() => setSelected(o.score)}
            >
              <View style={[styles.radio, { borderColor: selected === o.score ? theme.primary : theme.textTertiary }]}>
                {selected === o.score && <View style={[styles.radioFill, { backgroundColor: theme.primary }]} />}
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}

        <View style={styles.navRow}>
          <TouchableOpacity onPress={handleBack} disabled={step === 0} style={[styles.navBtn, { opacity: step === 0 ? 0.4 : 1 }]}>
            <Ionicons name="arrow-back" size={18} color={theme.text} />
            <Text style={[styles.navBtnText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            disabled={selected === null || submitting}
            style={[styles.nextBtn, { backgroundColor: theme.primary, opacity: selected === null ? 0.5 : 1 }]}
          >
            <Text style={styles.nextBtnText}>
              {submitting ? 'Calculating...' : step < questions.length - 1 ? 'Next' : 'See Results'}
            </Text>
            {!submitting && <Ionicons name="arrow-forward" size={18} color="white" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  content: { padding: 20, flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, fontWeight: '500' },
  progressPct: { fontSize: 13, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 24 },
  progressFill: { height: '100%', borderRadius: 4 },
  question: { fontSize: 17, fontWeight: '600', marginBottom: 20, lineHeight: 24 },
  options: { gap: 10 },
  option: { borderRadius: 12, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  error: { fontSize: 13, marginTop: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 20 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  nextBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  resultCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  profileBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  profileBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  scoreText: { fontSize: 13, marginTop: 4 },
  summary: { fontSize: 14, lineHeight: 20, marginTop: 14 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 16 },
  barContainer: { marginBottom: 16 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  barSegment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '45%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '500', flex: 1, textTransform: 'capitalize' },
  legendValue: { fontSize: 13, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, justifyContent: 'center' },
  primaryBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
