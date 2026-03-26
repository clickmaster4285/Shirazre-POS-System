import { useState } from 'react';
import { menuItems, menuCategories, type CartItem, type MenuItem } from '@/data/mockData';
import { Plus, Minus, Trash2, ShoppingBag, Printer, Pause, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { printReceipt } from '@/utils/printReceipt';

export default function POSScreen() {
  const { hasAction } = useAuth();
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('dine-in');
  const [noteItem, setNoteItem] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const filtered = category === 'All' ? menuItems : menuItems.filter(i => i.category === category);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const subtotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const saveNote = () => {
    if (noteItem) {
      setCart(prev => prev.map(c => c.menuItem.id === noteItem ? { ...c, notes: noteText } : c));
      setNoteItem(null);
      setNoteText('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
      {/* Left: Categories */}
      <div className="lg:w-24 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto scrollbar-thin shrink-0">
        {menuCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              category === cat ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Center: Menu grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="pos-card text-left group"
              disabled={!item.available}
            >
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{item.category}</p>
              <p className="font-serif text-base font-bold text-primary mt-1">Rs. {item.price.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="lg:w-80 flex flex-col pos-card p-0 overflow-hidden">
        {/* Order type */}
        <div className="p-3 border-b border-border flex gap-1">
          {(['dine-in', 'takeaway', 'delivery'] as const).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                orderType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : cart.map(c => (
            <div key={c.menuItem.id} className="bg-muted/50 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.menuItem.name}</p>
                  <p className="text-xs text-muted-foreground">Rs. {c.menuItem.price.toLocaleString()}</p>
                  {c.notes && <p className="text-xs text-primary italic mt-0.5">📝 {c.notes}</p>}
                </div>
                <button onClick={() => { setNoteItem(c.menuItem.id); setNoteText(c.notes); }} className="text-muted-foreground hover:text-primary p-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(c.menuItem.id, -1)} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors">
                    {c.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{c.quantity}</span>
                  <button onClick={() => updateQty(c.menuItem.id, 1)} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-sm font-bold text-foreground">Rs. {(c.menuItem.price * c.quantity).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Note modal */}
        {noteItem && (
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-4 w-full max-w-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm">Add Note</h3>
                <button onClick={() => setNoteItem(null)}><X className="w-4 h-4" /></button>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g., Less spicy, no onions..." className="w-full border border-border rounded-xl p-3 text-sm bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={saveNote} className="w-full bg-primary text-primary-foreground py-2 rounded-xl text-sm font-medium">Save Note</button>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-border p-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax (10%)</span><span>Rs. {Math.round(tax).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground">
            <span>Total</span><span>Rs. {Math.round(total).toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {hasAction('hold_order') && (
            <button onClick={() => { if(cart.length) { toast.info('Order held'); } }} className="py-2.5 rounded-xl bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors flex items-center justify-center gap-1">
              <Pause className="w-3 h-3" /> Hold
            </button>
            )}
            {hasAction('print_bill') && (
            <button onClick={() => {
              if(cart.length) {
                const orderId = `ORD-${Date.now().toString().slice(-4)}`;
                printReceipt({ orderId, orderType, items: cart, subtotal, discount: 0, discountPercent: 0, tax, total });
                toast.success('Bill printed');
              }
            }} className="py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-1">
              <Printer className="w-3 h-3" /> Print
            </button>
            )}
            <button
              onClick={() => { if(cart.length) { toast.success('Order placed!'); setCart([]); } }}
              className={`py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-secondary transition-colors ${!hasAction('hold_order') && !hasAction('print_bill') ? 'col-span-3' : !hasAction('hold_order') || !hasAction('print_bill') ? 'col-span-2' : ''}`}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
