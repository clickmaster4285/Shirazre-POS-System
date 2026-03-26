import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type PageKey } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';

interface Props {
  page: PageKey;
  children: React.ReactNode;
}

const pageToRoute: Record<PageKey, string> = {
  dashboard: '/pos',
  terminal: '/pos/terminal',
  orders: '/pos/orders',
  tables: '/pos/tables',
  kitchen: '/pos/kitchen',
  billing: '/pos/billing',
  menu: '/pos/menu',
  reports: '/pos/reports',
  users: '/pos/users',
  inventory: '/pos/inventory',
  hr: '/pos/hr',
  delivery: '/pos/delivery',
  analytics: '/pos/analytics',
};

const allPages: PageKey[] = ['dashboard', 'terminal', 'orders', 'tables', 'kitchen', 'billing', 'menu', 'reports', 'users', 'inventory', 'hr', 'delivery', 'analytics'];

export default function PageGuard({ page, children }: Props) {
  const { user, hasPageAccess, permissions } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/pos/login" replace />;

  if (!hasPageAccess(page)) {
    // If landing on default /pos route without dashboard access, redirect to first accessible page
    const firstAccessible = allPages.find(p => {
      if (user.role === 'admin') return true;
      return permissions[user.role].pageAccess.includes(p);
    });

    if (firstAccessible && pageToRoute[firstAccessible] !== location.pathname) {
      return <Navigate to={pageToRoute[firstAccessible]} replace />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-serif text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have permission to access this page. Contact your admin to update your role permissions.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
