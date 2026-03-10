// src/screens/customers/CustomerDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  ShoppingBag,
  Banknote,
  ChevronRight,
} from 'lucide-react-native';

import { dbGetCustomerById, dbGetOrdersByCustomer } from '../../db';
import { formatPeso, formatDate, formatRelativeTime } from '../../utils';
import {
  Avatar,
  Card,
  SectionLabel,
  StatusBadge,
  Divider,
  LoadingScreen,
} from '../../components/common';
import type { CustomersStackParams } from '../../navigation/types';
import type { Customer, Order } from '../../types';

type Nav = NativeStackNavigationProp<CustomersStackParams, 'CustomerDetail'>;
type Route = RouteProp<CustomersStackParams, 'CustomerDetail'>;

export default function CustomerDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      Promise.all([dbGetCustomerById(customerId), dbGetOrdersByCustomer(customerId)]).then(
        ([c, o]) => {
          setCustomer(c);
          setOrders(o);
          setLoading(false);
        }
      );
    }, [customerId])
  );

  if (loading || !customer) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => nav.goBack()}
            className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <ChevronLeft size={18} color="#334155" strokeWidth={2} />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-bold text-slate-900">Customer Profile</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-3 pb-10"
        showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card className="p-4">
          <View className="mb-4 flex-row items-center gap-4">
            <Avatar name={customer.name} size="lg" />
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">{customer.name}</Text>
              <View className="mt-1 flex-row items-center gap-1.5">
                <Calendar size={11} color="#94A3B8" />
                <Text className="text-xs text-slate-400">
                  Member since {formatDate(customer.joinDate)}
                </Text>
              </View>
            </View>
          </View>
          <Divider className="mb-4" />
          <View className="gap-2.5">
            <View className="flex-row items-center gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                <Phone size={12} color="#64748B" strokeWidth={1.75} />
              </View>
              <Text className="text-sm text-slate-700">{customer.phone}</Text>
            </View>
            {customer.email && (
              <View className="flex-row items-center gap-3">
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                  <Mail size={12} color="#64748B" strokeWidth={1.75} />
                </View>
                <Text className="text-sm text-slate-700">{customer.email}</Text>
              </View>
            )}
            {customer.address && (
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                  <MapPin size={12} color="#64748B" strokeWidth={1.75} />
                </View>
                <Text className="flex-1 text-sm leading-5 text-slate-700">{customer.address}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Stats */}
        <View className="flex-row gap-3">
          <Card className="flex-1 items-center p-3">
            <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-sky-50">
              <ShoppingBag size={15} color="#0EA5E9" strokeWidth={1.75} />
            </View>
            <Text className="text-xl font-bold text-sky-500">{customer.totalOrders}</Text>
            <Text className="mt-0.5 text-xs font-semibold text-slate-400">Orders</Text>
          </Card>
          <Card className="flex-1 items-center p-3">
            <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
              <Banknote size={15} color="#10B981" strokeWidth={1.75} />
            </View>
            <Text className="text-sm font-bold text-emerald-600">
              {formatPeso(customer.totalSpent)}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold text-slate-400">Total Spent</Text>
          </Card>
          <Card className="flex-1 items-center p-3">
            <View className="mb-2 h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
              <Star size={15} color="#F59E0B" fill="#F59E0B" strokeWidth={1.75} />
            </View>
            <Text className="text-xl font-bold text-amber-500">{customer.loyaltyPoints}</Text>
            <Text className="mt-0.5 text-xs font-semibold text-slate-400">Points</Text>
          </Card>
        </View>

        {/* Order history */}
        <Card className="p-4">
          <SectionLabel title={`Order History (${orders.length})`} className="mb-3" />
          {orders.length === 0 ? (
            <Text className="py-4 text-center text-sm text-slate-400">No orders yet</Text>
          ) : (
            orders.map((order, i) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => nav.navigate('OrderDetail', { orderId: order.id })}
                activeOpacity={0.75}
                className={`flex-row items-center justify-between py-3 ${i < orders.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <View>
                  <Text className="text-sm font-bold text-sky-500">{order.id}</Text>
                  <Text className="mt-0.5 text-xs text-slate-400">
                    {formatRelativeTime(order.createdAt)}
                  </Text>
                </View>
                <View className="items-end gap-1.5">
                  <Text className="text-sm font-bold text-slate-900">
                    {formatPeso(order.total)}
                  </Text>
                  <StatusBadge status={order.status} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
