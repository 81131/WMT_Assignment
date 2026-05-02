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

const Field = ({ icon, placeholder, value, onChangeText, secure, keyboardType, styles, colors }) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secure}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
    />
  </View>
);

export default function RegisterScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useThemeStyles(getStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setErrorMsg('');
    if (!name || !email || !password) return setErrorMsg('All fields are required.');
    if (password !== confirm) return setErrorMsg('Passwords do not match.');
    if (password.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register(name, email.trim().toLowerCase(), password);
      router.replace('/customer/home');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Something went wrong.');
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
        <View style={styles.formContainer}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and book your first movie</Text>
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <Field icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} styles={styles} colors={colors} />
            <Field icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" styles={styles} colors={colors} />
            <Field icon="lock-closed-outline" placeholder="Password (min 8 chars)" value={password} onChangeText={setPassword} secure styles={styles} colors={colors} />
            <Field icon="shield-checkmark-outline" placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secure styles={styles} colors={colors} />

            <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/login')} style={styles.link}>
              <Text style={styles.linkText}>Already have an account? <Text style={{ color: colors.primary }}>Sign In</Text></Text>
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
  backBtn: { marginBottom: SIZES.md },
  formContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.lg, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: SIZES.lg },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: SIZES.md, marginBottom: SIZES.md, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  btn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { marginTop: SIZES.md, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: 14 },
});
