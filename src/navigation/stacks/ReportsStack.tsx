// src/navigation/stacks/ReportsStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ReportsScreen from '../../screens/reports/ReportsScreen';
import ExpensesScreen from '../../screens/expenses/ExpensesScreen';
import SettingsScreen from '../../screens/settings/SettingsScreen';
import type { ReportsStackParams } from '../types';

const Stack = createNativeStackNavigator<ReportsStackParams>();

export default function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReportsMain" component={ReportsScreen} />
      <Stack.Screen name="ExpensesMain" component={ExpensesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
