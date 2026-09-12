import { useState } from 'react';
import { useAuth, type Role, type PageKey, type ActionKey, type DataKey, type PermissionsConfig, type RolePermissions } from '@/contexts/auth/AuthContext';
import { Shield, User, Plus, Trash2, X, Save, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const ALL_PAGES: { key: PageKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'terminal', label: 'POS Terminal' },
  { key: 'orders', label: 'Orders' },
  { key: 'tables', label: 'Tables' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'billing', label: 'Billing' },
  { key: 'menu', label: 'Menu Management' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'User Management' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'hr', label: 'HR Management' },
  { key: 'delivery', label: 'Delivery Tracking' },
  { key: 'analytics', label: 'Sales Analytics' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'printers', label: 'Printers (×3)' },
  { key: 'postabs', label: 'POS tabs (×3)' },
  { key: 'giftcards', label: 'Gift & loyalty' },
  { key: 'fbr', label: 'FBR POS' },
  { key: 'tax', label: 'Tax details' },
  { key: 'mobileapp', label: 'Mobile app' },
  { key: 'outdoordelivery', label: 'Outdoor delivery report' },
  { key: 'staffbills', label: 'Staff Bills' },
];

const ALL_ACTIONS: { key: ActionKey; label: string }[] = [
  { key: 'apply_discount', label: 'Apply Discounts' },
  { key: 'void_order', label: 'Void / Cancel Orders' },
  { key: 'delete_order', label: 'Delete Orders (permanent)' },
  { key: 'revert_order', label: 'Revert Completed/Cancelled Orders' },
  { key: 'edit_menu', label: 'Edit Menu Items' },
  { key: 'print_bill', label: 'Print Bills' },
  { key: 'hold_order', label: 'Hold Orders' },
  { key: 'change_table_status', label: 'Change Table Status' },
];

const ALL_DATA: { key: DataKey; label: string }[] = [
  { key: 'view_revenue', label: 'View Revenue Data' },
  { key: 'view_all_orders', label: 'View All Orders' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'view_staff', label: 'View Staff Info' },
];

const BADGES: Record<string, string> = {
  superadmin: 'bg-primary/10 text-primary',
  store_manager: 'bg-amber-100/50 text-amber-700',
  cashier: 'bg-success/10 text-success',
};

const roleBadge = (role: string) => BADGES[role] ?? 'bg-sky-100/50 text-sky-700';

const ROLE_SLUG = /^[a-zA-Z][a-zA-Z0-9_]{1,31}$/;

