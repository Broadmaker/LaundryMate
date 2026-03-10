// src/navigation/stacks/OrdersStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OrdersScreen from '../../screens/orders/OrdersScreen';
import OrderDetailScreen from '../../screens/orders/OrderDetailScreen';
import type { OrdersStackParams } from '../types';

const Stack = createNativeStackNavigator<OrdersStackParams>();

export default function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
