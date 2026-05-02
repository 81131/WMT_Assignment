import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch, Platform, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { movieAPI, branchAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { SIZES, ROLES } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemeStyles } from '../../../utils/themeUtils';

const GENRES = ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary'];
const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17'];

const Field = ({ label, styles, colors, ...props }) => (
  <View style={{ marginBottom: SIZES.md }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
  </View>
);

export default function MovieForm() {
  const { colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const { id } = useLocalSearchParams();
  const isEdit = id && id !== 'new';
  const router = useRouter();
  const { user } = useAuth();
  const isMain = user?.role === ROLES.MAIN_MANAGER;

  const [form, setForm] = useState({ title: '', description: '', duration: '', language: '', rating: 'PG', genre: [], cast: [], trailerUrl: '', branches: [], isActive: true });
  const [castInput, setCastInput] = useState('');
  const [distinctActors, setDistinctActors] = useState([]);
  const [filteredActors, setFilteredActors] = useState([]);
  const [posterUri, setPosterUri] = useState(null);
  const [existingPoster, setExistingPoster] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdMovieId, setCreatedMovieId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (isMain) {
          const { data } = await branchAPI.getAll();
          setBranches(data.branches);
        }
        }
        
        try {
          const { data: actorData } = await movieAPI.getDistinctActors();
          setDistinctActors(actorData.actors || []);
        } catch (e) { console.log('Could not fetch distinct actors', e); }

        if (isEdit) {
          const { data } = await movieAPI.getById(id);
          const m = data.movie;
          setForm({ 
            title: m.title, description: m.description, duration: String(m.duration), 
            language: m.language, rating: m.rating, genre: m.genre || [], 
            cast: m.cast?.map(c => typeof c === 'string' ? { name: c, photoUrl: null } : c) || [], 
            trailerUrl: m.trailerUrl || '', 
            branches: m.branches ? m.branches.map(b => b._id || b) : [], 
            isActive: m.isActive 
          });
          setExistingPoster(m.posterUrl);
        } else if (!isMain) {
          setForm((f) => ({ ...f, branches: [user.assignedBranch] }));
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [id]);

  const toggleGenre = (g) => setForm((f) => ({ ...f, genre: f.genre.includes(g) ? f.genre.filter((x) => x !== g) : [...f.genre, g] }));
  
  const toggleBranch = (bId) => setForm(f => ({
    ...f, 
    branches: f.branches.includes(bId) ? f.branches.filter(x => x !== bId) : [...f.branches, bId]
  }));

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You've refused to allow this app to access your photos!");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPosterUri(result.assets[0].uri);
    }
  };

  const pickActorImage = async (idx) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) return Alert.alert("Permission Refused", "You need to allow access to upload actor photos.");
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const uri = result.assets[0].uri;
        const formData = new FormData();
        if (Platform.OS === 'web') {
           const res = await fetch(uri);
           const blob = await res.blob();
           formData.append('image', blob, 'actor.jpg');
        } else {
           const filename = uri.split('/').pop() || 'actor.jpg';
           const type = `image/${filename.split('.').pop() || 'jpeg'}`;
           formData.append('image', { uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri, name: filename, type });
        }
        
        const { data } = await movieAPI.uploadActorImage(formData);
        
        setForm(f => {
          const newCast = [...f.cast];
          newCast[idx].photoUrl = data.imageUrl;
          return { ...f, cast: newCast };
        });
      } catch (err) {
        Alert.alert('Upload Failed', 'Could not upload actor image.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.duration || !form.language || form.branches.length === 0) 
      return Alert.alert('Error', 'Title, duration, language, and at least one branch are required.');
      
    setSaving(true);
    try {
      const payload = { ...form, duration: parseInt(form.duration) };
      
      let movieId = isEdit ? id : createdMovieId;
      if (movieId) {
        await movieAPI.update(movieId, payload);
      } else {
        const { data } = await movieAPI.create(payload);
        movieId = data.movie._id;
        setCreatedMovieId(movieId);
      }

      if (posterUri) {
        const formData = new FormData();
        if (Platform.OS === 'web') {
           const res = await fetch(posterUri);
           const blob = await res.blob();
           formData.append('poster', blob, 'poster.jpg');
        } else {
           const filename = posterUri.split('/').pop() || 'poster.jpg';
           const match = /\.(\w+)$/.exec(filename);
           const type = match ? `image/${match[1]}` : `image`;
           formData.append('poster', {
             uri: Platform.OS === 'ios' ? posterUri.replace('file://', '') : posterUri,
             name: filename,
             type,
           });
        }
        await movieAPI.uploadPoster(movieId, formData);
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/manager/movies');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save movie.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Movie' : 'Add Movie'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: SIZES.md }}>
        
        {/* Poster Upload */}
        <Text style={styles.label}>Movie Poster</Text>
        <TouchableOpacity style={styles.posterUpload} onPress={pickImage}>
          {(posterUri || existingPoster) ? (
            <Image source={{ uri: posterUri || existingPoster }} style={styles.posterImg} resizeMode="cover" />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Tap to upload poster</Text>
            </View>
          )}
        </TouchableOpacity>

        <Field styles={styles} colors={colors} label="Title *" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Movie title" />
        <View style={{ marginBottom: SIZES.md }}>
          <Text style={styles.label}>Description *</Text>
          <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} multiline placeholder="Movie description" placeholderTextColor={colors.textMuted} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} />
        </View>
        <Field styles={styles} colors={colors} label="Duration (minutes) *" value={form.duration} onChangeText={(v) => setForm((f) => ({ ...f, duration: v }))} keyboardType="numeric" placeholder="120" />
        <Field styles={styles} colors={colors} label="Language *" value={form.language} onChangeText={(v) => setForm((f) => ({ ...f, language: v }))} placeholder="English" />
        {/* Cast Members (Tag Input & Photo Upload) */}
        <Text style={styles.label}>Cast Members</Text>
        <View style={{ marginBottom: SIZES.md, gap: 10 }}>
          {form.cast.map((actor, idx) => (
            <View key={idx} style={styles.actorCard}>
              <TouchableOpacity onPress={() => pickActorImage(idx)} style={styles.actorAvatarBtn}>
                {actor.photoUrl ? (
                  <Image source={{ uri: actor.photoUrl }} style={styles.actorAvatar} />
                ) : (
                  <View style={styles.actorAvatarPlaceholder}>
                    <Ionicons name="camera" size={16} color={colors.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.actorName}>{actor.name}</Text>
              <TouchableOpacity onPress={() => setForm(f => ({ ...f, cast: f.cast.filter((_, i) => i !== idx) }))}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          
          <View style={{ zIndex: 10 }}>
            <TextInput
              style={styles.input}
              placeholder="Type actor name..."
              placeholderTextColor={colors.textMuted}
              value={castInput}
              onChangeText={(text) => {
                setCastInput(text);
                if (text.length > 0) {
                  setFilteredActors(distinctActors.filter(a => a.toLowerCase().includes(text.toLowerCase()) && !form.cast.find(c => c.name === a)));
                } else {
                  setFilteredActors([]);
                }
              }}
              onSubmitEditing={() => {
                const newActor = castInput.trim();
                if (newActor && !form.cast.find(c => c.name === newActor)) {
                  setForm(f => ({ ...f, cast: [...f.cast, { name: newActor, photoUrl: null }] }));
                }
                setCastInput('');
                setFilteredActors([]);
              }}
            />
            {filteredActors.length > 0 && (
              <View style={[styles.suggestionBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                {filteredActors.map(actor => (
                  <TouchableOpacity 
                    key={actor} 
                    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setForm(f => ({ ...f, cast: [...f.cast, { name: actor, photoUrl: null }] }));
                      setCastInput('');
                      setFilteredActors([]);
                    }}
                  >
                    <Text style={{ color: colors.textPrimary }}>{actor}</Text>
                    <Ionicons name="add" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <Field styles={styles} colors={colors} label="Trailer URL" value={form.trailerUrl} onChangeText={(v) => setForm((f) => ({ ...f, trailerUrl: v }))} placeholder="https://youtube.com/..." keyboardType="url" />

        {/* Rating */}
        <Text style={styles.label}>Age Rating</Text>
        <View style={styles.chipRow}>
          {RATINGS.map((r) => (
            <TouchableOpacity key={r} style={[styles.chip, form.rating === r && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, rating: r }))}>
              <Text style={[styles.chipText, form.rating === r && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Genre */}
        <Text style={styles.label}>Genres</Text>
        <View style={styles.chipRow}>
          {GENRES.map((g) => (
            <TouchableOpacity key={g} style={[styles.chip, form.genre.includes(g) && styles.chipActive]} onPress={() => toggleGenre(g)}>
              <Text style={[styles.chipText, form.genre.includes(g) && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Branch selector (main manager only) */}
        {isMain && (
          <>
            <Text style={styles.label}>Assign Branches *</Text>
            {branches.map((b) => (
              <TouchableOpacity key={b._id} style={[styles.branchOpt, form.branches.includes(b._id) && styles.branchOptActive]} onPress={() => toggleBranch(b._id)}>
                <Text style={{ color: form.branches.includes(b._id) ? '#fff' : colors.textPrimary }}>{b.name} — {b.city}</Text>
                {form.branches.includes(b._id) && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Active toggle (edit mode) */}
        {isEdit && (
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Active</Text>
            <Switch value={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))} trackColor={{ true: colors.primary }} />
          </View>
        )}
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
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, color: colors.textPrimary, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SIZES.md },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  branchOpt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  branchOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SIZES.md },
  posterUpload: { alignSelf: 'center', width: 140, height: 210, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: SIZES.md, justifyContent: 'center', alignItems: 'center' },
  posterImg: { width: '100%', height: '100%' },
  posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  actorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 8, borderWidth: 1, borderColor: colors.border },
  actorAvatarBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surfaceElevated, marginRight: 12, borderWidth: 1, borderColor: colors.border },
  actorAvatar: { width: '100%', height: '100%' },
  actorAvatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actorName: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '500' },
  suggestionBox: { position: 'absolute', top: 52, left: 0, right: 0, borderWidth: 1, borderRadius: SIZES.radius, zIndex: 999, maxHeight: 150 },
  suggestionItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
});
