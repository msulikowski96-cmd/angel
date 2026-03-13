import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MoodData {
  date: string;
  score: number;
}

const MOOD_COLORS = ['#E53935', '#FF8F00', '#FDD835', '#66BB6A', '#4A90D9'];
const MOOD_EMOJIS = ['', 'Słabo', 'Niedobrze', 'Tak sobie', 'Dobrze', 'Świetnie'];

const ACHIEVEMENTS = [
  { id: 'first_day', title: 'Pierwszy krok', desc: '1 dzień trzeźwości', days: 1, icon: 'walk-outline' as const },
  { id: 'week', title: 'Tydzień siły', desc: '7 dni trzeźwości', days: 7, icon: 'star-outline' as const },
  { id: 'month', title: 'Miesiąc odwagi', desc: '30 dni trzeźwości', days: 30, icon: 'trophy-outline' as const },
  { id: 'quarter', title: 'Kwartał wolności', desc: '90 dni trzeźwości', days: 90, icon: 'ribbon-outline' as const },
  { id: 'half_year', title: 'Pół roku mocy', desc: '180 dni trzeźwości', days: 180, icon: 'medal-outline' as const },
  { id: 'year', title: 'Rok triumfu', desc: '365 dni trzeźwości', days: 365, icon: 'diamond-outline' as const },
];

export default function ProgressScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { getSobrietyDuration, profile } = useApp();
  const [moodHistory, setMoodHistory] = useState<MoodData[]>([]);
  const [dailySpend, setDailySpend] = useState('');
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [savedDailySpend, setSavedDailySpend] = useState<number>(0);

  const { days, hours } = getSobrietyDuration();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const moodData: MoodData[] = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const stored = await AsyncStorage.getItem(`mood_${dateStr}`);
        if (stored) {
          moodData.push({ date: dateStr, score: parseInt(stored) });
        }
      }
      setMoodHistory(moodData);

      const spend = await AsyncStorage.getItem('daily_spend');
      if (spend) setSavedDailySpend(parseFloat(spend));
      else if (profile?.dailySpend) setSavedDailySpend(profile.dailySpend);
    } catch (e) {}
  };

  const saveSpend = async () => {
    const amount = parseFloat(dailySpend);
    if (!isNaN(amount) && amount >= 0) {
      setSavedDailySpend(amount);
      await AsyncStorage.setItem('daily_spend', String(amount));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSpendModal(false);
  };

  const moneySaved = Math.round(savedDailySpend * days);
  const avgMood = moodHistory.length > 0
    ? (moodHistory.reduce((sum, m) => sum + m.score, 0) / moodHistory.length).toFixed(1)
    : null;

  const totalHours = days * 24 + hours;
  const cigarettesNotSmoked = Math.round(totalHours / 24 * 20);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toDateString();
    const mood = moodHistory.find(m => m.date === dateStr);
    return { date, mood: mood?.score ?? null };
  });

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingHorizontal: 20,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Mój postęp
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: C.blue }]}>
            <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{days}</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Dni trzeźwości</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: C.green }]}>
            <Ionicons name="cash" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{moneySaved} zł</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Zaoszczędzone</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#9B59B6' }]}>
            <Ionicons name="heart" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{avgMood ?? '—'}</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Średni nastrój</Text>
          </View>
          <Pressable
            style={[styles.statCard, { backgroundColor: '#E67E22' }]}
            onPress={() => {
              setDailySpend(savedDailySpend.toString());
              setShowSpendModal(true);
            }}
          >
            <Ionicons name="pencil" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{savedDailySpend} zł</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Dzienny koszt</Text>
          </Pressable>
        </View>

        {/* Mood Calendar */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Nastrój — ostatnie 30 dni
          </Text>
          <View style={styles.moodGrid}>
            {last30Days.map((day, idx) => (
              <View
                key={idx}
                style={[
                  styles.moodDot,
                  {
                    backgroundColor: day.mood
                      ? MOOD_COLORS[day.mood - 1]
                      : C.border,
                  }
                ]}
              />
            ))}
          </View>
          <View style={styles.moodLegend}>
            {MOOD_COLORS.map((color, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {MOOD_EMOJIS[i + 1]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Odznaki
        </Text>
        {ACHIEVEMENTS.map(ach => {
          const earned = days >= ach.days;
          return (
            <View
              key={ach.id}
              style={[
                styles.achievementRow,
                {
                  backgroundColor: C.surface,
                  borderColor: earned ? C.green : C.border,
                  borderLeftColor: earned ? C.green : C.border,
                  borderLeftWidth: earned ? 4 : 1,
                }
              ]}
            >
              <View style={[
                styles.achievementIcon,
                { backgroundColor: earned ? C.green + '20' : C.border }
              ]}>
                <Ionicons
                  name={ach.icon}
                  size={24}
                  color={earned ? C.green : C.textTertiary}
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementTitle,
                  {
                    color: earned ? C.text : C.textTertiary,
                    fontFamily: earned ? 'Inter_700Bold' : 'Inter_400Regular',
                  }
                ]}>
                  {ach.title}
                </Text>
                <Text style={[styles.achievementDesc, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {ach.desc}
                </Text>
              </View>
              {earned && (
                <Ionicons name="checkmark-circle" size={24} color={C.green} />
              )}
              {!earned && (
                <Text style={[styles.daysLeft, { color: C.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                  -{ach.days - days}d
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Spend Modal */}
      <Modal visible={showSpendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: C.surface }]}>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              Dzienny koszt uzależnienia
            </Text>
            <Text style={[styles.modalDesc, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Ile złotych dziennie wydawałeś na substancję?
            </Text>
            <TextInput
              style={[styles.spendInput, {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.text,
                fontFamily: 'Inter_400Regular',
              }]}
              placeholder="np. 50"
              placeholderTextColor={C.textTertiary}
              value={dailySpend}
              onChangeText={setDailySpend}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: C.border }]}
                onPress={() => setShowSpendModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: C.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
                  Anuluj
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: C.blue }]}
                onPress={saveSpend}
              >
                <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                  Zapisz
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderRadius: 18,
    padding: 18,
    gap: 6,
    alignItems: 'flex-start',
  },
  statNumber: { color: '#fff', fontSize: 28 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  cardTitle: { fontSize: 17 },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  moodDot: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  moodLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  sectionTitle: { fontSize: 20, marginTop: 4 },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: { flex: 1 },
  achievementTitle: { fontSize: 16 },
  achievementDesc: { fontSize: 13, marginTop: 2 },
  daysLeft: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 20, textAlign: 'center' },
  modalDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  spendInput: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalBtnText: { fontSize: 16 },
});
