// App.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from './src/db';
import RootNavigator from './src/navigation/RootNavigator';
import './global.css';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('[App] DB init failed:', err);
        setError(String(err));
      });
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (ready || error) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, error]);

  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center bg-red-50 px-6"
        onLayout={onLayoutRootView}>
        <Text className="mb-2 text-base font-bold text-red-600">Database Error</Text>
        <Text className="text-center text-sm text-red-400">{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return null; // Splash screen stays visible until DB ready
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <RootNavigator />
    </View>
  );
}
