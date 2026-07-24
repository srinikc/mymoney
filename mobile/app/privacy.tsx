import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: theme.textTertiary }]}>Last updated: July 2026</Text>

        <Section theme={theme} title="1. Information We Collect">
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>MyMoney collects the following data to provide personal finance management:</Text>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Account data:</Text> Email address, name, and hashed password (if using email sign-in).</Bullet>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Financial data:</Text> Income sources, expenses, budgets, goals, investments, insurance policies, loans, assets, liabilities, subscriptions, and tax documents you enter.</Bullet>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Transaction data:</Text> Bank CSV/PDF files you upload for import, GPay transaction history from Google Takeout exports, and Gmail financial email metadata.</Bullet>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Device data:</Text> Platform type (Android/iOS) for push notifications, biometric authentication status (no biometric data stored).</Bullet>
        </Section>

        <Section theme={theme} title="2. How We Use Your Data">
          <Bullet theme={theme}>Display your financial dashboard, reports, and insights.</Bullet>
          <Bullet theme={theme}>Calculate financial health scores, tax estimates, and projections.</Bullet>
          <Bullet theme={theme}>Send push notifications for reminders and alerts (opt-in).</Bullet>
          <Bullet theme={theme}>Match expenses to income sources via auto-linking (user-confirmed only).</Bullet>
          <Bullet theme={theme}>AI chatbot uses your financial context to answer questions (no data is used for training).</Bullet>
        </Section>

        <Section theme={theme} title="3. Data Storage & Security">
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            All data is stored in your own PostgreSQL database. We use industry-standard encryption (SSL/TLS) for data in transit. API keys (OpenAI, Claude, broker integrations) are stored encrypted. We do not sell, share, or transmit your financial data to any third party except as required by law or as explicitly authorized by you (e.g., broker OAuth connections).
          </Text>
        </Section>

        <Section theme={theme} title="4. Google API & User Data">
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            MyMoney uses Google APIs (Drive read-only, Gmail read-only) solely for importing your financial data. We do not share Google user data with any third party. Access can be revoked at any time via Google Account permissions. Our use of this data complies with Google API Services User Data Policy.
          </Text>
        </Section>

        <Section theme={theme} title="5. Third-Party Services">
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>MyMoney optionally integrates with third-party services you explicitly authorize:</Text>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>OpenAI / Anthropic:</Text> AI chatbot queries (your API key, no data shared otherwise).</Bullet>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Zerodha / Sharekhan:</Text> Broker portfolio sync (via OAuth, read-only).</Bullet>
          <Bullet theme={theme}><Text style={{ fontWeight: '600' }}>Resend:</Text> Welcome emails (email address only).</Bullet>
        </Section>

        <Section theme={theme} title="6. Your Rights">
          <Bullet theme={theme}>Export your data at any time from the Reports page.</Bullet>
          <Bullet theme={theme}>Delete your account and all associated data.</Bullet>
          <Bullet theme={theme}>Revoke Google/Gmail/Drive access via your Google Account settings.</Bullet>
        </Section>

        <Section theme={theme} title="7. Contact">
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            For privacy concerns, open an issue at github.com/srinikc/mymoney or contact the repository owner.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ theme, title, children }: { theme: any; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ theme, children }: { theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{children}</Text>
    </View>
  );
}

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  lastUpdated: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  bullet: { flexDirection: 'row', marginBottom: 6, paddingRight: 16 },
  bulletDot: { fontSize: 14, marginRight: 8, lineHeight: 20 },
  bulletText: { fontSize: 14, lineHeight: 20, flex: 1 },
});
