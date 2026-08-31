import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Colors } from '../../constants/Colors';
import { BASE_URL } from '../../api/client';

export default function ImportScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const openWeb = (path: string) =>
    Linking.openURL(`${BASE_URL}${path}`).catch(() => {});

  const options = [
    {
      icon: 'document-text' as const,
      title: 'Upload Spreadsheet (.xlsx)',
      subtitle: 'Import your expense workbook',
      path: '/expenses/import',
    },
    {
      icon: 'phone-portrait' as const,
      title: 'GPay / Google Takeout',
      subtitle: 'Upload takeout JSON, ZIP, or HTML, or refresh from Drive',
      path: '/expenses/import',
    },
    {
      icon: 'file-tray-full' as const,
      title: 'Bank Analysis',
      subtitle: 'Recover GPAY note text from bank statements',
      path: '/expenses?bank=1',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Import Expenses</Text>
      </View>

      <View style={styles.hint}>
        <Ionicons name="cloud-outline" size={20} color={theme.textTertiary} />
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          File uploads run on the web app. Choose an import below to open it in your browser.
        </Text>
      </View>

      {options.map((opt) => (
        <TouchableOpacity
          key={opt.title}
          style={[styles.card, { backgroundColor: theme.surface }]}
          onPress={() => openWeb(opt.path)}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name={opt.icon} size={18} color={theme.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{opt.title}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>{opt.subtitle}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={theme.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, marginHorizontal: 16, marginTop: 16, borderRadius: 12 },
  hintText: { flex: 1, fontSize: 13, fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 },
  cardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});