import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Dimensions, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { slotAPI, bookingAPI } from '../../../services/api';
import { SIZES, SEAT_TYPE_COLORS } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

const { width } = Dimensions.get('window');

export default function SeatPicker() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { slotId } = useLocalSearchParams();
  const router = useRouter();
  const [slot, setSlot] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);

  useEffect(() => { fetchSeats(); }, [slotId]);

  const fetchSeats = async () => {
    try {
      const [slotRes, seatRes] = await Promise.all([
        slotAPI.getById(slotId),
        slotAPI.getSeats(slotId),
      ]);
      setSlot(slotRes.data.timeSlot);
      setSeats(seatRes.data.seats);
    } catch {
      Alert.alert('Error', 'Could not load seat map.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seat) => {
    if (seat.status === 'booked' || seat.status === 'locked' || seat.status === 'inactive') return;
    setSelected((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter((id) => id !== seat.seatId)
        : [...prev, seat.seatId]
    );
  };

  const totalPrice = selected.reduce((sum, seatId) => {
    const seat = seats.find((s) => s.seatId === seatId);
    return sum + (seat?.price || 0);
  }, 0);

  const handleProceed = async () => {
    if (selected.length === 0) return Alert.alert('Select seats', 'Please select at least one seat.');
    setLocking(true);
    try {
      await bookingAPI.lockSeats({ timeSlotId: slotId, seatIds: selected });
      router.push({ pathname: '/customer/checkout', params: { slotId, seats: JSON.stringify(selected), total: totalPrice } });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not lock seats. Try again.');
    } finally {
      setLocking(false);
    }
  };

  const seatColor = (seat) => {
    if (seat.status === 'booked') return colors.seatBooked;
    if (seat.status === 'locked') return colors.seatLocked;
    if (seat.status === 'my_hold') return colors.seatMyHold;
    if (seat.status === 'inactive') return colors.seatInactive;
    if (selected.includes(seat.seatId)) return colors.seatSelected || '#00BCD4';
    return SEAT_TYPE_COLORS[seat.type] || colors.seatRegular;
  };

  // Group seats by row for grid display
  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row][seat.col] = seat;
    return acc;
  }, {});

  const numCols = slot ? slot.hall?.layoutConfig?.cols || 10 : 10;
  const cellSize = Platform.OS === 'web' 
    ? Math.max(Math.min(Math.floor((width - 40) / numCols) - 2, 40), 32) 
    : Math.min(Math.floor((width - 40) / numCols) - 2, 36);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.hallName}>{slot?.hall?.name}</Text>
          <Text style={styles.showtime}>
            {slot ? new Date(slot.startTime).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
          </Text>
        </View>
      </View>

      {/* Screen indicator */}
      <View style={styles.screenBar}>
        <View style={styles.screen} />
        <Text style={styles.screenLabel}>SCREEN</Text>
      </View>

      {/* Seat grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
          {Object.keys(rows).sort((a, b) => a - b).map((rowIdx) => (
            <View key={rowIdx} style={styles.seatRow}>
              <Text style={styles.rowLabel}>{String.fromCharCode(65 + parseInt(rowIdx))}</Text>
              {Array.from({ length: numCols }).map((_, colIdx) => {
                const seat = rows[rowIdx][colIdx];
                if (!seat) return <View key={colIdx} style={[styles.seatCell, { width: cellSize, height: cellSize, backgroundColor: 'transparent' }]} />;
                return (
                  <TouchableOpacity
                    key={seat.seatId}
                    style={[styles.seatCell, { width: cellSize, height: cellSize, minWidth: cellSize, minHeight: cellSize, backgroundColor: seatColor(seat) }]}
                    onPress={() => toggleSeat(seat)}
                    disabled={['booked', 'locked', 'inactive'].includes(seat.status)}
                  >
                    {seat.isActive && (
                      <Text style={{ fontSize: cellSize > 28 ? 8 : 6, color: '#fff', fontWeight: 'bold' }}>
                        {seat.seatId}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legend} contentContainerStyle={{ gap: 12, paddingHorizontal: SIZES.md }}>
        {[
          { color: colors.seatRegular, label: 'Regular' },
          { color: colors.seatVip, label: 'VIP' },
          { color: colors.seatLoveseat, label: 'Loveseat' },
          { color: colors.seatProducer, label: 'Producer' },
          { color: colors.seatLobby, label: 'Lobby' },
          { color: colors.seatSelected || '#00BCD4', label: 'Selected' },
          { color: colors.seatBooked, label: 'Booked' },
          { color: colors.seatLocked, label: 'Held' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.selectedCount}>{selected.length} seat{selected.length !== 1 ? 's' : ''} selected</Text>
          <Text style={styles.totalPrice}>LKR {totalPrice.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={[styles.proceedBtn, selected.length === 0 && { opacity: 0.5 }]} onPress={handleProceed} disabled={locking}>
          {locking ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.proceedBtnText}>Proceed to Pay</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  hallName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  showtime: { fontSize: 12, color: colors.textSecondary },
  screenBar: { alignItems: 'center', paddingVertical: 10 },
  screen: { width: '60%', height: 4, backgroundColor: colors.accentSecondary, borderRadius: 2, marginBottom: 4, ...(Platform.OS === 'web' ? { boxShadow: '0px 4px 10px rgba(255,107,107,0.8)' } : { shadowColor: colors.accentSecondary, shadowOpacity: 0.8, shadowRadius: 10 }) },
  screenLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 3 },
  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowLabel: { width: 18, fontSize: 10, color: colors.textMuted, textAlign: 'center', marginRight: 4 },
  seatCell: { margin: 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  legend: { maxHeight: 36, marginVertical: 8 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.md, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
  },
  selectedCount: { fontSize: 13, color: colors.textSecondary },
  totalPrice: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  proceedBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, height: 46, borderRadius: SIZES.radius, justifyContent: 'center', alignItems: 'center' },
  proceedBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
