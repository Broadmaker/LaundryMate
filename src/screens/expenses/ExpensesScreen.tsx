// src/screens/expenses/ExpensesScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronLeft, Plus, X, Check, Trash2, TrendingDown } from 'lucide-react-native';

import { dbGetExpenses, dbInsertExpense, dbDeleteExpense } from '../../db';
import { formatPeso, formatDate, generateId } from '../../utils';
import { Card, SectionLabel, Input, LoadingScreen } from '@/components/common';
import { EXPENSE_CATEGORIES } from '../../constants';
import type { Expense, ExpenseCategory } from '../../types';

export default function ExpensesScreen() {
  const nav = useNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{
    categoryId: ExpenseCategory;
    description: string;
    amount: string;
  }>({
    categoryId: 'utilities',
    description: '',
    amount: '',
  });
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dbGetExpenses().then((data) => {
        setExpenses(data);
        setLoading(false);
      });
    }, [])
  );

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const catBreakdown = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter((e) => e.category === cat.id).length,
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const handleAdd = async () => {
    if (!form.description.trim() || !parseFloat(form.amount)) return;
    const cat = EXPENSE_CATEGORIES.find((c) => c.id === form.categoryId)!;
    setSaving(true);
    try {
      await dbInsertExpense({
        id: generateId('exp'),
        category: form.categoryId,
        categoryLabel: cat.label,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
        date: new Date().toISOString(),
        receipt: null,
      });
      const updated = await dbGetExpenses();
      setExpenses(updated);
      setShowAdd(false);
      setForm({ categoryId: 'utilities', description: '', amount: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Remove this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dbDeleteExpense(id);
          setExpenses((p) => p.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;

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
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900">Expenses</Text>
            <Text className="text-xs text-slate-400">Operational costs</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2">
            <Plus size={14} color="#fff" strokeWidth={2} />
            <Text className="text-xs font-bold text-white">Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10"
        ListHeaderComponent={
          <View className="mb-2 gap-3 px-4 pt-4">
            {/* Total */}
            <View
              className="rounded-2xl bg-red-500 p-4"
              style={{
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}>
              <View className="mb-1 flex-row items-center gap-2">
                <TrendingDown size={16} color="rgba(255,255,255,0.8)" strokeWidth={1.75} />
                <Text className="text-xs font-semibold uppercase tracking-wider text-red-100">
                  Total Expenses
                </Text>
              </View>
              <Text className="text-3xl font-bold tracking-tight text-white">
                {formatPeso(totalExpenses)}
              </Text>
              <Text className="mt-1 text-xs text-red-200">
                {expenses.length} entries this month
              </Text>
            </View>

            {/* Category breakdown */}
            {catBreakdown.length > 0 && (
              <Card className="p-4">
                <SectionLabel title="By Category" className="mb-3" />
                {catBreakdown.map((cat, i) => {
                  const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                  return (
                    <View key={cat.id} className={`${i < catBreakdown.length - 1 ? 'mb-4' : ''}`}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <Text className="text-sm font-semibold text-slate-800">{cat.label}</Text>
                          <Text className="text-xs text-slate-400">{cat.count}</Text>
                        </View>
                        <Text className="text-xs font-bold text-red-600">
                          {formatPeso(cat.total)}
                        </Text>
                      </View>
                      <View className="mb-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <View
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </View>
                      <Text className="text-xs text-slate-400">{pct.toFixed(1)}%</Text>
                    </View>
                  );
                })}
              </Card>
            )}

            <SectionLabel title="All Entries" />
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-8">
            <Text className="text-sm text-slate-400">No expenses recorded yet</Text>
          </View>
        }
        renderItem={({ item: e }) => {
          const cat = EXPENSE_CATEGORIES.find((c) => c.id === e.category);
          return (
            <View
              className="mx-4 mb-2.5 overflow-hidden rounded-2xl border border-slate-100 bg-white"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}>
              <View className="flex-row items-center gap-3 p-3.5">
                <View
                  className="h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: (cat?.color ?? '#64748B') + '20' }}>
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat?.color ?? '#64748B' }}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {e.description}
                  </Text>
                  <View className="mt-0.5 flex-row items-center gap-2">
                    <View
                      className="rounded-md px-1.5 py-0.5"
                      style={{ backgroundColor: (cat?.color ?? '#64748B') + '18' }}>
                      <Text
                        className="text-xs font-bold"
                        style={{ color: cat?.color ?? '#64748B' }}>
                        {e.categoryLabel}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-400">{formatDate(e.date)}</Text>
                  </View>
                </View>
                <Text className="mr-2 text-sm font-bold text-red-600">{formatPeso(e.amount)}</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(e.id)}
                  className="h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                  <Trash2 size={12} color="#EF4444" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add Expense Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}>
        <View className="flex-1 bg-white pt-4">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
            <Text className="text-lg font-bold text-slate-900">Add Expense</Text>
            <TouchableOpacity
              onPress={() => setShowAdd(false)}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <X size={15} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View className="p-4">
            {/* Category grid */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Category
            </Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const sel = form.categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setForm({ ...form, categoryId: cat.id })}
                    activeOpacity={0.8}
                    className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${sel ? 'border-transparent' : 'border-slate-200 bg-white'}`}
                    style={
                      sel
                        ? { backgroundColor: cat.color + '18', borderColor: cat.color }
                        : undefined
                    }>
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <Text
                      className={`text-xs font-bold ${sel ? '' : 'text-slate-600'}`}
                      style={sel ? { color: cat.color } : undefined}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Input
              label="Description"
              placeholder="e.g. Monthly electric bill"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />
            <Input
              label="Amount (₱)"
              placeholder="0.00"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
              keyboardType="numeric"
            />
            <View className="mt-3 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowAdd(false)}
                activeOpacity={0.8}
                className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
                <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving || !form.description.trim() || !parseFloat(form.amount)}
                activeOpacity={0.8}
                className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${saving || !form.description.trim() || !parseFloat(form.amount) ? 'bg-slate-200' : 'bg-red-500'}`}
                style={{ flex: 2 }}>
                <Check
                  size={15}
                  color={
                    saving || !form.description.trim() || !parseFloat(form.amount)
                      ? '#94A3B8'
                      : '#fff'
                  }
                  strokeWidth={2.5}
                />
                <Text
                  className={`text-sm font-bold ${saving || !form.description.trim() || !parseFloat(form.amount) ? 'text-slate-400' : 'text-white'}`}>
                  Save Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
