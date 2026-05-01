import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { movieAPI, branchAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function CustomerHome() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const GENRES = ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance'];

  const fetchMovies = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (genre) params.genre = genre;
      const { data } = await movieAPI.getAll(params);
      setMovies(data.movies);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, genre]);

  useEffect(() => { fetchMovies(); }, [fetchMovies]);

  const onRefresh = () => { setRefreshing(true); fetchMovies(); };

  const MovieCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/customer/movie/${item._id}`)}>
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Ionicons name="film-outline" size={40} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.movieMeta}>{item.language} • {item.duration} min</Text>
        <View style={styles.genreRow}>
          {(item.genre || []).slice(0, 2).map((g) => (
            <View key={g} style={styles.genreTag}>
              <Text style={styles.genreTagText}>{g}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push(`/customer/movie/${item._id}`)}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>What are you watching today?</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/customer/tickets')}>
          <Ionicons name="ticket-outline" size={26} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search movies..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Genre Filter */}
      <FlatList
        horizontal
        data={GENRES}
        keyExtractor={(g) => g}
        showsHorizontalScrollIndicator={false}
        style={styles.genreFilter}
        contentContainerStyle={{ paddingHorizontal: SIZES.md, gap: 8 }}
        renderItem={({ item: g }) => (
          <TouchableOpacity
            style={[styles.filterChip, genre === g && styles.filterChipActive]}
            onPress={() => setGenre(genre === g ? null : g)}
          >
            <Text style={[styles.filterChipText, genre === g && styles.filterChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Movie List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(m) => m._id}
          renderItem={({ item }) => <MovieCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="film-outline" size={60} color={colors.textMuted} />
              <Text style={styles.emptyText}>No movies found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.md, paddingTop: 55 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  subGreeting: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: SIZES.md, borderRadius: SIZES.radius, paddingHorizontal: 14,
    height: 46, borderWidth: 1, borderColor: colors.border, marginBottom: SIZES.sm,
  },
  searchInput: { flex: 1, color: colors.textPrimary, marginLeft: 8, fontSize: 14 },
  genreFilter: { maxHeight: 44, marginBottom: SIZES.sm },
  filterChip: { paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: 13 },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: SIZES.md, gap: 14 },
  card: { backgroundColor: colors.card, borderRadius: SIZES.radiusLg, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  poster: { width: 100, height: 140 },
  posterPlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  ratingBadge: { alignSelf: 'flex-start', backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  ratingText: { color: colors.accent, fontSize: 11, fontWeight: 'bold' },
  movieTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  movieMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  genreRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  genreTag: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  genreTagText: { color: colors.textSecondary, fontSize: 11 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 15 },
});
