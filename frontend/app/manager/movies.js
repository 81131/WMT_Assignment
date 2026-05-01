import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { movieAPI } from '../../services/api';
import { SIZES } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemeStyles } from '../../utils/themeUtils';

export default function ManagerMovies() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const router = useRouter();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovies = useCallback(async () => {
    try {
      const { data } = await movieAPI.getAll({ includeInactive: true });
      setMovies(data.movies);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchMovies(); }, []);

  const handleDelete = (id, title) => {
    Alert.alert('Deactivate Movie', `Deactivate "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            await movieAPI.delete(id);
            setMovies((prev) => prev.filter((m) => m._id !== id));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to deactivate.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.posterUrl ? (
        <Image source={{ uri: item.posterUrl }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Ionicons name="film-outline" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.movieMeta}>{item.language} • {item.duration} min</Text>
        <Text style={styles.branch}>{item.branch?.name}</Text>
        <View style={[styles.activeBadge, { backgroundColor: item.isActive ? colors.success + '22' : colors.error + '22' }]}>
          <Text style={{ fontSize: 11, color: item.isActive ? colors.success : colors.error }}>{item.isActive ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => router.push(`/manager/movie-edit/${item._id}`)}>
          <Ionicons name="pencil-outline" size={20} color={colors.accentSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id, item.title)} style={{ marginTop: 12 }}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Movies</Text>
        <TouchableOpacity onPress={() => router.push('/manager/movie-add')}>
          <Ionicons name="add-circle" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={movies}
          keyExtractor={(m) => m._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SIZES.md, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMovies(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No movies yet. Tap + to add one.</Text>}
        />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, paddingTop: 52, borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 12 },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  poster: { width: 70, height: 100 },
  posterFallback: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: 10, gap: 3 },
  movieTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  movieMeta: { fontSize: 12, color: colors.textSecondary },
  branch: { fontSize: 12, color: colors.textMuted },
  activeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  actions: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 15 },
});
