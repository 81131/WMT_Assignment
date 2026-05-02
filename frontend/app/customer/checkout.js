import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { bookingAPI, slotAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function CheckoutScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { slotId, seats: seatsParam, total } = useLocalSearchParams();
  const router = useRouter();
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payParams, setPayParams] = useState(null);
  const [showPayhere, setShowPayhere] = useState(false);

  const seatIds = JSON.parse(seatsParam || '[]');

  const Row = ({ label, value }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );

  useEffect(() => { fetchSlotAndInitiate(); }, []);

  const fetchSlotAndInitiate = async () => {
    try {
      const slotRes = await slotAPI.getById(slotId);
      setSlot(slotRes.data.timeSlot);
      const payRes = await bookingAPI.initiatePayment({ timeSlotId: slotId, seatIds });
      setPayParams(payRes.data.paymentParams);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not initiate payment.');
      if (router.canGoBack()) router.back();
      else router.replace('/customer/home');
    } finally {
      setLoading(false);
    }
  };

  // Build PayHere HTML form for WebView
  const buildPayhereHtml = (p) => `
    <!DOCTYPE html><html><body onload="document.forms[0].submit()">
    <form method="POST" action="${p.checkout_url}">
      ${Object.entries(p).filter(([k]) => !['checkout_url','sandbox'].includes(k)).map(([k,v]) => `<input type="hidden" name="${k}" value="${v}">`).join('')}
    </form>
    <p style="font-family:sans-serif;text-align:center;margin-top:40px;color:#888">Redirecting to PayHere...</p>
    </body></html>
  `;

  const handleWebViewNav = (navState) => {
    const url = navState.url;
    if (url.includes('payment/success') || url.includes('cinemaapp://payment/success')) {
      setShowPayhere(false);
      router.replace('/customer/tickets');
    } else if (url.includes('payment/cancel') || url.includes('cinemaapp://payment/cancel')) {
      setShowPayhere(false);
      Alert.alert('Payment Cancelled', 'Your seat hold will expire in 10 minutes.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (showPayhere && payParams) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.webviewHeader}>
          <TouchableOpacity onPress={() => setShowPayhere(false)}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Secure Payment</Text>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
        </View>
        {Platform.OS === 'web' ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 20, color: colors.textSecondary }}>Redirecting to secure payment gateway...</Text>
            {/* Inject and submit hidden form */}
            <iframe
              name="payhere_frame"
              style={{ display: 'none' }}
              onLoad={(e) => {
                if (e.target.contentWindow.location.href.includes('payment/success')) {
                  setShowPayhere(false);
                  router.replace('/customer/tickets');
                }
              }}
            />
            <form id="payhere_form" method="POST" action={payParams.checkout_url} target={Platform.OS === 'web' ? '_self' : 'payhere_frame'} style={{ display: 'none' }}>
              {Object.entries(payParams)
                .filter(([k]) => !['checkout_url', 'sandbox'].includes(k))
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
            </form>
            {Platform.OS === 'web' && setTimeout(() => document.getElementById('payhere_form').submit(), 1000) && null}
          </View>
        ) : (
          <WebView
            source={{ html: buildPayhereHtml(payParams) }}
            onNavigationStateChange={handleWebViewNav}
            startInLoadingState
            renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />}
          />
        )}
      </View>
    );
  }

  const seatObjs = seatIds.map((id) => ({ seatId: id }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {/* Movie summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Summary</Text>
          {slot && (
            <>
              <Row label="Movie" value={slot.movie?.title} />
              <Row label="Hall" value={`${slot.hall?.name} (${slot.hall?.screenType})`} />
              <Row label="Date & Time" value={new Date(slot.startTime).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })} />
              <Row label="Branch" value={slot.branch?.name} />
            </>
          )}
        </View>

        {/* Seats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Seats</Text>
          <View style={styles.seatChips}>
            {seatIds.map((id) => (
              <View key={id} style={styles.seatChip}><Text style={styles.seatChipText}>{id}</Text></View>
            ))}
          </View>
        </View>

        {/* Seat hold notice */}
        <View style={styles.holdNotice}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={styles.holdText}>Your seats are held for <Text style={{ fontWeight: 'bold' }}>10 minutes</Text>. Complete payment promptly.</Text>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>LKR {parseInt(total).toLocaleString()}</Text>
        </View>

        {/* Pay button */}
        <TouchableOpacity style={styles.payBtn} onPress={() => setShowPayhere(true)}>
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.payBtnText}>Pay with PayHere</Text>
        </TouchableOpacity>

        <Text style={styles.secureNote}>🔒 Secured by PayHere payment gateway</Text>
      </ScrollView>
    </View>
  );
}



const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, paddingTop: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border },
  webviewTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  card: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 10 },
  seatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatChip: { backgroundColor: colors.primary + '33', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary },
  seatChipText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  holdNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '22', borderRadius: SIZES.radius, padding: 12, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.warning + '44' },
  holdText: { color: colors.warning, fontSize: 13, flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  totalLabel: { fontSize: 16, color: colors.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  payBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secureNote: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 12 },
});
