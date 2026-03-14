import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MILESTONES = [
  { days: 1, label: '1 dzień', icon: 'star-outline' as const },
  { days: 7, label: '7 dni', icon: 'trophy-outline' as const },
  { days: 30, label: '30 dni', icon: 'medal-outline' as const },
  { days: 90, label: '90 dni', icon: 'ribbon-outline' as const },
  { days: 365, label: '1 rok', icon: 'diamond-outline' as const },
];

const MOODS = [
  { score: 1, icon: 'sad-outline' as const, label: 'Słabo', color: '#E53935' },
  { score: 2, icon: 'sad-outline' as const, label: 'Niedobrze', color: '#FF8F00' },
  { score: 3, icon: 'happy-outline' as const, label: 'Tak sobie', color: '#FDD835' },
  { score: 4, icon: 'happy-outline' as const, label: 'Dobrze', color: '#66BB6A' },
  { score: 5, icon: 'heart-outline' as const, label: 'Świetnie', color: '#4A90D9' },
];

function SobrietyCounter({ C }: { C: typeof Colors.light }) {
  const { getSobrietyDuration } = useApp();
  const [time, setTime] = useState(getSobrietyDuration());
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getSobrietyDuration());
    }, 1000);

    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  return (
    <RNAnimated.View style={[styles.counterCard, { backgroundColor: C.blue, transform: [{ scale: pulseAnim }] }]}>
      <Text style={[styles.counterLabel, { fontFamily: 'Inter_500Medium' }]}>Twoja trzeźwość</Text>
      <View style={styles.counterRow}>
        <View style={styles.counterUnit}>
          <Text style={[styles.counterNumber, { fontFamily: 'Inter_700Bold' }]}>{time.days}</Text>
          <Text style={[styles.counterUnitLabel, { fontFamily: 'Inter_400Regular' }]}>dni</Text>
        </View>
        <Text style={styles.counterDot}>:</Text>
        <View style={styles.counterUnit}>
          <Text style={[styles.counterNumber, { fontFamily: 'Inter_700Bold' }]}>
            {String(time.hours).padStart(2, '0')}
          </Text>
          <Text style={[styles.counterUnitLabel, { fontFamily: 'Inter_400Regular' }]}>godz</Text>
        </View>
        <Text style={styles.counterDot}>:</Text>
        <View style={styles.counterUnit}>
          <Text style={[styles.counterNumber, { fontFamily: 'Inter_700Bold' }]}>
            {String(time.minutes).padStart(2, '0')}
          </Text>
          <Text style={[styles.counterUnitLabel, { fontFamily: 'Inter_400Regular' }]}>min</Text>
        </View>
        <Text style={styles.counterDot}>:</Text>
        <View style={styles.counterUnit}>
          <Text style={[styles.counterNumber, { fontFamily: 'Inter_700Bold' }]}>
            {String(time.seconds).padStart(2, '0')}
          </Text>
          <Text style={[styles.counterUnitLabel, { fontFamily: 'Inter_400Regular' }]}>sek</Text>
        </View>
      </View>
    </RNAnimated.View>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, getSobrietyDuration } = useApp();
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);

  useEffect(() => {
    const loadTodayMood = async () => {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem(`mood_${today}`);
      if (stored) setTodayMood(parseInt(stored));
    };
    loadTodayMood();
  }, []);

  const logMood = async (score: number) => {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(`mood_${today}`, String(score));
    setTodayMood(score);
    setShowMoodModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const apiBase = process.env.EXPO_PUBLIC_DOMAIN 
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : 'http://localhost:8080';
      await fetch(`${apiBase}/api/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, moodScore: score }),
      });
    } catch (_e) {}
  };

  const { days } = getSobrietyDuration();
  const earnedMilestones = MILESTONES.filter(m => days >= m.days);
  const nextMilestone = MILESTONES.find(m => days < m.days);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: bottomPadding + 100,
          paddingHorizontal: 20,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View>
            <Text style={[styles.greetingSmall, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Dzień dobry,
            </Text>
            <Text style={[styles.greetingName, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              {profile?.name ?? 'Wojowniku'}
            </Text>
          </View>
          <Pressable
            style={[styles.settingsBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push('/settings')}
          >
            <Feather name="settings" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Sobriety Counter */}
        <SobrietyCounter C={C} />

        {/* Panic Button */}
        <Pressable
          style={({ pressed }) => [
            styles.panicButton,
            { backgroundColor: pressed ? C.panicDark : C.panic, transform: [{ scale: pressed ? 0.97 : 1 }] }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/panic');
          }}
        >
          <Ionicons name="warning" size={28} color="#fff" />
          <Text style={[styles.panicText, { fontFamily: 'Inter_700Bold' }]}>POTRZEBUJĘ POMOCY</Text>
        </Pressable>

        {/* Mood Check-in */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Jak się dziś czujesz?
          </Text>
          {todayMood ? (
            <View style={styles.moodResult}>
              <Text style={[styles.moodResultText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Dzisiejszy nastrój: {MOODS[todayMood - 1].label}
              </Text>
              <Pressable onPress={() => setShowMoodModal(true)}>
                <Text style={[styles.changeMoodText, { color: C.blue, fontFamily: 'Inter_500Medium' }]}>Zmień</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.moodButton, { backgroundColor: C.blue + '15', borderColor: C.blue + '40' }]}
              onPress={() => setShowMoodModal(true)}
            >
              <Text style={[styles.moodButtonText, { color: C.blue, fontFamily: 'Inter_600SemiBold' }]}>
                Sprawdź nastrój
              </Text>
            </Pressable>
          )}
        </View>

        {/* Milestones */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Odznaki
          </Text>
          <View style={styles.milestoneRow}>
            {MILESTONES.map(m => {
              const earned = days >= m.days;
              return (
                <View key={m.days} style={styles.milestoneItem}>
                  <View style={[
                    styles.milestoneCircle,
                    { backgroundColor: earned ? C.green + '20' : C.border }
                  ]}>
                    <Ionicons
                      name={m.icon}
                      size={22}
                      color={earned ? C.green : C.textTertiary}
                    />
                  </View>
                  <Text style={[
                    styles.milestoneLabel,
                    { color: earned ? C.text : C.textTertiary, fontFamily: earned ? 'Inter_600SemiBold' : 'Inter_400Regular' }
                  ]}>
                    {m.label}
                  </Text>
                </View>
              );
            })}
          </View>
          {nextMilestone && (
            <View style={[styles.nextMilestone, { backgroundColor: C.blue + '10' }]}>
              <Ionicons name="flag-outline" size={16} color={C.blue} />
              <Text style={[styles.nextMilestoneText, { color: C.blue, fontFamily: 'Inter_500Medium' }]}>
                {nextMilestone.days - days} dni do: {nextMilestone.label}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>Szybkie akcje</Text>
        <View style={styles.quickActions}>
          {[
            { icon: 'chatbubble-outline' as const, label: 'Rozmowa z AI', tab: '/(tabs)/chat' },
            { icon: 'map-outline' as const, label: 'Grupy wsparcia', tab: '/(tabs)/map' },
            { icon: 'people-outline' as const, label: 'Mój sponsor', tab: '/(tabs)/buddy' },
            { icon: 'bar-chart-outline' as const, label: 'Mój postęp', tab: '/(tabs)/progress' },
          ].map(action => (
            <Pressable
              key={action.tab}
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(action.tab as any);
              }}
            >
              <Ionicons name={action.icon} size={26} color={C.blue} />
              <Text style={[styles.quickActionLabel, { color: C.text, fontFamily: 'Inter_500Medium' }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.moodModal, { backgroundColor: C.surface }]}>
            <Text style={[styles.moodModalTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              Jak się dziś czujesz?
            </Text>
            <View style={styles.moodOptions}>
              {MOODS.map(mood => (
                <Pressable
                  key={mood.score}
                  style={[styles.moodOption, { borderColor: mood.color + '40' }]}
                  onPress={() => logMood(mood.score)}
                >
                  <Ionicons name={mood.icon} size={32} color={mood.color} />
                  <Text style={[styles.moodOptionLabel, { color: C.text, fontFamily: 'Inter_500Medium' }]}>
                    {mood.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowMoodModal(false)} style={styles.moodClose}>
              <Text style={[styles.moodCloseText, { color: C.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Zamknij
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingSmall: { fontSize: 14 },
  greetingName: { fontSize: 24 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  counterLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterUnit: { alignItems: 'center', minWidth: 56 },
  counterNumber: { color: '#fff', fontSize: 44, lineHeight: 50 },
  counterUnitLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  counterDot: { color: 'rgba(255,255,255,0.6)', fontSize: 36, marginBottom: 8 },
  panicButton: {
    height: 72,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  panicText: { color: '#fff', fontSize: 20, letterSpacing: 0.5 },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 17 },
  moodResult: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodResultText: { fontSize: 15 },
  changeMoodText: { fontSize: 14 },
  moodButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodButtonText: { fontSize: 15 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between' },
  milestoneItem: { alignItems: 'center', gap: 6 },
  milestoneCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneLabel: { fontSize: 11 },
  nextMilestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextMilestoneText: { fontSize: 13 },
  sectionTitle: { fontSize: 17, marginTop: 4 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: {
    width: '47%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  quickActionLabel: { fontSize: 13, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moodModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    gap: 20,
  },
  moodModalTitle: { fontSize: 20, textAlign: 'center' },
  moodOptions: { flexDirection: 'row', justifyContent: 'space-between' },
  moodOption: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodOptionLabel: { fontSize: 11 },
  moodClose: { alignItems: 'center', paddingVertical: 8 },
  moodCloseText: { fontSize: 16 },
});
