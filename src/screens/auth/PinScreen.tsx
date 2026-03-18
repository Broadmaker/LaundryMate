// src/screens/auth/PinScreen.tsx
// Full-screen PIN entry shown when app is locked.
// Supports both owner and staff PINs — identifies role automatically.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View, StatusBar, Vibration, Image } from 'react-native';
import { Delete } from 'lucide-react-native';
import { useAuth } from '../../auth/AuthContext';
import { dbGetSettings } from '../../db';

// ─── Keypad layout ────────────────────────────────────────────────────────────

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

// ─── PIN Dot ──────────────────────────────────────────────────────────────────

function PinDot({ filled, error }: { filled: boolean; error: boolean }) {
  return (
    <View
      className={`h-4 w-4 rounded-full border-2 ${
        error
          ? 'border-red-400 bg-red-400'
          : filled
            ? 'border-sky-500 bg-sky-500'
            : 'border-slate-300 bg-transparent'
      }`}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PinScreen() {
  const { unlock, ownerPinSet, staffPinSet } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noPinSet, setNoPinSet] = useState(false);
  const [shopName, setShopName] = useState('LaundryMate');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dbGetSettings().then((s) => {
      if (s.shopName) setShopName(String(s.shopName));
      if (!s.ownerPin && !s.staffPin) setNoPinSet(true);
    });
  }, []);

  const shake = () => {
    Vibration.vibrate(200);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = async (key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (key === '') return;

    const next = pin + key;
    setPin(next);
    setError(false);

    if (next.length === 4) {
      const result = await unlock(next);

      if (result === 'ok') return; // AuthContext handles navigation

      if (result === 'no_pin') {
        setErrorMsg('No PIN set. Please set up PINs in Settings.');
      } else {
        setErrorMsg('Incorrect PIN');
        shake();
      }
      setError(true);
      setTimeout(() => setPin(''), 600);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Logo / Shop name */}
      <View className="mb-12 items-center">
        <View
          className="mb-4 h-20 w-20 overflow-hidden rounded-2xl"
          style={{
            shadowColor: '#0EA5E9',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
          }}>
          <Image
            source={require('../../../assets/laundry_logo.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-2xl font-bold text-slate-900">{shopName}</Text>
        <Text className="mt-1 text-sm text-slate-400">Enter your PIN to continue</Text>
      </View>

      {/* PIN dots — hidden on first time setup */}
      {!noPinSet && (
        <Animated.View
          className="mb-3 flex-row gap-5"
          style={{ transform: [{ translateX: shakeAnim }] }}>
          {[0, 1, 2, 3].map((i) => (
            <PinDot key={i} filled={i < pin.length} error={error} />
          ))}
        </Animated.View>
      )}

      {/* First-time setup — tap any key to enter */}
      {noPinSet && (
        <TouchableOpacity
          onPress={() => handleKey('0')} // any key triggers no_pin → auto-enter
          activeOpacity={0.8}
          className="mb-6 items-center rounded-2xl bg-sky-500 px-8 py-4"
          style={{
            shadowColor: '#0EA5E9',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}>
          <Text className="text-sm font-bold text-white">Tap to Set Up →</Text>
          <Text className="mt-0.5 text-xs text-sky-100">No PIN configured yet</Text>
        </TouchableOpacity>
      )}

      {/* Error message */}
      <View className="mb-6 h-6 items-center justify-center">
        {error && !noPinSet && (
          <Text className="text-sm font-semibold text-red-500">{errorMsg}</Text>
        )}
      </View>

      {/* Keypad — hidden on first-time setup */}
      {!noPinSet && (
        <View className="w-full max-w-xs gap-3">
          {KEYS.map((row, ri) => (
            <View key={ri} className="flex-row justify-center gap-3">
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  onPress={() => handleKey(key)}
                  disabled={key === ''}
                  activeOpacity={key ? 0.7 : 1}
                  className={`h-16 w-20 items-center justify-center rounded-2xl ${
                    key === '' ? 'bg-transparent' : key === '⌫' ? 'bg-slate-100' : 'bg-slate-100'
                  }`}
                  style={
                    key && key !== '⌫'
                      ? {
                          shadowColor: '#0F172A',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.06,
                          shadowRadius: 4,
                          elevation: 1,
                        }
                      : {}
                  }>
                  {key === '⌫' ? (
                    <Delete size={18} color="#64748B" strokeWidth={1.75} />
                  ) : (
                    <Text className="text-2xl font-semibold text-slate-800">{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Role hint */}
      {!noPinSet && (
        <Text className="mt-10 text-center text-xs text-slate-300">
          Owner &amp; Staff PINs are both accepted
        </Text>
      )}
    </View>
  );
}
