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
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, guardians, setProfile, addGuardian, removeGuardian } = useApp();

  const [name, setName] = useState(profile?.name ?? '');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Błąd', 'Proszę podać imię.');
      return;
    }
    setIsSaving(true);
    try {
      await setProfile({ ...profile!, name: name.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Zapisano', 'Twój profil został zaktualizowany.');
    } finally {
      setIsSaving(false);
    }
  };

  const addNewGuardian = async () => {
    if (!guardianName.trim() || !guardianPhone.trim()) {
      Alert.alert('Uzupełnij dane', 'Wpisz imię i numer telefonu.');
      return;
    }
    if (guardians.length >= 5) {
      Alert.alert('Maksymalna liczba', 'Możesz dodać maksymalnie 5 Aniołów Stróżów.');
      return;
    }
    await addGuardian({
      id: Date.now(),
      name: guardianName.trim(),
      phone: guardianPhone.trim(),
    });
    setGuardianName('');
    setGuardianPhone('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmRemoveGuardian = (id: number, guardianNameStr: string) => {
    Alert.alert(`Usuń ${guardianNameStr}?`, 'Czy na pewno chcesz usunąć tego Anioła Stróża?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => removeGuardian(id) },
    ]);
  };

  const resetApp = () => {
    Alert.alert(
      'Zresetuj aplikację',
      'Czy na pewno? To nieodwracalnie usunie WSZYSTKIE Twoje dane — licznik trzeźwości, historię nastrojów i rozmowy.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Resetuj',
          style: 'destructive',
          onPress: async () => {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Ustawienia
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>Profil</Text>
          <Text style={[styles.label, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>Imię</Text>
          <TextInput
            style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: 'Inter_400Regular' }]}
            value={name}
            onChangeText={setName}
            placeholder="Twoje imię"
            placeholderTextColor={C.textTertiary}
          />
          <Pressable
            style={[styles.saveBtn, { backgroundColor: isSaving ? C.border : C.blue }]}
            onPress={saveProfile}
            disabled={isSaving}
          >
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
              {isSaving ? 'Zapisuję...' : 'Zapisz zmiany'}
            </Text>
          </Pressable>
        </View>

        {/* Guardians */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              Aniołowie Stróżowie
            </Text>
            <View style={[styles.badge, { backgroundColor: C.blue + '20' }]}>
              <Text style={[styles.badgeText, { color: C.blue, fontFamily: 'Inter_600SemiBold' }]}>
                {guardians.length}/5
              </Text>
            </View>
          </View>

          {guardians.length === 0 && (
            <View style={[styles.emptyGuardians, { backgroundColor: C.background }]}>
              <Ionicons name="people-outline" size={32} color={C.textTertiary} />
              <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Brak Aniołów. Dodaj osoby, które dostana SMS w sytuacji kryzysowej.
              </Text>
            </View>
          )}

          {guardians.map(g => (
            <View key={g.id} style={[styles.guardianRow, { borderBottomColor: C.border }]}>
              <View style={[styles.guardianAvatar, { backgroundColor: C.blue + '20' }]}>
                <Ionicons name="person" size={18} color={C.blue} />
              </View>
              <View style={styles.guardianInfo}>
                <Text style={[styles.guardianName, { color: C.text, fontFamily: 'Inter_600SemiBold' }]}>{g.name}</Text>
                <Text style={[styles.guardianPhone, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>{g.phone}</Text>
              </View>
              <Pressable onPress={() => confirmRemoveGuardian(g.id, g.name)} hitSlop={10}>
                <Feather name="trash-2" size={18} color="#E53935" />
              </Pressable>
            </View>
          ))}

          {guardians.length < 5 && (
            <View style={styles.addGuardian}>
              <TextInput
                style={[styles.smallInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: 'Inter_400Regular' }]}
                placeholder="Imię Anioła"
                placeholderTextColor={C.textTertiary}
                value={guardianName}
                onChangeText={setGuardianName}
              />
              <TextInput
                style={[styles.smallInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: 'Inter_400Regular' }]}
                placeholder="Numer telefonu (+48...)"
                placeholderTextColor={C.textTertiary}
                value={guardianPhone}
                onChangeText={setGuardianPhone}
                keyboardType="phone-pad"
              />
              <Pressable style={[styles.addBtn, { backgroundColor: C.green }]} onPress={addNewGuardian}>
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Dodaj Anioła</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Legal & Info */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>Informacje</Text>

          {[
            {
              icon: 'shield-checkmark-outline' as const,
              label: 'Polityka prywatności',
              onPress: () => router.push('/privacy'),
            },
            {
              icon: 'document-text-outline' as const,
              label: 'Regulamin',
              onPress: () => router.push('/privacy'),
            },
            {
              icon: 'star-outline' as const,
              label: 'Oceń aplikację',
              onPress: () => Linking.openURL('market://details?id=pl.aniolstroz.app'),
            },
            {
              icon: 'share-social-outline' as const,
              label: 'Podziel się z innymi',
              onPress: async () => {
                const { Share } = await import('react-native');
                Share.share({
                  message: 'Polecam aplikację Anioł Stróż — wspiera w trzeźwości i ma przyciski SOS. Pobierz: https://play.google.com/store/apps/details?id=pl.aniolstroz.app',
                });
              },
            },
          ].map((item, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [
                styles.menuRow,
                { borderBottomColor: C.border, opacity: pressed ? 0.7 : 1 }
              ]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={20} color={C.blue} />
              <Text style={[styles.menuLabel, { color: C.text, fontFamily: 'Inter_500Medium' }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: '#E5393520' }]}>
          <Text style={[styles.cardTitle, { color: '#E53935', fontFamily: 'Inter_700Bold' }]}>
            Strefa niebezpieczna
          </Text>
          <Text style={[styles.dangerDesc, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Usunięcie danych jest nieodwracalne. Stracisz swój licznik trzeźwości i całą historię.
          </Text>
          <Pressable style={[styles.dangerBtn, { borderColor: '#E53935' }]} onPress={resetApp}>
            <Ionicons name="trash-outline" size={18} color="#E53935" />
            <Text style={[styles.dangerBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Usuń wszystkie dane</Text>
          </Pressable>
        </View>

        {/* Version */}
        <Text style={[styles.version, { color: C.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Anioł Stróż v{APP_VERSION} · pl.aniolstroz.app
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13 },
  label: { fontSize: 14 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15 },
  emptyGuardians: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 12,
  },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  guardianAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardianInfo: { flex: 1 },
  guardianName: { fontSize: 15 },
  guardianPhone: { fontSize: 13 },
  addGuardian: { gap: 10 },
  smallInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addBtn: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 15 },
  dangerDesc: { fontSize: 13, lineHeight: 20 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dangerBtnText: { color: '#E53935', fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
