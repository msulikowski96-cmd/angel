import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function BuddyScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, guardians, getSobrietyDuration } = useApp();
  const [myCode] = useState(() => `GA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [sponsorPhone, setSponsorPhone] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const { days } = getSobrietyDuration();

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const shareCode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Cześć! Jestem w programie Anioł Stróż. Mój kod do połączenia to: ${myCode}. Pobierz aplikację i połącz się ze mną jako mój sponsor.`,
      });
    } catch (e) {}
  };

  const callSponsor = () => {
    if (!sponsorPhone) {
      Alert.alert('Brak numeru', 'Dodaj numer telefonu sponsora.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${sponsorPhone.replace(/ /g, '')}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingHorizontal: 20,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          System Sponsora
        </Text>
        <Text style={[styles.subtitle, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Połącz się ze swoim sponsorem i zarządzaj Aniołami Stróżami
        </Text>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: C.blue }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{days}</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Dni trzeźwości</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { fontFamily: 'Inter_700Bold' }]}>{guardians.length}</Text>
            <Text style={[styles.statLabel, { fontFamily: 'Inter_400Regular' }]}>Aniołowie Stróżowie</Text>
          </View>
        </View>

        {/* My Code Card */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Twój kod sponsora
          </Text>
          <Text style={[styles.cardDesc, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Udostępnij ten kod swojemu sponsorowi, aby mógł śledzić Twój postęp
          </Text>
          <View style={[styles.codeBox, { backgroundColor: C.blue + '15', borderColor: C.blue + '40' }]}>
            <Text style={[styles.codeText, { color: C.blue, fontFamily: 'Inter_700Bold' }]}>
              {myCode}
            </Text>
          </View>
          <Pressable
            style={[styles.shareBtn, { backgroundColor: C.blue }]}
            onPress={shareCode}
          >
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={[styles.shareBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
              Udostępnij kod
            </Text>
          </Pressable>
        </View>

        {/* Sponsor Contact */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Kontakt ze sponsorem
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
              Imię sponsora
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.text,
                fontFamily: 'Inter_400Regular',
              }]}
              placeholder="Imię..."
              placeholderTextColor={C.textTertiary}
              value={sponsorName}
              onChangeText={setSponsorName}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
              Numer telefonu
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.text,
                fontFamily: 'Inter_400Regular',
              }]}
              placeholder="+48 ..."
              placeholderTextColor={C.textTertiary}
              value={sponsorPhone}
              onChangeText={setSponsorPhone}
              keyboardType="phone-pad"
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.callBtn,
              { backgroundColor: C.green, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={callSponsor}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={[styles.callBtnText, { fontFamily: 'Inter_700Bold' }]}>
              Zadzwoń do sponsora
            </Text>
          </Pressable>
        </View>

        {/* Guardians List */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Aniołowie Stróżowie ({guardians.length}/5)
          </Text>
          {guardians.length === 0 ? (
            <View style={styles.emptyGuardians}>
              <Ionicons name="people-outline" size={40} color={C.textTertiary} />
              <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Brak Aniołów Stróżów. Dodaj ich w ustawieniach.
              </Text>
            </View>
          ) : (
            guardians.map(g => (
              <View key={g.id} style={[styles.guardianRow, { borderBottomColor: C.border }]}>
                <View style={[styles.guardianAvatar, { backgroundColor: C.blue + '20' }]}>
                  <Ionicons name="person" size={20} color={C.blue} />
                </View>
                <View style={styles.guardianInfo}>
                  <Text style={[styles.guardianName, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {g.name}
                  </Text>
                  <Text style={[styles.guardianPhone, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {g.phone}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(`tel:${g.phone.replace(/ /g, '')}`)}
                  style={[styles.callIconBtn, { backgroundColor: C.green + '20' }]}
                >
                  <Ionicons name="call" size={18} color={C.green} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: C.green + '15', borderColor: C.green + '40' }]}>
          <Text style={[styles.tipsTitle, { color: C.green, fontFamily: 'Inter_700Bold' }]}>
            Rada dnia
          </Text>
          <Text style={[styles.tipsText, { color: C.text, fontFamily: 'Inter_400Regular' }]}>
            "Nie musisz widzieć całej drogi schodów, musisz tylko zrobić pierwszy krok." — Martin Luther King Jr.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  statsCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statNumber: { color: '#fff', fontSize: 40 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  statDivider: { width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.3)' },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  cardTitle: { fontSize: 18 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  codeBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 18,
    alignItems: 'center',
  },
  codeText: { fontSize: 28, letterSpacing: 3 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  shareBtnText: { color: '#fff', fontSize: 16 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 14,
  },
  callBtnText: { color: '#fff', fontSize: 17 },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  guardianAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianInfo: { flex: 1 },
  guardianName: { fontSize: 15 },
  guardianPhone: { fontSize: 13 },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGuardians: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  tipsCard: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 8 },
  tipsTitle: { fontSize: 14 },
  tipsText: { fontSize: 15, lineHeight: 22 },
});