export default function PermissionManagement() {
  const {
    users,
    permissions,
    roles,
    roleLabel,
    updatePermissions,
    createRole,
    deleteRole,
    addUser,
    updateUser,
    removeUser,
    user: currentUser,
  } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [draft, setDraft] = useState<RolePermissions | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'cashier' as Role });
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editUserData, setEditUserData] = useState({ name: '', email: '', password: '', role: 'cashier' as Role });
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState({ key: '', label: '', discountLimit: 5 });

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setDraft({ ...permissions[role] });
  };

  const togglePage = (key: PageKey) => {
    if (!draft) return;
    setDraft(d => d ? ({
      ...d,
      pageAccess: d.pageAccess.includes(key) ? d.pageAccess.filter(p => p !== key) : [...d.pageAccess, key]
    }) : d);
  };

  const toggleAction = (key: ActionKey) => {
    if (!draft) return;
    setDraft(d => d ? ({
      ...d,
      actionPermissions: d.actionPermissions.includes(key) ? d.actionPermissions.filter(a => a !== key) : [...d.actionPermissions, key]
    }) : d);
  };

  const toggleData = (key: DataKey) => {
    if (!draft) return;
    setDraft(d => d ? ({
      ...d,
      dataVisibility: d.dataVisibility.includes(key) ? d.dataVisibility.filter(v => v !== key) : [...d.dataVisibility, key]
    }) : d);
  };

  const setDraftDiscountLimit = (value: number) => {
    if (!draft) return;
    setDraft(d => d ? ({ ...d, discountLimit: Math.max(0, Number(value) || 0) }) : d);
  };

  const saveDraft = async () => {
    if (!editingRole || !draft) return;
    const updated: PermissionsConfig = { ...permissions, [editingRole]: draft };
    await updatePermissions(updated);
    setEditingRole(null);
    setDraft(null);
    toast.success(`${roleLabel(editingRole)} permissions updated`);
  };

  const handleCreateRole = async () => {
    const key = newRole.key.trim().toLowerCase();
    if (!key) { toast.error('Enter a role key'); return; }
    if (!ROLE_SLUG.test(key)) { toast.error('Role key must be 2-32 characters (letters, digits, underscore), no spaces.'); return; }
    try {
      await createRole(key, newRole.label.trim() || key, {
        pageAccess: [],
        actionPermissions: [],
        dataVisibility: [],
        discountLimit: Math.max(0, Number(newRole.discountLimit) || 0),
      });
      toast.success('Role created — now configure its permissions');
      setShowCreateRole(false);
      setNewRole({ key: '', label: '', discountLimit: 5 });
      setEditingRole(key);
      setDraft({
        pageAccess: [],
        actionPermissions: [],
        dataVisibility: [],
        discountLimit: Math.max(0, Number(newRole.discountLimit) || 0),
        label: newRole.label.trim() || key,
        builtIn: false,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create role');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    const label = roleLabel(role);
    if (!window.confirm(`Delete the "${label}" role? This cannot be undone.`)) return;
    try {
      await deleteRole(role);
      toast.success(`Role "${label}" deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete role');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) return;
    await addUser({ name: newUser.name, email: newUser.email, role: newUser.role }, newUser.password);
    setShowAddUser(false);
    setNewUser({ name: '', email: '', password: '', role: 'cashier' });
    toast.success('User added');
  };

  const handleRemoveUser = async (id: string) => {
    if (id === currentUser?.id) { toast.error("Can't remove yourself"); return; }

    await removeUser(id);
    toast.success('Staff removed');
  };

  const startEditUser = (u: any) => {
    setEditingUser(u);
    setEditUserData({ name: u.name, email: u.email, role: u.role, password: '' });
    setShowEditUser(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editUserData.name || !editUserData.email) return;
    const updates: any = {
      name: editUserData.name,
      email: editUserData.email,
      role: editUserData.role
    };
    if (editUserData.password) updates.password = editUserData.password;

    await updateUser(editingUser.id, updates);
    setShowEditUser(false);
    setEditingUser(null);
    toast.success('Staff updated');
  };

  const inputClass = "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">User & Permission Management</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts and control access per role.</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <button onClick={() => setShowCreateRole(true)} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 hover:bg-secondary/80 transition-colors">
              <Plus className="w-4 h-4" /> Create Role
            </button>
          )}
          <button onClick={() => setShowAddUser(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 hover:bg-secondary transition-colors">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* Create role modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold">Create New Role</h3>
                <p className="text-[11px] text-muted-foreground">You can assign pages, actions & discount limit next.</p>
              </div>
              <button onClick={() => setShowCreateRole(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Role Key <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="e.g. receptionist" value={newRole.key} onChange={e => setNewRole({ ...newRole, key: e.target.value })} />
              <p className="text-[10px] text-muted-foreground/60 ml-1">Lowercase, no spaces. Used as the slug (e.g. <code>receptionist</code>).</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Display Name <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="e.g. Receptionist" value={newRole.label} onChange={e => setNewRole({ ...newRole, label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Max Discount (%)</label>
              <input className={inputClass} type="number" min="0" value={newRole.discountLimit} onChange={e => setNewRole({ ...newRole, discountLimit: Number(e.target.value) || 0 })} />
            </div>
            <button onClick={handleCreateRole} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors mt-2">
              Create Role
            </button>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold">Add Staff Member</h3>
                <p className="text-[11px] text-muted-foreground"><span className="text-destructive">*</span> required fields</p>
              </div>
              <button onClick={() => setShowAddUser(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Full Name <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="e.g. Ahmed Khan" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Email Address <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="e.g. ahmed@example.com" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Password <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="Enter password" type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Role <span className="text-destructive">*</span></label>
              <select className={inputClass} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                {roles.map(r => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleAddUser} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors mt-2">
              Add Staff
            </button>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {showEditUser && editingUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md space-y-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold">Edit Staff Member</h3>
                <p className="text-[11px] text-muted-foreground"><span className="text-destructive">*</span> required fields</p>
              </div>
              <button onClick={() => setShowEditUser(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Full Name <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="Full Name" value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Email Address <span className="text-destructive">*</span></label>
              <input className={inputClass} placeholder="Email" type="email" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Password <span className="text-[10px] text-muted-foreground/60">(Leave blank to keep same)</span></label>
              <input className={inputClass} placeholder="New Password" type="password" value={editUserData.password} onChange={e => setEditUserData({ ...editUserData, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Role <span className="text-destructive">*</span></label>
              <select className={inputClass} value={editUserData.role} onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}>
                {roles.map(r => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleUpdateUser} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-secondary transition-colors mt-2">
              Update Staff
            </button>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {roles.map(role => (
          <div key={role.role} className="pos-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{users.filter(u => u.role === role.role).length} staff</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {role.builtIn ? 'System' : 'Custom'} · Discount max {typeof permissions[role.role]?.discountLimit === 'number' ? permissions[role.role].discountLimit : 0}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {role.role !== 'superadmin' && (
                  <button onClick={() => startEdit(role.role)} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                    Edit
                  </button>
                )}
                {isSuperAdmin && !role.builtIn && (
                  <button onClick={() => handleDeleteRole(role.role)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors" title={`Delete ${role.label}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Pages:</p>
              <div className="flex flex-wrap gap-1">
                {permissions[role.role].pageAccess.map(p => (
                  <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">{p}</span>
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-2">Actions:</p>
              <div className="flex flex-wrap gap-1">
                {permissions[role.role].actionPermissions.map(a => (
                  <span key={a} className="text-xs bg-primary/5 px-2 py-0.5 rounded-full text-primary capitalize">{a.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission editor modal */}
      {editingRole && draft && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-5" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold">Edit {roleLabel(editingRole)} permissions</h3>
              <button onClick={() => { setEditingRole(null); setDraft(null); }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Page Access */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" /> Page Access
              </h4>
              <div className="space-y-1.5">
                {ALL_PAGES.filter(p => p.key !== 'users').map(p => (
                  <label key={p.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${draft.pageAccess.includes(p.key) ? 'bg-primary border-primary' : 'border-border'}`}
                      onClick={() => togglePage(p.key)}>
                      {draft.pageAccess.includes(p.key) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-foreground">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Permissions */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" /> Action Permissions
              </h4>
              <div className="space-y-1.5">
                {ALL_ACTIONS.map(a => (
                  <label key={a.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${draft.actionPermissions.includes(a.key) ? 'bg-primary border-primary' : 'border-border'}`}
                      onClick={() => toggleAction(a.key)}>
                      {draft.actionPermissions.includes(a.key) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-foreground">{a.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-muted/40 p-3">
                <label className="text-xs font-semibold text-foreground block mb-1.5">Max Discount Limit (%)</label>
                <p className="text-[10px] text-muted-foreground/70 mb-2">Applied when this role gives a discount. 0 disables discounts entirely. Superadmin is always unlimited.</p>
                <input
                  type="number"
                  min="0"
                  value={draft.discountLimit ?? 0}
                  onChange={e => setDraftDiscountLimit(Number(e.target.value) || 0)}
                  className="w-32 bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Data Visibility */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" /> Data Visibility
              </h4>
              <div className="space-y-1.5">
                {ALL_DATA.map(d => (
                  <label key={d.key} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${draft.dataVisibility.includes(d.key) ? 'bg-primary border-primary' : 'border-border'}`}
                      onClick={() => toggleData(d.key)}>
                      {draft.dataVisibility.includes(d.key) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-sm text-foreground">{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button onClick={saveDraft} className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
              <Save className="w-4 h-4" /> Save Permissions
            </button>
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="pos-card overflow-x-auto">
        <h3 className="font-semibold text-foreground mb-4">Staff Members</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 px-2 font-medium">Name</th>
              <th className="py-3 px-2 font-medium">Email</th>
              <th className="py-3 px-2 font-medium">Role</th>
              <th className="py-3 px-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{u.name}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-muted-foreground">{u.email}</td>
                <td className="py-3 px-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{roleLabel(u.role)}</span>
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEditUser(u)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Edit Staff">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleRemoveUser(u.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Remove Staff">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}