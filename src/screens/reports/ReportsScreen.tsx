// src/screens/reports/ReportsScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrendingUp, TrendingDown, BarChart2, ChevronRight, Settings } from 'lucide-react-native';

import { dbGetOrders, dbGetExpenses } from '../../db';
import { formatPeso } from '../../utils';
import { Card, SectionLabel, LoadingScreen } from '../../components/common';
import { EXPENSE_CATEGORIES } from '../../constants';
import type { ReportsStackParams } from '../../navigation/types';
import type { Order, Expense } from '../../types';

type Nav = NativeStackNavigationProp<ReportsStackParams, 'ReportsMain'>;

const { width: SCREEN_W } = Dimensions.get('window');

export default function ReportsScreen() {
  const nav = useNavigation<Nav>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useFocusEffect(
    useCallback(() => {
      Promise.all([dbGetOrders(), dbGetExpenses()]).then(([o, e]) => {
        setOrders(o);
        setExpenses(e);
        setLoading(false);
      });
    }, [])
  );

  if (loading) return <LoadingScreen />;

  // Month totals
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthOrders = orders.filter((o) => new Date(o.createdAt) >= monthStart && o.amountPaid > 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + o.amountPaid, 0);
  const monthExpenses = expenses
    .filter((e) => new Date(e.date) >= monthStart)
    .reduce((s, e) => s + e.amount, 0);
  const netProfit = monthRevenue - monthExpenses;

  // Daily data for chart
  const daily = Array.from({ length: period }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (period - 1 - i));
    d.setHours(0, 0, 0, 0);
    const nd = new Date(d);
    nd.setDate(d.getDate() + 1);
    const dayRev = orders
      .filter((o) => {
        const dt = new Date(o.createdAt);
        return dt >= d && dt < nd && o.amountPaid > 0;
      })
      .reduce((s, o) => s + o.amountPaid, 0);
    const dayExp = expenses
      .filter((e) => {
        const dt = new Date(e.date);
        return dt >= d && dt < nd;
      })
      .reduce((s, e) => s + e.amount, 0);
    return {
      label: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      rev: dayRev,
      exp: dayExp,
    };
  });

  const maxVal = Math.max(...daily.map((d) => Math.max(d.rev, d.exp)), 1);
  const BAR_W = Math.max(8, (SCREEN_W - 64) / (period * 2.5));
  const BAR_MAX_H = 72;

  // Service breakdown
  const svcMap: Record<string, { rev: number; addonRev: number; units: number }> = {};
  orders.forEach((o) =>
    o.items.forEach((item) => {
      if (!svcMap[item.serviceName]) svcMap[item.serviceName] = { rev: 0, addonRev: 0, units: 0 };
      svcMap[item.serviceName].rev += item.subtotal;
      svcMap[item.serviceName].addonRev += item.addons.reduce((s, a) => s + a.price, 0);
      svcMap[item.serviceName].units += item.qty;
    })
  );
  const svcBreakdown = Object.entries(svcMap)
    .map(([name, data]) => ({ name, ...data, total: data.rev + data.addonRev }))
    .sort((a, b) => b.total - a.total);
  const totalSvcRev = svcBreakdown.reduce((s, v) => s + v.total, 0);

  // Expense breakdown
  const expBreakdown = EXPENSE_CATEGORIES.map((cat) => {
    const catExp = expenses.filter((e) => e.category === cat.id);
    const total = catExp.reduce((s, e) => s + e.amount, 0);
    return { ...cat, total, count: catExp.length };
  })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">Reports</Text>
            <Text className="text-xs text-slate-400">P&L Overview</Text>
          </View>

          {/* Right: period toggle + settings icon — both OUTSIDE the map */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row overflow-hidden rounded-xl bg-slate-100">
              {([7, 30] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                  className={`px-3.5 py-2 ${period === p ? 'bg-sky-500' : ''}`}>
                  <Text
                    className={`text-xs font-bold ${period === p ? 'text-white' : 'text-slate-500'}`}>
                    {p === 7 ? '7D' : '30D'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => nav.navigate('Settings')}
              className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <Settings size={16} color="#64748B" strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-3 pb-10"
        showsVerticalScrollIndicator={false}>
        {/* P&L Cards */}
        <View className="flex-row gap-3">
          <Card className="flex-1 p-3">
            <View className="mb-2 flex-row items-center gap-1.5">
              <TrendingUp size={13} color="#10B981" strokeWidth={2} />
              <Text className="text-xs font-bold text-emerald-600">REVENUE</Text>
            </View>
            <Text className="text-base font-bold text-emerald-700">{formatPeso(monthRevenue)}</Text>
            <Text className="mt-0.5 text-xs text-slate-400">This month</Text>
          </Card>
          <Card className="flex-1 p-3">
            <View className="mb-2 flex-row items-center gap-1.5">
              <TrendingDown size={13} color="#EF4444" strokeWidth={2} />
              <Text className="text-xs font-bold text-red-500">EXPENSES</Text>
            </View>
            <Text className="text-base font-bold text-red-700">{formatPeso(monthExpenses)}</Text>
            <TouchableOpacity
              onPress={() => nav.navigate('ExpensesMain')}
              className="mt-0.5 flex-row items-center gap-0.5">
              <Text className="text-xs font-semibold text-sky-500">Manage</Text>
              <ChevronRight size={10} color="#0EA5E9" />
            </TouchableOpacity>
          </Card>
          <View
            className="flex-1 rounded-2xl p-3"
            style={{
              backgroundColor: netProfit >= 0 ? '#0EA5E9' : '#EF4444',
              shadowColor: netProfit >= 0 ? '#0EA5E9' : '#EF4444',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 3,
            }}>
            <View className="mb-2 flex-row items-center gap-1.5">
              <BarChart2 size={13} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                NET
              </Text>
            </View>
            <Text className="text-base font-bold text-white">{formatPeso(netProfit)}</Text>
            <Text className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Profit
            </Text>
          </View>
        </View>

        {/* Bar Chart */}
        <Card className="p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <SectionLabel title="Revenue vs Expenses" />
            <View className="flex-row gap-3">
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
                <Text className="text-xs text-slate-400">Rev</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                <Text className="text-xs text-slate-400">Exp</Text>
              </View>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-end gap-2 pb-5" style={{ height: BAR_MAX_H + 30 }}>
              {daily.map((d, i) => {
                const revH = Math.max(2, (d.rev / maxVal) * BAR_MAX_H);
                const expH = Math.max(2, (d.exp / maxVal) * BAR_MAX_H);
                const showLabel = period <= 7 || i % 5 === 0 || i === daily.length - 1;
                return (
                  <View key={i} className="items-center" style={{ gap: 2 }}>
                    <View className="flex-row items-end gap-0.5" style={{ height: BAR_MAX_H }}>
                      <View
                        style={{
                          width: BAR_W,
                          height: revH,
                          backgroundColor: '#0EA5E9',
                          borderRadius: 3,
                        }}
                      />
                      <View
                        style={{
                          width: BAR_W,
                          height: expH,
                          backgroundColor: '#FCA5A5',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    {showLabel && (
                      <Text
                        className="text-xs text-slate-400"
                        style={{ fontSize: 9, transform: [{ rotate: '-30deg' }], marginTop: 6 }}>
                        {d.label}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Service Revenue */}
        <Card className="p-4">
          <SectionLabel title="Revenue by Service" className="mb-3" />
          {svcBreakdown.length === 0 ? (
            <Text className="py-4 text-center text-sm text-slate-400">No data</Text>
          ) : (
            svcBreakdown.map((svc, i) => {
              const pct = totalSvcRev > 0 ? (svc.total / totalSvcRev) * 100 : 0;
              return (
                <View key={svc.name} className={`${i < svcBreakdown.length - 1 ? 'mb-4' : ''}`}>
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <Text
                      className="mr-2 flex-1 text-sm font-semibold text-slate-800"
                      numberOfLines={1}>
                      {svc.name}
                    </Text>
                    <Text className="text-xs font-bold text-slate-700">
                      {formatPeso(svc.total)}
                    </Text>
                  </View>
                  <View className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <View className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-400">{pct.toFixed(1)}%</Text>
                    {svc.addonRev > 0 && (
                      <Text className="text-xs font-semibold text-sky-500">
                        +{formatPeso(svc.addonRev)} add-ons
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Expense Breakdown */}
        <Card className="p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <SectionLabel title="Expenses by Category" />
            <TouchableOpacity
              onPress={() => nav.navigate('ExpensesMain')}
              className="flex-row items-center gap-1">
              <Text className="text-xs font-semibold text-sky-500">Manage</Text>
              <ChevronRight size={11} color="#0EA5E9" />
            </TouchableOpacity>
          </View>
          {expBreakdown.length === 0 ? (
            <Text className="py-4 text-center text-sm text-slate-400">No expenses recorded</Text>
          ) : (
            expBreakdown.map((cat, i) => {
              const pct = monthExpenses > 0 ? (cat.total / monthExpenses) * 100 : 0;
              return (
                <View key={cat.id} className={`${i < expBreakdown.length - 1 ? 'mb-4' : ''}`}>
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <View className="mr-2 flex-1 flex-row items-center gap-2">
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <Text className="text-sm font-semibold text-slate-800">{cat.label}</Text>
                    </View>
                    <Text className="text-xs font-bold text-red-600">{formatPeso(cat.total)}</Text>
                  </View>
                  <View className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </View>
                  <Text className="text-xs text-slate-400">
                    {pct.toFixed(1)}% · {cat.count} entries
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
