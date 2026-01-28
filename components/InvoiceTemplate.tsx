import React from 'react';
import type { Invoice, InvoiceItem } from '../types';
import { RevenueStatus } from '../types';

interface InvoiceTemplateProps {
  invoice: Invoice;
  activeTab: RevenueStatus; // Prop is passed but can be ignored as we'll color each row
}

// Local formatCurrency to match the image style "1.234.567 ₫"
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

const getStatusRowClass = (status: RevenueStatus) => {
    switch (status) {
        case RevenueStatus.DELIVERED:
            return 'bg-yellow-50';
        case RevenueStatus.SHIPPING:
            return 'bg-green-50';
        case RevenueStatus.HOLDING:
        default:
            return 'bg-white';
    }
};

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  const totalPrice = invoice.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const remaining = totalPrice - invoice.deposit;
  
  return (
    <div className="bg-white p-12 font-sans" style={{ width: '800px' }}>
      <header className="text-center mb-10 border-b pb-5">
        <h1 className="text-5xl font-black text-gray-800 tracking-tight">HÓA ĐƠN BÁN LẺ</h1>
        <p className="text-lg text-gray-500 mt-2">Cherry Shop Kids</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Khách hàng:</h2>
          <p className="text-xl font-bold text-gray-900">{invoice.customerName}</p>
        </div>
        <div className="text-right">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ngày xuất:</h2>
            <p className="text-xl font-bold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Sản Phẩm</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">SL</th>
              <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Đơn Giá</th>
              <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Thành Tiền</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, index) => (
              <tr key={item.id} className={getStatusRowClass(item.status)}>
                <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                <td className="px-4 py-4 font-semibold text-gray-800">{item.productName}</td>
                <td className="px-4 py-4 text-center text-gray-600">{item.quantity}</td>
                <td className="px-4 py-4 text-right text-gray-600">{formatCurrency(item.sellingPrice)}</td>
                <td className="px-4 py-4 text-right font-semibold text-gray-800">{formatCurrency(item.sellingPrice * item.quantity)}</td>
                <td className="px-4 py-4 text-center text-xs font-bold">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-8">
        <div className="w-full max-w-sm">
           <table className="w-full text-right text-base">
                <tbody>
                    <tr>
                        <td className="py-2 pr-4 text-gray-500">Tổng cộng:</td>
                        <td className="py-2 font-semibold text-gray-800">{formatCurrency(totalPrice)}</td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4 text-gray-500">Đã cọc:</td>
                        <td className="py-2 font-semibold text-gray-800">{formatCurrency(invoice.deposit)}</td>
                    </tr>
                    <tr className="font-black text-xl text-gray-900">
                        <td className="py-4 pr-4 border-t-2 border-gray-200 mt-2">Còn lại:</td>
                        <td className="py-4 border-t-2 border-gray-200 mt-2">{formatCurrency(remaining)}</td>
                    </tr>
                </tbody>
           </table>
        </div>
      </div>
      
       <footer className="text-center mt-16 pt-6 border-t text-sm text-gray-400">
            Cảm ơn quý khách đã mua sắm tại Cherry Shop Kids!
      </footer>
    </div>
  );
};

export default InvoiceTemplate;