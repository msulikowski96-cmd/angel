import React from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

const SECTIONS = [
  {
    title: '1. Jakie dane zbieramy',
    content: `Anioł Stróż zbiera wyłącznie dane niezbędne do działania aplikacji:

• Imię użytkownika (opcjonalne)
• Data ostatniego drinka/dawki (opcjonalne)  
• Numery telefonów Aniołów Stróżów (przechowywane tylko na Twoim urządzeniu)
• Wpisy nastroju (przechowywane lokalnie i na naszym serwerze)
• Historia rozmów z AI (przechowywana na naszym serwerze)

Nie zbieramy adresu e-mail, hasła, danych karty kredytowej ani żadnych innych danych osobowych.`,
  },
  {
    title: '2. Jak używamy Twoich danych',
    content: `Twoje dane służą wyłącznie do:

• Wyświetlania licznika trzeźwości
• Wysyłania SMS do Aniołów Stróżów (z Twoją lokalizacją) w sytuacji kryzysowej
• Prowadzenia rozmów z AI (Gemini)
• Śledzenia Twojego postępu i nastrojów

Nigdy nie sprzedajemy, nie wynajmujemy ani nie udostępniamy Twoich danych firmom trzecim w celach marketingowych.`,
  },
  {
    title: '3. Lokalizacja GPS',
    content: `Aplikacja prosi o dostęp do lokalizacji wyłącznie gdy naciskasz przycisk SOS. Lokalizacja jest:

• Pobierana jednorazowo w momencie naciśnięcia SOS
• Wysyłana SMS-em do Twoich Aniołów Stróżów
• Nie przechowywana na naszych serwerach
• Nie śledziona w tle

Możesz odmówić dostępu do lokalizacji — SMS zostanie wysłany bez niej.`,
  },
  {
    title: '4. SMS',
    content: `Aplikacja wysyła SMS wyłącznie gdy:
• Naciskasz przycisk SOS (z Twoją zgodą)
• Wiadomość zawiera tylko Twoje imię i link do lokalizacji

Koszt SMS pokrywa Twój operator telefoniczny zgodnie z Twoim abonamentem.`,
  },
  {
    title: '5. Bezpieczeństwo danych',
    content: `Chronię Twoje dane przez:

• Szyfrowanie połączeń (HTTPS/TLS)
• Przechowywanie danych lokalnie na urządzeniu (AsyncStorage)
• Minimalizację zbieranych danych
• Brak przechowywania haseł (brak systemu kont)`,
  },
  {
    title: '6. Dane dzieci',
    content: `Aplikacja jest przeznaczona wyłącznie dla osób powyżej 18 roku życia. Nie zbieramy świadomie danych od osób poniżej 18 lat.`,
  },
  {
    title: '7. Twoje prawa',
    content: `Masz prawo do:

• Usunięcia wszystkich danych (Ustawienia → Zresetuj aplikację)
• Eksportu danych (skontaktuj się z nami)
• Wniesienia skargi do UODO (Urząd Ochrony Danych Osobowych)

Dane przechowywane na serwerze usuwamy na żądanie w ciągu 30 dni.`,
  },
  {
    title: '8. Kontakt',
    content: `W sprawach prywatności skontaktuj się:\n\nE-mail: privacy@aniolstroz.pl\n\nAplicacja działa zgodnie z RODO (Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679).`,
  },
];

export default function PrivacyScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Polityka prywatności
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.intro, { backgroundColor: C.blue + '15', borderColor: C.blue + '30' }]}>
          <Ionicons name="shield-checkmark" size={24} color={C.blue} />
          <Text style={[styles.introText, { color: C.blue, fontFamily: 'Inter_500Medium' }]}>
            Twoja prywatność jest dla nas priorytetem. Ta aplikacja nie zbiera danych bez Twojej wiedzy.
          </Text>
        </View>

        <Text style={[styles.lastUpdated, { color: C.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Ostatnia aktualizacja: 14 marca 2026
        </Text>

        {SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <Pressable
          style={[styles.contactBtn, { borderColor: C.border }]}
          onPress={() => Linking.openURL('mailto:privacy@aniolstroz.pl')}
        >
          <Ionicons name="mail-outline" size={20} color={C.blue} />
          <Text style={[styles.contactBtnText, { color: C.blue, fontFamily: 'Inter_600SemiBold' }]}>
            Skontaktuj się w sprawie prywatności
          </Text>
        </Pressable>
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
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  introText: { flex: 1, fontSize: 14, lineHeight: 22 },
  lastUpdated: { fontSize: 13 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16 },
  sectionContent: { fontSize: 14, lineHeight: 22 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 8,
  },
  contactBtnText: { fontSize: 15 },
});
