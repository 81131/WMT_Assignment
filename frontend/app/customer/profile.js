import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { COLORS, SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty.');
    setSaving(true);
    try {
      await authAPI.updateUser(user._id, { name });
      Alert.alert('Updated', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={18} color={COLORS.primary} /></View>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Account info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="people-outline" label="Role" value={user?.role?.replace(/_/g, ' ')} />
        </View>

        {/* Edit name */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Edit Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </View>

        {/* My Tickets shortcut */}
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/customer/tickets')}>
          <Ionicons name="ticket-outline" size={20} color={COLORS.accent} />
          <Text style={styles.menuItemText}>My Tickets</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  header:         { padding: SIZES.md, paddingTop: 55 },
  headerTitle:    { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  avatarSection:  { alignItems: 'center', paddingVertical: SIZES.lg },
  avatar:         { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '33', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, marginBottom: 10 },
  avatarText:     { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  userName:       { fontSize: 22, fontWeight: 'bold', color: COLORS.textPrimary },
  roleBadge:      { marginTop: 6, backgroundColor: COLORS.surfaceElevated, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 3 },
  roleText:       { fontSize: 11, color: COLORS.textSecondary, letterSpacing: 1 },
  card:           { backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:   { fontSize: 14, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  infoIcon:       { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary + '22', justifyContent: 'center', alignItems: 'center' },
  infoLabel:      { fontSize: 11, color: COLORS.textMuted },
  infoValue:      { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', marginTop: 2 },
  input:          { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, height: 48, color: COLORS.textPrimary, fontSize: 14, marginBottom: 12 },
  saveBtn:        { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 46, justifyContent: 'center', alignItems: 'center' },
  saveBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: SIZES.radius, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  menuItemText:   { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '55', backgroundColor: COLORS.error + '11', marginTop: SIZES.sm },
  logoutText:     { color: COLORS.error, fontWeight: 'bold', fontSize: 15 },
});
