import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { branchAPI, authAPI } from '../../../services/api';
import { SIZES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

const F = ({ label, styles, colors, ...props }) => (
  <View style={{ marginBottom: SIZES.md }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
  </View>
);

export default function BranchForm() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const router = useRouter();
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '' });
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const usersRes = await authAPI.getUsers();
        setManagers(usersRes.data.users.filter((u) => u.role === 'branch_manager'));
        if (isEdit) {
          const { data } = await branchAPI.getById(id);
          const b = data.branch;
          setForm({ name: b.name, address: b.address, city: b.city, phone: b.phone });
          setSelectedManager(b.manager?._id || '');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!form.name || !form.city) return Alert.alert('Error', 'Name and city are required.');
    setSaving(true);
    try {
      const payload = { ...form, manager: selectedManager || null };
      if (isEdit) await branchAPI.update(id, payload);
      else await branchAPI.create(payload);
      if (router.canGoBack()) router.back();
      else router.replace('/manager/branches');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save branch.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/manager/branches')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Branch' : 'New Branch'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        <F styles={styles} colors={colors} label="Branch Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Cinema City Colombo" />
        <F styles={styles} colors={colors} label="Address *" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="123 Galle Road" />
        <F styles={styles} colors={colors} label="City *" value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="Colombo" />
        <F styles={styles} colors={colors} label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="011 234 5678" keyboardType="phone-pad" />

        <Text style={styles.label}>Assign Branch Manager (optional)</Text>
        <TouchableOpacity style={[styles.option, !selectedManager && styles.optionActive]} onPress={() => setSelectedManager('')}>
          <Text style={{ color: !selectedManager ? '#fff' : colors.textSecondary }}>None</Text>
        </TouchableOpacity>
        {managers.map((m) => (
          <TouchableOpacity key={m._id} style={[styles.option, selectedManager === m._id && styles.optionActive]} onPress={() => setSelectedManager(m._id)}>
            <Text style={{ color: selectedManager === m._id ? '#fff' : colors.textPrimary }}>{m.name}</Text>
            <Text style={{ color: selectedManager === m._id ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 12 }}>{m.email}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  saveBtn: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, color: colors.textPrimary, fontSize: 14, marginBottom: SIZES.sm },
  option: { backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
