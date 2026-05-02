import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { branchAPI, movieAPI, slotAPI, hallAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SIZES, ROLES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';



export default function ManagerDashboard() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ branches: 0, movies: 0, halls: 0, slots: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMain = user?.role === ROLES.MAIN_MANAGER;

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderColor: color + '55' }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const fetchStats = async () => {
    try {
      const [branchRes, movieRes, hallRes, slotRes] = await Promise.all([
        isMain ? branchAPI.getAll() : Promise.resolve({ data: { count: 1 } }),
        movieAPI.getAll(),
        hallAPI.getAll(),
        slotAPI.getAll(),
      ]);
      setStats({
        branches: branchRes.data.count,
        movies: movieRes.data.count,
        halls: hallRes.data.count,
        slots: slotRes.data.count,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const MENU_ITEMS = [
    { icon: 'film-outline', label: 'Movies', route: '/manager/movies', color: colors.primary },
    { icon: 'time-outline', label: 'Time Slots', route: '/manager/slots', color: colors.accentSecondary },
    ...(isMain ? [
      { icon: 'business-outline', label: 'Branches', route: '/manager/branches', color: colors.accent },
    ] : []),
    { icon: 'grid-outline', label: 'Halls', route: '/manager/halls', color: colors.seatProducer },
    { icon: 'people-outline', label: 'Staff', route: '/manager/staff', color: colors.success },
    { icon: 'scan-outline', label: 'Scanner', route: '/manager/scanner', color: colors.info },
    { icon: 'star-outline', label: 'Reviews', route: '/manager/reviews', color: colors.warning },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>{isMain ? 'Main Manager' : 'Branch Manager'}</Text>
          <Text style={styles.name}>{user?.name}</Text>
          {!isMain && <Text style={styles.branchNote}>Your branch only</Text>}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.primary} />}
      >
        {/* Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {isMain && <StatCard icon="business-outline" label="Branches" value={stats.branches} color={colors.accent} />}
            <StatCard icon="film-outline" label="Movies" value={stats.movies} color={colors.primary} />
            <StatCard icon="grid-outline" label="Halls" value={stats.halls} color={colors.seatProducer} />
            <StatCard icon="time-outline" label="Slots" value={stats.slots} color={colors.accentSecondary} />
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuCard}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: SIZES.md, paddingTop: 55 },
  role: { fontSize: 13, color: colors.primary, fontWeight: '600', letterSpacing: 0.5 },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginTop: 2 },
  branchNote: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logoutBtn: { padding: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, paddingHorizontal: SIZES.md, marginTop: SIZES.md, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIZES.md, gap: 10 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, alignItems: 'center', borderWidth: 1, gap: 4 },
  statValue: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  menuGrid: { paddingHorizontal: SIZES.md, gap: 8 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: colors.border },
  menuIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
});
