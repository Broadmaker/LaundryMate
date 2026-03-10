// src/navigation/stacks/NewOrderStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NewOrderScreen from '../../screens/neworder/NewOrderScreen';
import type { NewOrderStackParams } from '../types';

const Stack = createNativeStackNavigator<NewOrderStackParams>();

export default function NewOrderStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewOrderMain" component={NewOrderScreen} />
    </Stack.Navigator>
  );
}
