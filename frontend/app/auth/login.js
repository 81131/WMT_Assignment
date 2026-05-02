import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function LoginScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useThemeStyles(getStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email || !password) return setErrorMsg('Please fill in all fields.');
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      switch (user.role) {
        case 'main_manager':
        case 'branch_manager': router.replace('/manager/dashboard'); break;
        case 'hall_employee': router.replace('/employee/scan'); break;
        default: router.replace('/customer/home');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="film" size={40} color={colors.primary} />
          </View>
          <Text style={styles.appName}>CinemaApp</Text>
          <Text style={styles.tagline}>Your seat, your experience</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.link}>
              <Text style={styles.linkText}>Don't have an account? <Text style={{ color: colors.primary }}>Register</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  themeToggle: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, right: 20, zIndex: 10, padding: 8, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  errorText: { color: colors.error, fontSize: 14, marginBottom: SIZES.sm, textAlign: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SIZES.md },
  logoArea: { alignItems: 'center', marginBottom: SIZES.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, marginBottom: SIZES.md,
  },
  appName: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 1 },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  card: {
    backgroundColor: colors.card, borderRadius: SIZES.radiusLg,
    padding: SIZES.lg, borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: SIZES.lg },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: SIZES.md, marginBottom: SIZES.md, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  btn: {
    backgroundColor: colors.primary, borderRadius: SIZES.radius,
    height: 52, justifyContent: 'center', alignItems: 'center',
    marginTop: SIZES.sm,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { marginTop: SIZES.md, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: 14 },
});
