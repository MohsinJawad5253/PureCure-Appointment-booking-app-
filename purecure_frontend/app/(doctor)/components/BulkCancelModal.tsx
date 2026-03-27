import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { appointmentService } from '@services/appointmentService';
import {
  COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW
} from '@constants/index';
import { formatDate, formatTime } from '@utils/index';

interface Props {
  visible: boolean;
  selectedDate: string;  // pre-filled from agenda screen
  onClose: () => void;
  onSuccess: () => void;
}

// Time options in 30-minute increments from 6AM to 10PM
const TIME_OPTIONS = [
  '06:00:00', '06:30:00', '07:00:00', '07:30:00',
  '08:00:00', '08:30:00', '09:00:00', '09:30:00',
  '10:00:00', '10:30:00', '11:00:00', '11:30:00',
  '12:00:00', '12:30:00', '13:00:00', '13:30:00',
  '14:00:00', '14:30:00', '15:00:00', '15:30:00',
  '16:00:00', '16:30:00', '17:00:00', '17:30:00',
  '18:00:00', '18:30:00', '19:00:00', '19:30:00',
  '20:00:00', '20:30:00', '21:00:00', '21:30:00',
  '22:00:00',
];

type Step = 'select' | 'preview' | 'success';

export default function BulkCancelModal({
  visible, selectedDate, onClose, onSuccess
}: Props) {
  const [step, setStep] = useState<Step>('select');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('17:00:00');
  const [reason, setReason] = useState(
    'Doctor unavailable for this time period'
  );
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStep('select');
      setPreview(null);
      setResult(null);
      setReason('Doctor unavailable for this time period');
    }
  }, [visible]);

  const handlePreview = async () => {
    if (startTime >= endTime) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Time Range',
        text2: 'End time must be after start time',
      });
      return;
    }

    setLoadingPreview(true);
    try {
      const data = await appointmentService.bulkCancelPreview({
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
      });
      setPreview(data);
      setStep('preview');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to load preview',
        text2: e.response?.data?.message || 'Please try again',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmCancel = () => {
    if (!preview || preview.affected_count === 0) {
      Toast.show({
        type: 'info',
        text1: 'No appointments to cancel',
      });
      return;
    }

    Alert.alert(
      'Confirm Bulk Cancellation',
      `This will cancel ${preview.affected_count} appointment${
        preview.affected_count > 1 ? 's' : ''
      } and notify all affected patients immediately.\n\nThis cannot be undone.`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: `Cancel ${preview.affected_count} Appointment${
            preview.affected_count > 1 ? 's' : ''
          }`,
          style: 'destructive',
          onPress: executeBulkCancel,
        },
      ]
    );
  };

  const executeBulkCancel = async () => {
    setCancelling(true);
    try {
      const data = await appointmentService.bulkCancel({
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        reason: reason.trim() || 'Doctor unavailable',
      });
      setResult(data);
      setStep('success');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Bulk Cancel Failed',
        text2: e.response?.data?.message || 'Please try again',
      });
    } finally {
      setCancelling(false);
    }
  };

  // ── TIME PICKER DROPDOWN ───────────────────────────────
  const TimePicker = ({
    value,
    onChange,
    visible: pickerVisible,
    onToggle,
    label,
  }: {
    value: string;
    onChange: (t: string) => void;
    visible: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <View style={styles.timePickerContainer}>
      <Text style={styles.timePickerLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.timePickerButton}
        onPress={onToggle}
      >
        <Ionicons
          name="time-outline"
          size={16}
          color={COLORS.primary}
        />
        <Text style={styles.timePickerValue}>
          {formatTime(value)}
        </Text>
        <Ionicons
          name={pickerVisible ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {pickerVisible && (
        <ScrollView
          style={styles.timeDropdown}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {TIME_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.timeOption,
                value === t && styles.timeOptionSelected,
              ]}
              onPress={() => {
                onChange(t);
                onToggle();
              }}
            >
              <Text style={[
                styles.timeOptionText,
                value === t && styles.timeOptionTextSelected,
              ]}>
                {formatTime(t)}
              </Text>
              {value === t && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.white}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ── STEP 1: SELECT TIME RANGE ──────────────────────────
  const renderSelectStep = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Date display */}
      <View style={styles.dateCard}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={COLORS.primary}
        />
        <View>
          <Text style={styles.dateLabelSmall}>Cancelling appointments on</Text>
          <Text style={styles.dateValue}>
            {formatDate(selectedDate)}
          </Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={COLORS.info}
        />
        <Text style={styles.infoBannerText}>
          All upcoming appointments between the selected
          times will be cancelled and patients notified
          via push notification.
        </Text>
      </View>

      {/* Time range pickers */}
      <Text style={styles.sectionLabel}>Select Time Range</Text>

      <View style={styles.timeRangeRow}>
        <View style={{ flex: 1 }}>
          <TimePicker
            label="From"
            value={startTime}
            onChange={setStartTime}
            visible={showStartPicker}
            onToggle={() => {
              setShowStartPicker(!showStartPicker);
              setShowEndPicker(false);
            }}
          />
        </View>
        <View style={styles.timeRangeArrow}>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={COLORS.textMuted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TimePicker
            label="To"
            value={endTime}
            onChange={setEndTime}
            visible={showEndPicker}
            onToggle={() => {
              setShowEndPicker(!showEndPicker);
              setShowStartPicker(false);
            }}
          />
        </View>
      </View>

      {/* Validation warning */}
      {startTime >= endTime && (
        <View style={styles.errorBanner}>
          <Ionicons
            name="warning-outline"
            size={14}
            color={COLORS.danger}
          />
          <Text style={styles.errorBannerText}>
            End time must be after start time
          </Text>
        </View>
      )}

      {/* Reason input */}
      <Text style={styles.sectionLabel}>
        Reason for Cancellation
      </Text>
      <TextInput
        style={styles.reasonInput}
        value={reason}
        onChangeText={setReason}
        placeholder="Enter reason for patients..."
        multiline
        numberOfLines={3}
        placeholderTextColor={COLORS.textMuted}
      />
      <Text style={styles.reasonHint}>
        This message will be visible to all affected patients
      </Text>

      {/* Preview button */}
      <TouchableOpacity
        style={[
          styles.previewButton,
          (startTime >= endTime || loadingPreview) &&
            styles.buttonDisabled,
        ]}
        onPress={handlePreview}
        disabled={startTime >= endTime || loadingPreview}
      >
        {loadingPreview ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons
              name="eye-outline"
              size={18}
              color={COLORS.white}
            />
            <Text style={styles.previewButtonText}>
              Preview Affected Appointments
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ── STEP 2: PREVIEW AFFECTED APPOINTMENTS ─────────────
  const renderPreviewStep = () => (
    <View style={{ flex: 1 }}>
      {/* Summary banner */}
      <View style={[
        styles.previewBanner,
        preview?.affected_count === 0
          ? styles.previewBannerEmpty
          : styles.previewBannerFilled,
      ]}>
        <Ionicons
          name={
            preview?.affected_count === 0
              ? 'checkmark-circle-outline'
              : 'warning-outline'
          }
          size={24}
          color={
            preview?.affected_count === 0
              ? COLORS.success
              : COLORS.danger
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.previewBannerTitle}>
            {preview?.affected_count === 0
              ? 'No appointments in this range'
              : `${preview?.affected_count} appointment${
                  preview?.affected_count > 1 ? 's' : ''
                } will be cancelled`}
          </Text>
          <Text style={styles.previewBannerSub}>
            {formatTime(startTime)} – {formatTime(endTime)}
            {' '}on {formatDate(selectedDate)}
          </Text>
        </View>
      </View>

      {/* Appointment list */}
      {preview?.affected_count > 0 && (
        <>
          <Text style={styles.previewListTitle}>
            Affected Patients:
          </Text>
          <ScrollView
            style={styles.previewList}
            showsVerticalScrollIndicator={false}
          >
            {preview?.appointments?.map((appt: any) => (
              <View key={appt.id} style={styles.previewCard}>
                {/* Time badge */}
                <View style={styles.previewTimeBadge}>
                  <Text style={styles.previewTimeBadgeText}>
                    {appt.display_time}
                  </Text>
                </View>

                {/* Patient info */}
                <View style={styles.previewPatientInfo}>
                  <Text style={styles.previewPatientName}>
                    {appt.patient_name}
                  </Text>
                  <Text style={styles.previewPatientEmail}>
                    {appt.patient_email}
                  </Text>
                </View>

                {/* Notification status */}
                <View style={styles.previewNotifStatus}>
                  <Ionicons
                    name={
                      appt.has_push_token
                        ? 'notifications-outline'
                        : 'notifications-off-outline'
                    }
                    size={16}
                    color={
                      appt.has_push_token
                        ? COLORS.success
                        : COLORS.textMuted
                    }
                  />
                  <Text style={[
                    styles.previewNotifText,
                    { color: appt.has_push_token
                      ? COLORS.success : COLORS.textMuted }
                  ]}>
                    {appt.has_push_token ? 'Will notify' : 'No token'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Reason display */}
          <View style={styles.reasonDisplay}>
            <Text style={styles.reasonDisplayLabel}>
              Cancellation reason:
            </Text>
            <Text style={styles.reasonDisplayValue}>
              "{reason}"
            </Text>
          </View>

          {/* Confirm cancel button */}
          <TouchableOpacity
            style={[
              styles.confirmCancelButton,
              cancelling && styles.buttonDisabled,
            ]}
            onPress={handleConfirmCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <View style={styles.cancellingRow}>
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
                <Text style={styles.confirmCancelText}>
                  Cancelling & Notifying...
                </Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.confirmCancelText}>
                  Cancel {preview?.affected_count} Appointment
                  {preview?.affected_count > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* No appointments empty state */}
      {preview?.affected_count === 0 && (
        <View style={styles.emptyPreview}>
          <Text style={styles.emptyPreviewText}>
            No upcoming appointments found between{' '}
            {formatTime(startTime)} and {formatTime(endTime)}
          </Text>
          <TouchableOpacity
            style={styles.backToSelectButton}
            onPress={() => setStep('select')}
          >
            <Text style={styles.backToSelectText}>
              Change Time Range
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('select')}
      >
        <Text style={styles.backButtonText}>
          ← Change Time Range
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── STEP 3: SUCCESS ────────────────────────────────────
  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      {/* Success icon */}
      <View style={styles.successIconCircle}>
        <Ionicons
          name="checkmark-circle"
          size={64}
          color={COLORS.success}
        />
      </View>

      {/* Title */}
      <Text style={styles.successTitle}>
        Cancellation Complete
      </Text>
      <Text style={styles.successSubtitle}>
        {result?.cancelled_count} appointment
        {result?.cancelled_count !== 1 ? 's' : ''} cancelled
      </Text>

      {/* Stats cards */}
      <View style={styles.successStatsRow}>
        <View style={styles.successStatCard}>
          <Text style={[
            styles.successStatNum,
            { color: COLORS.danger }
          ]}>
            {result?.cancelled_count}
          </Text>
          <Text style={styles.successStatLabel}>Cancelled</Text>
        </View>

        <View style={styles.successStatCard}>
          <Text style={[
            styles.successStatNum,
            { color: COLORS.success }
          ]}>
            {result?.notified_count}
          </Text>
          <Text style={styles.successStatLabel}>Notified</Text>
        </View>

        {result?.failed_notifications > 0 && (
          <View style={styles.successStatCard}>
            <Text style={[
              styles.successStatNum,
              { color: COLORS.warning }
            ]}>
              {result?.failed_notifications}
            </Text>
            <Text style={styles.successStatLabel}>
              No Token
            </Text>
          </View>
        )}
      </View>

      {/* Patients list */}
      {result?.cancelled_appointments?.length > 0 && (
        <View style={styles.successPatientList}>
          <Text style={styles.successPatientListTitle}>
            Cancelled appointments:
          </Text>
          <ScrollView
            style={{ maxHeight: 180 }}
            showsVerticalScrollIndicator={false}
          >
            {result.cancelled_appointments.map(
              (appt: any, i: number) => (
                <View key={i} style={styles.successPatientRow}>
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={COLORS.danger}
                  />
                  <Text style={styles.successPatientName}>
                    {appt.patient_name}
                  </Text>
                  <Text style={styles.successPatientTime}>
                    {formatTime(appt.time)}
                  </Text>
                  <Ionicons
                    name={
                      appt.had_push_token
                        ? 'notifications'
                        : 'notifications-off'
                    }
                    size={12}
                    color={
                      appt.had_push_token
                        ? COLORS.success
                        : COLORS.textMuted
                    }
                  />
                </View>
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* Done button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={onSuccess}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Modal header */}
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>
              Cancel Time Range
            </Text>
            <Text style={styles.modalSubtitle}>
              {step === 'select' && 'Select time range to cancel'}
              {step === 'preview' && 'Review affected appointments'}
              {step === 'success' && 'Cancellation complete'}
            </Text>
          </View>
          {step !== 'success' && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {(['select', 'preview', 'success'] as Step[]).map(
            (s, i) => (
              <React.Fragment key={s}>
                <View style={[
                  styles.stepDot,
                  step === s && styles.stepDotActive,
                  (step === 'preview' && i === 0) ||
                  (step === 'success' && i < 2)
                    ? styles.stepDotDone
                    : null,
                ]}>
                  {((step === 'preview' && i === 0) ||
                    (step === 'success' && i < 2)) ? (
                    <Ionicons
                      name="checkmark"
                      size={10}
                      color={COLORS.white}
                    />
                  ) : (
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  )}
                </View>
                {i < 2 && (
                  <View style={[
                    styles.stepLine,
                    (step === 'preview' && i === 0) ||
                    step === 'success'
                      ? styles.stepLineDone
                      : null,
                  ]} />
                )}
              </React.Fragment>
            )
          )}
        </View>

        {/* Step content */}
        <View style={styles.modalContent}>
          {step === 'select' && renderSelectStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'success' && renderSuccessStep()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xxxl,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
  },
  stepDotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  stepLineDone: {
    backgroundColor: COLORS.success,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.xl,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDDAE3',
  },
  dateLabelSmall: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
  },
  dateValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: '#1D4ED8',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  timeRangeArrow: {
    paddingTop: 36,
  },
  timePickerContainer: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  timePickerValue: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeDropdown: {
    maxHeight: 200,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: 4,
    ...SHADOW.md,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  timeOptionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  timeOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  errorBannerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
  },
  reasonInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reasonHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.info,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
  },
  previewButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  previewBannerFilled: {
    backgroundColor: COLORS.dangerLight,
  },
  previewBannerEmpty: {
    backgroundColor: COLORS.successLight,
  },
  previewBannerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  previewBannerSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  previewListTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  previewList: {
    flex: 1,
    marginBottom: SPACING.md,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  previewTimeBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginRight: SPACING.sm,
  },
  previewTimeBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  previewPatientInfo: {
    flex: 1,
  },
  previewPatientName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewPatientEmail: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  previewNotifStatus: {
    alignItems: 'center',
    gap: 2,
  },
  previewNotifText: {
    fontSize: 9,
    fontWeight: '500',
  },
  reasonDisplay: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  reasonDisplayLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  reasonDisplayValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  confirmCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  cancellingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  confirmCancelText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyPreviewText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  backToSelectButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  backToSelectText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  backButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  successIconCircle: {
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  successSubtitle: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  successStatsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  successStatCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    minWidth: 90,
    ...SHADOW.md,
  },
  successStatNum: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  successStatLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  successPatientList: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  successPatientListTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  successPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  successPatientName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  successPatientTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl,
    marginTop: 'auto',
  },
  doneButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.white,
  },
});
