# LaundryMate POS — Optimization Roadmap

> Generated 2026-09-07 — covers completed high-ROI work and remaining medium/low items so you can resume.

## 1. Completed — High Priority (5 ROIs + hotfixes)

### DB — `src/db/index.ts`
* `src/db/index.ts:122` added indexes `idx_services_active_cat`, `idx_customers_name`, `idx_orders_status_created`, `idx_orders_pickup_status`, `idx_order_addons_order`
* `src/db/index.ts:185` split `buildOrder` → `mapOrderRow` + `buildOrdersBatch` (single `LEFT JOIN order_addons` + GROUP BY vs 300 queries)
* `src/db/index.ts:373` `dbGetOrders()` now `buildOrdersBatch`, added `dbGetRecentOrders(limit=5)` `SELECT ... LIMIT 5` and `dbGetOrdersPaginated({status,limit,offset})`
* `src/db/index.ts:385` `dbGetOrdersByCustomer` → `buildOrdersBatch`
* `src/db/index.ts:393` `dbInsertOrder` → `db.withTransactionAsync` with customer stats inside same tx
* `src/db/index.ts:529` `dbGetDashboardStats` 8 `getFirstAsync` → `Promise.all([...])`

### App startup — `App.tsx` / `app.json`
* `app.json:16` `assetBundlePatterns:["**/*"]` → `["assets/*","assets/**/*"]` (cuts ~15MB binary)
* `app.json:37` `updates.fallbackToCacheTimeout:0`→`5000`, `checkAutomatically:"ON_LOAD"`→`"ON_ERROR_RECOVERY"`, `runtimeVersion:"appVersion"`→`"fingerprint"`
* `App.tsx:2` added `expo-splash-screen@31.0.13` (`npx expo install expo-splash-screen`), `SplashScreen.preventAutoHideAsync()` + `onLayoutRootView` hide after `initDatabase()` (no white flash)

### Navigation re-renders
* `src/auth/AuthContext.tsx:4,155` `useMemo` for `value={{user,isLocked,...}}` with deps `[user,isLocked,ownerPinSet,staffPinSet,unlock,lock,savePin,removePin,resetInactivity]`
* `src/navigation/tabs/AppTabBar.tsx:6,46` `React.memo(AppTabBar)`, `getFocusedRouteNameFromRoute` hide on `Settings|ExpensesMain|DBBrowser`, guarded `StackActions.popToTop()` only when `prevState.routes.length>1`
* `src/navigation/RootNavigator.tsx:31` `popToTopOnBlur:true` + `AppTabBar.tsx:75` focused-tab `navigate(...,{screen:initial})`

### Filters / memoization
* `src/screens/orders/OrdersScreen.tsx:1,25,97` `OrderCard=React.memo`, `filtered+countMap` via `useMemo([orders,search,activeTab])`, `countFor/renderOrderCard` via `useCallback`
* `src/screens/customers/CustomersScreen.tsx:1,55` `filtered` → `useMemo`, extracted `renderCustomer` `useCallback`
* `src/screens/dashboard/DashboardScreen.tsx:25,36,64,106` `StatCard`/`OrderRow` → `React.memo`, `load` uses `dbGetRecentOrders(5)` not `dbGetOrders().slice(0,5)`
* `src/screens/reports/ReportsScreen.tsx:1,38,105` `daily/svcBreakdown/expBreakdown/netProfit` single `useMemo([orders,expenses,period])` + `if(loading)` after memo

### FlatList virtualization
* `src/screens/orders/OrdersScreen.tsx:177` `initialNumToRender=12`, `maxToRenderPerBatch=10`, `windowSize=5`, `removeClippedSubviews`, `getItemLayout`
* `src/screens/customers/CustomersScreen.tsx:133` same + `keyboardShouldPersistTaps="handled"`

### Expo / Babel / TS / Hooks hotfixes
* `package.json:18,20` `expo@54.0.33→~54.0.37`, `expo-updates@29.0.16→~29.0.20` (`npx expo install --fix` + `npm dedupe` for `expo-font` duplicate) — `npx expo-doctor` 18/18 now
* `babel.config.js:8` missing top-level `babel-preset-expo@54.0.12` → `npm install -D babel-preset-expo@~54.0.12`
* `tsconfig.json:3` added explicit `"jsx":"react-jsx"`, `"jsxImportSource":"nativewind"` (fixes `--jsx` not set for `src/auth/AuthContext.tsx:46`, `App.tsx:2`, etc.)
* `src/screens/DBBrowser/DBBrowserScreen.tsx:363` / `src/screens/expenses/ExpensesScreen.tsx:26` / `src/screens/reports/ReportsScreen.tsx:38` fixed conditional hooks (`useCallback`/`useFocusEffect`/`useMemo` after `if(role) return null` / `if(loading) return`)
* `src/screens/dashboard/DashboardScreen.tsx:209` `Today's`→`Today&apos;s`, `src/screens/neworder/NewOrderScreen.tsx:987` `customer's`→`customer&apos;s`, `src/screens/settings/SettingsScreen.tsx:862,1025` `Tap "Add"`→`Tap &quot;Add&quot;` — `react/no-unescaped-entities` 0 errors
* SVG migration: removed emoji `👑|👷|📱|⚠️` (`src/screens/dashboard/DashboardScreen.tsx:158`, `src/screens/DBBrowser/DBBrowserScreen.tsx:380`, `src/screens/neworder/NewOrderScreen.tsx:1005`) → `Crown|HardHat|Smartphone|AlertTriangle`, and `→` text arrows → `ArrowRight` SVG (`src/screens/neworder/NewOrderScreen.tsx:474,588,668,764`, `src/screens/auth/PinScreen.tsx:144`)

