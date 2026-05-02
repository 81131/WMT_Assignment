import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { bookingAPI, reviewAPI } from '../../../services/api';
import { SIZES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

export default function TicketDetail() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [ratings, setRatings] = useState({ movieRating: 5, hallRating: 5, facilityRating: 5 });
  const [comment, setComment] = useState('');

  useEffect(() => { fetchTicket(); }, [code]);

  const fetchTicket = async () => {
    try {
      const { data } = await bookingAPI.getTicketByCode(code);
      setTicket(data.ticket);
    } catch {
      Alert.alert('Error', 'Ticket not found.');
      if (router.canGoBack()) router.back();
      else router.replace('/customer/home');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    try {
      await reviewAPI.create({ bookingId: ticket._id, ...ratings, comment });
      Alert.alert('Thank you!', 'Your review has been submitted.');
      setShowReview(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not submit review.');
    }
  };

  const DetailRow = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const StarPicker = ({ label, value, onChange }) => (
    <View style={styles.starPickerRow}>
      <Text style={styles.starPickerLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}>
            <Ionicons name={n <= value ? 'star' : 'star-outline'} size={26} color={colors.accent} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!ticket) return null;

  const canReview = ticket.status === 'used' || ticket.status === 'confirmed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Ticket</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {/* Ticket card */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Ionicons name="film" size={28} color={colors.primary} />
            <Text style={styles.movieName}>{ticket.movie?.title}</Text>
          </View>
          <View style={styles.divider} />
          <DetailRow icon="business-outline" label="Branch" value={`${ticket.branch?.name}, ${ticket.branch?.city}`} />
          <DetailRow icon="map-outline" label="Hall" value={ticket.hall?.name} />
          <DetailRow icon="time-outline" label="Show" value={ticket.timeSlot ? new Date(ticket.timeSlot.startTime).toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' }) : ''} />
          <DetailRow icon="people-outline" label="Seats" value={ticket.seats?.map((s) => s.seatId).join(', ')} />
          <DetailRow icon="cash-outline" label="Total Paid" value={`LKR ${ticket.totalAmount?.toLocaleString()}`} />

          <View style={styles.divider} />
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>TICKET CODE</Text>
            <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
          </View>
          {ticket.qrCodeUrl && (
            <Image source={{ uri: ticket.qrCodeUrl }} style={styles.qrCode} resizeMode="contain" />
          )}
          <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'confirmed' ? colors.success + '22' : colors.info + '22' }]}>
            <Ionicons name={ticket.status === 'used' ? 'checkmark-circle' : 'checkmark-circle-outline'} size={16} color={ticket.status === 'confirmed' ? colors.success : colors.info} />
            <Text style={[styles.statusText, { color: ticket.status === 'confirmed' ? colors.success : colors.info }]}>
              {ticket.status === 'confirmed' ? 'Valid — Show this QR at the entrance' : 'Ticket Used'}
            </Text>
          </View>
        </View>

        {/* Review section */}
        {canReview && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>Rate Your Experience</Text>
            {!showReview ? (
              <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReview(true)}>
                <Ionicons name="star-outline" size={18} color={colors.accent} />
                <Text style={styles.reviewBtnText}>Write a Review</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <StarPicker label="Movie" value={ratings.movieRating} onChange={(v) => setRatings((r) => ({ ...r, movieRating: v }))} />
                <StarPicker label="Hall" value={ratings.hallRating} onChange={(v) => setRatings((r) => ({ ...r, hallRating: v }))} />
                <StarPicker label="Facilities" value={ratings.facilityRating} onChange={(v) => setRatings((r) => ({ ...r, facilityRating: v }))} />
                <TouchableOpacity style={styles.submitBtn} onPress={submitReview}>
                  <Text style={styles.submitBtnText}>Submit Review</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}



const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  ticketCard: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.lg, borderWidth: 1, borderColor: colors.border, marginBottom: SIZES.md },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  movieName: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  detailLabel: { width: 70, color: colors.textMuted, fontSize: 13 },
  detailValue: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  codeSection: { alignItems: 'center', marginVertical: 10 },
  codeLabel: { fontSize: 11, color: colors.textMuted, letterSpacing: 2 },
  ticketCode: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 4, fontFamily: 'monospace', marginTop: 4 },
  qrCode: { width: 180, height: 180, alignSelf: 'center', marginVertical: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: SIZES.radius, padding: 10, justifyContent: 'center' },
  statusText: { fontWeight: '600', fontSize: 13 },
  reviewSection: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.lg, borderWidth: 1, borderColor: colors.border },
  reviewTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 14 },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 14, backgroundColor: colors.accent + '22', borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.accent },
  reviewBtnText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  starPickerRow: { marginBottom: 14 },
  starPickerLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: SIZES.radius, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
