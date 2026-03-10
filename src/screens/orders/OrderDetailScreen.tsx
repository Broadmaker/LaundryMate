// src/screens/orders/OrderDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Phone,
  MapPin,
  Navigation,
  Calendar,
  User,
  Truck,
  Check,
  X,
  RefreshCw,
  CheckCircle2,
  Package,
  Circle,
  CreditCard,
  Banknote,
} from 'lucide-react-native';

import { dbGetOrderById, dbUpdateOrderStatus } from '../../db';
import { formatPeso, formatDateTime, formatDate } from '../../utils';
import { StatusBadge, Card, Avatar, SectionLabel, Divider } from '../../components/common';
import { ORDER_STATUS_FLOW, DELIVERY_STATUS_CONFIG } from '../../constants';
import type { OrdersStackParams } from '../../navigation/types';
import type { Order } from '../../types';

type Nav = NativeStackNavigationProp<OrdersStackParams, 'OrderDetail'>;
type Route = RouteProp<OrdersStackParams, 'OrderDetail'>;

// ─── Timeline Row ─────────────────────────────────────────────────────────────

function TimelineRow({
  label,
  time,
  done,
  isLast,
}: {
  label: string;
  time: string | null;
  done: boolean;
  isLast: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <View className="w-5 items-center">
        <View
          className={`h-5 w-5 items-center justify-center rounded-full ${done ? 'bg-sky-500' : 'bg-slate-200'}`}>
          {done ? (
            <Check size={10} color="#fff" strokeWidth={2.5} />
          ) : (
            <Circle size={8} color="#94A3B8" strokeWidth={2} />
          )}
        </View>
        {!isLast && (
          <View className={`mt-1 min-h-4 w-0.5 flex-1 ${done ? 'bg-sky-300' : 'bg-slate-200'}`} />
        )}
      </View>
      <View className="pb-4">
        <Text className={`text-sm font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>
          {label}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-400">{time ? formatDateTime(time) : '—'}</Text>
      </View>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View className="mb-3 flex-row items-start gap-3">
      <View className="mt-0.5 h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={13} color="#64748B" strokeWidth={1.75} />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </Text>
        <Text className="text-sm leading-5 text-slate-700">{value}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dbGetOrderById(orderId).then((o) => {
        setOrder(o);
        setLoading(false);
      });
    }, [orderId])
  );

  const handleStatusUpdate = async (nextStatus: Order['status']) => {
    if (!order) return;
    const label =
      nextStatus === 'completed'
        ? 'Mark as Claimed'
        : nextStatus === 'ready'
          ? 'Mark as Ready'
          : 'Start Processing';
    Alert.alert(label, `Update this order to "${nextStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          const updated = await dbUpdateOrderStatus(order.id, nextStatus);
          if (updated) setOrder(updated);
          setUpdating(false);
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Order',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          const updated = await dbUpdateOrderStatus(order!.id, 'cancelled');
          if (updated) setOrder(updated);
          setUpdating(false);
        },
      },
    ]);
  };

  if (loading || !order) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-sm text-slate-400">Loading…</Text>
      </View>
    );
  }

  const nxt = ORDER_STATUS_FLOW[order.status];
  const addonTotal = order.items.reduce(
    (s, i) => s + i.addons.reduce((a, ad) => a + ad.price, 0),
    0
  );

  const timeline = [
    { label: 'Order Placed', time: order.createdAt, done: true },
    {
      label: 'Processing',
      time: order.status !== 'pending' ? order.updatedAt : null,
      done: ['processing', 'ready', 'completed'].includes(order.status),
    },
    {
      label: 'Ready for Pickup',
      time: order.readyAt,
      done: ['ready', 'completed'].includes(order.status),
    },
    { label: 'Completed', time: order.claimedAt, done: order.status === 'completed' },
  ];

  const PayIcon = order.paymentMethod === 'cash' ? Banknote : CreditCard;

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
            <Text className="text-lg font-bold text-slate-900">{order.id}</Text>
            <Text className="text-xs text-slate-400">Order Detail</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 pb-10 gap-3"
        showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <Card className="p-4">
          <SectionLabel title="Customer" className="mb-3" />
          <View className="flex-row items-center gap-3">
            <Avatar name={order.customerName} size="lg" />
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">{order.customerName}</Text>
              {order.customerPhone && (
                <View className="mt-1 flex-row items-center gap-1.5">
                  <Phone size={11} color="#94A3B8" strokeWidth={1.75} />
                  <Text className="text-xs text-slate-500">{order.customerPhone}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Services & Add-ons */}
        <Card className="p-4">
          <SectionLabel title="Services & Add-ons" className="mb-3" />
          {order.items.map((item, i) => (
            <View key={item.id}>
              <View className="flex-row items-start justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-sm font-semibold text-slate-800">{item.serviceName}</Text>
                  <Text className="mt-0.5 text-xs text-slate-400">
                    {item.qty} {item.unit} × {formatPeso(item.pricePerUnit)}
                  </Text>
                  {item.addons.length > 0 && (
                    <View className="mt-1.5 flex-row flex-wrap gap-1">
                      {item.addons.map((a) => (
                        <View
                          key={a.addonId}
                          className="flex-row items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5">
                          <Text className="text-xs font-semibold text-sky-700">{a.addonName}</Text>
                          <Text className="text-xs text-sky-500">+{formatPeso(a.price)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text className="text-sm font-bold text-slate-900">
                  {formatPeso(item.subtotal + item.addons.reduce((s, a) => s + a.price, 0))}
                </Text>
              </View>
              {i < order.items.length - 1 && <Divider className="my-3" />}
            </View>
          ))}

          <Divider className="mb-3 mt-3" />
          {/* Totals */}
          {addonTotal > 0 && (
            <View className="mb-1.5 flex-row justify-between">
              <Text className="text-xs text-slate-500">Add-ons</Text>
              <Text className="text-xs font-semibold text-sky-600">+{formatPeso(addonTotal)}</Text>
            </View>
          )}
          {order.isPickup && order.deliveryFee > 0 && (
            <View className="mb-1.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Truck size={11} color="#64748B" />
                <Text className="text-xs text-slate-500">Delivery Fee</Text>
              </View>
              <Text className="text-xs font-semibold text-slate-700">
                {formatPeso(order.deliveryFee)}
              </Text>
            </View>
          )}
          {order.discount > 0 && (
            <View className="mb-1.5 flex-row justify-between">
              <Text className="text-xs text-slate-500">Discount</Text>
              <Text className="text-xs font-semibold text-emerald-600">
                −{formatPeso(order.discount)}
              </Text>
            </View>
          )}
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-slate-900">Total</Text>
            <Text className="text-xl font-bold text-sky-500">{formatPeso(order.total)}</Text>
          </View>
        </Card>

        {/* Payment */}
        <Card className="p-4">
          <SectionLabel title="Payment" className="mb-3" />
          <View className="flex-row flex-wrap gap-4">
            {[
              {
                label: 'Method',
                value: order.paymentMethod?.replace('_', ' ').toUpperCase() ?? 'Unpaid',
              },
              { label: 'Amount Paid', value: formatPeso(order.amountPaid) },
              ...(order.change > 0 ? [{ label: 'Change', value: formatPeso(order.change) }] : []),
            ].map((item) => (
              <View key={item.label} className="min-w-24">
                <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </Text>
                <Text className="text-sm font-bold text-slate-800">{item.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Pickup & Delivery */}
        {order.isPickup && (
          <Card className="p-4">
            <SectionLabel title="Pickup & Delivery" className="mb-3" />
            {order.pickupAddress && (
              <InfoRow icon={MapPin} label="Pickup" value={order.pickupAddress} />
            )}
            {order.deliveryAddress && (
              <InfoRow icon={Navigation} label="Delivery" value={order.deliveryAddress} />
            )}
            {order.scheduledAt && (
              <InfoRow
                icon={Calendar}
                label="Scheduled"
                value={formatDateTime(order.scheduledAt)}
              />
            )}
            {order.driverName && <InfoRow icon={User} label="Driver" value={order.driverName} />}
            {order.deliveryStatus && (
              <View className="mt-1">
                <View
                  className="self-start rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: DELIVERY_STATUS_CONFIG[order.deliveryStatus]?.color + '20',
                  }}>
                  <Text
                    className="text-xs font-bold"
                    style={{ color: DELIVERY_STATUS_CONFIG[order.deliveryStatus]?.color }}>
                    {DELIVERY_STATUS_CONFIG[order.deliveryStatus]?.label}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Notes */}
        {order.notes ? (
          <Card className="p-4">
            <SectionLabel title="Notes" className="mb-2" />
            <Text className="text-sm leading-5 text-slate-600">{order.notes}</Text>
          </Card>
        ) : null}

        {/* Timeline */}
        <Card className="p-4">
          <SectionLabel title="Timeline" className="mb-3" />
          {timeline.map((t, i) => (
            <TimelineRow
              key={i}
              label={t.label}
              time={t.time}
              done={t.done}
              isLast={i === timeline.length - 1}
            />
          ))}
        </Card>

        {/* Actions */}
        {nxt && (
          <View className="gap-2">
            <TouchableOpacity
              onPress={() => handleStatusUpdate(nxt.next)}
              disabled={updating}
              activeOpacity={0.8}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4"
              style={{
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}>
              {nxt.next === 'processing' && <RefreshCw size={16} color="#fff" strokeWidth={2} />}
              {nxt.next === 'ready' && <CheckCircle2 size={16} color="#fff" strokeWidth={2} />}
              {nxt.next === 'completed' && <Package size={16} color="#fff" strokeWidth={2} />}
              <Text className="text-sm font-bold text-white">{nxt.label}</Text>
            </TouchableOpacity>
            {['pending', 'processing'].includes(order.status) && (
              <TouchableOpacity
                onPress={handleCancel}
                disabled={updating}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5">
                <X size={15} color="#EF4444" strokeWidth={2} />
                <Text className="text-sm font-semibold text-red-500">Cancel Order</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
