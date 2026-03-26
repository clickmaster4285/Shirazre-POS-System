import { useState } from 'react';
import { Shield, User, Eye, EyeOff } from 'lucide-react';

type Role = 'admin' | 'cashier' | 'waiter';

interface StaffMember {
  id: string;
  name: string;
  role: Role;
  email: string;
  active: boolean;
}

const initialStaff: StaffMember[] = [
  { id: '1', name: 'Admin User', role: 'admin', email: 'admin@Shiraz Restaurant.com', active: true },
  { id: '2', name: 'John Cashier', role: 'cashier', email: 'john@Shiraz Restaurant.com', active: true },
  { id: '3', name: 'Sarah Waiter', role: 'waiter', email: 'sarah@Shiraz Restaurant.com', active: true },
  { id: '4', name: 'Mike Waiter', role: 'waiter', email: 'mike@Shiraz Restaurant.com', active: false },
];

const roleAccess: Record<Role, string[]> = {
  admin: ['Dashboard', 'POS', 'Orders', 'Tables', 'Kitchen', 'Billing', 'Menu', 'Reports', 'Users'],
  cashier: ['POS', 'Orders', 'Billing'],
  waiter: ['POS', 'Orders', 'Tables'],
};

const roleBadge: Record<Role, string> = {
  admin: 'bg-primary/10 text-primary',
  cashier: 'bg-success/10 text-success',
  waiter: 'bg-warning/10 text-warning',
};

export default function UserRoles() {
  const [staff] = useState<StaffMember[]>(initialStaff);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">User Roles</h1>
        <p className="text-sm text-muted-foreground">Manage staff access and permissions.</p>
      </div>

      {/* Role overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        {(['admin', 'cashier', 'waiter'] as Role[]).map(role => (
          <div key={role} className="pos-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground capitalize">{role}</p>
                <p className="text-xs text-muted-foreground">{staff.filter(s => s.role === role).length} staff</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {roleAccess[role].map(a => (
                <span key={a} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Staff table */}
      <div className="pos-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 px-2 font-medium">Name</th>
              <th className="py-3 px-2 font-medium">Email</th>
              <th className="py-3 px-2 font-medium">Role</th>
              <th className="py-3 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-border/50 last:border-0">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{s.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-muted-foreground">{s.email}</td>
                <td className="py-3 px-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleBadge[s.role]}`}>{s.role}</span>
                </td>
                <td className="py-3 px-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
