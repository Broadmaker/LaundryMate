// src/navigation/tabs/AppTabBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Home, PlusCircle, ClipboardList, Users, BarChart2 } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, React.ElementType> = {
  Dashboard: Home,
  NewOrder: PlusCircle,
  Orders: ClipboardList,
  Customers: Users,
  Reports: BarChart2,
};

const TAB_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  NewOrder: 'New Order',
  Orders: 'Orders',
  Customers: 'Clients',
  Reports: 'Reports',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View
      className="flex-row border-t border-slate-100 bg-white"
      style={{
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const isCenter = route.name === 'NewOrder';
        const IconComp = TAB_ICONS[route.name];
        const label = TAB_LABELS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // ── Centre FAB button ───────────────────────────────────────────────
        if (isCenter) {
          return (
            <View key={route.key} className="flex-1 items-center justify-center">
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.85}
                className="-mt-5 h-14 w-14 items-center justify-center rounded-full bg-sky-500"
                style={{
                  shadowColor: '#0EA5E9',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 8,
                }}>
                <IconComp size={24} color="#fff" strokeWidth={1.75} />
              </TouchableOpacity>
              <Text className="mt-1 text-xs font-semibold text-slate-400">{label}</Text>
            </View>
          );
        }

        // ── Regular tab item ────────────────────────────────────────────────
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-1 items-center justify-center gap-1 pt-1">
            {focused && <View className="absolute top-0 h-0.5 w-5 rounded-full bg-sky-500" />}
            <IconComp
              size={20}
              color={focused ? '#0EA5E9' : '#94A3B8'}
              strokeWidth={focused ? 2.25 : 1.75}
            />
            <Text
              className={`text-xs ${
                focused ? 'font-bold text-sky-500' : 'font-medium text-slate-400'
              }`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
