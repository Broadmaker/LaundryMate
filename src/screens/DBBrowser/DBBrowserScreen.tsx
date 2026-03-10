// src/screens/DBBrowser/DBBrowserScreen.tsx
//
// Developer tool — inspect every SQLite table, view raw rows,
// clear individual tables, and wipe + re-seed the whole database.
// Remove from navigation before shipping to production.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Database,
  Table2,
  RefreshCw,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Eye,
  Layers,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';

import { getDb } from '../../db';
import { TABLES } from '../../constants';
import { useAuth } from '../../auth/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableMeta {
  name: string;
  rowCount: number;
  columns: string[];
}

type RawRow = Record<string, any>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABLE_NAMES = Object.values(TABLES);

const TABLE_COLORS: Record<string, string> = {
  services: '#0EA5E9',
  addons: '#8B5CF6',
  customers: '#10B981',
  orders: '#F59E0B',
  order_items: '#F97316',
  order_addons: '#EF4444',
  expenses: '#64748B',
  settings: '#06B6D4',
};

async function fetchTableMeta(): Promise<TableMeta[]> {
  const db = await getDb();
  const result: TableMeta[] = [];

  for (const name of TABLE_NAMES) {
    const countRow = await db.getFirstAsync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM ${name}`);
    // Get column names from PRAGMA
    const colRows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${name})`);
    result.push({
      name,
      rowCount: countRow?.cnt ?? 0,
      columns: colRows.map((c) => c.name),
    });
  }
  return result;
}

async function fetchTableRows(tableName: string, limit = 50): Promise<RawRow[]> {
  const db = await getDb();
  return db.getAllAsync<RawRow>(`SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ?`, [limit]);
}

