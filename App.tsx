// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase } from './src/db';
import RootNavigator from './src/navigation/RootNavigator';
import './global.css';

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

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-red-50 px-6">
        <Text className="mb-2 text-base font-bold text-red-600">Database Error</Text>
        <Text className="text-center text-sm text-red-400">{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text className="mt-3 text-sm font-medium text-slate-400">Starting LaundryMate…</Text>
      </View>
    );
  }

  return <RootNavigator />;
}
