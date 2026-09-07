// src/navigation/tabs/AppTabBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Home, PlusCircle, ClipboardList, Users, BarChart2, Lock } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StackActions, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, UserRole } from '../../auth/AuthContext';

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

// Staff can see these tabs only
const STAFF_TABS = new Set(['Dashboard', 'NewOrder', 'Orders', 'Customers', 'Reports']);

// When a focused tab is tapped again, pop its stack to its initial screen
const INITIAL_SCREENS: Record<string, string> = {
  Dashboard: 'DashboardHome',
  Orders: 'OrdersList',
  NewOrder: 'NewOrderMain',
  Customers: 'CustomersList',
  Reports: 'ReportsMain',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface AppTabBarProps extends BottomTabBarProps {
  userRole?: UserRole;
}

function AppTabBar({ state, navigation, userRole }: AppTabBarProps) {
  const { lock } = useAuth();
  const insets = useSafeAreaInsets();

  // Hide tab bar when a pushed screen like Settings is focused (avoids Reports staying highlighted)
  const focusedRoute: any = state.routes[state.index];
  const nestedName =
    getFocusedRouteNameFromRoute(focusedRoute) ?? focusedRoute?.name;
  if (
    nestedName === 'Settings' ||
    nestedName === 'ExpensesMain' ||
    nestedName === 'DBBrowser' ||
    // also handle direct nested check as fallback
    focusedRoute?.state?.routes?.[focusedRoute.state.index]?.name === 'Settings'
  ) {
    return null;
  }

  // Bottom padding: safe area inset + extra breathing room
  const bottomPad = insets.bottom + 8;

  return (
    <View
      className="border-t border-slate-100 bg-white"
      style={{
        paddingBottom: bottomPad,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 10,
      }}>
      <View className="flex-row">
        {state.routes.map((route, index) => {
          // Staff cannot access tabs not in their allowed set (already blocked at nav level,
          // but we can hide unexpected tabs defensively)
          if (userRole === 'staff' && !STAFF_TABS.has(route.name)) return null;

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
            if (event.defaultPrevented) return;
            if (focused) {
              const initial = INITIAL_SCREENS[route.name];
              if (initial) {
                // Pop the nested stack to its first screen
                (navigation.navigate as any)(route.name, { screen: initial });
              }
            } else {
              // Pop the stack of the tab we're leaving so returning later
              // always lands on its initial screen (e.g. Reports → Settings
              // should not persist after Home → Reports). Guarded so we
              // don't dispatch popToTop when already at top (which throws
              // "POP_TO_TOP was not handled").
              const prevRoute: any = state.routes[state.index];
              const prevState: any = prevRoute?.state;
              const canPop =
                prevState?.routes?.length > 1 || (prevState?.index ?? 0) > 0;
              if (prevRoute.key !== route.key && canPop) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: prevRoute.key,
                } as any);
              }
              navigation.navigate(route.name as never);
            }
          };

          // ── Centre FAB ──────────────────────────────────────────────────────
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

          // ── Regular tab ─────────────────────────────────────────────────────
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
                className={`text-xs ${focused ? 'font-bold text-sky-500' : 'font-medium text-slate-400'}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Lock button — far right, always visible */}
        <TouchableOpacity
          onPress={lock}
          activeOpacity={0.7}
          className="w-14 items-center justify-center gap-1 pt-1">
          <Lock size={18} color="#CBD5E1" strokeWidth={1.75} />
          <Text className="text-xs font-medium text-slate-300">Lock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(AppTabBar);
