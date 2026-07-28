import { View, Text, ScrollView, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useState } from 'react';

const SECTIONS = [
  {
    title: 'Getting Started',
    icon: 'rocket-outline',
    content: 'Track your income and expenses, set budgets, and manage your financial goals. Add transactions manually or import them from bank statements, Gmail, or GPay.',
  },
  {
    title: 'Income & Expenses',
    icon: 'wallet-outline',
    content: 'Log your income sources and daily expenses. Categorize transactions, set payment modes, and attach receipts. Use the calendar view to track spending patterns.',
  },
  {
    title: 'Budgets & Goals',
    icon: 'flag-outline',
    content: 'Set monthly budgets by category and track your progress. Create financial goals with target amounts and deadlines to save for what matters.',
  },
  {
    title: 'Investments & Assets',
    icon: 'trending-up-outline',
    content: 'Track your investments, fixed deposits, and other assets. Monitor your portfolio performance and get insights on diversification.',
  },
  {
    title: 'Tax Management',
    icon: 'calculator-outline',
    content: 'Upload Form 16, track ITR filings, and estimate your tax liability. Get tax optimization suggestions based on your income and investments.',
  },
  {
    title: 'Net Worth',
    icon: 'cash-outline',
    content: 'View your complete financial picture with assets minus liabilities. Track your net worth over time with interactive charts.',
  },
  {
    title: 'Automation',
    icon: 'flash-outline',
    content: 'Auto-import transactions from Gmail, GPay, and bank accounts. Set up recurring transactions and get budget alerts automatically.',
  },
  {
    title: 'AI Advisor',
    icon: 'bulb-outline',
    content: 'Ask the AI chatbot questions about your finances, get spending insights, and receive personalized recommendations.',
  },
];

export default function GuideScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Guide</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Learn how to use MyMoney</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <TouchableOpacity
            key={section.title}
            style={[styles.card, { backgroundColor: theme.surface }]}
            onPress={() => setExpanded(expanded === section.title ? null : section.title)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name={section.icon as keyof typeof Ionicons.glyphMap} size={20} color={theme.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{section.title}</Text>
              <Ionicons
                name={expanded === section.title ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.textTertiary}
              />
            </View>
            {expanded === section.title && (
              <Text style={[styles.cardContent, { color: theme.textSecondary }]}>
                {section.content}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },
  content: { padding: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  cardContent: { fontSize: 13, lineHeight: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
});
