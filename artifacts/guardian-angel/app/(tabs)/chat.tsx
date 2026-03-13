import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationMeta {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  'Mam ochotę',
  'Jestem smutny',
  'Potrzebuję motywacji',
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? '';

export default function ChatScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, getSobrietyDuration } = useApp();

  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem('chat_conversations');
      if (stored) setConversations(JSON.parse(stored));
    } catch (e) {}
  };

  const saveConversations = async (convs: ConversationMeta[]) => {
    await AsyncStorage.setItem('chat_conversations', JSON.stringify(convs));
  };

  const createConversation = async () => {
    const id = Date.now().toString();
    const conv: ConversationMeta = {
      id,
      title: 'Nowa rozmowa',
      preview: '',
      createdAt: new Date().toISOString(),
    };
    const newConvs = [conv, ...conversations];
    setConversations(newConvs);
    await saveConversations(newConvs);
    setActiveConvId(id);
    setMessages([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openConversation = async (id: string) => {
    setActiveConvId(id);
    try {
      const stored = await AsyncStorage.getItem(`chat_messages_${id}`);
      if (stored) setMessages(JSON.parse(stored));
      else setMessages([]);
    } catch (e) {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const deleteConversation = async (id: string) => {
    Alert.alert('Usuń rozmowę', 'Czy na pewno chcesz usunąć tę rozmowę?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          const filtered = conversations.filter(c => c.id !== id);
          setConversations(filtered);
          await saveConversations(filtered);
          await AsyncStorage.removeItem(`chat_messages_${id}`);
          if (activeConvId === id) {
            setActiveConvId(null);
            setMessages([]);
          }
        },
      },
    ]);
  };

  const { days } = getSobrietyDuration();

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming || !activeConvId) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setStreamingContent('');

    const systemContext = `Imię użytkownika: ${profile?.name ?? 'Użytkownik'}. Liczba dni trzeźwości: ${days}.`;
    const messagesWithContext = [
      { role: 'user' as const, content: systemContext },
      { role: 'assistant' as const, content: 'Dziękuję za informacje. Jak mogę ci pomóc?' },
      ...updatedMessages,
    ];

    try {
      const response = await fetch(`${API_BASE}/api/gemini/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 50) }),
      });
      const conv = await response.json();

      const streamResponse = await fetch(`${API_BASE}/api/gemini/conversations/${conv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (!streamResponse.body) throw new Error('No stream body');

      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.done) break;
            } catch (e) {}
          }
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      await AsyncStorage.setItem(`chat_messages_${activeConvId}`, JSON.stringify(finalMessages));

      const updatedConvs = conversations.map(c =>
        c.id === activeConvId
          ? { ...c, preview: fullContent.slice(0, 60) + '...', title: text.slice(0, 40) }
          : c
      );
      setConversations(updatedConvs);
      await saveConversations(updatedConvs);

    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  if (!activeConvId) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: C.border }]}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Rozmowy z AI
          </Text>
          <Pressable
            style={[styles.newBtn, { backgroundColor: C.blue }]}
            onPress={createConversation}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={C.textTertiary} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              Brak rozmów
            </Text>
            <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Zacznij rozmowę ze swoim Aniołem Stróżem AI. Jestem tutaj, aby ci pomóc.
            </Text>
            <Pressable
              style={[styles.startBtn, { backgroundColor: C.blue }]}
              onPress={createConversation}
            >
              <Text style={[styles.startBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
                Zacznij rozmowę
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 100 }}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.convRow, { borderBottomColor: C.border }]}
                onPress={() => openConversation(item.id)}
                onLongPress={() => deleteConversation(item.id)}
              >
                <View style={[styles.convIcon, { backgroundColor: C.blue + '15' }]}>
                  <Ionicons name="chatbubble" size={22} color={C.blue} />
                </View>
                <View style={styles.convInfo}>
                  <Text style={[styles.convTitle, { color: C.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.preview ? (
                    <Text style={[styles.convPreview, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                      {item.preview}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  const allMessages = isStreaming && streamingContent
    ? [...messages, { id: 'streaming', role: 'assistant' as const, content: streamingContent, createdAt: '' }]
    : messages;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.chatHeader, { paddingTop: topPadding + 8, borderBottomColor: C.border }]}>
        <Pressable onPress={() => setActiveConvId(null)} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={[styles.chatHeaderTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
          Anioł Stróż AI
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={allMessages}
          inverted
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            gap: 12,
            flexDirection: 'column-reverse',
          }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            messages.length === 0 && !isStreaming ? (
              <View style={styles.introBox}>
                <Ionicons name="shield-checkmark" size={40} color={C.blue} />
                <Text style={[styles.introTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
                  Cześć, {profile?.name ?? 'Wojowniku'}
                </Text>
                <Text style={[styles.introText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Masz już {days} dni trzeźwości. To wielka siła. Jak mogę ci dziś pomóc?
                </Text>
                <View style={styles.quickPromptsRow}>
                  {QUICK_PROMPTS.map(p => (
                    <Pressable
                      key={p}
                      style={[styles.quickPrompt, { backgroundColor: C.blue + '15', borderColor: C.blue + '30' }]}
                      onPress={() => sendMessage(p)}
                    >
                      <Text style={[styles.quickPromptText, { color: C.blue, fontFamily: 'Inter_500Medium' }]}>
                        {p}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[
              styles.messageRow,
              item.role === 'user' ? styles.userMessageRow : styles.aiMessageRow
            ]}>
              {item.role === 'assistant' && (
                <View style={[styles.aiAvatar, { backgroundColor: C.blue }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={[
                styles.messageBubble,
                item.role === 'user'
                  ? { backgroundColor: C.blue, marginLeft: 48 }
                  : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, marginRight: 48 }
              ]}>
                <Text style={[
                  styles.messageText,
                  {
                    color: item.role === 'user' ? '#fff' : C.text,
                    fontFamily: 'Inter_400Regular',
                  }
                ]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={[
          styles.inputRow,
          {
            backgroundColor: C.surface,
            borderTopColor: C.border,
            paddingBottom: insets.bottom + 8,
          }
        ]}>
          {!isStreaming && messages.length === 0 && (
            <View style={styles.quickPromptsInline}>
              {QUICK_PROMPTS.map(p => (
                <Pressable
                  key={p}
                  style={[styles.quickPromptInline, { backgroundColor: C.blue + '15' }]}
                  onPress={() => sendMessage(p)}
                >
                  <Text style={[styles.quickPromptInlineText, { color: C.blue, fontFamily: 'Inter_500Medium' }]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.chatInput, {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.text,
                fontFamily: 'Inter_400Regular',
              }]}
              placeholder="Napisz wiadomość..."
              placeholderTextColor={C.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              editable={!isStreaming}
            />
            <Pressable
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() && !isStreaming ? C.blue : C.border }
              ]}
              onPress={() => {
                sendMessage(input);
                inputRef.current?.focus();
              }}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22 },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyTitle: { fontSize: 22 },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  startBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50, marginTop: 8 },
  startBtnText: { color: '#fff', fontSize: 16 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
  },
  convIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  convInfo: { flex: 1 },
  convTitle: { fontSize: 16 },
  convPreview: { fontSize: 13, marginTop: 2 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chatHeaderTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  introBox: { alignItems: 'center', gap: 14, paddingVertical: 24, paddingHorizontal: 16 },
  introTitle: { fontSize: 20 },
  introText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickPrompt: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
  },
  quickPromptText: { fontSize: 14 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userMessageRow: { justifyContent: 'flex-end' },
  aiMessageRow: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  messageBubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  messageText: { fontSize: 15, lineHeight: 22 },
  inputRow: { paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1 },
  quickPromptsInline: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  quickPromptInline: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
  quickPromptInlineText: { fontSize: 13 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1.5,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
