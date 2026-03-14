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
  ActivityIndicator,
} from 'react-native';
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
}

interface ConversationMeta {
  serverId: number;
  title: string;
  preview: string;
  createdAt: string;
}

const QUICK_PROMPTS = [
  'Mam ochotę się napić',
  'Jestem smutny i samotny',
  'Potrzebuję motywacji',
  'Jak przetrwać zachciankę?',
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN ?? '';

export default function ChatScreen() {
  const scheme = useColorScheme();
  const C = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { profile, getSobrietyDuration } = useApp();

  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const stored = await AsyncStorage.getItem('chat_conversations_v2');
      if (stored) setConversations(JSON.parse(stored));
    } catch (_e) {}
  };

  const saveConversations = async (convs: ConversationMeta[]) => {
    await AsyncStorage.setItem('chat_conversations_v2', JSON.stringify(convs));
  };

  const createConversation = async () => {
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/api/gemini/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nowa rozmowa' }),
      });
      if (!res.ok) throw new Error('Failed to create conversation');
      const data = await res.json();
      const conv: ConversationMeta = {
        serverId: data.id,
        title: data.title,
        preview: '',
        createdAt: data.createdAt,
      };
      const newConvs = [conv, ...conversations];
      setConversations(newConvs);
      await saveConversations(newConvs);
      setActiveConv(conv);
      setMessages([]);
    } catch (err) {
      Alert.alert('Błąd', 'Nie można połączyć z serwerem AI. Sprawdź połączenie.');
    } finally {
      setIsCreating(false);
    }
  };

  const openConversation = async (conv: ConversationMeta) => {
    setActiveConv(conv);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${API_BASE}/api/gemini/conversations/${conv.serverId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(data.messages.map((m: any) => ({
        id: String(m.id),
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
    } catch (_e) {
      setMessages([]);
    }
  };

  const deleteConversation = async (conv: ConversationMeta) => {
    Alert.alert('Usuń rozmowę', 'Czy na pewno chcesz usunąć tę rozmowę?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/api/gemini/conversations/${conv.serverId}`, { method: 'DELETE' });
          } catch (_e) {}
          const filtered = conversations.filter(c => c.serverId !== conv.serverId);
          setConversations(filtered);
          await saveConversations(filtered);
          if (activeConv?.serverId === conv.serverId) {
            setActiveConv(null);
            setMessages([]);
          }
        },
      },
    ]);
  };

  const { days } = getSobrietyDuration();

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming || !activeConv) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch(`${API_BASE}/api/gemini/conversations/${activeConv.serverId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
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
              if (data.error) {
                fullContent = data.error;
                setStreamingContent(fullContent);
              }
            } catch (_e) {}
          }
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Update conversation meta
      const preview = fullContent.slice(0, 80);
      const newTitle = text.slice(0, 40);
      const updatedConvs = conversations.map(c =>
        c.serverId === activeConv.serverId
          ? { ...c, preview, title: newTitle }
          : c
      );
      setConversations(updatedConvs);
      await saveConversations(updatedConvs);
      setActiveConv(prev => prev ? { ...prev, preview, title: newTitle } : prev);

    } catch (_err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Przepraszam, wystąpił problem z połączeniem. Sprawdź internet i spróbuj ponownie.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // --- CONVERSATION LIST VIEW ---
  if (!activeConv) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16, borderBottomColor: C.border }]}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Rozmowy z AI
          </Text>
          <Pressable
            style={[styles.newBtn, { backgroundColor: C.blue }]}
            onPress={createConversation}
            disabled={isCreating}
          >
            {isCreating
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="add" size={22} color="#fff" />
            }
          </Pressable>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: C.blue + '15' }]}>
              <Ionicons name="shield-checkmark" size={52} color={C.blue} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
              Anioł Stróż AI
            </Text>
            <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Jestem tu, żeby Ci pomóc. Możemy porozmawiać o Twoich zachciankach, emocjach lub po prostu jak sobie radzisz.
            </Text>
            <Pressable
              style={[styles.startBtn, { backgroundColor: C.blue }]}
              onPress={createConversation}
              disabled={isCreating}
            >
              {isCreating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.startBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Zacznij rozmowę</Text>
              }
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => String(item.serverId)}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: bottomPadding + 100 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.convRow,
                  { borderBottomColor: C.border, opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => openConversation(item)}
                onLongPress={() => deleteConversation(item)}
              >
                <View style={[styles.convIcon, { backgroundColor: C.blue + '15' }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={C.blue} />
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

  // --- ACTIVE CHAT VIEW ---
  const displayMessages: Message[] = isStreaming && streamingContent
    ? [...messages, { id: 'streaming', role: 'assistant', content: streamingContent }]
    : messages;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.chatHeader, { paddingTop: topPadding + 8, borderBottomColor: C.border }]}>
        <Pressable onPress={() => { setActiveConv(null); setMessages([]); }} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <View style={styles.chatHeaderCenter}>
          <View style={[styles.aiDot, { backgroundColor: C.green }]} />
          <Text style={[styles.chatHeaderTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
            Anioł Stróż AI
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={displayMessages}
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
            displayMessages.length === 0 && !isStreaming ? (
              <View style={styles.introBox}>
                <View style={[styles.introAvatar, { backgroundColor: C.blue }]}>
                  <Ionicons name="shield-checkmark" size={32} color="#fff" />
                </View>
                <Text style={[styles.introTitle, { color: C.text, fontFamily: 'Inter_700Bold' }]}>
                  Cześć, {profile?.name ?? 'Wojowniku'}
                </Text>
                <Text style={[styles.introText, { color: C.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Masz już {days} {days === 1 ? 'dzień' : days < 5 ? 'dni' : 'dni'} trzeźwości. To jest Twoja siła. Jak mogę Ci dziś pomóc?
                </Text>
                <View style={styles.quickPromptsRow}>
                  {QUICK_PROMPTS.map(p => (
                    <Pressable
                      key={p}
                      style={[styles.quickPrompt, { backgroundColor: C.blue + '12', borderColor: C.blue + '30' }]}
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
                  ? { backgroundColor: C.blue, marginLeft: 52 }
                  : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, marginRight: 52 }
              ]}>
                <Text style={[
                  styles.messageText,
                  {
                    color: item.role === 'user' ? '#fff' : C.text,
                    fontFamily: 'Inter_400Regular',
                  }
                ]}>
                  {item.content}
                  {item.id === 'streaming' && (
                    <Text style={{ color: C.blue }}>▌</Text>
                  )}
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
            paddingBottom: bottomPadding + 8,
          }
        ]}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.chatInput, {
                backgroundColor: C.background,
                borderColor: input.trim() ? C.blue : C.border,
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
                {
                  backgroundColor: input.trim() && !isStreaming ? C.blue : C.border,
                }
              ]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <ActivityIndicator color="#fff" size="small" />
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22 },
  emptyText: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  startBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
    marginTop: 8,
    minWidth: 200,
    alignItems: 'center',
  },
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
  chatHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  chatHeaderTitle: { fontSize: 17 },
  introBox: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  introAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  introTitle: { fontSize: 22 },
  introText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  quickPrompt: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  quickPromptText: { fontSize: 14 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userMessageRow: { justifyContent: 'flex-end' },
  aiMessageRow: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    flexShrink: 0,
  },
  messageBubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  messageText: { fontSize: 15, lineHeight: 22 },
  inputRow: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
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
