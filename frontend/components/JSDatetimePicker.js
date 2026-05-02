import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export default function JSDatetimePicker({ visible, onClose, onSelect, initialDate }) {
  const { colors } = useTheme();
  
  const defaultDate = initialDate ? new Date(initialDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  // Generate next 30 days
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const minutes = [0, 15, 30, 45]; // Standard cinema slots

  const handleConfirm = () => {
    onSelect(selectedDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Select Date & Time</Text>
          
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
            {days.map((d, i) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.chip, isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.border }]}
                  onPress={() => {
                    const newD = new Date(selectedDate);
                    newD.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    setSelectedDate(newD);
                  }}
                >
                  <Text style={[styles.chipText, isSelected ? { color: '#fff' } : { color: colors.textPrimary }]}>
                    {d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
          <View style={styles.timeRow}>
            {/* Hours */}
            <ScrollView style={[styles.timeScroll, { borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
              {hours.map(h => {
                const isSelected = h === selectedDate.getHours();
                return (
                  <TouchableOpacity key={`h-${h}`} onPress={() => {
                    const newD = new Date(selectedDate);
                    newD.setHours(h);
                    setSelectedDate(newD);
                  }}>
                    <Text style={[styles.timeText, isSelected ? { color: colors.primary, fontWeight: 'bold' } : { color: colors.textPrimary }]}>
                      {h.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={{ fontSize: 24, color: colors.textPrimary, marginHorizontal: 10 }}>:</Text>
            {/* Minutes */}
            <ScrollView style={[styles.timeScroll, { borderColor: colors.border }]} showsVerticalScrollIndicator={false}>
              {minutes.map(m => {
                const isSelected = m === selectedDate.getMinutes();
                return (
                  <TouchableOpacity key={`m-${m}`} onPress={() => {
                    const newD = new Date(selectedDate);
                    newD.setMinutes(m);
                    setSelectedDate(newD);
                  }}>
                    <Text style={[styles.timeText, isSelected ? { color: colors.primary, fontWeight: 'bold' } : { color: colors.textPrimary }]}>
                      {m.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: colors.primary }]} onPress={handleConfirm}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.lg, borderWidth: 1, borderBottomWidth: 0, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, marginBottom: 8, marginTop: 8 },
  scrollRow: { flexDirection: 'row', marginBottom: 16, flexGrow: 0 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 14, fontWeight: 'bold' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 120, marginBottom: 20 },
  timeScroll: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  timeText: { fontSize: 20, textAlign: 'center', paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: SIZES.radius },
  btnConfirm: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.radius }
});
