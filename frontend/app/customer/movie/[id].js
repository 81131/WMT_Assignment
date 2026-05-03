import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList, Alert, Platform, Modal
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
  const [allSlots, setAllSlots] = useState([]);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const scrollRef = useRef(null);
  const bookSectionY = useRef(0);

  // Generate next 14 days pool to check availability
  const DATES = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [movieRes, allSlotRes, statsRes, reviewRes] = await Promise.all([
        movieAPI.getById(id),
        slotAPI.getAll(), // fetch ALL slots to compute available dates
        reviewAPI.getStats(id),
        reviewAPI.getAll({ movie: id }),
      ]);
      setMovie(movieRes.data.movie);
      const movieSlots = (allSlotRes.data.timeSlots || []).filter(
        (s) => s.movie?._id === id || s.movie === id
      );
      setAllSlots(movieSlots);
      // Default to first available date
      const firstDate = movieSlots.length > 0
        ? new Date(movieSlots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0].startTime)
        : new Date();
      setSelectedDate(firstDate);
      setSlots(movieSlots.filter((s) => new Date(s.startTime).toDateString() === firstDate.toDateString()));
      setStats(statsRes.data.stats);
      setReviews(reviewRes.data.reviews.slice(0, 5));
    } catch (e) {
      Alert.alert('Error', 'Could not load movie details.');
    } finally {
      setLoading(false);
    }
  };

  // When user picks a date, filter slots client-side (no extra API call)
  const handleDateSelect = (d) => {
    setSelectedDate(d);
    setSlots(allSlots.filter((s) => new Date(s.startTime).toDateString() === d.toDateString()));
  };

  // Compute which dates actually have slots
  const availableDateStrings = new Set(allSlots.map((s) => new Date(s.startTime).toDateString()));
  const availableDates = DATES.filter((d) => availableDateStrings.has(d.toDateString()));

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
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* Hero Banner — full-width poster with deep gradient */}
        <View style={styles.posterContainer}>
          {movie.posterUrl ? (
            <Image source={{ uri: movie.posterUrl }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Ionicons name="film" size={60} color={colors.textMuted} />
            </View>
          )}
          {/* Deep cinema gradient overlay — fades from transparent top to black bottom */}
          <View style={styles.posterOverlay} />

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home')}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* On web: overlay movie info on the hero */}
          {Platform.OS === 'web' && (
            <View style={styles.heroContent}>
              <View style={styles.genreRow}>
                {(movie.genre || []).map((g) => (
                  <View key={g} style={styles.genreTagHero}><Text style={styles.genreTagHeroText}>{g}</Text></View>
                ))}
              </View>
              <Text style={styles.heroTitle}>{movie.title.toUpperCase()}</Text>
              <Text style={styles.heroMeta}>{movie.language} · {movie.duration} min</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <TouchableOpacity style={styles.bookBtn} onPress={() => scrollRef.current?.scrollTo({ y: bookSectionY.current, animated: true })}>
                  <Text style={styles.bookBtnText}>Book Tickets</Text>
                </TouchableOpacity>
                {movie.trailerUrl && (
                  <TouchableOpacity style={styles.trailerBtnHero} onPress={() => setShowTrailer(true)}>
                    <Ionicons name="play" size={14} color="#fff" />
                    <Text style={styles.trailerBtnHeroText}>Watch Trailer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Mobile: Title & badges below poster */}
          {Platform.OS !== 'web' && (
            <>
              <View style={styles.row}>
                <View style={styles.ratingBadge}><Text style={styles.ratingText}>{movie.rating}</Text></View>
                <Text style={styles.duration}>{movie.duration} min</Text>
                <Text style={styles.language}>{movie.language}</Text>
              </View>
              <Text style={styles.title}>{movie.title}</Text>
              <View style={styles.genreRow}>
                {(movie.genre || []).map((g) => (
                  <View key={g} style={styles.genreTag}><Text style={styles.genreTagText}>{g}</Text></View>
                ))}
              </View>
            </>
          )}

          {/* About the Film */}
          <Text style={styles.sectionTitle}>About The Film</Text>
          <Text style={styles.description}>{movie.description}</Text>

          {/* Mobile Trailer Button */}
          {movie.trailerUrl && Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.trailerBtn} onPress={() => setShowTrailer(true)}>
              <Ionicons name="play-circle" size={22} color="#fff" />
              <Text style={styles.trailerBtnText}>Play Trailer</Text>
            </TouchableOpacity>
          )}

          {/* Cast */}
          {movie.cast?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Cast & Crew</Text>
              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingVertical: 4 }}>
                  {movie.cast.map((actor, idx) => (
                    <View key={idx} style={{ alignItems: 'center', width: 90 }}>
                      <View style={styles.castAvatar}>
                        {actor.photoUrl ? (
                          <Image source={{ uri: actor.photoUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Ionicons name="person" size={28} color={colors.textMuted} />
                        )}
                      </View>
                      <Text style={styles.castName} numberOfLines={2}>{actor.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SIZES.md }} contentContainerStyle={{ paddingHorizontal: SIZES.md, gap: 16 }}>
                  {movie.cast.map((actor, idx) => (
                    <View key={idx} style={{ alignItems: 'center', width: 80 }}>
                      <View style={styles.castAvatar}>
                        {actor.photoUrl ? (
                          <Image source={{ uri: actor.photoUrl }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Ionicons name="person" size={24} color={colors.textMuted} />
                        )}
                      </View>
                      <Text style={styles.castName} numberOfLines={2}>{actor.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
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

          {/* Select Date — anchor point for scroll */}
          <View onLayout={(e) => { bookSectionY.current = e.nativeEvent.layout.y + 460; }}>
            <Text style={styles.sectionTitle}>Book Tickets</Text>
          </View>
          {availableDates.length === 0 ? (
            <Text style={styles.noSlots}>No upcoming showtimes scheduled.</Text>
          ) : (
            <FlatList
              horizontal
              data={availableDates}
              keyExtractor={(d) => d.toISOString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              renderItem={({ item: d }) => {
                const isSelected = selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <TouchableOpacity
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => handleDateSelect(d)}
                  >
                    <Text style={[styles.dateDay, isSelected && { color: '#000' }]}>
                      {d.toLocaleDateString('en', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateNum, isSelected && { color: '#000' }]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

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
                  
                  {r.managerResponse && (
                    <View style={styles.managerResponseContainer}>
                      <Text style={styles.managerResponseTitle}>Manager Response:</Text>
                      <Text style={styles.managerResponseText}>{r.managerResponse}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
          <View style={{ height: 30 }} />
        </View>
        </ScrollView>

        {/* Trailer Modal */}
        {movie.trailerUrl && showTrailer && (
          <Modal
            visible={showTrailer}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTrailer(false)}
          >
            <View style={styles.trailerOverlay}>
              <View style={styles.trailerContainer}>
                <TouchableOpacity style={styles.trailerClose} onPress={() => setShowTrailer(false)}>
                  <Ionicons name="close-circle" size={32} color="#fff" />
                </TouchableOpacity>
                {Platform.OS === 'web' ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(movie.trailerUrl)}?autoplay=1`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  // On native, open in browser since expo-av or WebView may not be installed
                  (() => {
                    const { Linking } = require('react-native');
                    Linking.openURL(movie.trailerUrl);
                    setShowTrailer(false);
                    return null;
                  })()
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
}

// Extract YouTube video ID from full URL or short URL
function extractYoutubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return match ? match[1] : url;
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' },

  // Hero poster
  posterContainer: { height: Platform.OS === 'web' ? 460 : 280, position: 'relative' },
  poster: { width: '100%', height: '100%' },
  posterFallback: { backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: Platform.OS === 'web'
      ? 'linear-gradient(to bottom, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.6) 40%, rgba(13,13,13,0.97) 100%)'
      : undefined,
    backgroundColor: Platform.OS !== 'web' ? 'rgba(13,13,13,0.45)' : undefined,
  },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },

  // Web hero overlay content
  heroContent: { position: 'absolute', bottom: 32, left: 32, right: 32, zIndex: 5 },
  heroTitle: { fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroMeta: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },

  // Hero genre tags
  genreTagHero: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  genreTagHeroText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // Hero CTA buttons
  bookBtn: { backgroundColor: '#C9A227', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  bookBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  trailerBtnHero: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  trailerBtnHeroText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Body
  body: { padding: SIZES.md, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  ratingBadge: { backgroundColor: '#C9A227', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  ratingText: { color: '#000', fontSize: 11, fontWeight: 'bold' },
  duration: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  language: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 10, letterSpacing: 1 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  genreTag: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  genreTagText: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  description: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22, marginBottom: 8 },

  // Section titles — gold uppercase cinema style
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#C9A227', marginTop: 24, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },

  // Cast
  castAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E1E1E', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 2, borderColor: 'rgba(201,162,39,0.4)' },
  castName: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', fontWeight: '600', marginTop: 4 },

  // Mobile trailer btn
  trailerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 6, paddingVertical: 11, paddingHorizontal: 18, alignSelf: 'flex-start', marginVertical: 12 },
  trailerBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Trailer modal
  trailerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  trailerContainer: { width: '90%', aspectRatio: 16 / 9, position: 'relative', backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' },
  trailerClose: { position: 'absolute', top: -40, right: 0, zIndex: 10 },

  // Stats
  statsCard: { backgroundColor: '#141414', borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  starLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, width: 70 },
  starValue: { color: '#C9A227', fontSize: 13, fontWeight: 'bold' },

  // Date chips
  dateChip: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', minWidth: 72 },
  dateChipActive: { backgroundColor: '#C9A227', borderColor: '#C9A227' },
  dateDay: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1 },
  dateNum: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  noSlots: { color: 'rgba(255,255,255,0.4)', fontSize: 14, paddingVertical: 12 },

  // Cinema groups & time chips
  cinemaGroup: { backgroundColor: '#141414', borderRadius: SIZES.radius, padding: SIZES.md, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cinemaTitle: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  slotChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6, borderWidth: 1, borderColor: '#C9A227', backgroundColor: 'rgba(201,162,39,0.08)' },
  timeChipTime: { color: '#C9A227', fontSize: 13, fontWeight: '700' },
  timeChipPrice: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // Reviews
  reviewCard: { backgroundColor: '#141414', borderRadius: SIZES.radius, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  reviewAuthor: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  reviewComment: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20, marginTop: 4 },
  managerResponseContainer: { marginTop: 10, padding: 10, backgroundColor: 'rgba(201,162,39,0.08)', borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#C9A227' },
  managerResponseTitle: { fontSize: 11, fontWeight: 'bold', color: '#C9A227', marginBottom: 2 },
  managerResponseText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
});
