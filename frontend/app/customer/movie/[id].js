import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { movieAPI, slotAPI, reviewAPI } from '../../../services/api';
import { SIZES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

export default function MovieDetail() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [slots, setSlots] = useState([]);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const DATES = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => { if (id) fetchAll(); }, [id, selectedDate]);

  const fetchAll = async () => {
    try {
      const [movieRes, slotRes, statsRes, reviewRes] = await Promise.all([
        movieAPI.getById(id),
        slotAPI.getAll({ date: selectedDate.toISOString().split('T')[0] }),
        reviewAPI.getStats(id),
        reviewAPI.getAll({ movie: id }),
      ]);
      setMovie(movieRes.data.movie);
      // filter slots for this movie only
      setSlots(slotRes.data.timeSlots.filter((s) => s.movie?._id === id || s.movie === id));
      setStats(statsRes.data.stats);
      setReviews(reviewRes.data.reviews.slice(0, 5));
    } catch (e) {
      Alert.alert('Error', 'Could not load movie details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!movie) return <View style={styles.center}><Text style={{ color: colors.textPrimary }}>Movie not found.</Text></View>;

  const StarRow = ({ rating, label }) => (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Ionicons key={n} name={n <= Math.round(rating) ? 'star' : 'star-outline'} size={14} color={colors.accent} />
        ))}
      </View>
      <Text style={styles.starValue}>{rating?.toFixed(1) || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Poster */}
        <View style={styles.posterContainer}>
          {movie.posterUrl ? (
            <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Ionicons name="film" size={60} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.posterOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Title & badges */}
          <View style={styles.row}>
            <View style={styles.ratingBadge}><Text style={styles.ratingText}>{movie.rating}</Text></View>
            <Text style={styles.duration}>{movie.duration} min</Text>
            <Text style={styles.language}>{movie.language}</Text>
          </View>
          <Text style={styles.title}>{movie.title}</Text>

          {/* Genres */}
          <View style={styles.genreRow}>
            {(movie.genre || []).map((g) => (
              <View key={g} style={styles.genreTag}><Text style={styles.genreTagText}>{g}</Text></View>
            ))}
          </View>

          <Text style={styles.description}>{movie.description}</Text>

          {/* Cast */}
          {movie.cast?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SIZES.md }} contentContainerStyle={{ paddingHorizontal: SIZES.md, gap: 16 }}>
                {movie.cast.map((actor, idx) => (
                  <View key={idx} style={{ alignItems: 'center', width: 70 }}>
                    <View style={styles.castAvatar}>
                      {actor.photoUrl ? (
                        <Image source={{ uri: actor.photoUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <Ionicons name="person" size={24} color={colors.textMuted} />
                      )}
                    </View>
                    <Text style={styles.castName} numberOfLines={2} textAlign="center">{actor.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Ratings summary */}
          {stats?.totalReviews > 0 && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Ratings ({stats.totalReviews} reviews)</Text>
              <StarRow rating={stats.avgMovieRating} label="Movie" />
              <StarRow rating={stats.avgHallRating} label="Hall" />
              <StarRow rating={stats.avgFacilityRating} label="Facilities" />
            </View>
          )}

          {/* Date picker */}
          <Text style={styles.sectionTitle}>Select Date</Text>
          <FlatList
            horizontal
            data={DATES}
            keyExtractor={(d) => d.toISOString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            renderItem={({ item: d }) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  style={[styles.dateChip, isSelected && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.dateDay, isSelected && { color: '#fff' }]}>
                    {d.toLocaleDateString('en', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dateNum, isSelected && { color: '#fff' }]}>{d.getDate()}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Time Slots */}
          <Text style={styles.sectionTitle}>Showtimes</Text>
          {slots.length === 0 ? (
            <Text style={styles.noSlots}>No showtimes available for this date.</Text>
          ) : (
            Object.entries(
              slots.reduce((acc, slot) => {
                const branchName = slot.branch?.name || 'Unknown Cinema';
                if (!acc[branchName]) acc[branchName] = [];
                acc[branchName].push(slot);
                return acc;
              }, {})
            ).map(([branch, branchSlots]) => (
              <View key={branch} style={styles.cinemaGroup}>
                <Text style={styles.cinemaTitle}>{branch}</Text>
                <View style={styles.slotChipsContainer}>
                  {branchSlots.map((slot) => {
                    const timeStr = new Date(slot.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
                    const format = slot.hall?.screenType || '2D';
                    const price = slot.pricing?.regular || 0;
                    return (
                      <TouchableOpacity
                        key={slot._id}
                        style={styles.timeChip}
                        onPress={() => router.push(`/customer/seats/${slot._id}`)}
                      >
                        <Text style={styles.timeChipTime}>{timeStr} [{format}] </Text>
                        <Text style={styles.timeChipPrice}>LKR {price}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {/* Recent Reviews */}
          {reviews.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {reviews.map((r) => (
                <View key={r._id} style={styles.reviewCard}>
                  <Text style={styles.reviewAuthor}>{r.customer?.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 2, marginVertical: 4 }}>
                    {[1,2,3,4,5].map((n) => (
                      <Ionicons key={n} name={n <= r.movieRating ? 'star' : 'star-outline'} size={12} color={colors.accent} />
                    ))}
                  </View>
                  <Text style={styles.reviewComment}>{r.comment}</Text>
                </View>
              ))}
            </>
          )}
          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  posterContainer: { height: 280, position: 'relative' },
  poster: { width: '100%', height: '100%' },
  posterFallback: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  posterOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 13, 26, 0.4)' },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  body: { padding: SIZES.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  ratingBadge: { backgroundColor: colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  ratingText: { color: colors.accent, fontSize: 11, fontWeight: 'bold' },
  duration: { color: colors.textSecondary, fontSize: 12 },
  language: { color: colors.textSecondary, fontSize: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  genreTag: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  genreTagText: { color: colors.textSecondary, fontSize: 12 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  castAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceElevated, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  castName: { color: colors.textPrimary, fontSize: 11, textAlign: 'center' },
  statsCard: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 14, borderWidth: 1, borderColor: colors.border },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  starLabel: { color: colors.textSecondary, fontSize: 13, width: 70 },
  starValue: { color: colors.accent, fontSize: 13, fontWeight: 'bold' },
  dateChip: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textSecondary },
  dateNum: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  noSlots: { color: colors.textMuted, fontSize: 14, paddingVertical: 12 },
  cinemaGroup: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cinemaTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  slotChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.primary },
  timeChipTime: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  timeChipPrice: { color: colors.textSecondary, fontSize: 12 },
  reviewCard: { backgroundColor: colors.card, borderRadius: SIZES.radius, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  reviewAuthor: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },
  reviewComment: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
