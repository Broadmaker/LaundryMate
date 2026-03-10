// src/navigation/RootNavigator.tsx
// Wraps the entire app in AuthProvider.
// Shows PinScreen when locked, tab navigator when unlocked.

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AuthProvider, useAuth } from '../auth/AuthContext';
import PinScreen from '../screens/auth/PinScreen';
import AppTabBar from './tabs/AppTabBar';
import DashboardStack from './stacks/DashboardStack';
import OrdersStack from './stacks/OrdersStack';
import NewOrderStack from './stacks/NewOrderStack';
import CustomersStack from './stacks/CustomersStack';
import ReportsStack from './stacks/ReportsStack';
import type { RootTabParams } from './types';

const Tab = createBottomTabNavigator<RootTabParams>();

// ─── Inner navigator (needs auth context) ────────────────────────────────────

function AppNavigator() {
  const { isLocked, user } = useAuth();

  if (isLocked || !user) return <PinScreen />;

  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} userRole={user.role} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="NewOrder" component={NewOrderStack} />
      <Tab.Screen name="Customers" component={CustomersStack} />
      <Tab.Screen name="Reports" component={ReportsStack} />
    </Tab.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