## 2. Remaining — Medium Priority

| Area | File:Line | Issue | Suggested Fix |
|------|-----------|-------|---------------|
| Bundle | `package.json:22` | `nativewind:"latest"` unpinned | Pin `4.2.2` (today) or `^4.2.1` |
| Bundle | `package.json:24,30` | `react-dom`+`react-native-web` (~180kB) web-only | If web not shipped: remove, keep `platforms:["ios","android"]` |
| Bundle | `package.json:21` | `lucide-react-native` barreled import (600 icons) | Per-icon `import Home from 'lucide-react-native/src/icons/Home'` or `babel-plugin-import` |
| Bundle | `package.json:29` | `react-native-svg@15.12.1` loose | Pin `~15.12.0` |
| Bundle | `package.json:26` | `reanimated@4.1.1`+`worklets` heavy, only `PinScreen.tsx:58` uses `Animated` | Remove or migrate shake to `useSharedValue/withSequence` |
| Navigation | `src/navigation/RootNavigator.tsx:23` | `if(isLocked) return <PinScreen/>` unmounts 5 stacks, loses state | Root `createNativeStackNavigator` with `Stack.Screen name="App" component={TabNavigator}` and `Stack.Screen name="Auth"`, gate via `navigation.navigate` |
| Lists | `src/screens/expenses/ExpensesScreen.tsx:129` | `ListHeaderComponent` inline object | `const header=useMemo(()=>..., [catBreakdown])` + pass `ListHeaderComponent={header}` |
| Lists | `src/screens/settings/SettingsScreen.tsx:852,1015` | `ServicesTab`/`AddonsTab` FlatLists no `windowSize`/`getItemLayout` | Add `windowSize=5`, `initialNumToRender=10`, `renderItem=useCallback` |
| Lists | `src/screens/neworder/NewOrderScreen.tsx:508` | `ScrollView flex-wrap` for services grid (no recycling) | `FlatList data={visibleServices} numColumns={2} columnWrapperStyle={{gap:8}}` + `getItemLayout` |
| Lists | `src/screens/reports/ReportsScreen.tsx:212` | Bar chart `ScrollView` maps `daily` without `FlatList` | `FlatList horizontal data={daily}` + `useWindowDimensions` for `BAR_W` |
| Common | `src/components/common/index.tsx:27,76,107,309` | `Card` shadow object, `Btn` variantStyles, `Avatar`, `ToggleSwitch` inline `onPress` | `React.memo`, `StyleSheet.create`, `useCallback` |
| Auth | `src/auth/AuthContext.tsx:70,96` | `AppState` lock timer not cleared on unmount, `resetInactivity` dep `user` churn | Add `clearLockTimer()` in cleanup, use `useRef` for `user` inside `resetInactivity` |
| Settings | `src/db/index.ts:335` | `LIKE '%q%'` full scan despite `idx_customers_phone` | FTS5 or prefix `LIKE ?||'%'` |
| Updates | `src/db/index.ts:518` | `dbSetSetting` 5 sequential awaits in `SettingsScreen.tsx:465` | `Promise.all([...dbSetSetting])` or tx |

## 3. Remaining — Low Priority

| Area | File:Line | Issue | Fix |
|------|-----------|-------|-----|
| Config | `metro.config.js:1` | No `unstable_enablePackageExports`, no hermes minifier | Add `config.resolver.unstable_enablePackageExports=true` |
| Config | `tailwind.config.js:3` | Dead glob `./components/**/*` | Fix to `["./App.tsx","./src/**/*.{ts,tsx}"]` + `safelist` |
| Config | `app.json:31` | Deprecated `experiments.tsconfigPaths` | Remove, add `babel-plugin-module-resolver` |
| Lint | `src/screens/*` | Many `react-hooks/exhaustive-deps` warnings | Add `eslint-plugin-react-hooks` rules, fix deps |
| Types | `src/db/index.ts:150` | `any` row mappers | Typed `ServiceRow` interfaces with `getAllAsync<ServiceRow>` |
| Utils | `src/utils/index.ts:74` | `formatRelativeTime` per render no memo | Throttle or `useMemo` |

## 4. Verify Commands

```bash
npx tsc --noEmit          # 0 errors
npx expo-doctor            # 18/18
npx expo install --check   # up to date (expo@54.0.37, expo-updates@29.0.20)
npx eslint "src/**/*.{ts,tsx}"  # 0 errors after hooks fix (36 warnings remaining)
npx expo export            # iOS 3.64MB, Android 3.65MB HBC, assets 925kB
npm ls babel-preset-expo   # 54.0.12 deduped
npm start                  # expo start --clear
```

## 5. Next Steps (suggested order)

1. **Root navigator** (`src/navigation/RootNavigator.tsx:23`) — preserve tab state on lock
2. **`nativewind` pin + optional `react-dom` removal** (`package.json:22,24`)
3. **Remaining FlatLists** (`NewOrderScreen.tsx:508`, `SettingsScreen.tsx:852`, `ExpensesScreen.tsx:129`)
4. **`src/components/common` memo** (`index.tsx:27`)
5. **Metro/Tailwind config cleanup**
