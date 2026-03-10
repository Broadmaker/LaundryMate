// src/auth/AuthContext.tsx
// PIN-based auth with role support and auto-lock after 5 mins inactivity.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { dbGetSettings, dbSetSetting } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'staff';

export interface AuthUser {
  role: UserRole;
  label: string; // e.g. "Owner" | "Staff"
}

interface AuthContextValue {
  user: AuthUser | null;
  isLocked: boolean;
  ownerPinSet: boolean;
  staffPinSet: boolean;
  unlock: (pin: string) => Promise<'ok' | 'wrong' | 'no_pin'>;
  lock: () => void;
  savePin: (role: UserRole, pin: string) => Promise<void>;
  removePin: (role: UserRole) => Promise<void>;
  resetInactivity: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [ownerPinSet, setOwnerPinSet] = useState(false);
  const [staffPinSet, setStaffPinSet] = useState(false);

  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerPinRef = useRef<string | null>(null);
  const staffPinRef = useRef<string | null>(null);

  // Load PINs from DB on mount
  useEffect(() => {
    dbGetSettings().then((s) => {
      if (s.ownerPin) {
        ownerPinRef.current = String(s.ownerPin);
        setOwnerPinSet(true);
      }
      if (s.staffPin) {
        staffPinRef.current = String(s.staffPin);
        setStaffPinSet(true);
      }
    });
  }, []);

  // Auto-lock on app background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        scheduleLock(30_000); // 30s grace when backgrounded
      } else if (state === 'active') {
        clearLockTimer();
      }
    });
    return () => sub.remove();
  }, []);

  const clearLockTimer = () => {
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
  };

  const scheduleLock = (ms = AUTO_LOCK_MS) => {
    clearLockTimer();
    lockTimer.current = setTimeout(() => {
      setIsLocked(true);
      setUser(null);
    }, ms);
  };

  const resetInactivity = useCallback(() => {
    if (user) scheduleLock(); // only reset if logged in
  }, [user]);

  const lock = useCallback(() => {
    clearLockTimer();
    setIsLocked(true);
    setUser(null);
  }, []);

  const unlock = useCallback(async (pin: string): Promise<'ok' | 'wrong' | 'no_pin'> => {
    // No PINs set yet — let owner in automatically for first-time setup
    if (!ownerPinRef.current && !staffPinRef.current) {
      setUser({ role: 'owner', label: 'Owner' });
      setIsLocked(false);
      scheduleLock();
      return 'ok';
    }

    // Check owner first, then staff
    if (ownerPinRef.current && pin === ownerPinRef.current) {
      setUser({ role: 'owner', label: 'Owner' });
      setIsLocked(false);
      scheduleLock();
      return 'ok';
    }
    if (staffPinRef.current && pin === staffPinRef.current) {
      setUser({ role: 'staff', label: 'Staff' });
      setIsLocked(false);
      scheduleLock();
      return 'ok';
    }
    return 'wrong';
  }, []);

  const savePin = useCallback(async (role: UserRole, pin: string) => {
    const key = role === 'owner' ? 'ownerPin' : 'staffPin';
    await dbSetSetting(key as any, pin);
    if (role === 'owner') {
      ownerPinRef.current = pin;
      setOwnerPinSet(true);
    } else {
      staffPinRef.current = pin;
      setStaffPinSet(true);
    }
  }, []);

  const removePin = useCallback(async (role: UserRole) => {
    const key = role === 'owner' ? 'ownerPin' : 'staffPin';
    await dbSetSetting(key as any, '');
    if (role === 'owner') {
      ownerPinRef.current = null;
      setOwnerPinSet(false);
    } else {
      staffPinRef.current = null;
      setStaffPinSet(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLocked,
        ownerPinSet,
        staffPinSet,
        unlock,
        lock,
        savePin,
        removePin,
        resetInactivity,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
