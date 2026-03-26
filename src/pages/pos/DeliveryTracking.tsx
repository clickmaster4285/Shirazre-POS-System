import { useState } from 'react';
import { Truck, MapPin, Clock, CheckCircle2, Package, Phone } from 'lucide-react';

type DeliveryStatus = 'pending' | 'out_for_delivery' | 'delivered';

interface DeliveryOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  items: string[];
  total: number;
  status: DeliveryStatus;
  assignedRider: string;
  estimatedTime: string;
  createdAt: string;
}

const initialDeliveries: DeliveryOrder[] = [
  { id: 'DEL-001', orderId: 'ORD-010', customerName: 'Ahmed Khan', phone: '+92 300 1234567', address: 'House 45, Street 12, F-7, Islamabad', items: ['Mutton Karahi (Full)', 'Naan x4', 'Raita'], total: 4800, status: 'out_for_delivery', assignedRider: 'Imran Ali', estimatedTime: '25 min', createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'DEL-002', orderId: 'ORD-011', customerName: 'Fatima Noor', phone: '+92 321 9876543', address: 'Apt 3B, Block C, Gulberg III, Lahore', items: ['Chicken Karahi Special', 'Chicken Fried Rice', 'Cold Drink x2'], total: 3200, status: 'pending', assignedRider: 'Hassan Raza', estimatedTime: '40 min', createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: 'DEL-003', orderId: 'ORD-012', customerName: 'Usman Tariq', phone: '+92 333 5556677', address: '23-A, DHA Phase 5, Karachi', items: ['Deal-1', 'Extra Naan x2'], total: 1500, status: 'delivered', assignedRider: 'Bilal Shah', estimatedTime: 'Delivered', createdAt: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: 'DEL-004', orderId: 'ORD-013', customerName: 'Sara Malik', phone: '+92 312 4445566', address: 'House 8, Street 5, I-8/2, Islamabad', items: ['Chicken Malai Boti', 'Kabli Pulao', 'Salad'], total: 2600, status: 'pending', assignedRider: 'Imran Ali', estimatedTime: '50 min', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 'DEL-005', orderId: 'ORD-014', customerName: 'Zain Abbas', phone: '+92 345 7778899', address: '15-B, Johar Town, Lahore', items: ['Shinwari Lamb Karahi', 'Naan x6', 'Raita x2'], total: 4200, status: 'out_for_delivery', assignedRider: 'Hassan Raza', estimatedTime: '15 min', createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
];

const statusConfig: Record<DeliveryStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-primary/10 text-primary border-primary/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
};

export default function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>(initialDeliveries);
  const [filter, setFilter] = useState<'all' | DeliveryStatus>('all');

  const filtered = filter === 'all' ? deliveries : deliveries.filter(d => d.status === filter);

  const updateStatus = (id: string, status: DeliveryStatus) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const counts = {
    pending: deliveries.filter(d => d.status === 'pending').length,
    out_for_delivery: deliveries.filter(d => d.status === 'out_for_delivery').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Delivery Tracking</h1>
        <p className="text-sm text-muted-foreground">Track and manage all delivery orders.</p>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {([
          { key: 'pending' as const, label: 'Pending', icon: Clock, count: counts.pending, color: 'text-warning' },
          { key: 'out_for_delivery' as const, label: 'Out for Delivery', icon: Truck, count: counts.out_for_delivery, color: 'text-primary' },
          { key: 'delivered' as const, label: 'Delivered', icon: CheckCircle2, count: counts.delivered, color: 'text-success' },
        ]).map(s => (
          <div key={s.key} className="pos-card flex items-center gap-4 cursor-pointer hover:border-primary/30" onClick={() => setFilter(s.key)}>
            <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-serif text-2xl font-bold text-foreground">{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'out_for_delivery', 'delivered'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {s === 'out_for_delivery' ? 'Out for Delivery' : s} {s !== 'all' && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {/* Delivery cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(delivery => {
          const config = statusConfig[delivery.status];
          const StatusIcon = config.icon;
          return (
            <div key={delivery.id} className="pos-card space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">{delivery.id}</p>
                  <p className="text-xs text-muted-foreground">{delivery.orderId}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 ${config.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-foreground">{delivery.customerName}</div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">{delivery.phone}</div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">{delivery.address}</div>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">Rider: {delivery.assignedRider}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Items: {delivery.items.join(', ')}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <div>
                  <p className="font-serif text-lg font-bold text-foreground">Rs. {delivery.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ETA: {delivery.estimatedTime}</p>
                </div>
                <div className="flex gap-1">
                  {delivery.status === 'pending' && (
                    <button onClick={() => updateStatus(delivery.id, 'out_for_delivery')}
                      className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-secondary transition-colors">
                      Dispatch
                    </button>
                  )}
                  {delivery.status === 'out_for_delivery' && (
                    <button onClick={() => updateStatus(delivery.id, 'delivered')}
                      className="bg-success/90 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-success transition-colors">
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
