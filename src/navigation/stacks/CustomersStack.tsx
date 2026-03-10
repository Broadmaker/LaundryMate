// src/navigation/stacks/CustomersStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomersScreen from '../../screens/customers/CustomersScreen';
import CustomerDetailScreen from '../../screens/customers/CustomerDetailScreen';
import OrderDetailScreen from '../../screens/orders/OrderDetailScreen';
import type { CustomersStackParams } from '../types';

const Stack = createNativeStackNavigator<CustomersStackParams>();

export default function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomersList" component={CustomersScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
