import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '@constants/index';
import { formatDoctorName } from '@utils/index';

export default function BookingSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    doctorName: string;
    specialty: string;
    clinicName: string;
    date: string;
    time: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  const formattedDate = new Date(params.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* SUCCESS ANIMATION */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={60} color={COLORS.white} />
          </View>
        </Animated.View>

        <Text style={styles.title}>Appointment Booked!</Text>
        <Text style={styles.subtitle}>Your appointment has been confirmed</Text>

        {/* SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryDoctor}>{formatDoctorName(params.doctorName)}</Text>
          <Text style={styles.summarySpecialty}>{params.specialty}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          
          <View style={styles.row}>
            <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{params.time}</Text>
          </View>
          
          <View style={styles.row}>
            <Ionicons name="business-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{params.clinicName}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryBtn}
            onPress={() => router.replace('/(patient)/appointments')}
          >
            <Text style={styles.primaryBtnText}>View My Appointments</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(patient)')}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          A confirmation has been saved to your bookings
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  summaryDoctor: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summarySpecialty: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  footer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xl,
    textAlign: 'center',
  },
});
