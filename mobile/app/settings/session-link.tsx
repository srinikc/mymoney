import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useColorScheme, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/auth';
import api from '../../api/client';

export default function SessionLinkScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { user } = useAuthStore();

  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await api.get('/api/auth/session-token');
        if (res.data?.token) setToken(res.data.token);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  const handleCopy = async () => {
    if (!token) return;
    try {
      await Clipboard.setStringAsync(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mobile Session Link</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.iconRow}>
            <Ionicons name="phone-portrait" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Link Web Session to Mobile</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Copy the session token below and paste it into the MyMoney mobile app to log in without entering credentials.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
          ) : token ? (
            <>
              <View style={[styles.tokenBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.tokenText, { color: theme.text }]} selectable numberOfLines={3}>
                  {token}
                </Text>
              </View>

              <TouchableOpacity style={[styles.copyBtn, { backgroundColor: theme.primary }]} onPress={handleCopy}>
                <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color="#fff" />
                <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Token'}</Text>
              </TouchableOpacity>

              <View style={styles.instructions}>
                <Text style={[styles.instructionsTitle, { color: theme.text }]}>On your mobile app:</Text>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.stepNumText, { color: theme.primary }]}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>Open the MyMoney mobile app</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.stepNumText, { color: theme.primary }]}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>On the login screen, tap <Text style={{ fontWeight: '700' }}>Link with Web</Text></Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.primaryLight }]}>
                    <Text style={[styles.stepNumText, { color: theme.primary }]}>3</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.textSecondary }]}>Paste the token and tap <Text style={{ fontWeight: '700' }}>Link</Text></Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noToken}>
              <Ionicons name="warning" size={32} color={theme.warning} />
              <Text style={[styles.noTokenText, { color: theme.textSecondary }]}>
                Log in on web first to generate a session token.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 24, alignItems: 'center' },
  iconRow: { marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  cardDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  tokenBox: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  tokenText: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },

  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  copyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  instructions: { width: '100%', marginTop: 24, gap: 14 },
  instructionsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '700' },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },

  noToken: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  noTokenText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
