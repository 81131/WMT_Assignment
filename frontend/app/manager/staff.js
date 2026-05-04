import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI, branchAPI, hallAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SIZES, ROLES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';



export default function StaffScreen() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const router = useRouter();
  const { user } = useAuth();
  
  const ROLE_CONFIG = {
    branch_manager: { label: 'Branch Manager', color: colors.accent },
    hall_employee:  { label: 'Hall Employee',   color: colors.accentSecondary },
  };
  const isMain = user?.role === ROLES.MAIN_MANAGER;

  const [staff,    setStaff]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [halls,    setHalls]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: 'hall_employee', assignedBranch: '', assignedHalls: [],
  });

  const fetchData = async () => {
    try {
      const [usersRes, branchRes, hallRes] = await Promise.all([
        authAPI.getUsers(),
        branchAPI.getAll(),
        hallAPI.getAll(),
      ]);
      setStaff(
        usersRes.data.users.filter((u) =>
          ['branch_manager', 'hall_employee'].includes(u.role)
        )
      );
      setBranches(branchRes.data.branches);
      setHalls(hallRes.data.halls);
    } catch {
      Alert.alert('Error', 'Could not load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const setField = (key, val) => {
    setForm((f) => {
      const newForm = { ...f, [key]: val };
      if (key === 'assignedBranch') {
        newForm.assignedHalls = []; // Reset halls when branch changes
      }
      return newForm;
    });
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password)
      return Alert.alert('Error', 'Name, email and password are required.');
    if (!form.assignedBranch)
      return Alert.alert('Error', 'Please assign a branch.');
    if (form.role === 'hall_employee' && form.assignedHalls.length === 0)
      return Alert.alert('Error', 'Please assign at least one hall for hall employees.');
    setSaving(true);
    try {
      await authAPI.createStaff(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'hall_employee', assignedBranch: '', assignedHalls: [] });
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not create account.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      assignedBranch: user.assignedBranch?._id || '',
      assignedHalls: user.assignedHalls?.map(h => h._id) || [],
    });
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!form.name || !form.email)
      return Alert.alert('Error', 'Name and email are required.');
    if (!form.assignedBranch)
      return Alert.alert('Error', 'Please assign a branch.');
    if (form.role === 'hall_employee' && form.assignedHalls.length === 0)
      return Alert.alert('Error', 'Please assign at least one hall for hall employees.');
    setSaving(true);
    try {
      await authAPI.updateUser(editingId, {
        name: form.name,
        role: form.role,
        assignedBranch: form.assignedBranch,
        assignedHalls: form.assignedHalls,
      });
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', email: '', password: '', role: 'hall_employee', assignedBranch: '', assignedHalls: [] });
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/manager/dashboard')}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff</Text>
        {isMain && (
          <TouchableOpacity onPress={() => {
            if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setForm({ name: '', email: '', password: '', role: 'hall_employee', assignedBranch: '', assignedHalls: [] });
            } else {
              setShowForm(true);
            }
          }}>
            <Ionicons
              name={showForm ? 'close-circle' : 'add-circle'}
              size={26}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        {/* Add-staff form (main manager only) */}
        {showForm && isMain && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{editingId ? 'Edit Staff Account' : 'New Staff Account'}</Text>

            {[
              { label: 'Full Name',  key: 'name',     placeholder: 'e.g. Kamal Perera',   capitalize: 'words' },
              { label: 'Email',      key: 'email',    placeholder: 'staff@cinema.lk',      keyboard: 'email-address', capitalize: 'none' },
              ...(editingId ? [] : [{ label: 'Password',   key: 'password', placeholder: 'Min 8 characters',     secure: true }]),
            ].map(({ label, key, placeholder, keyboard, capitalize, secure }) => (
              <View key={key} style={{ marginBottom: 12 }}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={form[key]}
                  onChangeText={(v) => setField(key, v)}
                  keyboardType={keyboard || 'default'}
                  autoCapitalize={capitalize || 'none'}
                  secureTextEntry={!!secure}
                />
              </View>
            ))}

            {/* Role selector */}
            <Text style={styles.label}>Role</Text>
            <View style={styles.chipRow}>
              {Object.entries(ROLE_CONFIG).map(([r, cfg]) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, form.role === r && styles.chipActive]}
                  onPress={() => setField('role', r)}
                >
                  <Text style={[styles.chipText, form.role === r && { color: '#fff' }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Branch selector */}
            <Text style={styles.label}>Assign Branch *</Text>
            {branches.map((b) => (
              <TouchableOpacity
                key={b._id}
                style={[styles.branchOpt, form.assignedBranch === b._id && styles.branchOptActive]}
                onPress={() => setField('assignedBranch', b._id)}
              >
                <Text style={{ color: form.assignedBranch === b._id ? '#fff' : colors.textPrimary }}>
                  {b.name}
                </Text>
                {form.assignedBranch === b._id && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            ))}

            {/* Hall selector for hall employees */}
            {form.role === 'hall_employee' && (
              <>
                <Text style={styles.label}>Assign Halls *</Text>
                {halls.filter(h => h.branch._id === form.assignedBranch).map((h) => (
                  <TouchableOpacity
                    key={h._id}
                    style={[styles.branchOpt, form.assignedHalls.includes(h._id) && styles.branchOptActive]}
                    onPress={() => {
                      const newHalls = form.assignedHalls.includes(h._id)
                        ? form.assignedHalls.filter(id => id !== h._id)
                        : [...form.assignedHalls, h._id];
                      setField('assignedHalls', newHalls);
                    }}
                  >
                    <Text style={{ color: form.assignedHalls.includes(h._id) ? '#fff' : colors.textPrimary }}>
                      {h.name}
                    </Text>
                    {form.assignedHalls.includes(h._id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.createBtn, { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({ name: '', email: '', password: '', role: 'hall_employee', assignedBranch: '', assignedHalls: [] });
              }}>
                <Text style={[styles.createBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { flex: 1 }]} onPress={editingId ? handleUpdate : handleCreate} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.createBtnText}>{editingId ? 'Update' : 'Create'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Staff list */}
        <Text style={styles.sectionTitle}>
          {staff.length} Staff Member{staff.length !== 1 ? 's' : ''}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          staff.map((item) => {
            const cfg = ROLE_CONFIG[item.role];
            return (
              <TouchableOpacity key={item._id} style={styles.card} onPress={() => handleEdit(item)}>
                <View style={[styles.avatar, { backgroundColor: cfg.color + '22' }]}>
                  <Text style={[styles.avatarText, { color: cfg.color }]}>
                    {item.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <Text style={styles.staffEmail}>{item.email}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: cfg.color + '22' }]}>
                    <Text style={[styles.roleText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {item.assignedBranch?.name && (
                    <Text style={styles.branchText}>{item.assignedBranch.name}</Text>
                  )}
                  {item.role === 'hall_employee' && item.assignedHalls?.length > 0 && (
                    <Text style={styles.branchText}>Halls: {item.assignedHalls.map(h => h.name).join(', ')}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })
        )}

        {!loading && staff.length === 0 && (
          <Text style={styles.empty}>No staff accounts yet.</Text>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle:    { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  form:           { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, padding: SIZES.md, marginBottom: SIZES.lg, borderWidth: 1, borderColor: colors.border },
  formTitle:      { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 14 },
  label:          { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  input:          { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, color: colors.textPrimary, fontSize: 14 },
  chipRow:        { flexDirection: 'row', gap: 10, marginBottom: SIZES.md },
  chip:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { color: colors.textSecondary, fontSize: 13 },
  branchOpt:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  branchOptActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  createBtn:      { backgroundColor: colors.primary, borderRadius: SIZES.radius, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.sm },
  createBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle:   { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  avatar:         { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:     { fontSize: 20, fontWeight: 'bold' },
  info:           { flex: 1 },
  staffName:      { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  staffEmail:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  roleBadge:      { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  roleText:       { fontSize: 11, fontWeight: '600' },
  branchText:     { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty:          { textAlign: 'center', color: colors.textMuted, marginTop: 30, fontSize: 15 },
});
