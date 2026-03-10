// src/screens/dashboard/DashboardScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Truck,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  ChevronRight,
  Settings,
  Plus,
  BarChart2,
  Package,
  Users,
  Database,
} from 'lucide-react-native';

import { dbGetDashboardStats, dbGetOrders } from '../../db';
import { formatPeso, formatRelativeTime, getGreeting, formatFullDate } from '../../utils';
import { StatusBadge, Card, Avatar, SectionLabel, LoadingScreen } from '../../components/common';
import type { DashboardStackParams } from '../../navigation/types';
import type { Order } from '../../types';

type Nav = NativeStackNavigationProp<DashboardStackParams, 'DashboardHome'>;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  bgClass,
  iconColor,
  onPress,
}: {
  label: string;
  value: string | number;
  icon: any;
  bgClass: string;
  iconColor: string;
  onPress?: () => void;
}) {
  return (
    <Card className="flex-1 p-3" onPress={onPress}>
      <View className={`mb-2 h-8 w-8 items-center justify-center rounded-xl ${bgClass}`}>
        <Icon size={16} color={iconColor} strokeWidth={1.75} />
      </View>
      <Text className="text-xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-xs font-semibold text-slate-400">{label}</Text>
    </Card>
  );
}

// ─── Recent Order Row ─────────────────────────────────────────────────────────

function OrderRow({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center gap-3 border-b border-slate-50 py-3 last:border-0">
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
        <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
          {order.customerName}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-400">{formatRelativeTime(order.createdAt)}</Text>
      </View>
      <View className="items-end gap-1.5">
        <Text className="text-sm font-bold text-slate-900">{formatPeso(order.total)}</Text>
        <StatusBadge status={order.status} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof dbGetDashboardStats>> | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, orders] = await Promise.all([dbGetDashboardStats(), dbGetOrders()]);
      setStats(s);
      setRecentOrders(orders.slice(0, 5));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) return <LoadingScreen />;

  const now = new Date();

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-medium text-slate-400">{getGreeting()}</Text>
            <Text className="mt-0.5 text-xl font-bold text-slate-900">LaundryMate</Text>
            <Text className="mt-0.5 text-xs text-slate-400">{formatFullDate(now)}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-bold text-emerald-700">Open</Text>
            </View>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Settings size={16} color="#64748B" strokeWidth={1.75} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate('DBBrowser')}>
              <Database size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0EA5E9']} />
        }>
        {/* Revenue Hero */}
        <View className="mx-4 mt-4">
          <View
            className="overflow-hidden rounded-2xl bg-sky-500 p-4"
            style={{
              shadowColor: '#0EA5E9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 6,
            }}>
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-sky-100">
                  Today's Revenue
                </Text>
                <Text className="mt-1 text-4xl font-bold tracking-tight text-white">
                  {formatPeso(stats?.todayRevenue ?? 0)}
                </Text>
                <Text className="mt-1.5 text-xs text-sky-200">
                  {stats?.todayOrderCount ?? 0} orders ·{' '}
                  {now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <View className="rounded-xl bg-white/10 p-2">
                <TrendingUp size={20} color="#fff" strokeWidth={1.75} />
              </View>
            </View>
          </View>
        </View>

        {/* Stat Cards */}
        <View className="mx-4 mt-3 flex-row gap-3">
          <StatCard
            label="In Progress"
            value={stats?.pendingCount ?? 0}
            icon={RefreshCw}
            bgClass="bg-violet-50"
            iconColor="#8B5CF6"
          />
          <StatCard
            label="Pickups"
            value={stats?.pickupPendingCount ?? 0}
            icon={Truck}
            bgClass="bg-sky-50"
            iconColor="#0EA5E9"
          />
          <StatCard
            label="Ready"
            value={stats?.readyCount ?? 0}
            icon={CheckCircle2}
            bgClass="bg-emerald-50"
            iconColor="#10B981"
          />
          <StatCard
            label="Clients"
            value={stats?.totalCustomers ?? 0}
            icon={Users}
            bgClass="bg-amber-50"
            iconColor="#F59E0B"
          />
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mt-4">
          <SectionLabel title="Quick Actions" className="mb-2" />
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => nav.getParent()?.navigate('NewOrder')}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-sky-500 py-3"
              style={{
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }}>
              <Plus size={16} color="#fff" strokeWidth={2} />
              <Text className="text-sm font-bold text-white">New Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => nav.getParent()?.navigate('Reports', { screen: 'ExpensesMain' })}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <DollarSign size={15} color="#64748B" strokeWidth={1.75} />
              <Text className="text-sm font-semibold text-slate-700">Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => nav.getParent()?.navigate('Orders')}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <ClipboardList size={15} color="#64748B" strokeWidth={1.75} />
              <Text className="text-sm font-semibold text-slate-700">Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* P&L Snapshot */}
        <View className="mx-4 mt-4">
          <Card className="p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <SectionLabel title="This Month" />
              <TouchableOpacity
                onPress={() => nav.getParent()?.navigate('Reports')}
                className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-sky-500">Report</Text>
                <ChevronRight size={12} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-3">
              {/* Revenue */}
              <View className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <View className="mb-2 flex-row items-center gap-1.5">
                  <TrendingUp size={12} color="#10B981" strokeWidth={2} />
                  <Text className="text-xs font-bold text-emerald-600">REVENUE</Text>
                </View>
                <Text className="text-base font-bold text-emerald-800">
                  {formatPeso(stats?.monthRevenue ?? 0)}
                </Text>
              </View>
              {/* Expenses */}
              <View className="flex-1 rounded-xl border border-red-100 bg-red-50 p-3">
                <View className="mb-2 flex-row items-center gap-1.5">
                  <TrendingDown size={12} color="#EF4444" strokeWidth={2} />
                  <Text className="text-xs font-bold text-red-500">EXPENSES</Text>
                </View>
                <Text className="text-base font-bold text-red-800">
                  {formatPeso(stats?.totalExpenses ?? 0)}
                </Text>
              </View>
              {/* Net */}
              <View
                className={`flex-1 rounded-xl border p-3 ${(stats?.netProfit ?? 0) >= 0 ? 'border-sky-100 bg-sky-50' : 'border-red-100 bg-red-50'}`}>
                <View className="mb-2 flex-row items-center gap-1.5">
                  <BarChart2
                    size={12}
                    color={(stats?.netProfit ?? 0) >= 0 ? '#0EA5E9' : '#EF4444'}
                    strokeWidth={2}
                  />
                  <Text
                    className={`text-xs font-bold ${(stats?.netProfit ?? 0) >= 0 ? 'text-sky-600' : 'text-red-500'}`}>
                    NET
                  </Text>
                </View>
                <Text
                  className={`text-base font-bold ${(stats?.netProfit ?? 0) >= 0 ? 'text-sky-800' : 'text-red-800'}`}>
                  {formatPeso(stats?.netProfit ?? 0)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Recent Orders */}
        <View className="mx-4 mt-4">
          <Card className="p-4">
            <View className="mb-1 flex-row items-center justify-between">
              <SectionLabel title="Recent Orders" />
              <TouchableOpacity
                onPress={() => nav.getParent()?.navigate('Orders')}
                className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-sky-500">See all</Text>
                <ChevronRight size={12} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
            {recentOrders.length === 0 ? (
              <View className="items-center py-8">
                <Package size={28} color="#CBD5E1" strokeWidth={1.5} />
                <Text className="mt-2 text-sm text-slate-400">No orders yet</Text>
              </View>
            ) : (
              recentOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onPress={() => nav.navigate('OrderDetail', { orderId: order.id })}
                />
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
