import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function ConversationRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    router.replace('/(tabs)/chat');
  }, []);

  return null;
}
