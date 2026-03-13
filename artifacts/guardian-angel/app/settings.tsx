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
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, guardians, setProfile, addGuardian, removeGuardian, completeOnboarding } = useApp();

  const [name, setName] = useState(profile?.name ?? '');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const saveProfile = async () => {
    if (!name.trim()) return;
    await setProfile({ ...profile!, name: name.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Zapisano', 'Twój profil został zaktualizowany.');
  };

  const addNewGuardian = async () => {
    if (!guardianName.trim() || !guardianPhone.trim()) return;
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

  const confirmRemoveGuardian = (id: number, name: string) => {
    Alert.alert(`Usuń ${name}?`, 'Czy na pewno chcesz usunąć tego Anioła Stróża?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => removeGuardian(id) },
    ]);
  };

  const resetApp = () => {
    Alert.alert(
      'Zresetuj aplikację',
      'Czy na pewno? To usunie wszystkie Twoje dane.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Resetuj',
          style: 'destructive',
          onPress: async () => {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.clear();
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
          gap: 20,
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
          <Pressable style={[styles.saveBtn, { backgroundColor: C.blue }]} onPress={saveProfile}>
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Zapisz</Text>
          </Pressable>
        </View>

        {/* Guardians */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Aniołowie Stróżowie ({guardians.length}/5)
          </Text>
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
                placeholder="Imię"
                placeholderTextColor={C.textTertiary}
                value={guardianName}
                onChangeText={setGuardianName}
              />
              <TextInput
                style={[styles.smallInput, { borderColor: C.border, color: C.text, backgroundColor: C.background, fontFamily: 'Inter_400Regular' }]}
                placeholder="Numer telefonu"
                placeholderTextColor={C.textTertiary}
                value={guardianPhone}
                onChangeText={setGuardianPhone}
                keyboardType="phone-pad"
              />
              <Pressable style={[styles.addBtn, { backgroundColor: C.green }]} onPress={addNewGuardian}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Dodaj</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: '#E5393530' }]}>
          <Text style={[styles.cardTitle, { color: '#E53935', fontFamily: 'Inter_700Bold' }]}>Strefa niebezpieczna</Text>
          <Pressable style={[styles.dangerBtn, { borderColor: '#E53935' }]} onPress={resetApp}>
            <Ionicons name="refresh" size={18} color="#E53935" />
            <Text style={[styles.dangerBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Zresetuj aplikację</Text>
          </Pressable>
        </View>
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
  cardTitle: { fontSize: 17 },
  label: { fontSize: 14 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15 },
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
    gap: 6,
  },
  addBtnText: { color: '#fff', fontSize: 15 },
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
});
