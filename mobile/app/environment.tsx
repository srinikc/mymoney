import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../store/auth';
import api from '../api/client';

interface EnvVarDef {
  key: string;
  label: string;
  description: string;
  sensitive: boolean;
  editable: boolean;
}

interface EnvVarInfo {
  value?: string;
  envValue?: string;
}

export default function EnvironmentScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();

  const [vars, setVars] = useState<Record<string, EnvVarInfo>>({});
  const [definitions, setDefinitions] = useState<EnvVarDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setForbidden(true);
      setLoading(false);
      return;
    }
    api.get('/api/settings/environment')
      .then((r) => {
        setVars(r.data?.vars || {});
        const defs = r.data?.definitions || [];
        setDefinitions(defs);
        const ov: Record<string, string> = {};
        for (const d of defs) if (d.editable) ov[d.key] = r.data?.vars[d.key]?.value || '';
        setOverrides(ov);
      })
      .catch((err) => {
        if (err?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/environment', { vars: overrides });
      Alert.alert('Saved', 'Environment overrides saved');
    } catch {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></View>;

  if (forbidden) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Environment</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color={theme.expense} />
          <Text style={[styles.forbiddenText, { color: theme.textSecondary }]}>Admin access required</Text>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Environment</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.textTertiary }]}>View and override environment configuration.</Text>
        {definitions.map((def) => {
          const info: EnvVarInfo = vars[def.key] || {};
          return (
            <View key={def.key} style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, { color: theme.text }]}>{def.label}</Text>
                <View style={[styles.badge, { backgroundColor: def.editable ? theme.incomeLight : theme.border }]}>
                  <Text style={[styles.badgeText, { color: def.editable ? theme.income : theme.textTertiary }]}>{def.editable ? 'Overridable' : 'Boot only'}</Text>
                </View>
              </View>
              <Text style={[styles.cardDesc, { color: theme.textTertiary }]}>{def.description}</Text>
              {def.editable ? (
                <View style={[styles.inputRow, { borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={overrides[def.key] || ''}
                    onChangeText={(v) => setOverrides((prev) => ({ ...prev, [def.key]: v }))}
                    placeholder={def.sensitive ? '********' : info.envValue || 'not set'}
                    placeholderTextColor={theme.textTertiary}
                    secureTextEntry={def.sensitive && !visible[def.key]}
                  />
                  {def.sensitive && (
                    <TouchableOpacity onPress={() => setVisible({ ...visible, [def.key]: !visible[def.key] })} style={styles.eyeBtn}>
                      <Ionicons name={visible[def.key] ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.value, { color: theme.textSecondary }]}>
                  {def.sensitive ? '********' : info.value || 'not set'}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', flex: 1 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  description: { fontSize: 13, marginBottom: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 12, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  input: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  eyeBtn: { padding: 10 },
  forbiddenText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  value: { fontSize: 13, fontFamily: 'monospace', paddingVertical: 8 },
});