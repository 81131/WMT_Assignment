import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { branchAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';
import ConfirmModal from '../../components/ConfirmModal';

export default function BranchesScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const router = useRouter();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ visible: false, id: null, name: '' });

  const fetchBranches = async () => {
    try {
      const { data } = await branchAPI.getAll({ includeDeleted: showDeleted });
      setBranches(data.branches);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchBranches(); }, [showDeleted]);

  const requestDelete = (id, name) => {
    setConfirmDelete({ visible: true, id, name });
  };

  const executeDelete = async () => {
    const { id } = confirmDelete;
    setConfirmDelete({ visible: false, id: null, name: '' });
    try {
      await branchAPI.delete(id);
      fetchBranches();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleRestore = async (id) => {
    try { await branchAPI.restore(id); fetchBranches(); }
    catch (err) { Alert.alert('Error', err.response?.data?.message || 'Restore failed.'); }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.isDeleted && styles.cardDeleted]}>
      <View style={styles.cardIcon}>
        <Ionicons name="business" size={24} color={item.isDeleted ? colors.textMuted : colors.accent} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.branchName, item.isDeleted && { color: colors.textMuted }]}>{item.name}</Text>
        <Text style={styles.city}>{item.city}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        {item.isDeleted && (
          <Text style={styles.deletedNote}>
            Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {item.isDeleted ? (
          <TouchableOpacity onPress={() => handleRestore(item._id)}>
            <Ionicons name="refresh-circle" size={26} color={colors.success} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.push(`/manager/branch-edit/${item._id}`)}>
              <Ionicons name="pencil-outline" size={20} color={colors.accentSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => requestDelete(item._id, item.name)} style={{ marginTop: 12 }}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/manager/dashboard')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Branches</Text>
        <TouchableOpacity onPress={() => router.push('/manager/branch-add')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.toggleDeleted} onPress={() => setShowDeleted(!showDeleted)}>
        <Ionicons name={showDeleted ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textMuted} />
        <Text style={styles.toggleDeletedText}>{showDeleted ? 'Hide' : 'Show'} deleted branches</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={branches}
          keyExtractor={(b) => b._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SIZES.md, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBranches(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No branches. Tap + to add one.</Text>}
        />
      )}
      <ConfirmModal
        visible={confirmDelete.visible}
        title="Delete Branch"
        message={`Are you sure you want to soft-delete "${confirmDelete.name}"? It can be restored within 30 days.`}
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
  toggleDeleted: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SIZES.md, paddingVertical: 8 },
  toggleDeletedText: { color: colors.textMuted, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardDeleted: { opacity: 0.6, borderColor: colors.error + '55' },
  cardIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  branchName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  city: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  deletedNote: { fontSize: 11, color: colors.error, marginTop: 4 },
  actions: { alignItems: 'center', paddingLeft: 10 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
