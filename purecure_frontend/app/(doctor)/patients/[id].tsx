import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE } from '@constants/index';

export default function DoctorPatientRecord() {
  return (
    <SafeAreaView style={{ flex:1, backgroundColor: COLORS.white }}>
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize: FONT_SIZE.xl, fontWeight:'700', color: COLORS.textPrimary }}>
          Patient Record
        </Text>
        <Text style={{ fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginTop: 8 }}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
