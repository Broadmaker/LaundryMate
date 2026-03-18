// src/screens/settings/SettingsScreen.tsx
// 3 tabs: Shop Info · Services · Add-ons
// All data persisted to SQLite — no seed, no hard-coded defaults.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Store,
  Wrench,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Phone,
  MapPin,
  Tag,
  DollarSign,
  Package,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react-native';

import { useAuth } from '../../auth/AuthContext';

import {
  dbGetSettings,
  dbSetSetting,
  dbGetServices,
  dbInsertService,
  dbUpdateService,
  dbDeleteService,
  dbGetAddons,
  dbInsertAddon,
  dbUpdateAddon,
  dbDeleteAddon,
} from '../../db';
import { generateId, formatPeso } from '../../utils';
import { SERVICE_CATEGORIES } from '../../constants';
import {
  Card,
  SectionLabel,
  Divider,
  LoadingScreen,
  ToggleSwitch,
  ModalSheet,
} from '../../components/common';
import type { Service, Addon, ShopSettings } from '../../types';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'shop' | 'services' | 'addons';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'shop', label: 'Shop Info', icon: Store },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'addons', label: 'Add-ons', icon: Sparkles },
];

const UNITS = ['kg', 'pc', 'pair', 'set', 'load', 'bag'];
const DURATIONS = ['Same Day', '1-2 Days', '2-3 Days', '3-5 Days', 'Express'];

// ─── Service Form Modal ───────────────────────────────────────────────────────

interface ServiceFormProps {
  existing?: Service;
  onSave: (data: Omit<Service, 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

function ServiceFormModal({ existing, onSave, onClose }: ServiceFormProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [unit, setUnit] = useState(existing?.unit ?? 'kg');
  const [category, setCategory] = useState(existing?.category ?? 'basic');
  const [duration, setDuration] = useState(existing?.duration ?? 'Same Day');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [kgsPerLoad, setKgsPerLoad] = useState(
    existing?.kgsPerLoad ? String(existing.kgsPerLoad) : '6'
  );
  const [saving, setSaving] = useState(false);

  const isLoad = unit === 'load';
  const isValid =
    name.trim().length > 0 && parseFloat(price) > 0 && (!isLoad || parseFloat(kgsPerLoad) > 0);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSave({
      id: existing?.id ?? generateId('svc'),
      name: name.trim(),
      price: parseFloat(price),
      unit,
      category: category as Service['category'],
      duration,
      description: description.trim(),
      isActive,
      kgsPerLoad: isLoad ? parseFloat(kgsPerLoad) || 6 : 6,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ModalSheet>
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
            <Text className="text-lg font-bold text-slate-900">
              {existing ? 'Edit Service' : 'New Service'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-10">
            {/* Name */}
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Service Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Wash & Fold"
                placeholderTextColor="#94A3B8"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />
            </View>

            {/* Price + Unit row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Price (₱) *
                </Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Unit
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-1.5">
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnit(u)}
                        className={`rounded-xl border px-3 py-2.5 ${unit === u ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'}`}>
                        <Text
                          className={`text-xs font-bold ${unit === u ? 'text-white' : 'text-slate-600'}`}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* kgsPerLoad — only shown when unit is load */}
            {isLoad && (
              <View className="rounded-xl border border-sky-100 bg-sky-50 p-3">
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                  Kg per Load *
                </Text>
                <View className="flex-row items-center gap-3">
                  <TextInput
                    value={kgsPerLoad}
                    onChangeText={setKgsPerLoad}
                    keyboardType="numeric"
                    placeholder="6"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm text-slate-800"
                  />
                  <View className="flex-1">
                    <Text className="text-xs leading-4 text-sky-600">
                      e.g. 6 means 1 load = 6 kg.{'\n'}Staff enters kg, system calculates loads.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Category */}
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Category
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    className={`rounded-xl border px-3 py-2 ${category === cat.id ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'}`}>
                    <Text
                      className={`text-xs font-bold capitalize ${category === cat.id ? 'text-white' : 'text-slate-600'}`}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Duration */}
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Duration
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuration(d)}
                    className={`rounded-xl border px-3 py-2 ${duration === d ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'}`}>
                    <Text
                      className={`text-xs font-bold ${duration === d ? 'text-white' : 'text-slate-600'}`}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Short description…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />
            </View>

            {/* Active toggle */}
            <View className="flex-row items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <Text className="text-sm font-semibold text-slate-700">
                Active (visible in New Order)
              </Text>
              <ToggleSwitch value={isActive} onChange={setIsActive} />
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 border-t border-slate-100 px-4 pb-8 pt-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
              <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isValid || saving}
              activeOpacity={0.85}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${isValid && !saving ? 'bg-sky-500' : 'bg-slate-200'}`}
              style={{ flex: 2 }}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={15} color={isValid ? '#fff' : '#94A3B8'} strokeWidth={2.5} />
              )}
              <Text
                className={`text-sm font-bold ${isValid && !saving ? 'text-white' : 'text-slate-400'}`}>
                Save Service
              </Text>
            </TouchableOpacity>
          </View>
        </ModalSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AddonFormProps {
  existing?: Addon;
  onSave: (data: Omit<Addon, 'isActive'>) => Promise<void>;
  onClose: () => void;
}

function AddonFormModal({ existing, onSave, onClose }: AddonFormProps) {
  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && parseFloat(price) > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    await onSave({
      id: existing?.id ?? generateId('adn'),
      name: name.trim(),
      price: parseFloat(price),
      description: description.trim(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ModalSheet>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3 pt-2">
            <Text className="text-lg font-bold text-slate-900">
              {existing ? 'Edit Add-on' : 'New Add-on'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View className="gap-4 p-4">
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Add-on Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Fabric Softener"
                placeholderTextColor="#94A3B8"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
                autoFocus
              />
            </View>
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Price (₱) *
              </Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />
            </View>
            <View>
              <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Short description…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800"
              />
            </View>
          </View>

          <View className="mt-auto flex-row gap-3 border-t border-slate-100 px-4 pb-8 pt-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
              <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!isValid || saving}
              activeOpacity={0.85}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${isValid && !saving ? 'bg-sky-500' : 'bg-slate-200'}`}
              style={{ flex: 2 }}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check size={15} color={isValid ? '#fff' : '#94A3B8'} strokeWidth={2.5} />
              )}
              <Text
                className={`text-sm font-bold ${isValid && !saving ? 'text-white' : 'text-slate-400'}`}>
                Save Add-on
              </Text>
            </TouchableOpacity>
          </View>
        </ModalSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Shop Info Tab ────────────────────────────────────────────────────────────

function ShopInfoTab() {
  const { savePin, removePin, ownerPinSet, staffPinSet } = useAuth();
  const [settings, setSettings] = useState<Partial<ShopSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loyalty, setLoyalty] = useState(false);
  const [pickup, setPickup] = useState(false);

