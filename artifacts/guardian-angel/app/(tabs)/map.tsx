import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Colors } from '@/constants/colors';

const HOTLINES = [
  { name: 'Telefon Zaufania', number: '116 123', desc: 'Czynny całą dobę, bezpłatny', icon: 'call' as const },
  { name: 'PARPA', number: '801 033 033', desc: 'Pomoc w uzależnieniach', icon: 'medical' as const },
  { name: 'Pomarańczowa Linia', number: '801 140 068', desc: 'Pomoc dla rodzin osób uzależnionych', icon: 'heart' as const },
  { name: 'Telefon dla Dorosłych w Kryzysie', number: '116 123', desc: 'Wsparcie psychologiczne', icon: 'pulse' as const },
];

const SUPPORT_GROUPS = [
  { name: 'Anonimowi Alkoholicy (AA)', type: 'AA', meetings: 'Wiele grup w Polsce', website: 'https://www.anonimowialkoholicy.org.pl' },
  { name: 'Anonimowi Narkomani (NA)', type: 'NA', meetings: 'Grupy w całej Polsce', website: 'https://www.na.org.pl' },
  { name: 'Al-Anon', type: 'Al-Anon', meetings: 'Dla bliskich osób uzależnionych', website: 'https://al-anon.org.pl' },
  { name: 'SMART Recovery Polska', type: 'SMART', meetings: 'Wsparcie oparte na nauce', website: 'https://smartrecovery.pl' },
];

export default function MapScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'hotlines' | 'groups'>('hotlines');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (Platform.OS === 'web') {
      setLocationGranted(false);
      return;
    }
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(status === 'granted');
  };

  const callNumber = (number: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${number.replace(/ /g, '')}`);
  };

  const openWebsite = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Pomoc i wsparcie
        </Text>
        <Text style={[styles.subtitle, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Infolinie i grupy wsparcia w Polsce
        </Text>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: C.border }]}>
        {(['hotlines', 'groups'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: C.blue, borderBottomWidth: 2 }]}
            onPress={() => {
              setActiveTab(tab);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              styles.tabText,
              {
                color: activeTab === tab ? C.blue : C.textSecondary,
                fontFamily: activeTab === tab ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }
            ]}>
              {tab === 'hotlines' ? 'Infolinie' : 'Grupy wsparcia'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 100,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'hotlines' ? (
          <>
            <View style={[styles.infoBox, { backgroundColor: C.blue + '15', borderColor: C.blue + '30' }]}>
              <Ionicons name="information-circle" size={20} color={C.blue} />
              <Text style={[styles.infoText, { color: C.blue, fontFamily: 'Inter_400Regular' }]}>
                Wszystkie infolinie są bezpłatne i dostępne całą dobę
              </Text>
            </View>
            {HOTLINES.map((h, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.hotlineCard,
                  { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => callNumber(h.number)}
              >
                <View style={[styles.hotlineIcon, { backgroundColor: C.green + '20' }]}>
                  <Ionicons name={h.icon} size={24} color={C.green} />
                </View>
                <View style={styles.hotlineInfo}>
                  <Text style={[styles.hotlineName, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {h.name}
                  </Text>
                  <Text style={[styles.hotlineDesc, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {h.desc}
                  </Text>
                </View>
                <View style={[styles.callBadge, { backgroundColor: C.green }]}>
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={[styles.callNumber, { fontFamily: 'Inter_700Bold' }]}>{h.number}</Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            {SUPPORT_GROUPS.map((g, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.groupCard,
                  { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => openWebsite(g.website)}
              >
                <View style={styles.groupHeader}>
                  <View style={[styles.groupBadge, { backgroundColor: C.blue + '20' }]}>
                    <Text style={[styles.groupType, { color: C.blue, fontFamily: 'Inter_700Bold' }]}>
                      {g.type}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={C.textTertiary} />
                </View>
                <Text style={[styles.groupName, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {g.name}
                </Text>
                <Text style={[styles.groupMeetings, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {g.meetings}
                </Text>
                <Text style={[styles.groupWebsite, { color: C.blue, fontFamily: 'Inter_400Regular' }]}>
                  {g.website}
                </Text>
              </Pressable>
            ))}

            <View style={[styles.mapHint, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name="location-outline" size={32} color={C.textTertiary} />
              <Text style={[styles.mapHintTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
                Znajdź grupy w pobliżu
              </Text>
              <Text style={[styles.mapHintText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Odwiedź strony organizacji, aby znaleźć spotkania w Twoim mieście
              </Text>
              <Pressable
                style={[styles.mapsBtn, { backgroundColor: C.blue }]}
                onPress={() => openWebsite('https://www.anonimowialkoholicy.org.pl/grupy')}
              >
                <Ionicons name="map" size={18} color="#fff" />
                <Text style={[styles.mapsBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
                  Znajdź grupy AA
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 15 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  hotlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineInfo: { flex: 1 },
  hotlineName: { fontSize: 15 },
  hotlineDesc: { fontSize: 13, marginTop: 2 },
  callBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  callNumber: { color: '#fff', fontSize: 13 },
  groupCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  groupType: { fontSize: 12 },
  groupName: { fontSize: 16 },
  groupMeetings: { fontSize: 14 },
  groupWebsite: { fontSize: 12 },
  mapHint: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  mapHintTitle: { fontSize: 18 },
  mapHintText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 8,
  },
  mapsBtnText: { color: '#fff', fontSize: 15 },
});
