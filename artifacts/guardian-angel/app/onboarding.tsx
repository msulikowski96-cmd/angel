import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ADDICTION_TYPES = [
  'Alkohol', 'Narkotyki', 'Leki', 'Hazard', 'Inne', 'Wolę nie podawać',
];

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { setProfile, addGuardian, completeOnboarding } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sobrietyDate, setSobrietyDate] = useState('');
  const [addictionType, setAddictionType] = useState('');
  const [guardians, setGuardians] = useState<{ name: string; phone: string }[]>([]);
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const progress = useSharedValue(0);
  const slideX = useSharedValue(0);

  const goToStep = (newStep: number) => {
    progress.value = withTiming(newStep / 3);
    setStep(newStep);
  };

  const addGuardianLocal = () => {
    if (!guardianName.trim() || !guardianPhone.trim()) return;
    if (guardians.length >= 5) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGuardians([...guardians, { name: guardianName.trim(), phone: guardianPhone.trim() }]);
    setGuardianName('');
    setGuardianPhone('');
  };

  const removeGuardian = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGuardians(guardians.filter((_, i) => i !== idx));
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Proszę podać swoje imię');
      return;
    }

    let sobrietyStart = new Date();
    if (sobrietyDate.trim()) {
      const parts = sobrietyDate.split('.');
      if (parts.length === 3) {
        const parsed = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
        if (!isNaN(parsed.getTime())) sobrietyStart = parsed;
      }
    }

    await setProfile({
      name: name.trim(),
      sobrietyStart: sobrietyStart.toISOString(),
      addictionType: addictionType || undefined,
    });

    for (let i = 0; i < guardians.length; i++) {
      await addGuardian({
        id: Date.now() + i,
        name: guardians[i].name,
        phone: guardians[i].phone,
      });
    }

    await completeOnboarding();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  const steps = [
    // Step 0: Welcome + Name
    <View key="step0" style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: C.blue + '20' }]}>
        <Ionicons name="shield-checkmark" size={48} color={C.blue} />
      </View>
      <Text style={[styles.stepTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
        Witaj w Aniele Stróżu
      </Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        Jesteś silny. Jesteś odważny. Ta aplikacja jest tutaj, aby cię wspierać każdego dnia.
      </Text>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
          Jak masz na imię?
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: C.surface,
            borderColor: C.border,
            color: C.text,
            fontFamily: 'Inter_400Regular',
          }]}
          placeholder="Twoje imię..."
          placeholderTextColor={C.textTertiary}
          value={name}
          onChangeText={setName}
          autoFocus
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
          Data ostatniego drinka / dawki (opcjonalnie)
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: C.surface,
            borderColor: C.border,
            color: C.text,
            fontFamily: 'Inter_400Regular',
          }]}
          placeholder="DD.MM.RRRR (np. 01.01.2025)"
          placeholderTextColor={C.textTertiary}
          value={sobrietyDate}
          onChangeText={setSobrietyDate}
          keyboardType="numeric"
        />
      </View>
    </View>,

    // Step 1: Addiction type
    <View key="step1" style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: C.green + '20' }]}>
        <Ionicons name="heart" size={48} color={C.green} />
      </View>
      <Text style={[styles.stepTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
        Czego szukasz wsparcia?
      </Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        Opcjonalnie. To pomoże nam lepiej Cię wspierać.
      </Text>
      <View style={styles.chipGrid}>
        {ADDICTION_TYPES.map(type => (
          <Pressable
            key={type}
            style={[
              styles.chip,
              {
                backgroundColor: addictionType === type ? C.blue : C.surface,
                borderColor: addictionType === type ? C.blue : C.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAddictionType(addictionType === type ? '' : type);
            }}
          >
            <Text style={[
              styles.chipText,
              {
                color: addictionType === type ? '#fff' : C.text,
                fontFamily: 'Inter_500Medium',
              }
            ]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>,

    // Step 2: Guardians
    <View key="step2" style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: C.blue + '20' }]}>
        <Ionicons name="people" size={48} color={C.blue} />
      </View>
      <Text style={[styles.stepTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
        Twoi Aniołowie Stróżowie
      </Text>
      <Text style={[styles.stepSubtitle, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        Dodaj do 5 zaufanych osób. W sytuacji kryzysowej wyślemy im SMS z Twoją lokalizacją.
      </Text>

      {guardians.map((g, idx) => (
        <View key={idx} style={[styles.guardianRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.guardianAvatar, { backgroundColor: C.blue + '20' }]}>
            <Ionicons name="person" size={20} color={C.blue} />
          </View>
          <View style={styles.guardianInfo}>
            <Text style={[styles.guardianName, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>{g.name}</Text>
            <Text style={[styles.guardianPhone, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>{g.phone}</Text>
          </View>
          <Pressable onPress={() => removeGuardian(idx)} hitSlop={10}>
            <Feather name="x" size={20} color={C.textTertiary} />
          </Pressable>
        </View>
      ))}

      {guardians.length < 5 && (
        <View style={[styles.addGuardianCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TextInput
            style={[styles.smallInput, { borderColor: C.border, color: C.text, fontFamily: 'Inter_400Regular' }]}
            placeholder="Imię"
            placeholderTextColor={C.textTertiary}
            value={guardianName}
            onChangeText={setGuardianName}
          />
          <TextInput
            style={[styles.smallInput, { borderColor: C.border, color: C.text, fontFamily: 'Inter_400Regular' }]}
            placeholder="Numer telefonu"
            placeholderTextColor={C.textTertiary}
            value={guardianPhone}
            onChangeText={setGuardianPhone}
            keyboardType="phone-pad"
          />
          <Pressable
            style={[styles.addBtn, { backgroundColor: C.green }]}
            onPress={addGuardianLocal}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Dodaj</Text>
          </Pressable>
        </View>
      )}
    </View>,
  ];

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.progressBar, { backgroundColor: C.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: C.blue }, progressStyle]} />
        </View>
        <Text style={[styles.stepCount, { color: C.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          {step + 1} / 3
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {steps[step]}
      </ScrollView>

      <View style={[styles.footer, {
        paddingBottom: insets.bottom + 16,
        backgroundColor: C.background,
        borderTopColor: C.border,
      }]}>
        {step > 0 && (
          <Pressable
            style={[styles.backBtn, { borderColor: C.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goToStep(step - 1);
            }}
          >
            <Feather name="arrow-left" size={20} color={C.text} />
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, { backgroundColor: C.blue, flex: step > 0 ? 1 : undefined }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (step < 2) {
              goToStep(step + 1);
            } else {
              handleFinish();
            }
          }}
        >
          <Text style={[styles.nextBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {step === 2 ? 'Zacznij swoją podróż' : 'Dalej'}
          </Text>
          {step < 2 && <Feather name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepCount: { fontSize: 13, minWidth: 32, textAlign: 'right' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  stepContainer: { gap: 20 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  stepTitle: { fontSize: 28, lineHeight: 36, textAlign: 'center' },
  stepSubtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  inputGroup: { gap: 8 },
  label: { fontSize: 14 },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 15 },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  guardianAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianInfo: { flex: 1 },
  guardianName: { fontSize: 15 },
  guardianPhone: { fontSize: 13 },
  addGuardianCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  smallInput: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addBtn: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { color: '#fff', fontSize: 15 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
    minWidth: 160,
  },
  nextBtnText: { color: '#fff', fontSize: 17 },
});
