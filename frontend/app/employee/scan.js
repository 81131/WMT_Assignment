import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { bookingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function EmployeeScan() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { user, logout } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, ticket, message }

  const requestCamera = async () => {
    if (permission?.granted) {
      setScanning(true);
      return;
    }
    const { granted } = await requestPermission();
    if (granted) setScanning(true);
    else Alert.alert('Error', 'Camera permission is required to scan tickets.');
  };

  const handleScan = async (code) => {
    setScanning(false);
    await validateCode(code);
  };

  const validateCode = async (code) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return Alert.alert('Error', 'Please enter a ticket code.');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await bookingAPI.validateTicket(trimmed);
      setResult({ success: true, ticket: data.ticket, message: data.message });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Validation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setManualCode(''); };

  if (scanning) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleScan(data)}
        />
        <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
          <Ionicons name="close" size={28} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 6 }}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Point camera at ticket QR code</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ticket Scanner</Text>
          <Text style={styles.headerSub}>{user?.name} • Hall Employee</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {/* Result display */}
        {result && (
          <View style={[styles.resultCard, { borderColor: result.success ? colors.success : colors.error }]}>
            <Ionicons
              name={result.success ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={result.success ? colors.success : colors.error}
            />
            <Text style={[styles.resultTitle, { color: result.success ? colors.success : colors.error }]}>
              {result.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </Text>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.success && result.ticket && (
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketInfoText}>🎬 {result.ticket.movie?.title}</Text>
                <Text style={styles.ticketInfoText}>🪑 {result.ticket.seats?.map((s) => s.seatId).join(', ')}</Text>
                <Text style={styles.ticketInfoText}>👤 {result.ticket.customer?.name}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>Scan Next Ticket</Text>
            </TouchableOpacity>
          </View>
        )}

        {!result && (
          <>
            {/* QR Scanner button */}
            <TouchableOpacity style={styles.scanBtn} onPress={requestCamera}>
              <Ionicons name="qr-code-outline" size={36} color="#fff" />
              <Text style={styles.scanBtnText}>Scan QR Code</Text>
              <Text style={styles.scanBtnSub}>Open camera to scan ticket</Text>
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR ENTER CODE MANUALLY</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Manual entry */}
            <View style={styles.manualSection}>
              <TextInput
                style={styles.codeInput}
                placeholder="Enter ticket code (e.g. AB12CD34EF)"
                placeholderTextColor={colors.textMuted}
                value={manualCode}
                onChangeText={(t) => setManualCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={12}
              />
              <TouchableOpacity
                style={[styles.validateBtn, loading && { opacity: 0.7 }]}
                onPress={() => validateCode(manualCode)}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.validateBtnText}>Validate</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.md, paddingTop: 55, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cancelScan: { position: 'absolute', top: 52, right: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  scanOverlay: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  scanFrame: { width: 220, height: 220, borderWidth: 2, borderColor: colors.primary, borderRadius: 12, marginBottom: 16 },
  scanHint: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  resultCard: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.lg, alignItems: 'center', borderWidth: 2, marginBottom: SIZES.md },
  resultTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  resultMessage: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginVertical: 8 },
  ticketInfo: { width: '100%', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 12, marginVertical: 8, gap: 4 },
  ticketInfoText: { color: colors.textPrimary, fontSize: 14 },
  resetBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  resetBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  scanBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radiusLg, padding: SIZES.lg, alignItems: 'center', marginBottom: SIZES.lg },
  scanBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  scanBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SIZES.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  manualSection: { gap: 10 },
  codeInput: { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: SIZES.md, height: 54, color: colors.textPrimary, fontSize: 18, letterSpacing: 3, textAlign: 'center', fontWeight: 'bold' },
  validateBtn: { backgroundColor: colors.accentSecondary, borderRadius: SIZES.radius, height: 54, justifyContent: 'center', alignItems: 'center' },
  validateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
