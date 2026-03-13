import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  name: string;
  sobrietyStart: string;
  addictionType?: string;
  dailySpend?: number;
  checkInTime?: string;
  userId?: number;
}

export interface Guardian {
  id: number;
  name: string;
  phone: string;
  relationship?: string;
}

interface AppContextValue {
  profile: UserProfile | null;
  guardians: Guardian[];
  isOnboarded: boolean;
  isLoading: boolean;
  setProfile: (profile: UserProfile) => void;
  setGuardians: (guardians: Guardian[]) => void;
  addGuardian: (guardian: Guardian) => void;
  removeGuardian: (id: number) => void;
  completeOnboarding: () => void;
  getSobrietyDuration: () => { days: number; hours: number; minutes: number; seconds: number };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [guardians, setGuardiansState] = useState<Guardian[]>([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData, guardiansData, onboardedData] = await Promise.all([
          AsyncStorage.getItem('profile'),
          AsyncStorage.getItem('guardians'),
          AsyncStorage.getItem('onboarded'),
        ]);
        if (profileData) setProfileState(JSON.parse(profileData));
        if (guardiansData) setGuardiansState(JSON.parse(guardiansData));
        if (onboardedData === 'true') setIsOnboarded(true);
      } catch (err) {
        console.error('Failed to load app data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const setProfile = async (newProfile: UserProfile) => {
    setProfileState(newProfile);
    await AsyncStorage.setItem('profile', JSON.stringify(newProfile));
  };

  const setGuardians = async (newGuardians: Guardian[]) => {
    setGuardiansState(newGuardians);
    await AsyncStorage.setItem('guardians', JSON.stringify(newGuardians));
  };

  const addGuardian = async (guardian: Guardian) => {
    const newGuardians = [...guardians, guardian];
    setGuardiansState(newGuardians);
    await AsyncStorage.setItem('guardians', JSON.stringify(newGuardians));
  };

  const removeGuardian = async (id: number) => {
    const newGuardians = guardians.filter(g => g.id !== id);
    setGuardiansState(newGuardians);
    await AsyncStorage.setItem('guardians', JSON.stringify(newGuardians));
  };

  const completeOnboarding = async () => {
    setIsOnboarded(true);
    await AsyncStorage.setItem('onboarded', 'true');
  };

  const getSobrietyDuration = () => {
    if (!profile?.sobrietyStart) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const now = new Date();
    const start = new Date(profile.sobrietyStart);
    const diffMs = now.getTime() - start.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  };

  const value = useMemo(() => ({
    profile,
    guardians,
    isOnboarded,
    isLoading,
    setProfile,
    setGuardians,
    addGuardian,
    removeGuardian,
    completeOnboarding,
    getSobrietyDuration,
  }), [profile, guardians, isOnboarded, isLoading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
