// src/screens/orders/OrdersScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, X, Truck, ClipboardList } from 'lucide-react-native';

import { dbGetOrders } from '../../db';
import { formatPeso, formatRelativeTime } from '../../utils';
import { StatusBadge, Avatar, LoadingScreen, EmptyState } from '@/components/common';
import type { OrdersStackParams } from '../../navigation/types';
import type { Order, OrderStatus } from '../../types';

type Nav = NativeStackNavigationProp<OrdersStackParams, 'OrdersList'>;

const STATUS_TABS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
];

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="mx-4 mb-2.5 rounded-2xl border border-slate-100 bg-white p-3.5"
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}>
      <View className="flex-row items-start gap-3">
        <Avatar name={order.customerName} size="md" />
        <View className="min-w-0 flex-1">
          <View className="mb-0.5 flex-row items-center gap-2">
            <Text className="text-xs font-bold text-sky-500">{order.id}</Text>
            {order.isPickup && (
              <View className="flex-row items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5">
                <Truck size={9} color="#0EA5E9" strokeWidth={2} />
                <Text className="text-xs font-bold text-sky-600">P&D</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {order.customerName}
          </Text>
          {/* Items preview */}
          <View className="mt-1.5 flex-row flex-wrap gap-1">
            {order.items.slice(0, 2).map((item, i) => (
              <View key={i} className="rounded-md bg-slate-100 px-2 py-0.5">
                <Text className="text-xs font-semibold text-slate-600">
                  {item.serviceName} ×{item.qty}
                </Text>
              </View>
            ))}
            {order.items.length > 2 && (
              <View className="rounded-md bg-slate-100 px-2 py-0.5">
                <Text className="text-xs text-slate-400">+{order.items.length - 2}</Text>
              </View>
            )}
          </View>
          <Text className="mt-1.5 text-xs text-slate-400">
            {formatRelativeTime(order.createdAt)}
          </Text>
        </View>
        <View className="flex-shrink-0 items-end gap-1.5">
          <Text className="text-sm font-bold text-slate-900">{formatPeso(order.total)}</Text>
          <StatusBadge status={order.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const nav = useNavigation<Nav>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      dbGetOrders().then((data) => {
        setOrders(data);
        setLoading(false);
      });
    }, [])
  );

  const filtered = orders.filter((o) => {
    const matchTab = activeTab === 'all' || o.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const countFor = (tab: OrderStatus | 'all') =>
    tab === 'all' ? orders.length : orders.filter((o) => o.status === tab).length;

  if (loading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">Orders</Text>
            <Text className="text-xs text-slate-400">{orders.length} total</Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3">
          <Search size={15} color="#94A3B8" strokeWidth={1.75} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by order ID or name…"
            placeholderTextColor="#94A3B8"
            className="flex-1 py-2.5 text-sm text-slate-800"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <View className="border-b border-slate-100 bg-white">
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(t) => t.id}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-3 py-2 gap-2"
          renderItem={({ item: tab }) => {
            const active = activeTab === tab.id;
            const cnt = countFor(tab.id);
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
                  active ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'
                }`}>
                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
                  {tab.label}
                </Text>
                {cnt > 0 && (
                  <View
                    className={`rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <Text
                      className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`}>
                      {cnt}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerClassName="pt-3 pb-6"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={28} color="#CBD5E1" strokeWidth={1.5} />}
            title="No orders found"
            subtitle={search ? 'Try a different search term' : 'Orders will appear here'}
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => nav.navigate('OrderDetail', { orderId: item.id })}
          />
        )}
      />
    </View>
  );
}