async function clearTable(tableName: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${tableName}`);
}

async function clearAllTables(): Promise<void> {
  const db = await getDb();
  // Delete in FK-safe order
  const ordered = [
    TABLES.order_addons,
    TABLES.order_items,
    TABLES.orders,
    TABLES.expenses,
    TABLES.customers,
    TABLES.settings,
    TABLES.addons,
    TABLES.services,
  ];
  for (const t of ordered) {
    await db.runAsync(`DELETE FROM ${t}`);
  }
}

// ─── Cell value renderer ─────────────────────────────────────────────────────

function cellValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string' && val.length > 40) return val.slice(0, 40) + '…';
  return String(val);
}

function cellColor(val: any): string {
  if (val === null || val === undefined) return '#94A3B8';
  if (typeof val === 'number') return '#0EA5E9';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return '#10B981';
  return '#1E293B';
}

// ─── Row Detail Modal ────────────────────────────────────────────────────────

function RowDetailModal({
  row,
  columns,
  tableName,
  onClose,
}: {
  row: RawRow;
  columns: string[];
  tableName: string;
  onClose: () => void;
}) {
  const color = TABLE_COLORS[tableName] ?? '#64748B';
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-slate-100 px-4 pb-3 pt-5">
          <View
            className="h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: color + '20' }}>
            <Eye size={15} color={color} strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900">Row Detail</Text>
            <Text className="text-xs text-slate-400">{tableName}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
            <X size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4" contentContainerClassName="gap-2 pb-10">
          {columns.map((col) => (
            <View key={col} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                {col}
              </Text>
              <Text
                className="break-all text-sm font-medium leading-5"
                style={{ color: cellColor(row[col]) }}>
                {row[col] === null || row[col] === undefined ? 'NULL' : String(row[col])}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Table Viewer Modal ───────────────────────────────────────────────────────

function TableViewerModal({
  meta,
  onClose,
  onCleared,
}: {
  meta: TableMeta;
  onClose: () => void;
  onCleared: () => void;
}) {
  const color = TABLE_COLORS[meta.name] ?? '#64748B';
  const [rows, setRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<RawRow | null>(null);

  useCallback(() => {
    fetchTableRows(meta.name).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [meta.name])();

  // Load on mount
  React.useEffect(() => {
    fetchTableRows(meta.name).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [meta.name]);

  const handleClear = () => {
    Alert.alert(
      `Clear "${meta.name}"`,
      `This will permanently delete all ${meta.rowCount} rows. Cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Table',
          style: 'destructive',
          onPress: async () => {
            await clearTable(meta.name);
            setRows([]);
            onCleared();
          },
        },
      ]
    );
  };

  // Determine which columns to show in the list (first 3 non-id cols)
  const previewCols = meta.columns
    .filter((c) => !['id', 'created_at', 'updated_at'].includes(c))
    .slice(0, 3);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-50">
        {/* Header */}
        <View className="border-b border-slate-100 bg-white px-4 pb-3 pt-12">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <ChevronLeft size={18} color="#334155" strokeWidth={2} />
            </TouchableOpacity>
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: color + '20' }}>
              <Table2 size={16} color={color} strokeWidth={1.75} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">{meta.name}</Text>
              <Text className="text-xs text-slate-400">
                {rows.length} of {meta.rowCount} rows · {meta.columns.length} cols
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClear}
              className="flex-row items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <Trash2 size={12} color="#EF4444" strokeWidth={2} />
              <Text className="text-xs font-bold text-red-500">Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Column names strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            <View className="flex-row gap-1.5">
              {meta.columns.map((col) => (
                <View
                  key={col}
                  className="rounded-lg px-2 py-1"
                  style={{ backgroundColor: color + '15' }}>
                  <Text className="text-xs font-bold" style={{ color }}>
                    {col}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={color} />
          </View>
        ) : rows.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Layers size={32} color="#CBD5E1" strokeWidth={1.5} />
            <Text className="text-sm text-slate-400">Table is empty</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(_, i) => String(i)}
            contentContainerClassName="px-4 pt-3 pb-6 gap-2"
            renderItem={({ item: row, index }) => (
              <TouchableOpacity
                onPress={() => setSelectedRow(row)}
                activeOpacity={0.75}
                className="rounded-2xl border border-slate-100 bg-white p-3"
                style={{
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                <View className="mb-2 flex-row items-center justify-between">
                  <View
                    className="rounded-md px-2 py-0.5"
                    style={{ backgroundColor: color + '15' }}>
                    <Text className="text-xs font-bold" style={{ color }}>
                      #{index + 1}
                    </Text>
                  </View>
                  <ChevronRight size={13} color="#94A3B8" />
                </View>
                {previewCols.map((col) => (
                  <View key={col} className="mb-0.5 flex-row items-start gap-2">
                    <Text className="w-24 flex-shrink-0 text-xs font-bold text-slate-400">
                      {col}
                    </Text>
                    <Text
                      className="flex-1 text-xs"
                      style={{ color: cellColor(row[col]) }}
                      numberOfLines={1}>
                      {cellValue(row[col])}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
            )}
          />
        )}

        {selectedRow && (
          <RowDetailModal
            row={selectedRow}
            columns={meta.columns}
            tableName={meta.name}
            onClose={() => setSelectedRow(null)}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DBBrowserScreen() {
  const nav = useNavigation();
  const { user } = useAuth();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TableMeta | null>(null);
  const [wiping, setWiping] = useState(false);

  // Hard guard — owner only
  React.useEffect(() => {
    if (user?.role !== 'owner') nav.goBack();
  }, [user]);

  if (user?.role !== 'owner') return null;

  const load = useCallback(async () => {
    setLoading(true);
    const meta = await fetchTableMeta();
    setTables(meta);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalRows = tables.reduce((s, t) => s + t.rowCount, 0);

  const handleWipeAll = () => {
    Alert.alert(
      '⚠️ Wipe Entire Database',
      'This will delete ALL data from every table — orders, customers, services, expenses, everything. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: async () => {
            setWiping(true);
            await clearAllTables();
            await load();
            setWiping(false);
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View className="border-b border-slate-100 bg-white px-4 pb-4 pt-12">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
              <Database size={18} color="#8B5CF6" strokeWidth={1.75} />
            </View>
            <View>
              <Text className="text-xl font-bold text-slate-900">DB Browser</Text>
              <Text className="text-xs text-slate-400">
                {TABLE_NAMES.length} tables · {totalRows} total rows
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            {/* Refresh */}
            <TouchableOpacity
              onPress={load}
              className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <RefreshCw size={15} color="#64748B" strokeWidth={1.75} />
            </TouchableOpacity>
            {/* Wipe all */}
            <TouchableOpacity
              onPress={handleWipeAll}
              disabled={wiping}
              className="flex-row items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2">
              {wiping ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Trash2 size={13} color="#fff" strokeWidth={2} />
              )}
              <Text className="text-xs font-bold text-white">Wipe All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dev warning banner */}
        <View className="mt-3 flex-row items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle size={13} color="#D97706" strokeWidth={2} />
          <Text className="flex-1 text-xs font-semibold text-amber-700">
            Developer tool — remove from navigation before release
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="mt-3 text-sm text-slate-400">Reading database…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4 gap-3 pb-10"
          showsVerticalScrollIndicator={false}>
          {/* Summary row */}
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: 'Tables', value: TABLE_NAMES.length, color: '#8B5CF6' },
              { label: 'Total Rows', value: totalRows, color: '#0EA5E9' },
              { label: 'DB File', value: 'laundrymate.db', color: '#10B981' },
            ].map((stat) => (
              <View
                key={stat.label}
                className="flex-1 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                style={{ minWidth: 100 }}>
                <Text className="text-lg font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </Text>
                <Text className="mt-0.5 text-xs font-semibold text-slate-400">{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Table cards */}
          {tables.map((table) => {
            const color = TABLE_COLORS[table.name] ?? '#64748B';
            return (
              <TouchableOpacity
                key={table.name}
                onPress={() => setSelected(table)}
                activeOpacity={0.75}
                className="rounded-2xl border border-slate-100 bg-white p-4"
                style={{
                  shadowColor: '#0F172A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                <View className="flex-row items-center gap-3">
                  {/* Icon */}
                  <View
                    className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: color + '18' }}>
                    <Table2 size={18} color={color} strokeWidth={1.75} />
                  </View>

                  {/* Info */}
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-900">{table.name}</Text>
                    <Text className="mt-0.5 text-xs text-slate-400">
                      {table.columns.length} columns
                    </Text>
                    {/* Column names */}
                    <Text className="mt-1 text-xs text-slate-300" numberOfLines={1}>
                      {table.columns.join(' · ')}
                    </Text>
                  </View>

                  {/* Row count + arrow */}
                  <View className="items-end gap-1.5">
                    <View
                      className="rounded-xl px-2.5 py-1"
                      style={{ backgroundColor: color + '15' }}>
                      <Text className="text-sm font-bold" style={{ color }}>
                        {table.rowCount}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-400">rows</Text>
                  </View>
                  <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Table viewer modal */}
      {selected && (
        <TableViewerModal
          meta={selected}
          onClose={() => setSelected(null)}
          onCleared={() => {
            // Refresh row count in the list without closing modal
            setTables((prev) =>
              prev.map((t) => (t.name === selected.name ? { ...t, rowCount: 0 } : t))
            );
          }}
        />
      )}
    </View>
  );
}
