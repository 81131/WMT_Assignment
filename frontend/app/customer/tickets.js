import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { bookingAPI, reviewAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';



export default function TicketsScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const STATUS_COLORS = {
    confirmed: colors.success,
    pending: colors.warning,
    used: colors.info,
    cancelled: colors.error,
  };
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reviewForm, setReviewForm] = useState({ movieRating: 5, hallRating: 5, facilityRating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const router = useRouter();

  const fetchTickets = async () => {
    try {
      const { data } = await bookingAPI.getMyTickets();
      setTickets(data.tickets);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const openReviewModal = (ticket) => {
    setSelectedTicket(ticket);
    setReviewForm({ movieRating: 5, hallRating: 5, facilityRating: 5, comment: '' });
    setReviewModalVisible(true);
  };

  const submitReview = async () => {
    if (!selectedTicket) return;
    setSubmittingReview(true);
    try {
      await reviewAPI.create({
        bookingId: selectedTicket._id,
        ...reviewForm
      });
      alert('Review submitted successfully! Thank you.');
      setReviewModalVisible(false);
      fetchTickets(); // Refresh to update status if needed
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to submit review');
    }
    setSubmittingReview(false);
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/customer/ticket/${item.ticketCode || item._id}`)}
    >
      {item.movie?.posterUrl ? (
        <Image source={{ uri: item.movie.posterUrl }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Ionicons name="film-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '33', borderColor: STATUS_COLORS[item.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.movie?.title}</Text>
        <Text style={styles.hall}>{item.hall?.name} • {item.branch?.name}</Text>
        <Text style={styles.time}>
          {item.timeSlot ? new Date(item.timeSlot.startTime).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
        </Text>
        <View style={styles.codeRow}>
          <Ionicons name="barcode-outline" size={14} color={colors.textMuted} />
          <Text style={styles.code}>{item.ticketCode || 'Pending payment'}</Text>
        </View>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        {item.status === 'used' && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => openReviewModal(item)}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.reviewBtnText}>Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t._id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: SIZES.md, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={60} color={colors.textMuted} />
              <Text style={styles.emptyText}>No tickets yet</Text>
              <Text style={styles.emptySubtext}>Book a movie to see your tickets here</Text>
            </View>
          }
        />
      )}

      {/* Review Modal */}
      {reviewModalVisible && selectedTicket && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <Text style={styles.modalSubtitle}>{selectedTicket.movie?.title}</Text>

            <Text style={styles.label}>Movie Rating</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewForm({ ...reviewForm, movieRating: star })}>
                  <Ionicons name={star <= reviewForm.movieRating ? 'star' : 'star-outline'} size={28} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hall Experience</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewForm({ ...reviewForm, hallRating: star })}>
                  <Ionicons name={star <= reviewForm.hallRating ? 'star' : 'star-outline'} size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Facilities Rating</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewForm({ ...reviewForm, facilityRating: star })}>
                  <Ionicons name={star <= reviewForm.facilityRating ? 'star' : 'star-outline'} size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Comments (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="How was the movie?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={reviewForm.comment}
              onChangeText={(text) => setReviewForm({ ...reviewForm, comment: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReviewModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitReview} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: SIZES.md, paddingTop: 55 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  poster: { width: 70, height: 100 },
  posterFallback: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: 12, gap: 3 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  movieTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  hall: { fontSize: 12, color: colors.textSecondary },
  time: { fontSize: 12, color: colors.textSecondary },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  code: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  reviewBtn: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, marginRight: 8 },
  reviewBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { width: '85%', backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.lg, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: colors.primary, textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: 10, marginBottom: 4 },
  starsContainer: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border, textAlignVertical: 'top', marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { color: colors.textSecondary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitBtnText: { color: '#000', fontWeight: 'bold' },
});
