// src/navigation/stacks/DashboardStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../../screens/dashboard/DashboardScreen';
import OrderDetailScreen from '../../screens/orders/OrderDetailScreen';
import type { DashboardStackParams } from '../types';
import DBBrowserScreen from '@/screens/DBBrowser/DBBrowserScreen';

const Stack = createNativeStackNavigator<DashboardStackParams>();

export default function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="DBBrowser" component={DBBrowserScreen} />
    </Stack.Navigator>
  );
}
