// src/navigation/RootNavigator.tsx
// Thin entry point — imports stacks and tab bar, wires them together.
// All param types live in ./types.ts
// All stack navigators live in ./stacks/
// Tab bar UI lives in ./tabs/AppTabBar.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AppTabBar from './tabs/AppTabBar';
import DashboardStack from './stacks/DashboardStack';
import OrdersStack from './stacks/OrdersStack';
import NewOrderStack from './stacks/NewOrderStack';
import CustomersStack from './stacks/CustomersStack';
import ReportsStack from './stacks/ReportsStack';
import type { RootTabParams } from './types';

const Tab = createBottomTabNavigator<RootTabParams>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Orders" component={OrdersStack} />
        <Tab.Screen name="NewOrder" component={NewOrderStack} />
        <Tab.Screen name="Customers" component={CustomersStack} />
        <Tab.Screen name="Reports" component={ReportsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
