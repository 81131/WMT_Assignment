import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { bookingAPI } from '../../services/api';
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
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
});
