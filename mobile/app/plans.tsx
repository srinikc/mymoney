import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/Colors';
import api from '../api/client';
import Toast from '../components/ui/Toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  profiles: number;
  features: string[];
}

const PLANS: Plan[] = [
  { id: 'free', name: 'Free', price: 0, profiles: 1, features: ['Basic tracking', 'Manual import'] },
  { id: 'pro', name: 'Pro', price: 499, profiles: 3, features: ['Everything in Free', 'AI insights', 'Gmail parsing', 'Auto-linking', 'Tax optimization', 'What-if simulator', 'LLM Chatbot (50/mo)'] },
  { id: 'enterprise', name: 'Enterprise', price: 1999, profiles: 10, features: ['Everything in Pro', 'Unlimited LLM', 'Admin console', 'Account Aggregator', 'Dedicated support'] },
];

export default function PlansScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const currentTier = user?.tier || 'free';
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleUpgrade = useCallback(async (planId: string) => {
    if (planId === 'free') return;
    setLoading(planId);

    try {
      const res = await api.post('/api/payments/create-order', { plan: planId });
      const { orderId } = res.data;

      const checkoutUrl = `${api.defaults.baseURL}/api/payments/mobile-checkout?orderId=${orderId}`;
      const result = await WebBrowser.openBrowserAsync(checkoutUrl);

      if (result.type === 'opened') {
        showToast(`Upgraded to ${PLANS.find(p => p.id === planId)?.name}!`);
        const meRes = await api.get('/api/auth/me');
        if (meRes.data?.tier) {
          setUser({ ...user, tier: meRes.data.tier } as any);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Payment failed', 'error');
    } finally {
      setLoading(null);
    }
  }, [user, setUser]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Pricing Plans</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Choose the plan that fits your needs</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isLoading = loading === plan.id;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.card,
                { backgroundColor: theme.surface },
                isCurrent && { borderColor: theme.primary, borderWidth: 2 },
              ]}
              activeOpacity={1}
              disabled
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: theme.primaryLight }]}>
                      <Text style={[styles.currentBadgeText, { color: theme.primary }]}>Current</Text>
                    </View>
                  )}
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: theme.text }]}>
                    {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={[styles.pricePeriod, { color: theme.textSecondary }]}> /month</Text>
                  )}
                </View>
                <Text style={[styles.profiles, { color: theme.textSecondary }]}>
                  {plan.profiles} profile{plan.profiles > 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.featureList}>
                {plan.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              {plan.id !== 'free' && (
                <TouchableOpacity
                  style={[
                    styles.upgradeBtn,
                    { backgroundColor: isCurrent ? theme.primaryLight : theme.primary },
                    isLoading && { opacity: 0.6 },
                  ]}
                  onPress={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.white} size="small" />
                  ) : (
                    <Text style={[styles.upgradeText, { color: isCurrent ? theme.primary : theme.white }]}>
                      {isCurrent ? 'Current Plan' : 'Upgrade'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { marginBottom: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planName: { fontSize: 20, fontWeight: '700' },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 36, fontWeight: '800' },
  pricePeriod: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  profiles: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  featureList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontWeight: '500', flex: 1 },
  upgradeBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  upgradeText: { fontSize: 15, fontWeight: '700' },
});
