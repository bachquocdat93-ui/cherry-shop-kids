import React from 'react';
import type { Invoice } from '../types';
import { RevenueStatus } from '../types';

interface InvoiceTemplateProps {
  invoice: Invoice;
  activeTab: RevenueStatus;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, activeTab }) => {
  const totalPrice = invoice.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const remaining = totalPrice - invoice.deposit;
  
  return (
    <div className="bg-white p-10 font-sans border-t-8 border-primary" style={{ width: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">CHERRY SHOP KIDS</h1>
          <p className="text-xs text-gray-500 mt-1">Quần áo & Phụ kiện trẻ em</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold text-gray-800 uppercase">Hóa Đơn Bán Hàng</h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">{activeTab}</p>
          <p className="text-gray-500 font-semibold mt-2 text-xs">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>
      
      {/* Customer Info */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Thông tin khách hàng:</h3>
        <div className="bg-gray-50 p-4 rounded-xl border">
            <p className="text-xl font-bold text-gray-900">{invoice.customerName}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden mb-8">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-16">STT</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Sản Phẩm</th>
              <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider w-20">SL</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider w-32">Đơn Giá</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider w-40">Thành Tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, index) => (
              <tr key={item.id} className="bg-white">
                <td className="px-4 py-3 text-gray-500 font-bold text-center align-top">{index + 1}</td>
                <td className="px-4 py-3 font-bold text-gray-800 align-top">{item.productName}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-700 align-top">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-600 align-top">{formatCurrency(item.sellingPrice)}</td>
                <td className="px-4 py-3 text-right font-extrabold text-primary align-top">{formatCurrency(item.sellingPrice * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mt-10">
        <div className="w-full max-w-xs">
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Tổng cộng:</span>
                    <span className="font-bold text-gray-800 text-base">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-500">Đã cọc:</span>
                    <span className="font-bold text-green-600">{invoice.deposit > 0 ? `-${formatCurrency(invoice.deposit)}` : formatCurrency(0)}</span>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-dashed">
                <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                    <span className="font-bold uppercase tracking-wider text-sm text-gray-800">Cần thanh toán</span>
                    <span className="text-2xl font-black text-primary tracking-tight">{formatCurrency(remaining)}</span>
                </div>
            </div>
        </div>
      </div>
      
       {/* Footer */}
       <footer className="text-center mt-16 pt-6 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-1">Cảm ơn quý khách đã mua sắm!</p>
            <p className="text-xs text-gray-400">Hẹn gặp lại bạn tại Cherry Shop Kids</p>
      </footer>
    </div>
  );
};

export default InvoiceTemplate;