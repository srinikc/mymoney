import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/auth';
import { Colors } from '../constants/Colors';
import api, { TOKEN_KEY } from '../api/client';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const { login, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkToken, setLinkToken] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  });

  const handleLinkWeb = async () => {
    if (!linkToken.trim()) { setLocalError('Please paste a session token'); return; }
    setLoading(true);
    setLocalError(null);
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, linkToken.trim());
      await checkAuth();
      router.replace('/');
    } catch (err: any) {
      setLocalError(err.message || 'Failed to link. Try copying the token again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      // Get the Google OAuth URL from the web app
      const res = await api.get('/api/auth/mobile-google');
      const authUrl = res.data.url;
      if (!authUrl) throw new Error('No auth URL received');

      // Open in system browser with redirect back to app
      const redirectUrl = Linking.createURL('auth');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = new URL(result.url);
        const token = parsed.searchParams.get('token');
        if (token) {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
          await checkAuth();
          router.replace('/');
        } else {
          // Token not in URL — user may have copied it manually
          setShowLinkInput(true);
          setLocalError('Google login successful! Paste the token from the website to link.');
        }
      }
    } catch (err: any) {
      setLocalError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setLocalError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.gradientBg}>
        <View style={[styles.gradientTop, { backgroundColor: theme.gradientStart }]} />
        <View style={[styles.gradientBottom, { backgroundColor: theme.gradientEnd }]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { backgroundColor: theme.white }]}>
            <Ionicons name="wallet" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.appName, { color: theme.white }]}>MyMoney</Text>
          <Text style={[styles.tagline, { color: 'rgba(255,255,255,0.8)' }]}>
            Your personal finance companion
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Sign in to continue managing your finances
          </Text>

          {displayError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.expenseLight }]}>
              <Ionicons name="alert-circle" size={18} color={theme.expense} />
              <Text style={[styles.errorText, { color: theme.expense }]}>
                {displayError}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.googleButton, { borderColor: theme.border }, loading && styles.loginButtonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color={theme.text} />
            <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { marginVertical: 16 }]}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <Text style={[styles.dividerText, { color: theme.textTertiary, marginHorizontal: 12 }]}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <View style={[styles.inputWrapper, { borderColor: theme.border }]}>
              <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="you@example.com"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); setLocalError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
            <View style={[styles.inputWrapper, { borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); setLocalError(null); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.light.white} size="small" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.light.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowLinkInput(!showLinkInput)}
            style={[styles.linkWebBtn, { marginTop: 12 }]}
          >
            <Ionicons name="link-outline" size={16} color={theme.primary} />
            <Text style={[styles.linkWebText, { color: theme.primary }]}>Already logged in on web? Link with Web</Text>
          </TouchableOpacity>

          {showLinkInput && (
            <View style={[styles.linkInputContainer, { backgroundColor: theme.surface }]}>
              <Text style={[styles.linkInputLabel, { color: theme.text }]}>Paste session token from web app (Settings > Mobile Session Link)</Text>
              <TextInput
                value={linkToken}
                onChangeText={setLinkToken}
                placeholder="Paste token here"
                placeholderTextColor={theme.textTertiary}
                style={[styles.linkInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.linkButton, { backgroundColor: theme.primary }]}
                onPress={handleLinkWeb}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Link & Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    flex: 1,
  },
  gradientBottom: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  googleButtonText: { fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center' },
  dividerText: { fontSize: 12, fontWeight: '500' },
  linkWebBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  linkWebText: { fontSize: 13, fontWeight: '600' },
  linkInputContainer: { borderRadius: 14, padding: 16, marginTop: 12, gap: 12 },
  linkInputLabel: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  linkInput: { borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1 },
  linkButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
});
