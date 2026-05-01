import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { slotAPI, movieAPI, hallAPI, branchAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { SIZES, ROLES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

export default function SlotForm() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const router = useRouter();
  const { user } = useAuth();
  const isMain = user?.role === ROLES.MAIN_MANAGER;

  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ movie: '', hall: '', branch: isMain ? '' : String(user?.assignedBranch || ''), startTime: '', pricing: { regular: '500', vip: '1000', loveseat: '1200', producer: '1500', lobby: '800' } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [mRes, hRes] = await Promise.all([movieAPI.getAll(), hallAPI.getAll()]);
        setMovies(mRes.data.movies);
        setHalls(hRes.data.halls);
        if (isMain) {
          const bRes = await branchAPI.getAll();
          setBranches(bRes.data.branches);
        }
        if (isEdit) {
          const { data } = await slotAPI.getById(id);
          const s = data.timeSlot;
          setForm({ movie: s.movie?._id || '', hall: s.hall?._id || '', branch: s.branch?._id || '', startTime: new Date(s.startTime).toISOString().slice(0, 16), pricing: { regular: String(s.pricing.regular), vip: String(s.pricing.vip), loveseat: String(s.pricing.loveseat), producer: String(s.pricing.producer), lobby: String(s.pricing.lobby) } });
        }
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!form.movie || !form.hall || !form.startTime) return Alert.alert('Error', 'Movie, hall and start time are required.');
    setSaving(true);
    try {
      const pricing = Object.fromEntries(Object.entries(form.pricing).map(([k, v]) => [k, parseFloat(v) || 0]));
      const payload = { ...form, pricing };
      if (isEdit) await slotAPI.update(id, { pricing });
      else await slotAPI.create(payload);
      router.back();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save slot.');
    } finally {
      setSaving(false);
    }
  };

  const filteredHalls = form.branch ? halls.filter((h) => (h.branch?._id || h.branch) === form.branch) : halls;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const SelectList = ({ label, data, value, onChange, displayFn }) => (
    <View style={{ marginBottom: SIZES.md }}>
      <Text style={styles.label}>{label}</Text>
      {data.map((item) => (
        <TouchableOpacity key={item._id} style={[styles.option, value === item._id && styles.optionActive]} onPress={() => onChange(item._id)}>
          <Text style={{ color: value === item._id ? '#fff' : colors.textPrimary, fontSize: 14 }}>{displayFn(item)}</Text>
          {value === item._id && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Time Slot' : 'New Time Slot'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {!isEdit && (
          <>
            {isMain && <SelectList label="Branch *" data={branches} value={form.branch} onChange={(v) => setForm((f) => ({ ...f, branch: v, hall: '' }))} displayFn={(b) => `${b.name} — ${b.city}`} />}
            <SelectList label="Movie *" data={movies} value={form.movie} onChange={(v) => setForm((f) => ({ ...f, movie: v }))} displayFn={(m) => `${m.title} (${m.duration} min)`} />
            <SelectList label="Hall *" data={filteredHalls} value={form.hall} onChange={(v) => setForm((f) => ({ ...f, hall: v }))} displayFn={(h) => `${h.name} — ${h.screenType}`} />
            <Text style={styles.label}>Start Date & Time *</Text>
            <TextInput style={[styles.input, { marginBottom: SIZES.md }]} value={form.startTime} onChangeText={(v) => setForm((f) => ({ ...f, startTime: v }))} placeholder="YYYY-MM-DDTHH:MM (e.g. 2026-06-15T18:30)" placeholderTextColor={colors.textMuted} />
            <Text style={styles.hint}>End time is auto-calculated from movie duration + 20 min buffer.</Text>
          </>
        )}

        <Text style={[styles.label, { marginTop: SIZES.md }]}>Pricing (LKR)</Text>
        {Object.keys(form.pricing).map((type) => (
          <View key={type} style={styles.priceRow}>
            <Text style={styles.priceLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            <TextInput style={styles.priceInput} value={form.pricing[type]} onChangeText={(v) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [type]: v } }))} keyboardType="numeric" />
          </View>
        ))}
        <View style={{ height: 40 }} />
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
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: SIZES.md, fontStyle: 'italic' },
  input: { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, color: colors.textPrimary, fontSize: 14 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priceLabel: { width: 80, color: colors.textSecondary, fontSize: 13 },
  priceInput: { flex: 1, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 44, color: colors.textPrimary, fontSize: 14 },
});
