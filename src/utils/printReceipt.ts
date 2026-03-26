import type { CartItem } from '@/data/mockData';

interface ReceiptData {
  orderId: string;
  orderType: string;
  table?: number;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  customerName?: string;
}

const fmtPKR = (v: number) => `Rs. ${Math.round(v).toLocaleString()}`;

export function printReceipt(data: ReceiptData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${data.orderId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@300;400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Poppins', sans-serif; width: 300px; margin: 0 auto; padding: 20px; color: #2B1B17; background: #fff; }
    .header { text-align: center; padding-bottom: 12px; border-bottom: 2px dashed #ddd; margin-bottom: 12px; }
    .header h1 { font-family: 'Playfair Display', serif; font-size: 22px; color: #5A0F2E; margin-bottom: 2px; }
    .header p { font-size: 10px; color: #888; line-height: 1.5; }
    .meta { font-size: 11px; margin-bottom: 12px; color: #666; }
    .meta .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .items { border-top: 1px dashed #ddd; border-bottom: 1px dashed #ddd; padding: 10px 0; margin-bottom: 10px; }
    .item { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .item .name { flex: 1; }
    .item .price { text-align: right; font-weight: 500; }
    .item .notes { font-size: 10px; color: #5A0F2E; font-style: italic; padding-left: 16px; }
    .totals { margin-bottom: 12px; }
    .totals .row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; color: #666; }
    .totals .row.discount { color: #16a34a; }
    .totals .row.total { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #2B1B17; padding-top: 8px; margin-top: 6px; border-top: 2px solid #2B1B17; }
    .payment { text-align: center; font-size: 11px; color: #888; padding: 8px 0; border-top: 1px dashed #ddd; border-bottom: 1px dashed #ddd; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .footer { text-align: center; padding-top: 8px; }
    .footer p { font-size: 10px; color: #888; line-height: 1.6; }
    .footer .thanks { font-family: 'Playfair Display', serif; font-size: 14px; color: #5A0F2E; margin-bottom: 4px; }
    @media print { body { width: 80mm; padding: 5mm; } @page { margin: 0; size: 80mm auto; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Shiraz Restaurant</h1>
    <p>Restaurant & Fine Dining</p>
    <p>123 Royal Avenue, Islamabad</p>
    <p>Tel: +92 51 1234567</p>
  </div>

  <div class="meta">
    <div class="row"><span>Order:</span><span>${data.orderId}</span></div>
    <div class="row"><span>Type:</span><span style="text-transform:capitalize">${data.orderType}</span></div>
    ${data.table ? `<div class="row"><span>Table:</span><span>${data.table}</span></div>` : ''}
    ${data.customerName ? `<div class="row"><span>Customer:</span><span>${data.customerName}</span></div>` : ''}
    <div class="row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="row"><span>Time:</span><span>${timeStr}</span></div>
  </div>

  <div class="items">
    ${data.items.map(item => `
      <div class="item">
        <span class="name">${item.quantity}× ${item.menuItem.name}</span>
        <span class="price">${fmtPKR(item.menuItem.price * item.quantity)}</span>
      </div>
      ${item.notes ? `<div class="item"><span class="notes">📝 ${item.notes}</span></div>` : ''}
    `).join('')}
  </div>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmtPKR(data.subtotal)}</span></div>
    ${data.discountPercent > 0 ? `<div class="row discount"><span>Discount (${data.discountPercent}%)</span><span>-${fmtPKR(data.discount)}</span></div>` : ''}
    <div class="row"><span>Tax (10%)</span><span>${fmtPKR(data.tax)}</span></div>
    <div class="row total"><span>Total</span><span>${fmtPKR(data.total)}</span></div>
  </div>

  ${data.paymentMethod ? `<div class="payment">Paid via ${data.paymentMethod}</div>` : ''}

  <div class="footer">
    <p class="thanks">Thank You!</p>
    <p>We hope you enjoyed your dining experience.</p>
    <p>Please visit us again.</p>
    <p style="margin-top:8px">www.Shiraz Restaurant.com</p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (printWindow) {
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  }
}
