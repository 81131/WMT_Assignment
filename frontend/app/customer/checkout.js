import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Payment Form State
  const [cardNumber, setCardNumber] = useState('4916217501611292');
  const [nameOnCard, setNameOnCard] = useState('John Doe');
  const [expiryDate, setExpiryDate] = useState('12/26');
  const [cvv, setCvv] = useState('123');

  const seatIds = JSON.parse(seatsParam || '[]');

  const Row = ({ label, value }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );

  useEffect(() => { 
    const fetchSlot = async () => {
      try {
        const slotRes = await slotAPI.getById(slotId);
        setSlot(slotRes.data.timeSlot);
      } catch (err) {
        Alert.alert('Error', 'Could not load booking details.');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchSlot(); 
  }, []);

  const handlePayment = async () => {
    if (!cardNumber || !nameOnCard || !expiryDate || !cvv) {
      if (Platform.OS === 'web') window.alert('All payment fields are required.');
      else Alert.alert('Validation Error', 'All payment fields are required.');
      return;
    }

    setProcessing(true);
    try {
      await bookingAPI.processPayment({
        timeSlotId: slotId,
        seatIds,
        cardNumber,
        nameOnCard,
        expiryDate,
        cvv
      });

      // Navigate immediately — Alert callback is unreliable on web
      if (Platform.OS === 'web') {
        window.alert('Payment Successful! Your ticket has been generated.');
        router.replace('/customer/tickets');
      } else {
        Alert.alert('Payment Successful!', 'Your ticket has been generated.', [
          { text: 'View Tickets', onPress: () => router.replace('/customer/tickets') }
        ]);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Transaction could not be processed.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Payment Failed', msg);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (showPaymentForm) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowPaymentForm(false)}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Payment</Text>
        </View>
        
        <ScrollView contentContainerStyle={[
          { padding: SIZES.md },
          Platform.OS === 'web' && { alignItems: 'center' }
        ]}>
          <View style={[styles.card, Platform.OS === 'web' && { width: '100%', maxWidth: 480 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={styles.cardTitle}>Credit/Debit Card</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <Ionicons name="card" size={24} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.label}>Name on Card</Text>
            <TextInput
              style={styles.input}
              value={nameOnCard}
              onChangeText={setNameOnCard}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Card Number</Text>
            <TextInput
              style={styles.input}
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="0000 0000 0000 0000"
              keyboardType="number-pad"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={setCvv}
                  placeholder="123"
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total to Pay</Text>
              <Text style={styles.totalValue}>LKR {parseInt(total).toLocaleString()}</Text>
            </View>

            <TouchableOpacity style={styles.payBtn} onPress={handlePayment} disabled={processing}>
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Pay LKR {parseInt(total).toLocaleString()}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Seats</Text>
          <View style={styles.seatChips}>
            {seatIds.map((id) => (
              <View key={id} style={styles.seatChip}><Text style={styles.seatChipText}>{id}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.holdNotice}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={styles.holdText}>Your seats are held for <Text style={{ fontWeight: 'bold' }}>10 minutes</Text>. Complete payment promptly.</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>LKR {parseInt(total).toLocaleString()}</Text>
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={() => setShowPaymentForm(true)}>
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.payBtnText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  card: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 10 },
  seatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seatChip: { backgroundColor: colors.primary + '33', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.primary },
  seatChipText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  holdNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warning + '22', borderRadius: SIZES.radius, padding: 12, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.warning + '44' },
  holdText: { color: colors.warning, fontSize: 13, flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SIZES.md },
  totalLabel: { fontSize: 16, color: colors.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  payBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.textPrimary, fontSize: 15, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) }
});
