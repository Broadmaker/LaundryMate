import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initDatabase } from './src/db';
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
        <Text className="text-red-600 font-bold text-base mb-2">Database Error</Text>
        <Text className="text-red-500 text-sm text-center">{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text className="text-slate-400 text-sm mt-3 font-medium">
          Starting LaundryMate...
        </Text>
      </View>
    );
  }

  // TODO: Replace with NavigationContainer + Tab/Stack navigators
  return (
    <View className="flex-1 items-center justify-center bg-sky-50">
      <Text className="text-sky-600 text-2xl font-bold">LaundryMate POS</Text>
      <Text className="text-slate-400 text-sm mt-2">Database ready ✓ — screens coming next</Text>
    </View>
  );
}