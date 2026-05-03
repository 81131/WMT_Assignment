import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, TextInput, ActivityIndicator, RefreshControl, ScrollView, Modal, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { movieAPI, slotAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function CustomerHome() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const [movies, setMovies] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Now Showing');
  const router = useRouter();
  const { user } = useAuth();

  // Quick Book State
  const [qbMovie, setQbMovie] = useState(null);
  const [qbDate, setQbDate] = useState(null);
  const [qbCinema, setQbCinema] = useState(null);
  const [qbTime, setQbTime] = useState(null);
  
  // Selection Modal
  const [selectModal, setSelectModal] = useState({ visible: false, type: '', options: [] });

  const fetchData = useCallback(async () => {
    try {
      const [moviesRes, slotsRes] = await Promise.all([
        movieAPI.getAll({ search: search || undefined }),
        slotAPI.getAll()
      ]);
      setMovies(moviesRes.data.movies);
      setSlots(slotsRes.data.timeSlots || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // --- Quick Book Logic ---
  
  // 1. Available Movies
  const availableMovies = useMemo(() => {
    const movieIdsWithSlots = new Set(slots.map(s => s.movie?._id));
    return movies.filter(m => movieIdsWithSlots.has(m._id));
  }, [movies, slots]);

  // 2. Available Dates (based on selected movie)
  const availableDates = useMemo(() => {
    if (!qbMovie) return [];
    const dates = new Set(slots.filter(s => s.movie?._id === qbMovie._id).map(s => new Date(s.startTime).toDateString()));
    return Array.from(dates).sort((a,b) => new Date(a) - new Date(b));
  }, [qbMovie, slots]);

  // 3. Available Cinemas (based on movie & date)
  const availableCinemas = useMemo(() => {
    if (!qbMovie || !qbDate) return [];
    const c = new Map();
    slots.filter(s => s.movie?._id === qbMovie._id && new Date(s.startTime).toDateString() === qbDate)
         .forEach(s => {
            if (s.branch && s.hall) {
              const label = `${s.branch.name} — ${s.hall.name}`;
              c.set(label, { branch: s.branch, hall: s.hall });
            }
         });
    return Array.from(c.entries()).map(([label, val]) => ({ label, ...val }));
  }, [qbMovie, qbDate, slots]);

  // 4. Available Times (based on movie, date, cinema)
  const availableTimes = useMemo(() => {
    if (!qbMovie || !qbDate || !qbCinema) return [];
    return slots.filter(s => 
      s.movie?._id === qbMovie._id && 
      new Date(s.startTime).toDateString() === qbDate &&
      s.branch?._id === qbCinema.branch._id &&
      s.hall?._id === qbCinema.hall._id
    ).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  }, [qbMovie, qbDate, qbCinema, slots]);

  const openSelect = (type) => {
    let options = [];
    if (type === 'movie') options = availableMovies.map(m => ({ label: m.title, value: m }));
    if (type === 'date') options = availableDates.map(d => ({ label: d, value: d }));
    if (type === 'cinema') options = availableCinemas.map(c => ({ label: c.label, value: c }));
    if (type === 'time') options = availableTimes.map(t => {
      const timeStr = new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { label: `${timeStr} [${t.hall.screenType}]`, value: t };
    });
    
    if (options.length === 0) return;
    setSelectModal({ visible: true, type, options });
  };

  const handleSelect = (option) => {
    const { type, value } = selectModal;
    setSelectModal({ visible: false, type: '', options: [] });
    if (selectModal.type === 'movie') { setQbMovie(option.value); setQbDate(null); setQbCinema(null); setQbTime(null); }
    if (selectModal.type === 'date') { setQbDate(option.value); setQbCinema(null); setQbTime(null); }
    if (selectModal.type === 'cinema') { setQbCinema(option.value); setQbTime(null); }
    if (selectModal.type === 'time') { setQbTime(option.value); }
  };

  const handleQuickBook = () => {
    if (!qbTime) return;
    router.push(`/customer/seats/${qbTime._id}`);
  };

  // --- Render ---

  const MovieCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/customer/movie/${item._id}`)}
      {...(Platform.OS === 'web' && { accessibilityRole: 'link' })}
    >
      <View style={styles.cardImageContainer}>
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={40} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        {/* Gradient fade at bottom of card */}
        <View style={styles.cardGradient} />
        <View style={styles.badgeTopLeft}>
          <Text style={styles.badgeTextBlack}>In Cinemas</Text>
        </View>
        <View style={styles.badgeTopLeftRating}>
          <Text style={styles.badgeTextWhite}>{item.rating}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="star" size={12} color="#C9A227" />
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' }}>
            {item.avgStarRating > 0 ? item.avgStarRating.toFixed(1) : 'New'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header / Navbar */}
      <View style={styles.header}>
        <Text style={styles.logoText}>CinemaApp</Text>
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/customer/tickets')}>
             <Text style={styles.navLink}>My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C9A227" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Quick Book Widget */}
        <View style={styles.quickBookWrapper}>
          <Text style={styles.sectionTitleQb}>Quick Book</Text>
          <View style={styles.quickBookRow}>
            <TouchableOpacity style={styles.qbDropdown} onPress={() => openSelect('movie')}>
              <Text style={{ color: qbMovie ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 14 }} numberOfLines={1}>
                {qbMovie ? qbMovie.title : 'Select Movie'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.qbDropdown, !qbMovie && { opacity: 0.4 }]} disabled={!qbMovie} onPress={() => openSelect('date')}>
              <Text style={{ color: qbDate ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 14 }} numberOfLines={1}>
                {qbDate ? qbDate.substring(0, 10) : 'Select Date'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.qbDropdown, !qbDate && { opacity: 0.4 }]} disabled={!qbDate} onPress={() => openSelect('cinema')}>
              <Text style={{ color: qbCinema ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 14 }} numberOfLines={1}>
                {qbCinema ? qbCinema.label : 'Select Cinema'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.qbDropdown, !qbCinema && { opacity: 0.4 }]} disabled={!qbCinema} onPress={() => openSelect('time')}>
              <Text style={{ color: qbTime ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontSize: 14 }} numberOfLines={1}>
                {qbTime ? new Date(qbTime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.qbBtn, !qbTime && { opacity: 0.5 }]} 
              disabled={!qbTime}
              onPress={handleQuickBook}
            >
              <Text style={styles.qbBtnText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'Now Showing' && styles.tabBtnActive]} onPress={() => setActiveTab('Now Showing')}>
            <Text style={[styles.tabBtnText, activeTab === 'Now Showing' && styles.tabBtnTextActive]}>Now Showing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'Coming Soon' && styles.tabBtnActive]} onPress={() => setActiveTab('Coming Soon')}>
            <Text style={[styles.tabBtnText, activeTab === 'Coming Soon' && styles.tabBtnTextActive]}>Coming Soon</Text>
          </TouchableOpacity>
        </View>

        {/* Movie Grid */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.movieGrid}>
            {movies.map(m => <MovieCard key={m._id} item={m} />)}
          </View>
        )}
      </ScrollView>

      {/* Select Modal */}
      {selectModal.visible && (
        <Modal transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectModal({ visible: false })}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select {selectModal.type}</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {selectModal.options.map((opt, i) => (
                  <TouchableOpacity key={i} style={styles.modalOption} onPress={() => handleSelect(opt)}>
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  // Navbar
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.lg, height: 64,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0D0D0D',
  },
  logoText: { color: '#C9A227', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  navLink: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },

  // Quick book
  quickBookWrapper: { backgroundColor: '#141414', margin: SIZES.md, padding: SIZES.md, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionTitleQb: { color: '#C9A227', fontSize: 13, fontWeight: '800', marginBottom: 12, letterSpacing: 2 },
  quickBookRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qbDropdown: {
    flex: 1, minWidth: 120, height: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, paddingHorizontal: 12
  },
  qbBtn: { flex: 1, minWidth: 120, height: 44, backgroundColor: '#C9A227', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  qbBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: SIZES.md, marginBottom: SIZES.md, gap: 10 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: '#C9A227', borderColor: '#C9A227' },
  tabBtnText: { color: 'rgba(255,255,255,0.55)', fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: '#000', fontWeight: '700' },

  // Movie grid & cards
  movieGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIZES.md, justifyContent: 'flex-start', gap: 16 },
  card: { width: Platform.OS === 'web' ? 200 : '48%', marginBottom: 20 },
  cardImageContainer: { position: 'relative', width: '100%', aspectRatio: 0.67, borderRadius: SIZES.radius, overflow: 'hidden', backgroundColor: '#1A1A1A' },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.4)' },
  badgeTopLeft: { position: 'absolute', top: 8, left: 36, backgroundColor: '#C9A227', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeTextBlack: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  badgeTopLeftRating: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  badgeTextWhite: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  cardBody: { marginTop: 8 },
  movieTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Select Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#141414', borderRadius: SIZES.radiusLg, padding: SIZES.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12, textTransform: 'capitalize' },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
});
