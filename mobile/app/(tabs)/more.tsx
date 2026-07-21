import { ScrollView, View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

interface MenuItem {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Money Management',
    items: [
      { title: 'Income Sources', icon: 'cash-outline', route: '/income' },
      { title: 'Budgets', icon: 'wallet-outline', route: '/budgets' },
      { title: 'Goals', icon: 'flag-outline', route: '/goals' },
      { title: 'Investments', icon: 'trending-up-outline', route: '/investments' },
      { title: 'Net Worth', icon: 'bar-chart-outline', route: '/net-worth' },
    ],
  },
  {
    title: 'Assets & Liabilities',
    items: [
      { title: 'Assets', icon: 'diamond-outline', route: '/assets' },
      { title: 'Loans', icon: 'card-outline', route: '/loans' },
    ],
  },
  {
    title: 'Protection',
    items: [
      { title: 'Insurance', icon: 'shield-checkmark-outline', route: '/insurance' },
      { title: 'Subscriptions', icon: 'refresh-outline', route: '/subscriptions' },
      { title: 'Reminders', icon: 'notifications-outline', route: '/reminders' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'GPay Sync', icon: 'logo-google', route: 'gpay' },
      { title: 'Gmail Import', icon: 'mail-outline', route: '/gmail-import' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { title: 'Reports', icon: 'document-text-outline', route: '/reports' },
      { title: 'Tax Summary', icon: 'calculator-outline', route: '/tax' },
      { title: 'Auto-Link', icon: 'link-outline', route: '/auto-link' },
      { title: 'Settings', icon: 'settings-outline', route: '/settings' },
    ],
  },
];

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [gpayLoading, setGpayLoading] = useState(false);

  const handleGpaySync = async () => {
    setGpayLoading(true);
    try {
      const res = await api.post('/api/refresh-gpay');
      Alert.alert('GPay Sync', `Sync started! Job ID: ${res.data?.jobId || 'pending'}\nCheck back in a few minutes.`);
    } catch {
      // Fallback: use the import endpoint for manual file
      Alert.alert('GPay Sync', 'Please export from Google Takeout and import via the web app.');
    } finally {
      setGpayLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const getName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>More</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.profileCard, { backgroundColor: theme.surface }]} activeOpacity={0.7}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="person" size={28} color={theme.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{getName()}</Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
              {user?.email || 'user@example.com'}
            </Text>
          </View>
          {user?.tier ? (
            <View style={[styles.tierBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.tierText, { color: theme.primary }]}>{user.tier}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
        </TouchableOpacity>

        {MENU_SECTIONS.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={iIdx}
                  style={[
                    styles.menuItem,
                    iIdx < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight },
                  ]}
                  onPress={() => item.route === 'gpay' ? handleGpaySync() : router.push(item.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name={item.icon} size={18} color={theme.primary} />
                  </View>
                  <Text style={[styles.menuLabel, { color: theme.text }]}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.surface }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.expense} />
          <Text style={[styles.logoutText, { color: theme.expense }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.textTertiary }]}>MyMoney v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: '500',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
});
