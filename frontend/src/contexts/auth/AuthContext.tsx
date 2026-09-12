import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, setToken } from '@/lib/api/api';
import { fetchAllPaginatedItems } from '@/lib/api/paginatedFetch';
import { POS_REALTIME_EVENT } from '@/hooks/pos/use-pos-realtime';

export type Role = string;

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  cashier: 'Cashier',
  store_manager: 'Store Manager',
};

export interface RoleInfo {
  role: string;
  label: string;
  builtIn: boolean;
}

export const MANAGER_ROLES: Role[] = ['superadmin'];
export const BUILTIN_ROLES: string[] = ['superadmin', 'cashier', 'store_manager'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export type PageKey =
  | 'dashboard'
  | 'terminal'
  | 'orders'
  | 'tables'
  | 'kitchen'
  | 'billing'
  | 'menu'
  | 'recipes'
  | 'reports'
  | 'users'
  | 'inventory'
  | 'hr'
  | 'delivery'
  | 'analytics'
  | 'expenses'
  | 'printers'
  | 'postabs'
  | 'giftcards'
  | 'fbr'
  | 'tax'
  | 'payment'
  | 'mobileapp'
  | 'outdoordelivery'
  | 'staffbills';

export type ActionKey =
  | 'apply_discount'
  | 'void_order'
  | 'edit_menu'
  | 'print_bill'
  | 'hold_order'
  | 'change_table_status'
  | 'delete_order'
  | 'revert_order';

export type DataKey = 'view_revenue' | 'view_all_orders' | 'view_reports' | 'view_staff';

export interface RolePermissions {
  pageAccess: PageKey[];
  actionPermissions: ActionKey[];
  dataVisibility: DataKey[];
  /** Max discount in % a role may apply. 0 = no discount. Superadmin bypasses. */
  discountLimit?: number;
  /** Display name for the role (from backend). */
  label?: string;
  /** Whether this is a system role that cannot be deleted. */
  builtIn?: boolean;
}

export type PermissionsConfig = Record<string, RolePermissions>;

const ALL_PAGE_KEYS: PageKey[] = [
  'dashboard',
  'terminal',
  'orders',
  'tables',
  'kitchen',
  'billing',
  'menu',
  'recipes',
  'reports',
  'users',
  'inventory',
  'hr',
  'delivery',
  'analytics',
  'expenses',
  'printers',
  'postabs',
  'giftcards',
  'fbr',
  'tax',
  'payment',
  'mobileapp',
  'outdoordelivery',
  'staffbills',
];

const MANAGER_ACTIONS: ActionKey[] = [
  'apply_discount',
  'void_order',
  'edit_menu',
  'print_bill',
  'hold_order',
  'change_table_status',
  'delete_order',
  'revert_order',
];

const MANAGER_DATA: DataKey[] = ['view_revenue', 'view_all_orders', 'view_reports', 'view_staff'];

const DEFAULT_PERMISSIONS: PermissionsConfig = {
  superadmin: {
    label: 'Superadmin',
    builtIn: true,
    pageAccess: [...ALL_PAGE_KEYS],
    actionPermissions: [...MANAGER_ACTIONS],
    dataVisibility: [...MANAGER_DATA],
    discountLimit: 100,
  },
  cashier: {
    label: 'Cashier',
    builtIn: true,
    pageAccess: ['terminal', 'orders', 'tables', 'billing', 'delivery', 'giftcards'],
    actionPermissions: ['print_bill', 'apply_discount', 'hold_order', 'change_table_status'],
    dataVisibility: ['view_all_orders'],
    discountLimit: 5,
  },
  store_manager: {
    label: 'Store Manager',
    builtIn: true,
    pageAccess: ['dashboard', 'terminal', 'orders', 'tables', 'kitchen', 'billing', 'inventory', 'reports', 'expenses', 'delivery', 'outdoordelivery'],
    actionPermissions: ['print_bill', 'apply_discount', 'hold_order', 'change_table_status', 'edit_menu'],
    dataVisibility: ['view_all_orders', 'view_reports', 'view_staff'],
    discountLimit: 10,
  },
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function migrateRole(r: string): Role {
  const map: Record<string, string> = {
    admin: 'superadmin',
    superadmin: 'superadmin',
    cashier: 'cashier',
    store_manager: 'store_manager',
    manager: 'store_manager',
  };
  return (map[r] ?? r) || 'cashier';
}

function upgradeLegacyUser(u: User): User {
  const normalizedEmail = normalizeEmail(u.email);
  const role = migrateRole(u.role as string);

  if (
    role === 'superadmin' &&
    (normalizedEmail === 'admin@gmail.com' ||
      normalizedEmail === 'admin@shiraz.com' ||
      u.name === 'Admin User')
  ) {
    return {
      ...u,
      name: 'Superadmin',
      email: 'superadmin@gmail.com',
      role,
    };
  }

  return { ...u, email: normalizedEmail, role };
}

function normalizeUsers(input: User[]): User[] {
  return input.map(u => upgradeLegacyUser(u));
}

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Superadmin', email: 'superadmin@gmail.com', role: 'superadmin', avatar: '' },
  { id: '4', name: 'Cashier', email: 'cashier@gmail.com', role: 'cashier', avatar: '' },
];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function prettifyRole(role: string): string {
  if (!role) return 'Unknown Role';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function roleLabel(role: string, permissions?: PermissionsConfig): string {
  const saved = permissions?.[role];
  if (saved?.label) return saved.label;
  return ROLE_LABELS[role] ?? prettifyRole(role);
}

function mergeRolePermissions(base: RolePermissions, saved?: Partial<RolePermissions> | null): RolePermissions {
  if (!saved?.pageAccess?.length) return { ...base, label: saved?.label || base.label, builtIn: base.builtIn ?? true };
  const extraPages = base.pageAccess.filter(p => !saved.pageAccess!.includes(p));
  const extraActions = base.actionPermissions.filter(a => !(saved.actionPermissions ?? []).includes(a));
  const extraData = base.dataVisibility.filter(d => !(saved.dataVisibility ?? []).includes(d));
  return {
    pageAccess: uniq([...saved.pageAccess, ...extraPages]) as PageKey[],
    actionPermissions: uniq([...(saved.actionPermissions ?? []), ...extraActions]) as ActionKey[],
    dataVisibility: uniq([...(saved.dataVisibility ?? []), ...extraData]) as DataKey[],
    discountLimit: typeof saved.discountLimit === 'number' ? saved.discountLimit : base.discountLimit,
    label: saved.label || base.label || '',
    builtIn: base.builtIn ?? true,
  };
}

function migratePermissionsFromStorage(parsed: Record<string, RolePermissions>): PermissionsConfig {
  const remapped: Record<string, RolePermissions> = { ...parsed };
  if (parsed.admin && !parsed.superadmin) {
    remapped.superadmin = parsed.admin;
    delete remapped.admin;
  }

  // Start from backend truth, then fold built-in defaults over the 3 system roles.
  const out: PermissionsConfig = { ...remapped };
  for (const role of BUILTIN_ROLES) {
    const saved = remapped[role];
    out[role] = mergeRolePermissions(DEFAULT_PERMISSIONS[role], saved);
  }
  // Ensure custom roles carry a label + non-builtIn flag.
  for (const role of Object.keys(out)) {
    if (BUILTIN_ROLES.includes(role)) continue;
    out[role] = {
      ...out[role],
      label: out[role].label || prettifyRole(role),
      builtIn: out[role].builtIn === true,
      pageAccess: Array.isArray(out[role].pageAccess) ? out[role].pageAccess : [],
      actionPermissions: Array.isArray(out[role].actionPermissions) ? out[role].actionPermissions : [],
      dataVisibility: Array.isArray(out[role].dataVisibility) ? out[role].dataVisibility : [],
      discountLimit: typeof out[role].discountLimit === 'number' ? out[role].discountLimit : 0,
    };
  }
  return out;
}

function orderRoles(config: PermissionsConfig): RoleInfo[] {
  const rank = (role: string) => {
    if (role === 'superadmin') return 0;
    if (config[role]?.builtIn) return 1;
    return 2;
  };
  return Object.keys(config)
    .sort((a, b) => rank(a) - rank(b) || roleLabel(a, config).localeCompare(roleLabel(b, config)))
    .map(role => ({ role, label: roleLabel(role, config), builtIn: config[role]?.builtIn === true }));
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  users: User[];
  permissions: PermissionsConfig;
  roles: RoleInfo[];
  roleLabel: (role: string) => string;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  hasPageAccess: (page: PageKey) => boolean;
  hasAction: (action: ActionKey) => boolean;
  hasDataAccess: (data: DataKey) => boolean;
  updatePermissions: (config: PermissionsConfig) => Promise<void>;
  createRole: (roleKey: string, label: string, config: Partial<RolePermissions>) => Promise<void>;
  deleteRole: (roleKey: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>, password: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<Omit<User, 'id'>> & { password?: string }) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  currentPermissions: RolePermissions | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LEGACY_STORAGE_KEYS = ['shirazre_user', 'shirazre_permissions', 'shirazre_users', 'shirazre_creds'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [permissions, setPermissions] = useState<PermissionsConfig>(DEFAULT_PERMISSIONS);

  const clearLegacyStorage = () => {
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const fetchSession = async () => {
    try {
      clearLegacyStorage();
      const me = await api<{ user: User; permissions: RolePermissions | null }>('/auth/me');
      setUser(upgradeLegacyUser(me.user));
      const all = await api<{ [key: string]: RolePermissions }>('/permissions');
      setPermissions(migratePermissionsFromStorage(all as Record<string, RolePermissions>));
      const uItems = await fetchAllPaginatedItems<User>(
        (page, limit) => `/users?page=${page}&limit=${limit}`,
        200
      );
      setUsers(normalizeUsers(uItems));
    } catch (error) {
      console.error('Session fetch failed:', error);
      // If no token, clear user and any legacy user data
      if (!localStorage.getItem('shirazre_token')) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSessionRef = useRef(fetchSession);
  fetchSessionRef.current = fetchSession;

  useEffect(() => {
    const onPosRealtime = (e: Event) => {
      const ce = e as CustomEvent<{ scopes?: string[] }>;
      const scopes = ce.detail?.scopes ?? [];
      if (!scopes.length) return;
      if (scopes.includes('all') || scopes.includes('users') || scopes.includes('permissions')) {
        void fetchSessionRef.current();
      }
    };
    window.addEventListener(POS_REALTIME_EVENT, onPosRealtime);
    return () => window.removeEventListener(POS_REALTIME_EVENT, onPosRealtime);
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const payload = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizeEmail(email), password }),
      });
      setToken(payload.token);
      setUser(upgradeLegacyUser(payload.user));
      await fetchSession();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid email or password';
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearLegacyStorage();
    setUsers(DEFAULT_USERS);
    setPermissions(DEFAULT_PERMISSIONS);
  };

  const currentPermissions = user ? permissions[user.role] ?? null : null;

  const rolePermsOf = (role: string): RolePermissions | undefined => permissions[role];

  const roleLabelOf = (role: string) => roleLabel(role, permissions);

  const hasPageAccess = (page: PageKey) => {
    if (!user) return false;
    if (MANAGER_ROLES.includes(user.role)) return true;
    return rolePermsOf(user.role)?.pageAccess.includes(page) ?? false;
  };

  const hasAction = (action: ActionKey) => {
    if (!user) return false;
    if (MANAGER_ROLES.includes(user.role)) return true;
    return rolePermsOf(user.role)?.actionPermissions.includes(action) ?? false;
  };

  const hasDataAccess = (data: DataKey) => {
    if (!user) return false;
    if (MANAGER_ROLES.includes(user.role)) return true;
    return rolePermsOf(user.role)?.dataVisibility.includes(data) ?? false;
  };

  const updatePermissions = async (config: PermissionsConfig) => {
    setPermissions(config);
    await api('/permissions', { method: 'PUT', body: JSON.stringify(config) });
  };

  const createRole = async (roleKey: string, label: string, config: Partial<RolePermissions>) => {
    await api('/permissions/roles', {
      method: 'POST',
      body: JSON.stringify({ role: roleKey, label, ...config }),
    });
    await fetchSession();
  };

  const deleteRole = async (roleKey: string) => {
    await api(`/permissions/roles/${encodeURIComponent(roleKey)}`, { method: 'DELETE' });
    await fetchSession();
  };

  const addUser = async (newUser: Omit<User, 'id'>, password: string) => {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: newUser.name,
        email: normalizeEmail(newUser.email),
        role: migrateRole(newUser.role),
        password,
      }),
    });
    await fetchSession();
  };

  const updateUser = async (id: string, updates: Partial<Omit<User, 'id'>> & { password?: string }) => {
    await api(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        email: updates.email ? normalizeEmail(updates.email) : undefined,
        role: updates.role ? migrateRole(updates.role) : undefined,
      }),
    });
    await fetchSession();
  };

  const removeUser = async (id: string) => {
    await api(`/users/${id}`, { method: 'DELETE' });
    await fetchSession();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      users,
      permissions,
      roles: orderRoles(permissions),
      roleLabel: roleLabelOf,
      login,
      logout,
      hasPageAccess,
      hasAction,
      hasDataAccess,
      updatePermissions,
      createRole,
      deleteRole,
      addUser,
      updateUser,
      removeUser,
      currentPermissions,
    }),
    [user, loading, users, permissions, currentPermissions]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

