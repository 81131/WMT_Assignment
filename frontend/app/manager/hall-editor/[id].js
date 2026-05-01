import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Alert, ActivityIndicator, TextInput, Platform, PanResponder
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { hallAPI, branchAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { SIZES, SEAT_TYPE_COLORS, ROLES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SEAT_TYPES = ['regular', 'vip', 'loveseat', 'producer', 'lobby', 'inactive'];
const SEAT_TYPE_ICONS = { regular: 'person', vip: 'star', loveseat: 'heart', producer: 'ribbon', lobby: 'cafe', inactive: 'close' };
const SEAT_TYPE_LABELS = { regular: 'Regular', vip: 'VIP', loveseat: 'Loveseat', producer: 'Producer', lobby: 'Lobby', inactive: 'Space/Aisle' };

export default function HallEditor() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { id } = useLocalSearchParams();
  const isEdit = id && id !== 'new';
  const router = useRouter();
  const { user } = useAuth();
  const isMain = user?.role === ROLES.MAIN_MANAGER;

  const [name, setName] = useState('');
  const [screenType, setScreenType] = useState('2D');
  const [branch, setBranch] = useState(isMain ? '' : user?.assignedBranch);
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(10);
  const [seats, setSeats] = useState([]);
  const [activeTool, setActiveTool] = useState('regular');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const SCREEN_TYPES = ['2D', '3D', '4DX', 'IMAX'];

  useEffect(() => {
    const init = async () => {
      if (isMain) {
        const { data } = await branchAPI.getAll();
        setBranches(data.branches);
      }
      if (isEdit) {
        const { data } = await hallAPI.getById(id);
        const h = data.hall;
        setName(h.name);
        setScreenType(h.screenType);
        setBranch(h.branch?._id || h.branch);
        setRows(h.layoutConfig.rows);
        setCols(h.layoutConfig.cols);
        setSeats(h.layoutConfig.seats.map((s) => ({ ...s })));
      }
      setLoading(false);
    };
    init().catch(() => setLoading(false));
  }, [id]);

  // Build grid keeping existing seats
  const buildGrid = (r, c) => {
    setSeats((prev) => {
      const newSeats = [];
      for (let ri = 0; ri < r; ri++) {
        for (let ci = 0; ci < c; ci++) {
          const existing = prev.find((s) => s.row === ri && s.col === ci);
          if (existing) {
            newSeats.push(existing);
          } else {
            const rowLetter = String.fromCharCode(65 + ri);
            newSeats.push({ seatId: `${rowLetter}${ci + 1}`, type: 'regular', row: ri, col: ci, isActive: true });
          }
        }
      }
      return newSeats;
    });
  };

  // Initially build grid if it's a new hall
  useEffect(() => {
    if (!isEdit && seats.length === 0) buildGrid(rows, cols);
  }, []);

  const applyRows = (val) => { const r = Math.max(1, Math.min(30, parseInt(val) || 1)); setRows(r); buildGrid(r, cols); };
  const applyCols = (val) => { const c = Math.max(1, Math.min(30, parseInt(val) || 1)); setCols(c); buildGrid(rows, c); };

  // Paint Tool Logic
  const activeToolRef = useRef(activeTool);
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

  const lastPainted = useRef(null);

  const paintSeatAt = (r, c) => {
    if (lastPainted.current === `${r},${c}`) return;
    lastPainted.current = `${r},${c}`;
    
    setSeats((prev) => prev.map((s) => {
      if (s.row === r && s.col === c) {
        const tool = activeToolRef.current;
        if (tool === 'inactive') return { ...s, isActive: false, type: 'regular' };
        return { ...s, type: tool, isActive: true };
      }
      return s;
    }));
  };

  const paintRow = (r) => {
    setSeats((prev) => prev.map((s) => {
      if (s.row === r) {
        const tool = activeToolRef.current;
        if (tool === 'inactive') return { ...s, isActive: false, type: 'regular' };
        return { ...s, type: tool, isActive: true };
      }
      return s;
    }));
  };

  const paintCol = (c) => {
    setSeats((prev) => prev.map((s) => {
      if (s.col === c) {
        const tool = activeToolRef.current;
        if (tool === 'inactive') return { ...s, isActive: false, type: 'regular' };
        return { ...s, type: tool, isActive: true };
      }
      return s;
    }));
  };

  // PanResponder for drag-to-paint
  const isLargeScreen = SCREEN_WIDTH > 768;
  const gridContainerWidth = isLargeScreen ? (SCREEN_WIDTH * 0.65 - 40) : (SCREEN_WIDTH - 24);
  const cellSize = Math.min(Math.floor(gridContainerWidth / cols) - 2, 34);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const col = Math.floor((locationX - 26) / (cellSize + 4)); // 26 is rowLabel width + margin
        const row = Math.floor(locationY / (cellSize + 8)); // 4px row margin + 4px cell margin
        if (col >= 0 && col < cols && row >= 0 && row < rows) paintSeatAt(row, col);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const col = Math.floor((locationX - 26) / (cellSize + 4));
        const row = Math.floor(locationY / (cellSize + 8));
        if (col >= 0 && col < cols && row >= 0 && row < rows) paintSeatAt(row, col);
      },
      onPanResponderRelease: () => {
        lastPainted.current = null;
      },
    })
  ).current;

  const handleSave = async () => {
    if (!name) return Alert.alert('Error', 'Hall name is required.');
    if (!branch) return Alert.alert('Error', 'Branch is required.');
    setSaving(true);
    try {
      const payload = { branch, name, screenType, rows, cols, seats };
      if (isEdit) await hallAPI.update(id, payload);
      else await hallAPI.create(payload);
      router.canGoBack() ? router.back() : router.replace('/manager/halls');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save hall.');
    } finally {
      setSaving(false);
    }
  };

  const seatColor = (seat) => {
    if (!seat.isActive) return colors.seatInactive;
    return SEAT_TYPE_COLORS[seat.type] || colors.seatRegular;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/manager/halls')}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Hall' : 'New Hall'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.mainLayout, isLargeScreen && { flexDirection: 'row' }]}>
        
        {/* Left Panel: Tools & Details */}
        <ScrollView style={[styles.leftPanel, isLargeScreen && { flex: 0.35, borderRightWidth: 1, borderColor: colors.border }]} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Metadata */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hall Details</Text>
            <Text style={styles.label}>Hall Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Hall 1 - IMAX" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Screen Type</Text>
            <View style={styles.chipRow}>
              {SCREEN_TYPES.map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, screenType === t && styles.chipActive]} onPress={() => setScreenType(t)}>
                  <Text style={[styles.chipText, screenType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isMain && (
              <>
                <Text style={styles.label}>Branch *</Text>
                {branches.map((b) => (
                  <TouchableOpacity key={b._id} style={[styles.branchOpt, branch === b._id && styles.branchOptActive]} onPress={() => setBranch(b._id)}>
                    <Text style={{ color: branch === b._id ? '#fff' : colors.textPrimary }}>{b.name}</Text>
                    {branch === b._id && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.gridSizeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Rows</Text>
                <TextInput style={styles.input} value={String(rows)} onChangeText={applyRows} keyboardType="numeric" />
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Columns</Text>
                <TextInput style={styles.input} value={String(cols)} onChangeText={applyCols} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* Tool palette */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paint Tool — tap a seat to apply</Text>
            <Text style={styles.sectionHint}>Drag to paint. Tap Row/Col labels to fill lines.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {SEAT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.toolChip, activeTool === t && styles.toolChipActive, { borderColor: t === 'inactive' ? colors.textMuted : (SEAT_TYPE_COLORS[t] || colors.textMuted) }]}
                  onPress={() => setActiveTool(t)}
                >
                  <Ionicons name={SEAT_TYPE_ICONS[t]} size={14} color={t === 'inactive' ? colors.textMuted : (SEAT_TYPE_COLORS[t] || colors.textMuted)} />
                  <Text style={[styles.toolChipText, activeTool === t && { color: '#fff' }]}>{SEAT_TYPE_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legend</Text>
            <View style={styles.legendGrid}>
              {SEAT_TYPES.filter((t) => t !== 'inactive').map((t) => (
                <View key={t} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: SEAT_TYPE_COLORS[t] }]} />
                  <Text style={styles.legendText}>{SEAT_TYPE_LABELS[t]}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sectionHint}>Seats: {seats.filter((s) => s.isActive).length} active • {seats.filter((s) => !s.isActive).length} spaces</Text>
          </View>
        </ScrollView>

        {/* Right Panel: Canvas */}
        <View style={[styles.rightPanel, isLargeScreen && { flex: 0.65 }]}>
          {/* Screen indicator */}
          <View style={styles.screenBar}>
            <View style={styles.screen} />
            <Text style={styles.screenLabel}>SCREEN</Text>
          </View>

          {/* Column Headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
            <View>
              <View style={{ flexDirection: 'row', marginLeft: 26, marginBottom: 8 }}>
                {Array.from({ length: cols }, (_, colIdx) => (
                  <TouchableOpacity key={`col-${colIdx}`} onPress={() => paintCol(colIdx)} style={{ width: cellSize + 4, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: 'bold' }}>{colIdx + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Seat grid container with PanResponder */}
              <View {...panResponder.panHandlers}>
                {Array.from({ length: rows }, (_, rowIdx) => (
                  <View key={`row-${rowIdx}`} style={styles.seatRow}>
                    <TouchableOpacity onPress={() => paintRow(rowIdx)}>
                      <Text style={styles.rowLabel}>{String.fromCharCode(65 + rowIdx)}</Text>
                    </TouchableOpacity>
                    {Array.from({ length: cols }, (_, colIdx) => {
                      const seat = seats.find((s) => s.row === rowIdx && s.col === colIdx);
                      if (!seat) return <View key={colIdx} style={{ width: cellSize + 4, height: cellSize + 4 }} />;
                      return (
                        <View
                          key={seat.seatId}
                          pointerEvents="none" // Let the container handle touches
                          style={[styles.seatCell, { width: cellSize, height: cellSize, backgroundColor: seatColor(seat) },
                            activeTool !== 'inactive' && seat.type === activeTool && { borderWidth: 2, borderColor: '#fff' }
                          ]}
                        >
                          {cellSize >= 26 && (
                            <Ionicons name={SEAT_TYPE_ICONS[seat.type] || 'person'} size={10} color="rgba(255,255,255,0.6)" />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

      </View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mainLayout: { flex: 1 },
  leftPanel: { backgroundColor: colors.background },
  rightPanel: { backgroundColor: colors.card, minHeight: 400 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  saveBtn: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  section: { padding: SIZES.md, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 6 },
  input: { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 46, color: colors.textPrimary, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  branchOpt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  branchOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  gridSizeRow: { flexDirection: 'row', marginTop: 8 },
  toolChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5 },
  toolChipActive: { backgroundColor: colors.surfaceElevated },
  toolChipText: { color: colors.textSecondary, fontSize: 12 },
  screenBar: { alignItems: 'center', paddingVertical: 20 },
  screen: { width: '55%', height: 4, backgroundColor: colors.accentSecondary, borderRadius: 2, marginBottom: 4, ...(Platform.OS === 'web' ? { boxShadow: '0px 4px 10px rgba(255,107,107,0.8)' } : { shadowColor: colors.accentSecondary, shadowOpacity: 0.8, shadowRadius: 10 }) },
  screenLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 3 },
  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowLabel: { width: 20, fontSize: 10, color: colors.textPrimary, textAlign: 'right', marginRight: 6, fontWeight: 'bold' },
  seatCell: { margin: 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 3 },
  legendText: { color: colors.textSecondary, fontSize: 12 },
});
