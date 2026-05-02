import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { hallAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SIZES, ROLES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';
import ConfirmModal from '../../components/ConfirmModal';

export default function HallsScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const router = useRouter();
  const { user } = useAuth();
  const isMain = user?.role === ROLES.MAIN_MANAGER;
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null, name: '' });

  const fetchHalls = async () => {
    try { const { data } = await hallAPI.getAll(); setHalls(data.halls); } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { fetchHalls(); }, []);

  const requestDelete = (id, name) => {
    if (!isMain) return Alert.alert('Permission Denied', 'Only the main manager can delete halls.');
    setConfirmDelete({ visible: true, id, name });
  };

  const executeDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null, name: '' });
    try {
      await hallAPI.delete(id);
      setHalls((p) => p.filter((h) => h._id !== id));
    } catch (err) {
      Alert.alert('Error', 'Delete failed.');
    }
  };

  const SCREEN_COLORS = { '2D': colors.textSecondary, '3D': colors.accentSecondary, '4DX': colors.warning, 'IMAX': colors.accent };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: (SCREEN_COLORS[item.screenType] || colors.textMuted) + '22' }]}>
        <Text style={[styles.badgeText, { color: SCREEN_COLORS[item.screenType] || colors.textMuted }]}>{item.screenType}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.hallName}>{item.name}</Text>
        <Text style={styles.branch}>{item.branch?.name}</Text>
        <Text style={styles.seats}>{item.layoutConfig?.seats?.filter((s) => s.isActive).length || 0} seats</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.push(`/manager/hall-editor/${item._id}`)}>
          <Ionicons name="grid-outline" size={20} color={colors.accentSecondary} />
        </TouchableOpacity>
        {isMain && (
          <TouchableOpacity onPress={() => requestDelete(item._id, item.name)} style={{ marginTop: 12 }}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/manager/dashboard')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Halls</Text>
        <TouchableOpacity onPress={() => router.push('/manager/hall-editor/new')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={halls}
          keyExtractor={(h) => h._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SIZES.md, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHalls(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No halls yet. Tap + to create one.</Text>}
        />
      )}
      <ConfirmModal
        visible={confirmDelete.visible}
        title="Delete Hall"
        message={`Are you sure you want to delete "${confirmDelete.name}"?`}
        confirmText="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ visible: false, id: null, name: '' })}
      />
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 44, alignItems: 'center' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  info: { flex: 1 },
  hallName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  branch: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  seats: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actions: { alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