  // PIN state
  const [pinModal, setPinModal] = useState<'owner' | 'staff' | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    dbGetSettings().then((s) => {
      setSettings(s);
      setShopName(String(s.shopName ?? ''));
      setPhone(String(s.phone ?? ''));
      setAddress(String(s.address ?? ''));
      setLoyalty(Boolean(s.loyaltyEnabled));
      setPickup(Boolean(s.pickupEnabled));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await dbSetSetting('shopName', shopName.trim());
    await dbSetSetting('phone', phone.trim());
    await dbSetSetting('address', address.trim());
    await dbSetSetting('loyaltyEnabled', loyalty);
    await dbSetSetting('pickupEnabled', pickup);
    setSaving(false);
    Alert.alert('Saved', 'Shop settings updated.');
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    setPinSaving(true);
    await savePin(pinModal!, newPin);
    setPinSaving(false);
    setPinModal(null);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    Alert.alert('PIN Saved', `${pinModal === 'owner' ? 'Owner' : 'Staff'} PIN updated.`);
  };

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView
      className="flex-1 p-4"
      contentContainerClassName="gap-3 pb-10"
      showsVerticalScrollIndicator={false}>
      <Card className="gap-3 p-4">
        <SectionLabel title="Shop Details" />

        {[
          {
            label: 'Shop Name',
            value: shopName,
            set: setShopName,
            placeholder: 'My Laundry Shop',
            icon: Store,
          },
          { label: 'Phone', value: phone, set: setPhone, placeholder: '09XXXXXXXXX', icon: Phone },
          {
            label: 'Address',
            value: address,
            set: setAddress,
            placeholder: 'Street, City',
            icon: MapPin,
          },
        ].map(({ label, value, set, placeholder, icon: Icon }) => (
          <View key={label}>
            <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              {label}
            </Text>
            <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <Icon size={14} color="#94A3B8" strokeWidth={1.75} />
              <TextInput
                value={value}
                onChangeText={set}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                className="flex-1 py-3 text-sm text-slate-800"
              />
            </View>
          </View>
        ))}
      </Card>

      <Card className="gap-0 p-4">
        <SectionLabel title="Features" className="mb-3" />
        <View className="flex-row items-center justify-between border-b border-slate-100 py-3">
          <View className="mr-4 flex-1">
            <Text className="text-sm font-semibold text-slate-800">Loyalty Points</Text>
            <Text className="mt-0.5 text-xs text-slate-400">Earn 1 point per ₱100 spent</Text>
          </View>
          <ToggleSwitch value={loyalty} onChange={setLoyalty} />
        </View>
        <View className="flex-row items-center justify-between pt-3">
          <View className="mr-4 flex-1">
            <Text className="text-sm font-semibold text-slate-800">Pickup & Delivery</Text>
            <Text className="mt-0.5 text-xs text-slate-400">
              Enable home pickup option in orders
            </Text>
          </View>
          <ToggleSwitch value={pickup} onChange={setPickup} />
        </View>
      </Card>

      {/* PIN Management — Owner only */}
      <Card className="p-4">
        <View className="mb-3 flex-row items-center gap-2">
          <ShieldCheck size={15} color="#0EA5E9" strokeWidth={2} />
          <SectionLabel title="Access PINs" />
        </View>

        {[
          {
            role: 'owner' as const,
            label: 'Owner PIN',
            desc: 'Full access — all features',
            set: ownerPinSet,
          },
          {
            role: 'staff' as const,
            label: 'Staff PIN',
            desc: 'New Order, Orders, Customers, Reports',
            set: staffPinSet,
          },
        ].map(({ role, label, desc, set }, i, arr) => (
          <View
            key={role}
            className={`flex-row items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <View className="mr-3 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-slate-800">{label}</Text>
                <View
                  className={`rounded-full px-2 py-0.5 ${set ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  <Text
                    className={`text-xs font-bold ${set ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {set ? 'Set' : 'Not set'}
                  </Text>
                </View>
              </View>
              <Text className="mt-0.5 text-xs text-slate-400">{desc}</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setPinModal(role);
                  setNewPin('');
                  setConfirmPin('');
                  setPinError('');
                }}
                className="rounded-xl bg-sky-50 px-3 py-2">
                <Text className="text-xs font-bold text-sky-600">{set ? 'Change' : 'Set PIN'}</Text>
              </TouchableOpacity>
              {set && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(`Remove ${label}`, 'This will prevent login with this PIN.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removePin(role) },
                    ])
                  }
                  className="rounded-xl bg-red-50 px-3 py-2">
                  <Text className="text-xs font-bold text-red-500">Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </Card>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
        className="flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4"
        style={{
          shadowColor: '#0EA5E9',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        }}>
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Check size={15} color="#fff" strokeWidth={2.5} />
        )}
        <Text className="text-sm font-bold text-white">Save Settings</Text>
      </TouchableOpacity>

      {/* ── PIN Setup Modal ── */}
      <Modal
        visible={!!pinModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPinModal(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ModalSheet>
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
              <Text className="text-lg font-bold text-slate-900">
                {pinModal === 'owner' ? 'Owner PIN' : 'Staff PIN'}
              </Text>
              <TouchableOpacity
                onPress={() => setPinModal(null)}
                className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="gap-4 p-4">
              <View className="rounded-xl bg-sky-50 px-4 py-3">
                <Text className="text-xs font-semibold text-sky-700">
                  {pinModal === 'owner'
                    ? 'Owner PIN gives full access to all features including Settings.'
                    : 'Staff PIN gives access to New Order, Orders, Customers, and Reports only.'}
                </Text>
              </View>

              {/* New PIN */}
              <View>
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  New PIN (4 digits)
                </Text>
                <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <KeyRound size={14} color="#94A3B8" strokeWidth={1.75} />
                  <TextInput
                    value={newPin}
                    onChangeText={(t) => {
                      setNewPin(t.replace(/\D/g, '').slice(0, 4));
                      setPinError('');
                    }}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={4}
                    placeholder="····"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 py-3 text-sm tracking-widest text-slate-800"
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPin((v) => !v)}>
                    {showPin ? (
                      <EyeOff size={14} color="#94A3B8" />
                    ) : (
                      <Eye size={14} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm PIN */}
              <View>
                <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Confirm PIN
                </Text>
                <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <KeyRound size={14} color="#94A3B8" strokeWidth={1.75} />
                  <TextInput
                    value={confirmPin}
                    onChangeText={(t) => {
                      setConfirmPin(t.replace(/\D/g, '').slice(0, 4));
                      setPinError('');
                    }}
                    keyboardType="number-pad"
                    secureTextEntry={!showPin}
                    maxLength={4}
                    placeholder="····"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 py-3 text-sm tracking-widest text-slate-800"
                  />
                </View>
              </View>

              {pinError ? (
                <Text className="text-xs font-semibold text-red-500">{pinError}</Text>
              ) : null}
            </View>

            <View className="mt-auto flex-row gap-3 border-t border-slate-100 px-4 pb-10 pt-3">
              <TouchableOpacity
                onPress={() => setPinModal(null)}
                className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
                <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSavePin}
                disabled={newPin.length !== 4 || confirmPin.length !== 4 || pinSaving}
                activeOpacity={0.85}
                className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${newPin.length === 4 && confirmPin.length === 4 ? 'bg-sky-500' : 'bg-slate-200'}`}
                style={{ flex: 2 }}>
                {pinSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Check
                    size={15}
                    color={newPin.length === 4 && confirmPin.length === 4 ? '#fff' : '#94A3B8'}
                    strokeWidth={2.5}
                  />
                )}
                <Text
                  className={`text-sm font-bold ${newPin.length === 4 && confirmPin.length === 4 ? 'text-white' : 'text-slate-400'}`}>
                  Save PIN
                </Text>
              </TouchableOpacity>
            </View>
          </ModalSheet>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>();
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = useCallback(async () => {
    const data = await dbGetServices(false); // get all including inactive
    setServices(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async (data: Omit<Service, 'createdAt'>) => {
    if (editing) {
      await dbUpdateService(data.id, data);
    } else {
      await dbInsertService(data);
    }
    await load();
  };

  const handleDelete = (svc: Service) => {
    Alert.alert('Delete Service', `Remove "${svc.name}"? This won't affect existing orders.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dbDeleteService(svc.id);
          await load();
        },
      },
    ]);
  };

  const handleToggleActive = async (svc: Service) => {
    await dbUpdateService(svc.id, { isActive: !svc.isActive });
    await load();
  };

  const filtered = services.filter((s) =>
    filter === 'all' ? true : filter === 'active' ? s.isActive : !s.isActive
  );

  if (loading) return <LoadingScreen />;

  return (
    <View className="flex-1">
      {/* Toolbar */}
      <View className="flex-row items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
        <View className="flex-1 flex-row overflow-hidden rounded-xl bg-slate-100">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              className={`flex-1 items-center py-2 ${filter === f ? 'bg-sky-500' : ''}`}>
              <Text
                className={`text-xs font-bold capitalize ${filter === f ? 'text-white' : 'text-slate-500'}`}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
          activeOpacity={0.85}
          className="flex-row items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2">
          <Plus size={14} color="#fff" strokeWidth={2} />
          <Text className="text-xs font-bold text-white">Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerClassName="px-4 pt-3 pb-6 gap-2"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <Package size={32} color="#CBD5E1" strokeWidth={1.5} />
            <Text className="mt-3 text-sm font-bold text-slate-500">No services yet</Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Tap "Add" to create your first service
            </Text>
          </View>
        }
        renderItem={({ item: svc }) => (
          <View
            className={`rounded-2xl border bg-white px-4 py-3 ${svc.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}>
            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <View className="mb-0.5 flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {svc.name}
                  </Text>
                  {!svc.isActive && (
                    <View className="rounded-md bg-slate-100 px-1.5 py-0.5">
                      <Text className="text-xs font-bold text-slate-400">Inactive</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-sm font-bold text-sky-500">
                    {formatPeso(svc.price)}
                    <Text className="text-xs font-medium text-slate-400">/{svc.unit}</Text>
                  </Text>
                  <View className="h-1 w-1 rounded-full bg-slate-300" />
                  <Text className="text-xs capitalize text-slate-400">{svc.category}</Text>
                  <View className="h-1 w-1 rounded-full bg-slate-300" />
                  <Text className="text-xs text-slate-400">{svc.duration}</Text>
                </View>
                {svc.description ? (
                  <Text className="mt-1 text-xs text-slate-400" numberOfLines={1}>
                    {svc.description}
                  </Text>
                ) : null}
              </View>

              {/* Actions */}
              <View className="flex-shrink-0 flex-row gap-1.5">
                <TouchableOpacity
                  onPress={() => handleToggleActive(svc)}
                  className={`h-8 w-8 items-center justify-center rounded-xl ${svc.isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  {svc.isActive ? (
                    <ToggleRight size={15} color="#10B981" strokeWidth={1.75} />
                  ) : (
                    <ToggleLeft size={15} color="#94A3B8" strokeWidth={1.75} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(svc);
                    setShowForm(true);
                  }}
                  className="h-8 w-8 items-center justify-center rounded-xl bg-sky-50">
                  <Pencil size={13} color="#0EA5E9" strokeWidth={1.75} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(svc)}
                  className="h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                  <Trash2 size={13} color="#EF4444" strokeWidth={1.75} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {showForm && (
        <ServiceFormModal
          existing={editing}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
        />
      )}
    </View>
  );
}

// ─── Add-ons Tab ──────────────────────────────────────────────────────────────

function AddonsTab() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Addon | undefined>();

  const load = useCallback(async () => {
    const data = await dbGetAddons(false);
    setAddons(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async (data: Omit<Addon, 'isActive'>) => {
    if (editing) {
      await dbUpdateAddon(data.id, data);
    } else {
      await dbInsertAddon(data);
    }
    await load();
  };

  const handleDelete = (addon: Addon) => {
    Alert.alert('Delete Add-on', `Remove "${addon.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dbDeleteAddon(addon.id);
          await load();
        },
      },
    ]);
  };

  const handleToggleActive = async (addon: Addon) => {
    await dbUpdateAddon(addon.id, { isActive: !addon.isActive });
    await load();
  };

  if (loading) return <LoadingScreen />;

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
        <Text className="text-xs font-bold text-slate-400">{addons.length} add-ons</Text>
        <TouchableOpacity
          onPress={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
          activeOpacity={0.85}
          className="flex-row items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2">
          <Plus size={14} color="#fff" strokeWidth={2} />
          <Text className="text-xs font-bold text-white">Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={addons}
        keyExtractor={(a) => a.id}
        contentContainerClassName="px-4 pt-3 pb-6 gap-2"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <Sparkles size={32} color="#CBD5E1" strokeWidth={1.5} />
            <Text className="mt-3 text-sm font-bold text-slate-500">No add-ons yet</Text>
            <Text className="mt-1 text-xs text-slate-400">
              Tap "Add" to create your first add-on
            </Text>
          </View>
        }
        renderItem={({ item: addon }) => (
          <View
            className={`flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 ${!addon.isActive ? 'opacity-60' : ''}`}
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}>
            <View className="h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <Sparkles size={15} color="#8B5CF6" strokeWidth={1.75} />
            </View>
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {addon.name}
                </Text>
                {!addon.isActive && (
                  <View className="rounded-md bg-slate-100 px-1.5 py-0.5">
                    <Text className="text-xs font-bold text-slate-400">Off</Text>
                  </View>
                )}
              </View>
              <Text className="mt-0.5 text-sm font-bold text-sky-500">
                +{formatPeso(addon.price)}
              </Text>
              {addon.description ? (
                <Text className="mt-0.5 text-xs text-slate-400" numberOfLines={1}>
                  {addon.description}
                </Text>
              ) : null}
            </View>
            <View className="flex-shrink-0 flex-row gap-1.5">
              <TouchableOpacity
                onPress={() => handleToggleActive(addon)}
                className={`h-8 w-8 items-center justify-center rounded-xl ${addon.isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                {addon.isActive ? (
                  <ToggleRight size={15} color="#10B981" strokeWidth={1.75} />
                ) : (
                  <ToggleLeft size={15} color="#94A3B8" strokeWidth={1.75} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditing(addon);
                  setShowForm(true);
                }}
                className="h-8 w-8 items-center justify-center rounded-xl bg-sky-50">
                <Pencil size={13} color="#0EA5E9" strokeWidth={1.75} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(addon)}
                className="h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                <Trash2 size={13} color="#EF4444" strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {showForm && (
        <AddonFormModal
          existing={editing}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const nav = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('shop');

  // Hard guard — staff cannot access this screen
  React.useEffect(() => {
    if (user?.role !== 'owner') nav.goBack();
  }, [user]);

  if (user?.role !== 'owner') return null;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-0 pt-12">
        <Text className="pb-3 text-xl font-bold text-slate-900">Settings</Text>

        {/* Tab bar */}
        <View className="flex-row">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                className="relative flex-1 items-center pb-3">
                <View className="flex-row items-center gap-1.5">
                  <Icon
                    size={14}
                    color={active ? '#0EA5E9' : '#94A3B8'}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  <Text
                    className={`text-xs font-bold ${active ? 'text-sky-500' : 'text-slate-400'}`}>
                    {tab.label}
                  </Text>
                </View>
                {active && (
                  <View className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-sky-500" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'shop' && <ShopInfoTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'addons' && <AddonsTab />}
    </View>
  );
}
