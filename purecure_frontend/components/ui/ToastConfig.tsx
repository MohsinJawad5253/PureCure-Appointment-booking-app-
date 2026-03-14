import { View, Text } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { COLORS } from '@constants/index';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: COLORS.success,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}
      text2Style={{ fontSize: 12, color: COLORS.textSecondary }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: COLORS.danger,
        borderRadius: 12,
        marginHorizontal: 16,
      }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      text1Style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}
      text2Style={{ fontSize: 12, color: COLORS.textSecondary }}
    />
  ),
  info: ({ text1, text2 }) => (
    <View style={{
      height: 60, width: '90%', backgroundColor: '#fff',
      borderRadius: 12, borderLeftWidth: 4,
      borderLeftColor: COLORS.info,
      paddingHorizontal: 16,
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }}>
      {text1 && <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{text1}</Text>}
      {text2 && <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{text2}</Text>}
    </View>
  ),
};
