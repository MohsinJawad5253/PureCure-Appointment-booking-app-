import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Alert, TextInput, RefreshControl, Switch, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { timeslotService } from '@services/timeslotService';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';

const SkeletonBox = ({ width, height, borderRadius = 8 }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width, height, borderRadius, backgroundColor: COLORS.border, opacity, marginBottom: 8 }} />;
};

export default function DoctorScheduleManager() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<'schedule' | 'blocked'>('schedule');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  
  // Schedule Form State
  const [selectedWeekday, setSelectedWeekday] = useState(0);
  const [startTimeH, setStartTimeH] = useState(9);
  const [startTimeM, setStartTimeM] = useState(0);
  const [endTimeH, setEndTimeH] = useState(17);
  const [endTimeM, setEndTimeM] = useState(0);
  const [slotDuration, setSlotDuration] = useState(30);

  // Block Date Form State
  const [blockDateStr, setBlockDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [blockFullDay, setBlockFullDay] = useState(true);
  const [blockReason, setBlockReason] = useState('');

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sched, blocked] = await Promise.all([
        timeslotService.getSchedule(),
        timeslotService.getBlockedDates(),
      ]);
      const s = sched.data ?? sched;
      const b = blocked.data ?? blocked;
      setSchedules(Array.isArray(s) ? s : s.results ?? []);
      setBlockedDates(Array.isArray(b) ? b : b.results ?? []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load schedule' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getScheduleForDay = (weekday: number) => {
    return schedules.find(s => s.weekday === weekday);
  };

  const handleGenerateSlots = async () => {
    setGenerating(true);
    try {
      const result = await timeslotService.generateSlots(14);
      const r = result.data ?? result;
      Toast.show({
        type: 'success',
        text1: 'Slots Generated!',
        text2: `${r.total_created ?? 0} new slots created`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to generate slots' });
    } finally {
      setGenerating(false);
    }
  };

  const handleActiveToggle = async (id: string, current: boolean) => {
    try {
      await timeslotService.updateSchedule(id, { is_active: !current });
      fetchData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update schedule status' });
    }
  };

  const handleDeleteSchedule = (id: string) => {
    Alert.alert('Delete Schedule', 'Are you sure you want to remove this day from your schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await timeslotService.deleteSchedule(id);
          fetchData();
          Toast.show({ type: 'success', text1: 'Schedule deleted' });
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to delete schedule' });
        }
      }}
    ]);
  };

  const handleUnblock = (id: string) => {
    Alert.alert('Unblock Date', 'Are you sure you want to open this date for bookings?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', style: 'destructive', onPress: async () => {
        try {
          await timeslotService.unblockDate(id);
          fetchData();
          Toast.show({ type: 'success', text1: 'Date unblocked' });
        } catch {
          Toast.show({ type: 'error', text1: 'Failed to unblock date' });
        }
      }}
    ]);
  };

  const openAddSchedule = (weekday: number, existing?: any) => {
    setSelectedWeekday(weekday);
    if (existing) {
      setEditingSchedule(existing);
      const [sh, sm] = existing.start_time.split(':');
      const [eh, em] = existing.end_time.split(':');
      setStartTimeH(parseInt(sh, 10));
      setStartTimeM(parseInt(sm, 10));
      setEndTimeH(parseInt(eh, 10));
      setEndTimeM(parseInt(em, 10));
      setSlotDuration(existing.slot_duration_minutes);
    } else {
      setEditingSchedule(null);
      setStartTimeH(9); setStartTimeM(0);
      setEndTimeH(17); setEndTimeM(0);
      setSlotDuration(30);
    }
    setShowAddModal(true);
  };

  const saveSchedule = async () => {
    const shStr = startTimeH.toString().padStart(2, '0');
    const smStr = startTimeM.toString().padStart(2, '0');
    const ehStr = endTimeH.toString().padStart(2, '0');
    const emStr = endTimeM.toString().padStart(2, '0');
    
    const start_time = `${shStr}:${smStr}:00`;
    const end_time = `${ehStr}:${emStr}:00`;

    if (startTimeH > endTimeH || (startTimeH === endTimeH && startTimeM >= endTimeM)) {
      Toast.show({ type: 'error', text1: 'End time must be after start time' });
      return;
    }

    try {
      if (editingSchedule) {
        await timeslotService.updateSchedule(editingSchedule.id, {
          start_time, end_time, slot_duration_minutes: slotDuration
        });
        Toast.show({ type: 'success', text1: 'Schedule updated' });
      } else {
        await timeslotService.createSchedule({
          weekday: selectedWeekday, start_time, end_time, slot_duration_minutes: slotDuration
        });
        Toast.show({ type: 'success', text1: 'Schedule added' });
      }
      setShowAddModal(false);
      fetchData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save schedule' });
    }
  };

  const saveBlockDate = async () => {
    try {
      await timeslotService.blockDate({
        date: blockDateStr,
        reason: blockReason,
        block_entire_day: blockFullDay
      });
      Toast.show({ type: 'success', text1: 'Date blocked' });
      setShowBlockModal(false);
      fetchData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to block date' });
    }
  };

  const formatTimePicker = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    const min = m.toString().padStart(2, '0');
    return `${hr}:${min} ${ampm}`;
  };

  const stepTime = (setterH: any, setterM: any, currentH: number, currentM: number, direction: 1 | -1) => {
    let newM = currentM + (30 * direction);
    let newH = currentH;
    if (newM >= 60) { newM -= 60; newH += 1; }
    if (newM < 0) { newM += 60; newH -= 1; }
    if (newH > 23) newH = 0;
    if (newH < 0) newH = 23;
    setterH(newH);
    setterM(newM);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule Manager</Text>
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateSlots} disabled={generating}>
          {generating ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.generateBtnText}>Generate Slots</Text>}
        </TouchableOpacity>
      </View>

      {/* TOGGLE */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeSection === 'schedule' && styles.toggleBtnActive]}
            onPress={() => setActiveSection('schedule')}
          >
            <Text style={[styles.toggleText, activeSection === 'schedule' && styles.toggleTextActive]}>My Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeSection === 'blocked' && styles.toggleBtnActive]}
            onPress={() => setActiveSection('blocked')}
          >
            <Text style={[styles.toggleText, activeSection === 'blocked' && styles.toggleTextActive]}>Blocked Dates</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}>
        {loading ? (
          <>
            <SkeletonBox width="100%" height={80} />
            <SkeletonBox width="100%" height={80} />
            <SkeletonBox width="100%" height={80} />
          </>
        ) : activeSection === 'schedule' ? (
          /* SCHEDULE SECTION */
          <View>
            {WEEKDAYS.map((dayName, wkIdx) => {
              const sched = getScheduleForDay(wkIdx);
              return (
                <View key={wkIdx} style={styles.dayRow}>
                  <Text style={[styles.dayLabel, sched ? styles.dayLabelActive : null]}>{dayName.substring(0, 3).toUpperCase()}</Text>
                  
                  {sched ? (
                    <View style={styles.schedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.schedTime}>{sched.start_time.substring(0, 5)} – {sched.end_time.substring(0, 5)}</Text>
                        <Text style={styles.schedDur}>{sched.slot_duration_minutes} min slots</Text>
                      </View>
                      <Switch 
                        value={sched.is_active} 
                        onValueChange={() => handleActiveToggle(sched.id, sched.is_active)} 
                        trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                        thumbColor={COLORS.white}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <View style={styles.actionCol}>
                        <TouchableOpacity onPress={() => openAddSchedule(wkIdx, sched)} style={{ padding: 4 }}>
                          <Ionicons name="pencil" size={16} color={COLORS.info} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteSchedule(sched.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash" size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.schedCardEmpty} onPress={() => openAddSchedule(wkIdx)}>
                      <Text style={styles.schedEmptyText}>+ Add Schedule</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          /* BLOCKED DATES SECTION */
          <View>
            {blockedDates.length > 0 ? blockedDates.map((blk) => (
              <View key={blk.id} style={styles.blockCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockDateTitle}>{blk.date}</Text>
                  <Text style={styles.blockReason}>{blk.reason || 'No reason specified'}</Text>
                  <Text style={styles.blockDur}>{blk.block_entire_day ? 'Full Day' : `${blk.block_start_time} - ${blk.block_end_time}`}</Text>
                </View>
                <TouchableOpacity onPress={() => handleUnblock(blk.id)} style={styles.unblockBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            )) : (
              <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 40, fontStyle: 'italic' }}>No blocked dates.</Text>
            )}

            <TouchableOpacity style={styles.addBlockBtn} onPress={() => setShowBlockModal(true)}>
              <Text style={styles.addBlockBtnText}>+ Block a Date</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ADD/EDIT SCHEDULE MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingSchedule ? 'Edit Schedule' : 'Add Schedule'}</Text>
            <Text style={styles.modalSubtitle}>{WEEKDAYS[selectedWeekday]}</Text>

            <Text style={styles.inputLabel}>Start Time</Text>
            <View style={styles.timePickerContainer}>
              <TouchableOpacity onPress={() => stepTime(setStartTimeH, setStartTimeM, startTimeH, startTimeM, -1)} style={styles.timeStepperBtn}>
                <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.timeDisplay}>{formatTimePicker(startTimeH, startTimeM)}</Text>
              <TouchableOpacity onPress={() => stepTime(setStartTimeH, setStartTimeM, startTimeH, startTimeM, 1)} style={styles.timeStepperBtn}>
                <Ionicons name="add" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>End Time</Text>
            <View style={styles.timePickerContainer}>
              <TouchableOpacity onPress={() => stepTime(setEndTimeH, setEndTimeM, endTimeH, endTimeM, -1)} style={styles.timeStepperBtn}>
                <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.timeDisplay}>{formatTimePicker(endTimeH, endTimeM)}</Text>
              <TouchableOpacity onPress={() => stepTime(setEndTimeH, setEndTimeM, endTimeH, endTimeM, 1)} style={styles.timeStepperBtn}>
                <Ionicons name="add" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Slot Duration</Text>
            <View style={styles.durRow}>
              {[15, 30, 45, 60].map(dur => (
                <TouchableOpacity 
                  key={dur} 
                  style={[styles.durPill, slotDuration === dur && styles.durPillActive]}
                  onPress={() => setSlotDuration(dur)}
                >
                  <Text style={[styles.durPillText, slotDuration === dur && styles.durPillTextActive]}>{dur} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveSchedule}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BLOCK DATE MODAL */}
      <Modal visible={showBlockModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Block a Date</Text>
            
            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.textInput} 
              value={blockDateStr} 
              onChangeText={setBlockDateStr}
              placeholder="e.g. 2026-04-10"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Block Entire Day</Text>
              <Switch value={blockFullDay} onValueChange={setBlockFullDay} trackColor={{ true: COLORS.primary }} />
            </View>

            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput 
              style={styles.textInput} 
              value={blockReason} 
              onChangeText={setBlockReason}
              placeholder="e.g. Personal Leave"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={saveBlockDate}>
              <Text style={styles.primaryBtnText}>Block Date</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBlockModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  generateBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6
  },
  generateBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  toggleContainer: { paddingHorizontal: SPACING.lg, marginVertical: SPACING.sm },
  toggleRow: {
    flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: 10, padding: 3
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: COLORS.white, ...SHADOW.sm },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.textPrimary },
  
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dayLabel: { width: 44, fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  dayLabelActive: { color: COLORS.textPrimary },
  schedCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, ...SHADOW.sm
  },
  schedCardEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 12, paddingVertical: 18
  },
  schedEmptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  schedTime: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  schedDur: { fontSize: 12, color: COLORS.textSecondary },
  actionCol: { marginLeft: 12, gap: 10 },
  
  blockCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.danger, ...SHADOW.md
  },
  blockDateTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  blockReason: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  blockDur: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  unblockBtn: { padding: 10 },
  addBlockBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  addBlockBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, paddingBottom: 40
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  
  timePickerContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12
  },
  timeStepperBtn: { padding: 4 },
  timeDisplay: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  
  durRow: { flexDirection: 'row', gap: 8 },
  durPill: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border
  },
  durPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durPillText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  durPillTextActive: { color: COLORS.white },
  
  textInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  cancelBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});
