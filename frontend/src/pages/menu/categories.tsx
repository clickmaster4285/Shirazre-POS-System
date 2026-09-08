import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderTree, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, resolveUploadUrl } from '@/lib/api/api';

type Category = {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
  image: string;
  isActive: boolean;
  itemCount: number;
  children: Category[];
};

type CategoriesResponse = { tree: Category[]; legacy: string[] };
type MenuItemSummary = { id: string; name: string; price: number; description: string; image?: string; available: boolean };
type MenuItemsResponse = { items: MenuItemSummary[] };

type CategoryForm = {
  name: string;
  description: string;
  isActive: boolean;
  image: string;
};

const emptyForm: CategoryForm = { name: '', description: '', isActive: true, image: '' };
const inputClass = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

export default function MenuCategories() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState<Category[]>([]);
  const [legacy, setLegacy] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [parentForForm, setParentForForm] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [legacyParentSelections, setLegacyParentSelections] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api<CategoriesResponse>('/menu/categories');
      setTree(response.tree || []);
      setLegacy(response.legacy || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const findCategory = (categories: Category[], id?: string): Category | null => {
    for (const category of categories) {
      if (category.id === id) return category;
      const child = findCategory(category.children || [], id);
      if (child) return child;
    }
    return null;
  };
  const selectedParent = useMemo(() => findCategory(tree, categoryId), [categoryId, tree]);
  const parentOptions = tree.filter((category) => category.id !== editing?.id);

  useEffect(() => {
    if (!selectedParent?.parentId) { setItems([]); return; }
    api<MenuItemsResponse>(`/menu?categoryId=${encodeURIComponent(selectedParent.id)}&page=1&limit=1000`)
      .then(response => setItems(response.items || []))
      .catch(error => toast.error(error instanceof Error ? error.message : 'Failed to load category items'));
  }, [selectedParent?.id, selectedParent?.parentId]);
  const openCreate = (parentId: string | null = null) => {
    setEditing(null);
    setParentForForm(parentId);
    setForm(emptyForm);
    setImageFile(null);
    setShowForm(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setParentForForm(category.parentId);
    setForm({ name: category.name, description: category.description || '', isActive: category.isActive, image: category.image || '' });
    setImageFile(null);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Enter a category name'); return; }
    const body = new FormData();
    body.append('name', form.name.trim());
    body.append('description', form.description);
    body.append('isActive', String(form.isActive));
    body.append('parentId', parentForForm || '');
    if (form.image) body.append('image', form.image);
    if (imageFile) body.set('image', imageFile);
    try {
      await api(editing ? `/menu/categories/${editing.id}` : '/menu/categories', { method: editing ? 'PUT' : 'POST', body });
      toast.success(editing ? 'Category updated' : 'Category created');
      setShowForm(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  const assignLegacyCategory = async (name: string) => {
    const parentId = legacyParentSelections[name];
    if (!parentId) { toast.error(`Select a parent for ${name}`); return; }
    const body = new FormData();
    body.append('name', name);
    body.append('parentId', parentId);
    body.append('isActive', 'true');
    try {
      await api('/menu/categories', { method: 'POST', body });
      toast.success(`${name} linked as a subcategory`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to link ${name}`);
    }
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    try {
      await api(`/menu/categories/${category.id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      if (categoryId === category.id) navigate('/pos/menu/categories');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {selectedParent && <Link to="/pos/menu/categories" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="w-4 h-4" /> All categories</Link>}
          <h1 className="font-serif text-2xl font-bold text-foreground">{selectedParent ? selectedParent.name : 'Menu Categories'}</h1>
          <p className="text-sm text-muted-foreground">{selectedParent ? 'Manage subcategories and items in this parent category.' : 'Create parent categories, then organize their subcategories.'}</p>
        </div>
        {!selectedParent?.parentId && <button type="button" onClick={() => openCreate(selectedParent?.id || null)} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2"><Plus className="w-4 h-4" /> {selectedParent ? 'Add Subcategory' : 'Add Parent Category'}</button>}
      </div>

      {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading categories...</div> : selectedParent ? (
        <div className="space-y-4">
          {selectedParent.parentId ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map(item => <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-[16/9] bg-muted/50">{item.image ? <img src={resolveUploadUrl(item.image)} alt={item.name} className="h-full w-full object-cover" /> : null}</div><div className="p-3"><p className="font-medium truncate">{item.name}</p><p className="mt-1 text-sm font-semibold">Rs. {item.price.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.description}</p></div></div>)}</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedParent.children.map((category) => <CategoryCard key={category.id} category={category} isSubcategory onOpen={() => navigate(`/pos/menu/categories/${category.id}`)} onEdit={() => openEdit(category)} onDelete={() => remove(category)} />)}
          </div>}
          {selectedParent.parentId && items.length === 0 && <EmptyState text="No menu items assigned to this subcategory." />}
          {!selectedParent.parentId && selectedParent.children.length === 0 && <EmptyState text="No subcategories yet." />}
          <Link to={`/pos/menu?category=${encodeURIComponent(selectedParent.name)}`} className="inline-flex text-sm text-primary hover:underline">View legacy items for this parent</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((category) => <CategoryCard key={category.id} category={category} onOpen={() => navigate(`/pos/menu/categories/${category.id}`)} onEdit={() => openEdit(category)} onDelete={() => remove(category)} />)}
          </div>
          {tree.length === 0 && <EmptyState text="No parent categories yet." />}
          {legacy.length > 0 && <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 text-sm"><p className="font-medium">Unassigned categories</p><p className="mt-1 text-muted-foreground">These existing category names have no category record yet. Choose a parent to link them without losing their menu items.</p><div className="mt-3 space-y-2">{legacy.map((name) => <div key={name} className="flex flex-col gap-2 rounded-lg border border-amber-300/40 bg-background/60 p-2 sm:flex-row sm:items-center"><span className="flex-1 font-medium">{name}</span><select value={legacyParentSelections[name] || ''} onChange={(event) => setLegacyParentSelections((current) => ({ ...current, [name]: event.target.value }))} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Select parent</option>{parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select><button type="button" onClick={() => void assignLegacyCategory(name)} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Link category</button></div>)}</div></div>}
        </>
      )}

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"><div className="w-full max-w-lg space-y-4 rounded-2xl bg-card p-6" style={{ boxShadow: 'var(--shadow-elevated)' }}>
        <div className="flex items-center justify-between"><h2 className="font-serif text-lg font-bold">{editing ? 'Edit Category' : parentForForm ? 'New Subcategory' : 'New Parent Category'}</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Close">×</button></div>
        <input className={inputClass} placeholder="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <label className="space-y-1 text-sm text-muted-foreground"><span>Parent category</span><select value={parentForForm || ''} onChange={(event) => setParentForForm(event.target.value || null)} className={inputClass}><option value="">No parent (top-level)</option>{parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>
        <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="accent-primary" /> Active</label>
        <label className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground"><ImagePlus className="h-4 w-4" /><span className="flex-1">Category image</span><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>
        {form.image && <img src={resolveUploadUrl(form.image)} alt="Category preview" className="h-28 w-full rounded-xl object-cover" />}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void save()} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save Category</button></div>
      </div></div>}
    </div>
  );
}

function CategoryCard({ category, isSubcategory = false, onOpen, onEdit, onDelete }: { category: Category; isSubcategory?: boolean; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const childNames = category.children.map((child) => child.name);
  return <div className="overflow-hidden rounded-xl border border-border bg-card"><button type="button" onClick={onOpen} className="block w-full text-left"><div className="aspect-[16/7] bg-muted/50">{category.image ? <img src={resolveUploadUrl(category.image)} alt={category.name} className="h-full w-full object-cover" /> : null}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-medium">{category.name}</h2><p className="mt-1 text-xs text-muted-foreground line-clamp-2">{category.description || 'No description'}</p></div><span className={`text-xs ${category.isActive ? 'text-success' : 'text-muted-foreground'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></div><p className="mt-3 text-xs text-muted-foreground">{category.children.length} subcategories · {category.itemCount} items</p>{childNames.length > 0 && <p className="mt-2 text-xs text-foreground/70 line-clamp-2">{childNames.join(' · ')}</p>}</div></button><div className="flex items-center justify-between gap-2 border-t border-border p-2"><button type="button" onClick={isSubcategory ? onEdit : onOpen} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"><FolderTree className="h-4 w-4" /> {isSubcategory ? 'Change parent' : 'View subcategories'}</button><div className="flex gap-1"><button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={`Edit ${category.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${category.name}`}><Trash2 className="h-4 w-4" /></button></div></div></div>;
}

function EmptyState({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">{text}</div>; }
