import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  Animated as RNAnimated,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const BREATHING_PHASES = [
  { label: 'Wdech', duration: 4, color: '#4A90D9' },
  { label: 'Zatrzymaj', duration: 7, color: '#7BC67E' },
  { label: 'Wydech', duration: 8, color: '#9B59B6' },
];

export default function PanicScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, guardians } = useApp();

  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BREATHING_PHASES[0].duration);
  const [smsSent, setSmsSent] = useState(false);

  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const circleAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (!showBreathing) return;
    const phase = BREATHING_PHASES[breathPhase];

    RNAnimated.timing(circleAnim, {
      toValue: breathPhase === 0 ? 1 : breathPhase === 2 ? 0 : circleAnim,
      duration: phase.duration * 1000,
      useNativeDriver: false,
    }).start();

    setTimeLeft(phase.duration);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const next = (breathPhase + 1) % 3;
          setBreathPhase(next);
          if (next === 0) setBreathCount(c => c + 1);
          return BREATHING_PHASES[next].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showBreathing, breathPhase]);

  const sendSOS = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    let locationText = 'Nie można pobrać lokalizacji';

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        locationText = `https://maps.google.com/?q=${latitude},${longitude}`;
      }
    } catch (e) {
      console.log('Location error:', e);
    }

    const name = profile?.name ?? 'Ktoś';
    const message = `${name} potrzebuje pomocy. Lokalizacja: ${locationText}`;

    if (guardians.length === 0) {
      Alert.alert(
        'Brak Aniołów Stróżów',
        'Dodaj zaufane osoby w ustawieniach, aby wysłać SOS.',
        [{ text: 'OK' }]
      );
      setShowBreathing(true);
      return;
    }

    if (Platform.OS === 'web') {
      setSmsSent(true);
      setShowBreathing(true);
      return;
    }

    const smsAvailable = await SMS.isAvailableAsync();
    if (smsAvailable) {
      const phones = guardians.map(g => g.phone);
      await SMS.sendSMSAsync(phones, message);
      setSmsSent(true);
    } else {
      Alert.alert('Brak SMS', 'SMS niedostępny. Zadzwoń ręcznie.');
    }
    setShowBreathing(true);
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  if (showBreathing) {
    const phase = BREATHING_PHASES[breathPhase];
    const size = circleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [160, 240],
    });

    return (
      <View style={[styles.breathContainer, { backgroundColor: '#0A1628' }]}>
        <Pressable
          style={[styles.closeBreath, { top: topPadding + 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <Text style={[styles.breathTitle, { fontFamily: 'Inter_700Bold' }]}>
          Technika 4-7-8
        </Text>
        <Text style={[styles.breathSubtitle, { fontFamily: 'Inter_400Regular' }]}>
          Oddychaj ze mną. Jesteś bezpieczny.
        </Text>

        {smsSent && (
          <View style={styles.smsSentBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#7BC67E" />
            <Text style={[styles.smsSentText, { fontFamily: 'Inter_500Medium' }]}>
              SOS wysłany do Twoich Aniołów
            </Text>
          </View>
        )}

        <View style={styles.breathCircleContainer}>
          <RNAnimated.View style={[
            styles.breathCircleOuter,
            { width: size, height: size, borderRadius: 200 / 2, backgroundColor: phase.color + '20', borderColor: phase.color + '60' }
          ]}>
            <View style={[styles.breathCircleInner, { backgroundColor: phase.color }]}>
              <Text style={[styles.breathPhaseLabel, { fontFamily: 'Inter_700Bold' }]}>
                {phase.label}
              </Text>
              <Text style={[styles.breathCount, { fontFamily: 'Inter_700Bold' }]}>
                {timeLeft}
              </Text>
            </View>
          </RNAnimated.View>
        </View>

        <Text style={[styles.breathCycleCount, { fontFamily: 'Inter_400Regular' }]}>
          Cykl {breathCount + 1}
        </Text>

        <View style={styles.breathPhaseIndicators}>
          {BREATHING_PHASES.map((p, i) => (
            <View key={i} style={[
              styles.phaseIndicator,
              { backgroundColor: i === breathPhase ? p.color : 'rgba(255,255,255,0.2)' }
            ]} />
          ))}
        </View>

        <Pressable
          style={styles.callHotlineBtn}
          onPress={() => Linking.openURL('tel:116123')}
        >
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={[styles.callHotlineText, { fontFamily: 'Inter_600SemiBold' }]}>
            Telefon Zaufania: 116 123
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.panicContainer, { backgroundColor: '#B71C1C' }]}>
      <Pressable
        style={[styles.closeBtn, { top: topPadding + 16 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="close" size={28} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <View style={styles.panicContent}>
        <Text style={[styles.panicTitle, { fontFamily: 'Inter_700Bold' }]}>
          Jesteś bezpieczny
        </Text>
        <Text style={[styles.panicSubtitle, { fontFamily: 'Inter_400Regular' }]}>
          Wziąłem twój sygnał. Pomoc jest w drodze.
        </Text>

        <RNAnimated.View style={[styles.sosButton, { transform: [{ scale: pulseAnim }] }]}>
          <Pressable
            style={styles.sosButtonInner}
            onPress={sendSOS}
          >
            <Ionicons name="warning" size={48} color="#fff" />
            <Text style={[styles.sosText, { fontFamily: 'Inter_700Bold' }]}>SOS</Text>
            <Text style={[styles.sosSub, { fontFamily: 'Inter_400Regular' }]}>
              Wyślij SMS do Aniołów
            </Text>
          </Pressable>
        </RNAnimated.View>

        <Pressable
          style={[styles.breathButton]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowBreathing(true);
          }}
        >
          <Ionicons name="heart" size={24} color="#fff" />
          <Text style={[styles.breathButtonText, { fontFamily: 'Inter_600SemiBold' }]}>
            Ćwiczenie oddechowe
          </Text>
        </Pressable>

        <View style={styles.hotlines}>
          <Text style={[styles.hotlinesTitle, { fontFamily: 'Inter_600SemiBold' }]}>
            Infolinie kryzysowe
          </Text>
          {[
            { name: 'Telefon Zaufania', number: '116 123' },
            { name: 'PARPA', number: '801 033 033' },
            { name: 'Pomarańczowa Linia', number: '801 140 068' },
          ].map(h => (
            <Pressable
              key={h.number}
              style={styles.hotlineRow}
              onPress={() => Linking.openURL(`tel:${h.number.replace(/ /g, '')}`)}
            >
              <Ionicons name="call-outline" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.hotlineName, { fontFamily: 'Inter_400Regular' }]}>{h.name}:</Text>
              <Text style={[styles.hotlineNumber, { fontFamily: 'Inter_700Bold' }]}>{h.number}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panicContainer: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panicContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  panicTitle: { color: '#fff', fontSize: 32, textAlign: 'center' },
  panicSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center' },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sosButtonInner: { alignItems: 'center', gap: 4 },
  sosText: { color: '#fff', fontSize: 36 },
  sosSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  breathButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  breathButtonText: { color: '#fff', fontSize: 16 },
  hotlines: { gap: 10, width: '100%' },
  hotlinesTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' },
  hotlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  hotlineName: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  hotlineNumber: { color: '#fff', fontSize: 14 },
  breathContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 32 },
  closeBreath: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathTitle: { color: '#fff', fontSize: 28, textAlign: 'center' },
  breathSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center' },
  smsSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(123, 198, 126, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
  },
  smsSentText: { color: '#7BC67E', fontSize: 14 },
  breathCircleContainer: { alignItems: 'center', justifyContent: 'center', height: 280 },
  breathCircleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  breathCircleInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  breathPhaseLabel: { color: '#fff', fontSize: 18 },
  breathCount: { color: '#fff', fontSize: 40 },
  breathCycleCount: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  breathPhaseIndicators: { flexDirection: 'row', gap: 8 },
  phaseIndicator: { width: 40, height: 4, borderRadius: 2 },
  callHotlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callHotlineText: { color: '#fff', fontSize: 15 },
});
