// src/screens/customers/CustomersScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  X,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  Check,
  Star,
  Users,
} from 'lucide-react-native';

import { dbGetCustomers, dbInsertCustomer } from '../../db';
import { formatDate, generateId, isValidPhilippinePhone } from '../../utils';
import { Avatar, EmptyState, Input, Card } from '@/components/common';
import type { CustomersStackParams } from '../../navigation/RootNavigator';
import type { Customer } from '../../types';

type Nav = NativeStackNavigationProp<CustomersStackParams, 'CustomersList'>;

export default function CustomersScreen() {
  const nav = useNavigation<Nav>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dbGetCustomers().then((data) => {
        setCustomers(data);
        setLoading(false);
      });
    }, [])
  );

  const filtered = search
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search) ||
          (c.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!isValidPhilippinePhone(form.phone)) e.phone = 'Enter a valid PH number (09XXXXXXXXX)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await dbInsertCustomer({
        id: generateId('cus'),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        joinDate: new Date().toISOString().split('T')[0],
      });
      const updated = await dbGetCustomers();
      setCustomers(updated);
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', address: '' });
      setErrors({});
    } catch {
      Alert.alert('Error', 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">Customers</Text>
            <Text className="text-xs text-slate-400">{customers.length} registered</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAdd(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2">
            <Plus size={14} color="#fff" strokeWidth={2} />
            <Text className="text-xs font-bold text-white">Add</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3">
          <Search size={15} color="#94A3B8" strokeWidth={1.75} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, phone, or email…"
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

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerClassName="px-4 pt-3 pb-6"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={28} color="#CBD5E1" strokeWidth={1.5} />}
            title={search ? 'No results' : 'No customers yet'}
            subtitle={
              search ? 'Try a different search term' : 'Add your first customer to get started'
            }
          />
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity
            onPress={() => nav.navigate('CustomerDetail', { customerId: c.id })}
            activeOpacity={0.75}
            className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
            <Avatar name={c.name} size="lg" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-slate-900">{c.name}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Phone size={10} color="#94A3B8" />
                <Text className="text-xs text-slate-400">{c.phone}</Text>
              </View>
              {c.email && (
                <View className="mt-0.5 flex-row items-center gap-1">
                  <Mail size={10} color="#94A3B8" />
                  <Text className="text-xs text-slate-400" numberOfLines={1}>
                    {c.email}
                  </Text>
                </View>
              )}
            </View>
            <View className="items-end gap-1.5">
              <Text className="text-xs font-bold text-slate-500">{c.totalOrders} orders</Text>
              <View className="flex-row items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5">
                <Star size={9} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-xs font-bold text-amber-600">{c.loyaltyPoints}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Add Customer Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}>
        <View className="flex-1 bg-white pt-4">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
            <Text className="text-lg font-bold text-slate-900">New Customer</Text>
            <TouchableOpacity
              onPress={() => setShowAdd(false)}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <X size={15} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View className="gap-0 p-4">
            <Input
              label="Full Name *"
              placeholder="Juan dela Cruz"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              error={errors.name}
            />
            <Input
              label="Phone *"
              placeholder="09XXXXXXXXX"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
              keyboardType="phone-pad"
              error={errors.phone}
            />
            <Input
              label="Email"
              placeholder="email@example.com"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Address"
              placeholder="Street, Barangay, City"
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
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
                disabled={saving}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4"
                style={{ flex: 2 }}>
                <Check size={15} color="#fff" strokeWidth={2.5} />
                <Text className="text-sm font-bold text-white">Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
