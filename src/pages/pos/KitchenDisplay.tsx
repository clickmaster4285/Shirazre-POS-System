import { useState } from 'react';
import { sampleOrders, type Order } from '@/data/mockData';
import { Clock, ChefHat, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>(sampleOrders.filter(o => o.status !== 'completed'));

  const updateStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Order ${id} → ${status}`);
  };

  const getElapsed = () => {
    return Math.floor(Math.random() * 15) + 2;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Kitchen Display</h1>
        <p className="text-sm text-muted-foreground">Real-time order queue for kitchen staff.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order.id} className={`pos-card border-l-4 ${
            order.status === 'pending' ? 'border-l-warning' :
            order.status === 'preparing' ? 'border-l-primary' :
            'border-l-success'
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-foreground text-lg">{order.id}</p>
                <p className="text-xs text-muted-foreground capitalize">{order.type}{order.table ? ` • Table ${order.table}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{getElapsed()} min</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {order.items.map((item, i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/50">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-foreground">{item.quantity}× {item.menuItem.name}</span>
                  </div>
                  {item.notes && <p className="text-xs text-primary mt-1">⚠ {item.notes}</p>}
                </div>
              ))}
            </div>

            {order.notes && <p className="text-xs text-primary italic mb-3">📝 {order.notes}</p>}

            <div className="flex gap-2">
              {order.status === 'pending' && (
                <button onClick={() => updateStatus(order.id, 'preparing')} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-secondary transition-colors">
                  <ChefHat className="w-3.5 h-3.5" /> Start Cooking
                </button>
              )}
              {order.status === 'preparing' && (
                <button onClick={() => updateStatus(order.id, 'ready')} className="flex-1 bg-success text-cream py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Ready
                </button>
              )}
              {order.status === 'ready' && (
                <span className="flex-1 text-center py-2.5 text-xs font-medium text-success">✓ Ready for pickup</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
