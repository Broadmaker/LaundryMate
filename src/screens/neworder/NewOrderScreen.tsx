// src/screens/neworder/NewOrderScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Search,
  X,
  Check,
  ChevronLeft,
  Plus,
  Minus,
  User,
  Users,
  Truck,
  MapPin,
  Calendar,
  Banknote,
  Tag,
  FileText,
  Navigation,
  Sparkles,
  CheckCircle2,
  ShoppingCart,
  Smartphone,
  ArrowRight,
} from 'lucide-react-native';

import { dbGetServices, dbGetAddons, dbGetCustomers, dbInsertOrder } from '../../db';
import { formatPeso, generateOrderId, generateId, calculateOrderTotals } from '../../utils';
import { Card, SectionLabel, Avatar, Divider, Input, ModalSheet } from '../../components/common';
import type { Service, Addon, Customer, Order, OrderItem } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  serviceId: string;
  serviceName: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  addons: { addonId: string; addonName: string; price: number }[];
}

const STEPS = ['Services', 'Add-ons', 'Delivery', 'Checkout'];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <View className="flex-row border-b border-slate-100 bg-white">
      {STEPS.map((label, i) => (
        <TouchableOpacity key={label} className="relative flex-1 items-center py-2.5">
          <Text
            className={`text-xs font-bold ${current === i ? 'text-sky-500' : 'text-slate-400'}`}>
            {label}
          </Text>
          {current === i && (
            <View className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-sky-500" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Service Tile ─────────────────────────────────────────────────────────────

function ServiceTile({ svc, qty, onAdd }: { svc: Service; qty: number; onAdd: () => void }) {
  const isLoad = svc.unit === 'load';
  return (
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={0.75}
      className={`rounded-2xl border bg-white p-3 ${qty > 0 ? 'border-sky-400' : 'border-slate-100'}`}
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}>
      {qty > 0 && (
        <View className="absolute right-2 top-2 z-10 h-5 w-5 items-center justify-center rounded-full bg-sky-500">
          <Text className="text-xs font-bold text-white">{qty}</Text>
        </View>
      )}
      <View
        className={`mb-2 h-9 w-9 items-center justify-center rounded-xl ${qty > 0 ? 'bg-sky-50' : 'bg-slate-100'}`}>
        <ShoppingCart size={16} color={qty > 0 ? '#0EA5E9' : '#94A3B8'} strokeWidth={1.75} />
      </View>
      <Text className="mb-1 text-xs font-bold leading-tight text-slate-800" numberOfLines={2}>
        {svc.name}
      </Text>
      <Text className="text-sm font-bold text-sky-500">
        ₱{svc.price}
        <Text className="text-xs font-medium text-slate-400">/{svc.unit}</Text>
      </Text>
      {isLoad && (
        <Text className="mt-0.5 text-xs text-slate-400">1 load = {svc.kgsPerLoad ?? 6}kg</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewOrderScreen() {
  const nav = useNavigation();
  const [step, setStep] = useState(0);

  // Data
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Order state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selCustomer, setSelCustomer] = useState<Customer | null>(null);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [custTab, setCustTab] = useState<'walkin' | 'registered'>('walkin');

  // Pickup
  const [isPickup, setIsPickup] = useState(false);
  const [pickupAddr, setPickupAddr] = useState('');
  const [deliveryAddr, setDeliveryAddr] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [driverName, setDriverName] = useState('');

  // Checkout
  const [payMethod, setPayMethod] = useState<Order['paymentMethod']>('cash');
  const [tendered, setTendered] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');

  // Modals
  const [qtyModal, setQtyModal] = useState<Service | null>(null);
  const [qtyInput, setQtyInput] = useState('1');
  const [kgInput, setKgInput] = useState(''); // for load-based entry

  // Custom add-on (inline, inside addon modal)
  const [customAddonName, setCustomAddonName] = useState('');
  const [customAddonPrice, setCustomAddonPrice] = useState('');
  const [showCustomAddon, setShowCustomAddon] = useState(false);
  const [custModal, setCustModal] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [addonModal, setAddonModal] = useState<number | null>(null); // cart index
  const [catFilter, setCatFilter] = useState('All');

  // Success
  const [success, setSuccess] = useState<Order | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([dbGetServices(), dbGetAddons(), dbGetCustomers()]).then(
        ([svcs, adns, custs]) => {
          setServices(svcs);
          setAddons(adns);
          setCustomers(custs);
        }
      );
      // Auto-open customer modal so staff fills in name first
      setCustModal(true);
    }, [])
  );

  const hasCustomer =
    selCustomer !== null || (walkinName.trim().length > 0 && walkinPhone.trim().length > 0);

  // ─── Cart helpers ─────────────────────────────────────────────────────────

  const addToCart = (svc: Service, qty: number) => {
    setCart((prev) => {
      const exists = prev.findIndex((i) => i.serviceId === svc.id);
      if (exists >= 0) {
        return prev.map((i, idx) =>
          idx === exists ? { ...i, qty: i.qty + qty, subtotal: (i.qty + qty) * i.pricePerUnit } : i
        );
      }
      return [
        ...prev,
        {
          serviceId: svc.id,
          serviceName: svc.name,
          qty,
          unit: svc.unit,
          pricePerUnit: svc.price,
          subtotal: qty * svc.price,
          addons: [],
        },
      ];
    });
  };

  // Load-based: qty = number of loads, unit label shows actual kg
  const addToCartLoad = (svc: Service, loads: number, actualKg: number) => {
    setCart((prev) => {
      const exists = prev.findIndex((i) => i.serviceId === svc.id);
      const unitLabel = `load (${actualKg}kg)`;
      if (exists >= 0) {
        const cur = prev[exists];
        const newLoads = cur.qty + loads;
        return prev.map((i, idx) =>
          idx === exists
            ? { ...i, qty: newLoads, unit: unitLabel, subtotal: newLoads * i.pricePerUnit }
            : i
        );
      }
      return [
        ...prev,
        {
          serviceId: svc.id,
          serviceName: svc.name,
          qty: loads,
          unit: unitLabel,
          pricePerUnit: svc.price,
          subtotal: loads * svc.price,
          addons: [],
        },
      ];
    });
  };

  const updateCartQty = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      setCart((p) => p.filter((_, i) => i !== idx));
      return;
    }
    setCart((p) =>
      p.map((item, i) =>
        i === idx ? { ...item, qty: newQty, subtotal: newQty * item.pricePerUnit } : item
      )
    );
  };

  const toggleAddon = (cartIdx: number, addon: Addon) => {
    setCart((p) =>
      p.map((item, i) => {
        if (i !== cartIdx) return item;
        const has = item.addons.find((a) => a.addonId === addon.id);
        return {
          ...item,
          addons: has
            ? item.addons.filter((a) => a.addonId !== addon.id)
            : [...item.addons, { addonId: addon.id, addonName: addon.name, price: addon.price }],
        };
      })
    );
  };

  const addCustomAddon = (cartIdx: number, name: string, price: number) => {
    const customId = `custom-${generateId('adn')}`;
    setCart((p) =>
      p.map((item, i) => {
        if (i !== cartIdx) return item;
        // Remove existing custom with same name if re-added
        const filtered = item.addons.filter((a) => a.addonName !== name);
        return {
          ...item,
          addons: [...filtered, { addonId: customId, addonName: name, price }],
        };
      })
    );
  };

  // ─── Totals ───────────────────────────────────────────────────────────────

  const totals = calculateOrderTotals({
    items: cart,
    deliveryFee: isPickup ? parseFloat(deliveryFee) || 0 : 0,
    discount: parseFloat(discount) || 0,
    amountTendered: parseFloat(tendered) || 0,
  });

  // ─── Place order ──────────────────────────────────────────────────────────

  const placeOrder = async () => {
    const now = new Date().toISOString();
    const id = generateOrderId();
    const order: Order = {
      id,
      customerId: selCustomer?.id ?? null,
      customerName: (selCustomer?.name ?? walkinName.trim()) || 'Walk-in Customer',
      customerPhone: (selCustomer?.phone ?? walkinPhone.trim()) || null,
      items: cart.map(
        (item, idx): OrderItem => ({
          id: generateId('itm'),
          orderId: id,
          serviceId: item.serviceId,
          serviceName: item.serviceName,
          qty: item.qty,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.subtotal,
          addons: item.addons,
        })
      ),
      servicesSubtotal: totals.servicesSubtotal,
      addonsSubtotal: totals.addonsSubtotal,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      total: totals.total,
      amountPaid: parseFloat(tendered) || 0,
      change: totals.change,
      paymentMethod: payMethod,
      status: 'pending',
      isPickup,
      pickupAddress: isPickup ? pickupAddr : null,
      deliveryAddress: isPickup ? deliveryAddr || pickupAddr : null,
      scheduledAt: isPickup && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      driverName: isPickup ? driverName || null : null,
      deliveryStatus: isPickup ? 'pending' : null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
      readyAt: null,
      claimedAt: null,
    };
    try {
      const saved = await dbInsertOrder(order);
      setSuccess(saved);
    } catch (e) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const resetForm = () => {
    setCart([]);
    setSelCustomer(null);
    setStep(0);
    setWalkinName('');
    setWalkinPhone('');
    setCustTab('walkin');
    setIsPickup(false);
    setPickupAddr('');
    setDeliveryAddr('');
    setScheduledAt('');
    setDeliveryFee('');
    setDriverName('');
    setPayMethod('cash');
    setTendered('');
    setDiscount('');
    setNotes('');
    setSuccess(null);
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (success) {
    return (
      <View className="flex-1 items-center justify-center gap-5 bg-slate-50 px-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} color="#10B981" strokeWidth={1.75} />
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-slate-900">Order Placed!</Text>
          <Text className="mt-1 text-sm text-slate-500">
            {success.id} · {success.customerName}
          </Text>
        </View>
        <Card className="w-full p-4">
          <View className="mb-2 flex-row justify-between">
            <Text className="text-sm text-slate-500">Total</Text>
            <Text className="text-lg font-bold text-sky-500">{formatPeso(success.total)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-500">Payment</Text>
            <Text className="text-sm font-bold text-slate-800">
              {success.paymentMethod?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {success.isPickup && (
            <View className="mt-3 flex-row items-center gap-2 rounded-xl bg-sky-50 p-2.5">
              <Truck size={13} color="#0EA5E9" />
              <Text className="text-xs font-semibold text-sky-700">
                Pickup & delivery scheduled
              </Text>
            </View>
          )}
        </Card>
        <TouchableOpacity
          onPress={resetForm}
          activeOpacity={0.8}
          className="w-full items-center rounded-2xl bg-sky-500 py-4">
          <Text className="text-sm font-bold text-white">New Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category)))];
  const visibleServices =
    catFilter === 'All' ? services : services.filter((s) => s.category === catFilter);
  const filteredCusts = custSearch
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)
      )
    : customers.slice(0, 8);

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-slate-900">New Order</Text>
            <Text className="text-xs text-slate-400" numberOfLines={1}>
              {selCustomer ? selCustomer.name : walkinName.trim() || 'No customer set'}
            </Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setCustModal(true)}
              activeOpacity={0.8}
              className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${hasCustomer ? 'bg-slate-100' : 'border border-red-200 bg-red-50'}`}>
              <User size={13} color={hasCustomer ? '#64748B' : '#EF4444'} strokeWidth={1.75} />
              <Text
                className={`text-xs font-semibold ${hasCustomer ? 'text-slate-700' : 'text-red-500'}`}>
                {selCustomer ? selCustomer.name : walkinName.trim() || 'Required'}
              </Text>
            </TouchableOpacity>
            {cart.length > 0 && (
              <TouchableOpacity
                onPress={() => setCart([])}
                className="h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50">
                <X size={14} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <StepBar current={step} />

      {/* ── STEP 0: Services ────────────────────────────────────────────── */}
      {step === 0 && services.length === 0 && (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <ShoppingCart size={28} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <View className="items-center gap-1">
            <Text className="text-base font-bold text-slate-700">No Services Yet</Text>
            <Text className="text-center text-sm text-slate-400">
              Add your laundry services in Settings before creating an order.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => (nav as any).navigate('Reports', { screen: 'Settings' })}
            activeOpacity={0.85}
            className="flex-row items-center gap-2 rounded-2xl bg-sky-500 px-6 py-3.5"
            style={{
              shadowColor: '#0EA5E9',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}>
            <Text className="text-sm font-bold text-white">Go to Settings</Text>
            <ArrowRight size={14} color="#fff" strokeWidth={2} />
            <Text className="text-sm font-bold text-white">Services</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 0 && services.length > 0 && (
        <View className="flex-1">
          {/* Category chips */}
          <View className="border-b border-slate-100 bg-white">
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-3 py-2 gap-2"
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  onPress={() => setCatFilter(cat)}
                  activeOpacity={0.7}
                  className={`rounded-full border px-3.5 py-1.5 ${catFilter === cat ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'}`}>
                  <Text
                    className={`text-xs font-bold capitalize ${catFilter === cat ? 'text-white' : 'text-slate-600'}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <View className="flex-1 flex-row">
            {/* Service grid */}
            <ScrollView className="flex-1 p-3" showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2">
                {visibleServices.map((svc) => {
                  const inCart = cart.find((i) => i.serviceId === svc.id);
                  return (
                    <View key={svc.id} style={{ width: '48%' }}>
                      <ServiceTile
                        svc={svc}
                        qty={inCart?.qty ?? 0}
                        onAdd={() => {
                          setQtyInput('1');
                          setKgInput('');
                          setQtyModal(svc);
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Mini cart sidebar */}
            <View className="w-40 border-l border-slate-100 bg-white p-3">
              <Text className="mb-2 text-xs font-bold text-slate-700">Cart</Text>
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {cart.length === 0 ? (
                  <Text className="mt-8 text-center text-xs text-slate-400">Empty</Text>
                ) : (
                  cart.map((item, idx) => (
                    <View key={item.serviceId} className="mb-3 border-b border-slate-100 pb-3">
                      <Text
                        className="mb-1.5 text-xs font-semibold text-slate-800"
                        numberOfLines={2}>
                        {item.serviceName}
                      </Text>
                      <View className="mb-1 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1">
                          <TouchableOpacity
                            onPress={() =>
                              updateCartQty(idx, item.qty - (item.unit === 'kg' ? 0.5 : 1))
                            }
                            className="h-5 w-5 items-center justify-center rounded-md bg-slate-100">
                            <Minus size={10} color="#64748B" />
                          </TouchableOpacity>
                          <Text className="w-6 text-center text-xs font-bold text-slate-900">
                            {item.qty}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateCartQty(idx, item.qty + (item.unit === 'kg' ? 0.5 : 1))
                            }
                            className="h-5 w-5 items-center justify-center rounded-md bg-sky-100">
                            <Plus size={10} color="#0EA5E9" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-xs font-bold text-slate-900">₱{item.subtotal}</Text>
                      </View>
                      {item.addons.length > 0 && (
                        <View className="mb-1 flex-row flex-wrap gap-0.5">
                          {item.addons.slice(0, 2).map((a) => (
                            <Text
                              key={a.addonId}
                              className="rounded bg-sky-50 px-1 text-xs text-sky-600">
                              +{a.addonName.split(' ')[0]}
                            </Text>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => setAddonModal(idx)}
                        className="mt-0.5 flex-row items-center gap-1">
                        <Sparkles size={9} color="#0EA5E9" />
                        <Text className="text-xs font-semibold text-sky-500">Add-ons</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
              <Divider className="mb-2" />
              <Text className="mb-0.5 text-xs text-slate-500">Services</Text>
              <Text className="mb-2 text-sm font-bold text-slate-900">
                {formatPeso(totals.servicesSubtotal)}
              </Text>
              <TouchableOpacity
                onPress={() => setStep(1)}
                disabled={cart.length === 0 || !hasCustomer}
                activeOpacity={0.8}
                className={`flex-row items-center justify-center gap-1 rounded-xl py-2.5 ${cart.length > 0 && hasCustomer ? 'bg-sky-500' : 'bg-slate-200'}`}>
                {!hasCustomer ? (
                  <Text className="text-xs font-bold text-slate-400">Enter Customer</Text>
                ) : (
                  <>
                    <Text className="text-xs font-bold text-white">Next</Text>
                    <ArrowRight size={12} color="#fff" strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── STEP 1: Add-ons ─────────────────────────────────────────────── */}
      {step === 1 && (
        <ScrollView
          className="flex-1 p-4"
          contentContainerClassName="gap-3 pb-6"
          showsVerticalScrollIndicator={false}>
          <Text className="text-xs text-slate-400">Tap an item to manage its add-ons</Text>
          {cart.map((item, idx) => (
            <Card key={item.serviceId} className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-bold text-slate-900">{item.serviceName}</Text>
                  <Text className="text-xs text-slate-400">
                    {item.qty} {item.unit} · {formatPeso(item.subtotal)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddonModal(idx)}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                  <Sparkles size={12} color="#0EA5E9" />
                  <Text className="text-xs font-semibold text-sky-600">Add-ons</Text>
                </TouchableOpacity>
              </View>
              {item.addons.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {item.addons.map((a) => (
                    <View
                      key={a.addonId}
                      className="flex-row items-center gap-1.5 rounded-xl bg-sky-50 px-2.5 py-1.5">
                      <Text className="text-xs font-semibold text-sky-800">{a.addonName}</Text>
                      <Text className="text-xs text-sky-500">+₱{a.price}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          toggleAddon(idx, {
                            id: a.addonId,
                            name: a.addonName,
                            price: a.price,
                            description: '',
                            isActive: true,
                          })
                        }>
                        <X size={10} color="#0EA5E9" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-xs text-slate-400">No add-ons selected</Text>
              )}
            </Card>
          ))}
          <View className="mt-2 flex-row gap-3">
            <TouchableOpacity
              onPress={() => setStep(0)}
              activeOpacity={0.8}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5">
              <ChevronLeft size={14} color="#64748B" />
              <Text className="text-sm font-semibold text-slate-700">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStep(2)}
              activeOpacity={0.8}
              className="flex-2 flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 px-8 py-3.5"
              style={{ flex: 2 }}>
              <Text className="text-sm font-bold text-white">Next: Delivery</Text>
              <ArrowRight size={14} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── STEP 2: Pickup & Delivery ───────────────────────────────────── */}
      {step === 2 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ScrollView
            className="flex-1 p-4"
            contentContainerClassName="gap-3 pb-6"
            showsVerticalScrollIndicator={false}>
            <Card className="p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-bold text-slate-900">Pickup & Delivery</Text>
                  <Text className="mt-0.5 text-xs text-slate-400">Is this a pickup order?</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPickup((v) => !v)}
                  activeOpacity={0.8}
                  className={`h-6 w-12 justify-center rounded-full px-1 ${isPickup ? 'bg-sky-500' : 'bg-slate-200'}`}>
                  <View
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm ${isPickup ? 'self-end' : 'self-start'}`}
                    style={{
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  />
                </TouchableOpacity>
              </View>
            </Card>

            {isPickup && (
              <>
                <Input
                  label="Pickup Address"
                  placeholder="Street, Barangay, City"
                  value={pickupAddr}
                  onChangeText={setPickupAddr}
                />
                <Input
                  label="Delivery Address"
                  placeholder="Same as pickup or different"
                  value={deliveryAddr}
                  onChangeText={setDeliveryAddr}
                />
                <Input
                  label="Scheduled Date & Time"
                  placeholder="e.g. 2026-03-10 14:00"
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Delivery Fee (₱)"
                      placeholder="0.00"
                      value={deliveryFee}
                      onChangeText={setDeliveryFee}
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Driver / Rider"
                      placeholder="Optional"
                      value={driverName}
                      onChangeText={setDriverName}
                    />
                  </View>
                </View>
              </>
            )}

            <View className="mt-2 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setStep(1)}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5">
                <ChevronLeft size={14} color="#64748B" />
                <Text className="text-sm font-semibold text-slate-700">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setTendered('');
                  setStep(3);
                }}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 px-8 py-3.5"
                style={{ flex: 2 }}>
                <Text className="text-sm font-bold text-white">Next: Checkout</Text>
                <ArrowRight size={14} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── STEP 3: Checkout ────────────────────────────────────────────── */}
      {step === 3 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ScrollView
            className="flex-1 p-4"
            contentContainerClassName="gap-3 pb-10"
            showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <Card className="p-4">
              <SectionLabel title="Order Summary" className="mb-3" />
              {cart.map((item) => (
                <View key={item.serviceId} className="mb-2 flex-row justify-between">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-slate-800">
                      {item.serviceName} ×{item.qty}
                      {item.unit}
                    </Text>
                    {item.addons.length > 0 && (
                      <Text className="text-xs text-slate-400">
                        {item.addons.map((a) => a.addonName).join(', ')}
                      </Text>
                    )}
                  </View>
                  <Text className="text-sm font-bold text-slate-900">
                    {formatPeso(item.subtotal + item.addons.reduce((s, a) => s + a.price, 0))}
                  </Text>
                </View>
              ))}
              <Divider className="my-3" />
              {totals.addonsSubtotal > 0 && (
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-xs text-slate-500">Add-ons</Text>
                  <Text className="text-xs font-semibold text-sky-600">
                    +{formatPeso(totals.addonsSubtotal)}
                  </Text>
                </View>
              )}
              {isPickup && totals.deliveryFee > 0 && (
                <View className="mb-1 flex-row justify-between">
                  <View className="flex-row items-center gap-1">
                    <Truck size={11} color="#64748B" />
                    <Text className="text-xs text-slate-500">Delivery Fee</Text>
                  </View>
                  <Text className="text-xs font-semibold text-slate-700">
                    {formatPeso(totals.deliveryFee)}
                  </Text>
                </View>
              )}
              <View className="mt-2">
                <Input
                  label="Discount (₱)"
                  placeholder="0"
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-slate-900">Total</Text>
                <Text className="text-2xl font-bold text-sky-500">{formatPeso(totals.total)}</Text>
              </View>
            </Card>

            {/* Payment method */}
            <Card className="p-4">
              <SectionLabel title="Payment" className="mb-3" />
              <View className="mb-3 flex-row flex-wrap gap-2">
                {(['cash', 'gcash', 'maya', 'bank_transfer'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPayMethod(method)}
                    activeOpacity={0.8}
                    className={`rounded-xl border px-4 py-2.5 ${payMethod === method ? 'border-sky-500 bg-sky-500' : 'border-slate-200 bg-white'}`}>
                    <Text
                      className={`text-xs font-bold ${payMethod === method ? 'text-white' : 'text-slate-600'}`}>
                      {method.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Amount Received (₱)"
                placeholder={`Full amount: ${formatPeso(totals.total)}`}
                value={tendered}
                onChangeText={setTendered}
                keyboardType="numeric"
              />

              {/* Change — only when tendered > total */}
              {parseFloat(tendered) > totals.total && totals.change > 0 && (
                <View className="mt-2 flex-row items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                  <Text className="text-xs font-bold text-emerald-700">Change</Text>
                  <Text className="text-base font-bold text-emerald-600">
                    {formatPeso(totals.change)}
                  </Text>
                </View>
              )}

              {/* Balance due — when partial payment */}
              {parseFloat(tendered) > 0 && parseFloat(tendered) < totals.total && (
                <View className="mt-2 flex-row items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5">
                  <View>
                    <Text className="text-xs font-bold text-amber-700">Balance Due</Text>
                    <Text className="mt-0.5 text-xs text-amber-600">Collect before claiming</Text>
                  </View>
                  <Text className="text-base font-bold text-amber-600">
                    {formatPeso(totals.total - (parseFloat(tendered) || 0))}
                  </Text>
                </View>
              )}

              {/* No payment entered yet */}
              {(!tendered || parseFloat(tendered) === 0) && (
                <View className="mt-2 flex-row items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                  <Text className="text-xs font-bold text-slate-500">Full Amount Due</Text>
                  <Text className="text-base font-bold text-slate-700">
                    {formatPeso(totals.total)}
                  </Text>
                </View>
              )}
            </Card>

            <Input
              label="Notes"
              placeholder="Special instructions…"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setStep(2)}
                activeOpacity={0.8}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5">
                <ChevronLeft size={14} color="#64748B" />
                <Text className="text-sm font-semibold text-slate-700">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={placeOrder}
                disabled={cart.length === 0}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3.5"
                style={{
                  flex: 2,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                }}>
                <Check size={16} color="#fff" strokeWidth={2.5} />
                <Text className="text-sm font-bold text-white">Place Order</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Customer Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={custModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCustModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1">
          <ModalSheet>
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
              <Text className="text-lg font-bold text-slate-900">Customer</Text>
              <TouchableOpacity
                onPress={() => setCustModal(false)}
                className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View className="flex-row border-b border-slate-100">
              {(['walkin', 'registered'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setCustTab(tab)}
                  activeOpacity={0.7}
                  className="relative flex-1 items-center py-3">
                  <Text
                    className={`text-xs font-bold capitalize ${custTab === tab ? 'text-sky-500' : 'text-slate-400'}`}>
                    {tab === 'walkin' ? 'Walk-in' : 'Registered'}
                  </Text>
                  {custTab === tab && (
                    <View className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-sky-500" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Walk-in Tab ── */}
            {custTab === 'walkin' && (
              <View className="flex-1 gap-4 p-4">
                <View className="rounded-xl bg-sky-50 px-4 py-3">
                  <Text className="text-xs font-semibold text-sky-700">
                    Enter the customer&apos;s name and phone number to identify this order. Not saved to
                    the customers list.
                  </Text>
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Customer Name *
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <User size={14} color="#94A3B8" strokeWidth={1.75} />
                    <TextInput
                      value={walkinName}
                      onChangeText={setWalkinName}
                      placeholder="e.g. Juan dela Cruz"
                      placeholderTextColor="#94A3B8"
                      className="flex-1 py-3 text-sm text-slate-800"
                      autoFocus
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View>
                  <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phone Number *
                  </Text>
                  <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Smartphone size={14} color="#94A3B8" strokeWidth={1.75} />
                    <TextInput
                      value={walkinPhone}
                      onChangeText={setWalkinPhone}
                      placeholder="09XXXXXXXXX"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      className="flex-1 py-3 text-sm text-slate-800"
                    />
                  </View>
                </View>

                <View className="mt-auto pb-4">
                  <TouchableOpacity
                    onPress={() => {
                      setSelCustomer(null);
                      setCustModal(false);
                      setCustSearch('');
                    }}
                    disabled={!walkinName.trim() || !walkinPhone.trim()}
                    activeOpacity={0.85}
                    className={`items-center rounded-2xl py-4 ${walkinName.trim() && walkinPhone.trim() ? 'bg-sky-500' : 'bg-slate-200'}`}
                    style={
                      walkinName.trim() && walkinPhone.trim()
                        ? {
                            shadowColor: '#0EA5E9',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.25,
                            shadowRadius: 8,
                            elevation: 4,
                          }
                        : {}
                    }>
                    <Text
                      className={`text-sm font-bold ${walkinName.trim() && walkinPhone.trim() ? 'text-white' : 'text-slate-400'}`}>
                      Confirm Walk-in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Registered Tab ── */}
            {custTab === 'registered' && (
              <View className="flex-1">
                <View className="px-4 py-3">
                  <View className="flex-row items-center gap-2 rounded-xl bg-slate-100 px-3">
                    <Search size={14} color="#94A3B8" />
                    <TextInput
                      value={custSearch}
                      onChangeText={setCustSearch}
                      placeholder="Search name or phone…"
                      placeholderTextColor="#94A3B8"
                      className="flex-1 py-2.5 text-sm text-slate-800"
                    />
                  </View>
                </View>
                <FlatList
                  data={filteredCusts}
                  keyExtractor={(c) => c.id}
                  contentContainerClassName="px-4 pb-6"
                  ListEmptyComponent={
                    <View className="items-center gap-2 py-12">
                      <Users size={28} color="#CBD5E1" strokeWidth={1.5} />
                      <Text className="text-sm font-bold text-slate-400">No customers found</Text>
                      <Text className="text-xs text-slate-400">
                        Add customers in the Customers tab
                      </Text>
                    </View>
                  }
                  renderItem={({ item: c }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelCustomer(c);
                        setWalkinName('');
                        setWalkinPhone('');
                        setCustModal(false);
                        setCustSearch('');
                      }}
                      activeOpacity={0.75}
                      className="flex-row items-center gap-3 border-b border-slate-100 py-3">
                      <Avatar name={c.name} size="md" />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-800">{c.name}</Text>
                        <Text className="mt-0.5 text-xs text-slate-400">{c.phone}</Text>
                      </View>
                      <View className="rounded-lg bg-amber-50 px-2 py-1">
                        <Text className="text-xs font-bold text-amber-600">
                          {c.loyaltyPoints} pts
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </ModalSheet>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Qty / Load Modal ────────────────────────────────────────────── */}
      <Modal
        visible={!!qtyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setQtyModal(null)}>
        <TouchableOpacity
          className="flex-1 justify-end bg-black/40"
          activeOpacity={1}
          onPress={() => setQtyModal(null)}>
          <View className="rounded-t-3xl bg-white p-6" onStartShouldSetResponder={() => true}>
            {qtyModal?.unit === 'load' ? (
              // ── Load-based entry ──────────────────────────────────────
              (() => {
                const kgsPerLoad = qtyModal.kgsPerLoad ?? 6;
                const kg = parseFloat(kgInput) || 0;
                const loads = Math.floor(kg / kgsPerLoad);
                const remainderKg = parseFloat((kg % kgsPerLoad).toFixed(2));
                const subtotal = loads * qtyModal.price;
                const isValid = kg > 0;

                return (
                  <>
                    <Text className="mb-0.5 text-center text-lg font-bold text-slate-900">
                      {qtyModal.name}
                    </Text>
                    <Text className="mb-4 text-center text-xs text-slate-400">
                      1 load = {kgsPerLoad} kg · ₱{qtyModal.price}/load
                    </Text>

                    {/* Kg input */}
                    <View className="mb-3 items-center">
                      <View className="flex-row items-end justify-center gap-2">
                        <TextInput
                          value={kgInput}
                          onChangeText={setKgInput}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#CBD5E1"
                          className="min-w-24 border-b-2 border-sky-400 pb-1 text-center text-5xl font-bold text-sky-500"
                          style={{ fontFamily: undefined }}
                          autoFocus
                        />
                        <Text className="mb-2 text-xl font-bold text-slate-400">kg</Text>
                      </View>
                    </View>

                    {/* Load breakdown */}
                    {kg > 0 && (
                      <View className="mb-4 gap-2 rounded-2xl bg-sky-50 p-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-slate-600">Loads charged</Text>
                          <Text className="text-sm font-bold text-slate-900">
                            {loads} load{loads !== 1 ? 's' : ''} × {formatPeso(qtyModal.price)}
                          </Text>
                        </View>
                        {remainderKg > 0 && (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-amber-600">Remainder</Text>
                            <Text className="text-sm font-bold text-amber-600">
                              {remainderKg} kg — add via Add-ons
                            </Text>
                          </View>
                        )}
                        <View className="flex-row items-center justify-between border-t border-sky-200 pt-2">
                          <Text className="text-sm font-bold text-slate-700">Subtotal</Text>
                          <Text className="text-base font-bold text-sky-600">
                            {formatPeso(subtotal)}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => setQtyModal(null)}
                        activeOpacity={0.8}
                        className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
                        <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (qtyModal && loads > 0) {
                            // Add to cart with loads as qty, store actual kg in unit label
                            addToCartLoad(qtyModal, loads, kg);
                            setQtyModal(null);
                          }
                        }}
                        disabled={!isValid || loads === 0}
                        activeOpacity={0.8}
                        className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${isValid && loads > 0 ? 'bg-sky-500' : 'bg-slate-200'}`}
                        style={{ flex: 2 }}>
                        <Check
                          size={16}
                          color={isValid && loads > 0 ? '#fff' : '#94A3B8'}
                          strokeWidth={2.5}
                        />
                        <Text
                          className={`text-sm font-bold ${isValid && loads > 0 ? 'text-white' : 'text-slate-400'}`}>
                          Add {loads > 0 ? `${loads} Load${loads !== 1 ? 's' : ''}` : 'to Cart'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()
            ) : (
              // ── Regular qty entry ─────────────────────────────────────
              <>
                <Text className="mb-1 text-center text-lg font-bold text-slate-900">
                  {qtyModal?.name}
                </Text>
                <Text className="mb-5 text-center text-sm text-slate-400">
                  Enter quantity in {qtyModal?.unit}
                </Text>
                <TextInput
                  value={qtyInput}
                  onChangeText={setQtyInput}
                  keyboardType="numeric"
                  className="mb-4 border-b-2 border-sky-400 pb-2 text-center text-5xl font-bold text-sky-500"
                  style={{ fontFamily: undefined }}
                  autoFocus
                />
                <Text className="mb-6 text-center text-sm text-slate-500">
                  Subtotal:{' '}
                  <Text className="font-bold text-sky-500">
                    {formatPeso((parseFloat(qtyInput) || 0) * (qtyModal?.price ?? 0))}
                  </Text>
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setQtyModal(null)}
                    activeOpacity={0.8}
                    className="flex-1 items-center rounded-2xl bg-slate-100 py-4">
                    <Text className="text-sm font-semibold text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (qtyModal) {
                        addToCart(qtyModal, parseFloat(qtyInput) || 1);
                        setQtyModal(null);
                      }
                    }}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4"
                    style={{ flex: 2 }}>
                    <Check size={16} color="#fff" strokeWidth={2.5} />
                    <Text className="text-sm font-bold text-white">Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Addon Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={addonModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setAddonModal(null);
          setShowCustomAddon(false);
          setCustomAddonName('');
          setCustomAddonPrice('');
        }}>
        <ModalSheet>
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3">
            <View>
              <Text className="text-lg font-bold text-slate-900">Add-ons</Text>
              {addonModal !== null && (
                <Text className="text-xs text-slate-400">{cart[addonModal]?.serviceName}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setAddonModal(null);
                setShowCustomAddon(false);
                setCustomAddonName('');
                setCustomAddonPrice('');
              }}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <X size={15} color="#64748B" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={addons}
            keyExtractor={(a) => a.id}
            contentContainerClassName="p-4 gap-3"
            showsVerticalScrollIndicator={false}
            renderItem={({ item: addon }) => {
              const selected =
                addonModal !== null &&
                !!cart[addonModal]?.addons.find((a) => a.addonId === addon.id);
              return (
                <TouchableOpacity
                  onPress={() => addonModal !== null && toggleAddon(addonModal, addon)}
                  activeOpacity={0.75}
                  className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${selected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-sky-100' : 'bg-slate-100'}`}>
                    <Sparkles
                      size={16}
                      color={selected ? '#0EA5E9' : '#94A3B8'}
                      strokeWidth={1.75}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-900">{addon.name}</Text>
                    <Text className="mt-0.5 text-xs text-slate-400">{addon.description}</Text>
                  </View>
                  <Text className="mr-2 text-sm font-bold text-sky-500">+₱{addon.price}</Text>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                    {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <View className="mt-2">
                {/* Divider + label */}
                <View className="mb-3 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-slate-200" />
                  <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Custom
                  </Text>
                  <View className="h-px flex-1 bg-slate-200" />
                </View>

                {!showCustomAddon ? (
                  // ── Tap to expand ──────────────────────────────────────
                  <TouchableOpacity
                    onPress={() => setShowCustomAddon(true)}
                    activeOpacity={0.75}
                    className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
                    <View className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      <Plus size={16} color="#94A3B8" strokeWidth={2} />
                    </View>
                    <Text className="text-sm font-semibold text-slate-400">Add custom add-on…</Text>
                  </TouchableOpacity>
                ) : (
                  // ── Custom addon form ──────────────────────────────────
                  <View className="gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <Text className="text-xs font-bold uppercase tracking-wider text-violet-700">
                      Custom Add-on
                    </Text>

                    {/* Name */}
                    <View>
                      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Name *
                      </Text>
                      <TextInput
                        value={customAddonName}
                        onChangeText={setCustomAddonName}
                        placeholder="e.g. Extra kg, Special treatment"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-violet-200 bg-white px-3 py-3 text-sm text-slate-800"
                        autoFocus
                      />
                    </View>

                    {/* Price */}
                    <View>
                      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Price (₱) *
                      </Text>
                      <TextInput
                        value={customAddonPrice}
                        onChangeText={setCustomAddonPrice}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-violet-200 bg-white px-3 py-3 text-sm text-slate-800"
                      />
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomAddon(false);
                          setCustomAddonName('');
                          setCustomAddonPrice('');
                        }}
                        className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-3">
                        <Text className="text-xs font-semibold text-slate-500">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const name = customAddonName.trim();
                          const price = parseFloat(customAddonPrice);
                          if (!name || !price || price <= 0) return;
                          if (addonModal !== null) {
                            addCustomAddon(addonModal, name, price);
                          }
                          setShowCustomAddon(false);
                          setCustomAddonName('');
                          setCustomAddonPrice('');
                        }}
                        disabled={!customAddonName.trim() || !(parseFloat(customAddonPrice) > 0)}
                        activeOpacity={0.85}
                        className={`flex-row items-center justify-center gap-1.5 rounded-xl py-3 ${
                          customAddonName.trim() && parseFloat(customAddonPrice) > 0
                            ? 'bg-violet-500'
                            : 'bg-slate-200'
                        }`}
                        style={{ flex: 2 }}>
                        <Check
                          size={13}
                          color={
                            customAddonName.trim() && parseFloat(customAddonPrice) > 0
                              ? '#fff'
                              : '#94A3B8'
                          }
                          strokeWidth={2.5}
                        />
                        <Text
                          className={`text-xs font-bold ${customAddonName.trim() && parseFloat(customAddonPrice) > 0 ? 'text-white' : 'text-slate-400'}`}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Show already added custom addons for this cart item */}
                {addonModal !== null &&
                  cart[addonModal]?.addons
                    .filter((a) => a.addonId.startsWith('custom-'))
                    .map((a) => (
                      <View
                        key={a.addonId}
                        className="mt-2 flex-row items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                          <Sparkles size={16} color="#7C3AED" strokeWidth={1.75} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-violet-900">
                            {a.addonName}
                          </Text>
                          <Text className="text-xs text-violet-400">Custom</Text>
                        </View>
                        <Text className="mr-2 text-sm font-bold text-violet-600">
                          +{formatPeso(a.price)}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setCart((p) =>
                              p.map((item, i) =>
                                i === addonModal
                                  ? {
                                      ...item,
                                      addons: item.addons.filter((ad) => ad.addonId !== a.addonId),
                                    }
                                  : item
                              )
                            )
                          }
                          className="h-6 w-6 items-center justify-center rounded-full bg-red-100">
                          <X size={11} color="#EF4444" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))}
              </View>
            }
          />
        </ModalSheet>
      </Modal>
    </View>
  );
}
