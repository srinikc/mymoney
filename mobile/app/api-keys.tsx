import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme,
  ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import api from '../api/client';

const KEY_FIELDS = [
  { key: 'LLM_PROVIDER', label: 'LLM Provider', type: 'select' as const, description: 'Choose AI provider for financial advisor' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', type: 'password' as const, description: 'Required if using OpenAI' },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', type: 'password' as const, description: 'Required if using Claude' },
  { key: 'LLM_MODEL', label: 'LLM Model', type: 'text' as const, description: 'e.g. gpt-4o-mini' },
  { key: 'AUTH_RESEND_KEY', label: 'Resend API Key', type: 'password' as const, description: 'For welcome emails' },
  { key: 'ZERODHA_API_KEY', label: 'Zerodha API Key', type: 'password' as const, description: 'For Zerodha Kite API' },
  { key: 'ZERODHA_API_SECRET', label: 'Zerodha API Secret', type: 'password' as const, description: 'Zerodha Kite secret' },
  { key: 'SHAREKHAN_API_KEY', label: 'Sharekhan API Key', type: 'password' as const, description: 'For Sharekhan API' },
  { key: 'SHAREKHAN_API_SECRET', label: 'Sharekhan API Secret', type: 'password' as const, description: 'Sharekhan secret' },
];

export default function ApiKeysScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get('/api/settings/api-keys')
      .then((r) => setKeys(r.data?.keys || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings/api-keys', { keys });
      Alert.alert('Saved', 'API keys saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>API Keys</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.textTertiary }]}>Configure API keys for external services.</Text>
        {KEY_FIELDS.map((field) => (
          <View key={field.key} style={[styles.fieldCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}</Text>
            <Text style={[styles.fieldDesc, { color: theme.textTertiary }]}>{field.description}</Text>
            {field.type === 'select' ? (
              <View style={styles.selectRow}>
                {['openai', 'claude'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.selectOpt, { borderColor: (keys[field.key] || 'openai') === opt ? theme.primary : theme.border, backgroundColor: (keys[field.key] || 'openai') === opt ? theme.primaryLight : 'transparent' }]}
                    onPress={() => setKeys({ ...keys, [field.key]: opt })}
                  >
                    <Text style={[styles.selectOptText, { color: (keys[field.key] || 'openai') === opt ? theme.primary : theme.text }]}>{opt === 'openai' ? 'OpenAI' : 'Claude'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.inputRow, { borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={keys[field.key] || ''}
                  onChangeText={(v) => setKeys({ ...keys, [field.key]: v })}
                  placeholder="Not configured"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry={field.type === 'password' && !visible[field.key]}
                />
                {field.type === 'password' && (
                  <TouchableOpacity onPress={() => setVisible({ ...visible, [field.key]: !visible[field.key] })} style={styles.eyeBtn}>
                    <Ionicons name={visible[field.key] ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
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
  fieldCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  fieldLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  fieldDesc: { fontSize: 12, marginBottom: 10 },
  selectRow: { flexDirection: 'row', gap: 8 },
  selectOpt: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  selectOptText: { fontSize: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  input: { flex: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  eyeBtn: { padding: 10 },
});
