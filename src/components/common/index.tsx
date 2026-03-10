// src/components/common/index.tsx
// Shared reusable UI components — NativeWind styled

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OrderStatus } from '../../types';
import { ORDER_STATUS_CONFIG } from '../../constants';
import { getAvatarColor, getInitials } from '../../utils';

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  style?: object;
}

export function Card({ children, className = '', onPress, style }: CardProps) {
  const shadow = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        className={`rounded-2xl border border-slate-100 bg-white ${className}`}
        style={[shadow, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`rounded-2xl border border-slate-100 bg-white ${className}`}
      style={[shadow, style]}>
      {children}
    </View>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_CONFIG[status];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${cfg.bgClass}`}>
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dotColor }} />
      <Text className={`text-xs font-bold ${cfg.textClass}`}>{cfg.label}</Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const sizeMap = {
    sm: { outer: 'w-8 h-8 rounded-xl', text: 'text-xs font-bold' },
    md: { outer: 'w-10 h-10 rounded-xl', text: 'text-sm font-bold' },
    lg: { outer: 'w-12 h-12 rounded-2xl', text: 'text-base font-bold' },
  };
  const s = sizeMap[size];
  return (
    <View
      className={`${s.outer} flex-shrink-0 items-center justify-center`}
      style={{ backgroundColor: getAvatarColor(name) }}>
      <Text className={`${s.text} text-white`}>{getInitials(name)}</Text>
    </View>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  className?: string;
}

export function Btn({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled,
  loading,
  full,
  className = '',
}: BtnProps) {
  const variantStyles = {
    primary: { wrap: 'bg-sky-500 border-sky-500', text: 'text-white' },
    secondary: { wrap: 'bg-sky-50 border-sky-100', text: 'text-sky-600' },
    outline: { wrap: 'bg-white border-slate-200', text: 'text-slate-700' },
    danger: { wrap: 'bg-red-500 border-red-500', text: 'text-white' },
    ghost: { wrap: 'bg-transparent border-transparent', text: 'text-slate-500' },
    success: { wrap: 'bg-emerald-500 border-emerald-500', text: 'text-white' },
  }[variant];

  const sizeStyles = {
    sm: { wrap: 'px-3 py-2', text: 'text-xs font-semibold' },
    md: { wrap: 'px-4 py-2.5', text: 'text-sm font-semibold' },
    lg: { wrap: 'px-5 py-3.5', text: 'text-sm font-bold' },
  }[size];

  const spinnerColor = variant === 'outline' || variant === 'ghost' ? '#64748B' : '#ffffff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`
        flex-row items-center justify-center gap-1.5 rounded-xl border
        ${variantStyles.wrap} ${sizeStyles.wrap}
        ${full ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50' : ''}
        ${className}
      `}>
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text className={`${variantStyles.text} ${sizeStyles.text}`}>{label}</Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, icon, error, containerClassName = '', ...props }: InputProps) {
  return (
    <View className={`mb-3 ${containerClassName}`}>
      {label && (
        <Text className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center rounded-xl border bg-slate-50 px-3 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}>
        {icon && <View className="mr-2">{icon}</View>}
        <TextInput
          className="flex-1 py-3 text-sm text-slate-800"
          placeholderTextColor="#94A3B8"
          {...props}
        />
      </View>
      {error && <Text className="mt-1 text-xs text-red-500">{error}</Text>}
    </View>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

interface SectionLabelProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionLabel({ title, action, className = '' }: SectionLabelProps) {
  return (
    <View className={`mb-2 flex-row items-center justify-between ${className}`}>
      <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</Text>
      {action}
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return <View className={`h-px bg-slate-100 ${className}`} />;
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        {icon}
      </View>
      <Text className="mb-1 text-center text-base font-bold text-slate-700">{title}</Text>
      {subtitle && <Text className="text-center text-sm leading-5 text-slate-400">{subtitle}</Text>}
      {action && <View className="mt-4">{action}</View>}
    </View>
  );
}

// ─── ScreenHeader ─────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, left, right }: ScreenHeaderProps) {
  return (
    <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-3">
          {left}
          <View className="flex-1">
            <Text className="text-lg font-bold leading-tight text-slate-900">{title}</Text>
            {subtitle && <Text className="mt-0.5 text-xs text-slate-400">{subtitle}</Text>}
          </View>
        </View>
        {right && <View className="ml-2">{right}</View>}
      </View>
    </View>
  );
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#0EA5E9" />
      <Text className="mt-3 text-sm font-medium text-slate-400">Loading...</Text>
    </View>
  );
}

// ─── PesoText ─────────────────────────────────────────────────────────────────

interface PesoTextProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PesoText({ amount, className = '', size = 'md' }: PesoTextProps) {
  const sizeClass = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold',
    xl: 'text-3xl font-bold',
  }[size];

  const formatted =
    '₱' +
    Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return <Text className={`${sizeClass} ${className}`}>{formatted}</Text>;
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export function ToggleSwitch({ value, onChange }: ToggleSwitchProps) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      className={`h-6 w-11 justify-center rounded-full px-0.5 ${
        value ? 'bg-sky-500' : 'bg-slate-200'
      }`}>
      <View
        className={`h-5 w-5 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`}
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }}
      />
    </TouchableOpacity>
  );
}

// ─── ModalSheet ───────────────────────────────────────────────────────────────
// Wraps modal content with correct top safe-area padding (notch / status bar).
// Use this as the root View inside every <Modal> instead of a plain <View>.
//
// Usage:
//   <Modal visible={...} animationType="slide" presentationStyle="pageSheet">
//     <ModalSheet>
//       ... your modal content ...
//     </ModalSheet>
//   </Modal>

interface ModalSheetProps {
  children: React.ReactNode;
  className?: string;
  style?: object;
}

export function ModalSheet({ children, className = '', style }: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-white ${className}`}
      style={[{ paddingTop: insets.top > 0 ? insets.top : 16 }, style]}>
      {children}
    </View>
  );
}
