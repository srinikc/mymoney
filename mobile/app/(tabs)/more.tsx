import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/Colors';
import api from '../../api/client';

// Known Drive file IDs already imported/seen this session, so a sync that is
// interrupted and retried does not re-import the same export.
const knownGpayFileIds = new Set<string>();

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
      { title: 'Subscriptions', icon: 'refresh-outline', route: '/subscriptions' },
      { title: 'Expenses', icon: 'receipt-outline', route: '/expenses' },
      { title: 'Expenses — Archive', icon: 'archive-outline', route: '/expenses/archive' },
      { title: 'Expenses — Import', icon: 'cloud-upload-outline', route: '/expenses/import' },
      { title: 'Expenses — Vendors', icon: 'storefront-outline', route: '/expenses/vendors' },
      { title: 'Expenses — Duplicates', icon: 'copy-outline', route: '/expenses/review-duplicates' },
      { title: 'Deals', icon: 'pricetag-outline', route: '/deals' },
    ],
  },
  {
    title: 'Assets & Liabilities',
    items: [
      { title: 'Bank Accounts', icon: 'business-outline', route: '/bank-accounts' },
      { title: 'Assets', icon: 'diamond-outline', route: '/assets' },
      { title: 'Loans', icon: 'card-outline', route: '/loans' },
    ],
  },
  {
    title: 'Protection',
    items: [
      { title: 'Insurance', icon: 'shield-checkmark-outline', route: '/insurance' },
      { title: 'Reminders', icon: 'notifications-outline', route: '/reminders' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { title: 'Reports', icon: 'document-text-outline', route: '/reports' },
      { title: 'Insights', icon: 'analytics-outline', route: '/insights' },
      { title: 'Financial Health', icon: 'heart-outline', route: '/health' },
      { title: 'Tax Summary', icon: 'calculator-outline', route: '/tax' },
      { title: 'Risk Profile', icon: 'shield-checkmark-outline', route: '/risk-profile' },
      { title: 'What-If Simulator', icon: 'trending-up-outline', route: '/what-if' },
      { title: 'Audit Log', icon: 'document-text-outline', route: '/audit-log' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { title: 'GPay Sync', icon: 'logo-google', route: 'gpay' },
      { title: 'Gmail Import', icon: 'mail-outline', route: '/gmail-import' },
      { title: 'Auto-Link', icon: 'link-outline', route: '/auto-link' },
      { title: 'Broker Integrations', icon: 'trending-up-outline', route: '/settings/integrations' },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Family Sharing', icon: 'people-outline', route: '/family' },
      { title: 'Plans', icon: 'diamond-outline', route: '/plans' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'Settings', icon: 'settings-outline', route: '/settings' },
      { title: 'API Keys', icon: 'key-outline', route: '/api-keys' },
      { title: 'Gmail Keywords', icon: 'mail-outline', route: '/gmail-parser' },
      { title: 'Bank Accounts', icon: 'business-outline', route: '/settings/bank-accounts' },
      { title: 'Session Link', icon: 'link-outline', route: '/settings/session-link' },
      { title: 'Privacy Policy', icon: 'shield-outline', route: '/privacy' },
      { title: 'Help & Guide', icon: 'help-circle-outline', route: '/guide' },
    ],
  },
];

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [, setGpayLoading] = useState(false);

  const handleGpaySync = async () => {
    setGpayLoading(true);
    try {
      const res = await api.post('/api/refresh-gpay');
      const jobId = res.data?.jobId;
      if (!jobId) {
        Alert.alert('GPay Sync', 'Could not start the GPay export. Check that Playwright and Chrome are installed on the server.');
        return;
      }
      // Poll the job until it settles, matching the web app behavior.
      const maxAttempts = 60;
      let autoCreated = false;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusRes = await api.get(`/api/refresh-gpay?jobId=${jobId}`);
        const status = statusRes.data?.job?.status;
        if (status === 'export_created' || status === 'already_in_progress') {
          autoCreated = status === 'export_created';
          break;
        }
        if (status === 'auth_required') {
          Alert.alert(
            'GPay Sync',
            'Your Google session has expired. Re-authenticate from the web app (Expenses → Refresh GPay → Re-authenticate), then try again.'
          );
          return;
        }
        if (status === 'failed' || status === 'reauth_failed') {
          Alert.alert('GPay Sync', `The export failed. ${statusRes.data?.job?.error || ''}`.trim());
          return;
        }
      }
      if (!autoCreated) {
        Alert.alert('GPay Sync', 'Timed out while waiting for the export. Check the web app for details.');
        return;
      }
      // Export created — watch Drive for the file and import it, like the web app.
      const imported = await pollDriveForImport();
      if (imported) return;
      Alert.alert(
        'GPay Sync',
        'Google is creating the export. It will be delivered to your Google Drive and auto-imported shortly. Open the web app (Expenses → Refresh GPay) to watch progress.'
      );
    } catch {
      Alert.alert('GPay Sync', 'Please export from Google Takeout and import via the web app.');
    } finally {
      setGpayLoading(false);
    }
  };

  // Google Takeout delivers TWO zips per export: a small index zip (only
  // archive_browser.html, NO GPay data) and the real data zip (contains
  // My Activity.html with the transactions). Picking the first .zip often
  // grabs the empty index file, so choose the candidate with the most bytes —
  // the real data zip is always much larger than the index zip.
  const pickBestGpayFile = (
    files: { id: string; name: string; size?: string; createdTime?: string }[]
  ): { id: string; name: string; size?: string; createdTime?: string } | null => {
    // Only treat files created recently (fresh exports from a just-triggered
    // Takeout request) as import candidates. Older exports were already
    // imported and must not be re-flagged after an app restart.
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    const candidates = files.filter(
      (f) =>
        (f.name === 'MyActivity.html' || f.name.endsWith('.zip')) &&
        !knownGpayFileIds.has(f.id) &&
        (f.createdTime ? new Date(f.createdTime).getTime() > cutoff : true)
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, f) => {
      const bestSize = Number(best.size) || 0;
      const size = Number(f.size) || 0;
      if (size > bestSize) return f;
      if (size === bestSize && (f.name === 'MyActivity.html' || best.name !== 'MyActivity.html')) return f;
      return best;
    });
  };

  // Poll Drive every 15s (up to ~15 min) for a new GPay file and import it.
  const pollDriveForImport = async (): Promise<boolean> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 15000));
      let attemptedId: string | null = null;
      try {
        const listRes = await api.get('/api/drive/list');
        const files = listRes.data?.files || [];
        const newFile = pickBestGpayFile(files);
        if (newFile) {
          attemptedId = newFile.id;
          const importRes = await api.post('/api/drive/import', { fileId: newFile.id });
          const result = importRes.data || {};
          const importedCount = result.imported || 0;
          const skippedCount = result.skipped || 0;
          if (importedCount > 0) {
            const created = newFile.createdTime
              ? ` (export created ${new Date(newFile.createdTime).toLocaleString()})`
              : '';
            Alert.alert(
              'GPay Sync',
              `Imported ${importedCount} new GPay transaction${importedCount === 1 ? '' : 's'}${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}${created}.`
            );
            return true;
          }
          // No new records — the file may be the small index zip or an already
          // imported export. Mark it known and keep polling for the real data zip.
          knownGpayFileIds.add(newFile.id);
        }
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        const respData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data || {};
        if (status === 401) {
          Alert.alert(
            'GPay Sync',
            'Your Google Drive connection has expired. Reconnect it in the web app (Settings → Google Account), then try Refresh GPay again.'
          );
          return true;
        }
        if (status && status >= 500) {
          // Real import failure — surface it, stop polling, and do NOT drop the
          // file (keep it retryable instead of silently losing the import).
          if (attemptedId) knownGpayFileIds.delete(attemptedId);
          Alert.alert(
            'GPay Sync',
            `Import failed: ${String(respData.errorDetail || respData.error || 'Server error')}. Open the web app (Expenses → Refresh GPay) to see the details.`
          );
          return true;
        }
        if (status === 400 && // Unrecognized file (index zip) — skip it and keep polling.
          attemptedId) knownGpayFileIds.add(attemptedId);
      }
    }
    return false;
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

        {user?.role === 'admin' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Admin</Text>
            <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin' as never)} activeOpacity={0.6}>
                <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                </View>
                <Text style={[styles.menuLabel, { color: theme.text }]}>Admin Panel</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight }]} onPress={() => router.push('/environment' as never)} activeOpacity={0.6}>
                <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="server-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.menuLabel, { color: theme.text }]}>Environment</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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
                  onPress={() => item.route === 'gpay' ? handleGpaySync() : router.push(item.route as never)}
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
