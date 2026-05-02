import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { slotAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';
import ConfirmModal from '../../components/ConfirmModal';

export default function SlotsScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const router = useRouter();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null });

  const fetchSlots = async () => {
    try {
      const { data } = await slotAPI.getAll();
      setSlots(data.timeSlots);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchSlots(); }, []);

  const requestDelete = (id) => {
    setConfirmDelete({ visible: true, id });
  };

  const executeDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null });
    try {
      await slotAPI.delete(id);
      setSlots((p) => p.filter((s) => s._id !== id));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Delete failed.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.timeBlock}>
        <Text style={styles.time}>{new Date(item.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={styles.date}>{new Date(item.startTime).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.movie} numberOfLines={1}>{item.movie?.title}</Text>
        <Text style={styles.hall}>{item.hall?.name} • {item.hall?.screenType}</Text>
        <Text style={styles.branch}>{item.branch?.name}</Text>
        <Text style={styles.priceFrom}>From LKR {item.pricing?.regular?.toLocaleString()}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.push(`/manager/slot-edit/${item._id}`)}>
          <Ionicons name="pencil-outline" size={20} color={colors.accentSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => requestDelete(item._id)} style={{ marginTop: 12 }}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/manager/dashboard')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Time Slots</Text>
        <TouchableOpacity onPress={() => router.push('/manager/slot-add')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={slots}
          keyExtractor={(s) => s._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SIZES.md, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSlots(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No time slots. Tap + to add one.</Text>}
        />
      )}
      <ConfirmModal
        visible={confirmDelete.visible}
        title="Delete Slot"
        message="Are you sure you want to delete this time slot?"
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ visible: false, id: null })}
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, borderWidth: 1, borderColor: colors.border },
  timeBlock: { width: 56, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  time: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  info: { flex: 1 },
  movie: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  hall: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  branch: { fontSize: 12, color: colors.textMuted },
  priceFrom: { fontSize: 12, color: colors.accent, marginTop: 4 },
  actions: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
