import React from 'react';
import type { ConsignmentItem } from '../types';
import { ConsignmentStatus } from '../types';

interface ConsignmentTemplateProps {
  customerName: string;
  items: ConsignmentItem[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

const calculateSummary = (customerItems: ConsignmentItem[]) => {
    const totalItems = customerItems.reduce((sum, item) => sum + item.quantity, 0);
    const soldItems = customerItems.filter(i => i.status === ConsignmentStatus.SOLD).reduce((sum, item) => sum + item.quantity, 0);
    const totalTransferAmount = customerItems.filter(i => i.status === ConsignmentStatus.SOLD)
        .reduce((sum, item) => sum + (item.consignmentPrice * (1 - item.consignmentFee / 100)) * item.quantity, 0);
    
    return { totalItems, soldItems, totalTransferAmount };
};

const getStatusRowClass = (status: ConsignmentStatus) => {
    switch (status) {
        case ConsignmentStatus.SOLD:
            return 'bg-yellow-100';
        case ConsignmentStatus.DEPOSITED:
            return 'bg-green-100';
        case ConsignmentStatus.IN_STOCK:
        default:
            return 'bg-white';
    }
};

const ConsignmentTemplate: React.FC<ConsignmentTemplateProps> = ({ customerName, items }) => {
  const summary = calculateSummary(items);
  
  return (
    <div className="bg-white p-12 font-sans" style={{ width: '800px' }}>
      <header className="text-center mb-10 border-b pb-5">
        <h1 className="text-5xl font-black text-gray-800 tracking-tight">BÁO CÁO KÝ GỬI</h1>
        <p className="text-lg text-gray-500 mt-2">Cherry Shop Kids</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Khách hàng ký gửi:</h2>
          <p className="text-xl font-bold text-gray-900">{customerName}</p>
        </div>
        <div className="text-right">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ngày xuất báo cáo:</h2>
            <p className="text-xl font-bold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-base">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">STT</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Sản Phẩm</th>
              <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Giá Gửi Bán</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">SL</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Phí (%)</th>
              <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Tiền Nhận Lại</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Trạng Thái</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">NOTE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
                const amountAfterFee = item.consignmentPrice * (1 - item.consignmentFee / 100);
                return (
                  <tr key={item.id} className={getStatusRowClass(item.status)}>
                    <td className="px-4 py-4 text-gray-600">{index + 1}</td>
                    <td className="px-4 py-4 font-semibold text-gray-800">{item.productName}</td>
                    <td className="px-4 py-4 text-right text-gray-600">{formatCurrency(item.consignmentPrice)}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{item.consignmentFee}%</td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-800">{formatCurrency(amountAfterFee)}</td>
                    <td className="px-4 py-4 text-center text-xs font-bold">{item.status}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">{item.note || ''}</td>
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-8">
        <div className="w-full max-w-sm">
           <table className="w-full text-right text-base">
                <tbody>
                    <tr>
                        <td className="py-2 pr-4 text-gray-500">Tổng sản phẩm ký gửi:</td>
                        <td className="py-2 font-semibold text-gray-800">{summary.totalItems}</td>
                    </tr>
                    <tr>
                        <td className="py-2 pr-4 text-gray-500">Số sản phẩm đã bán:</td>
                        <td className="py-2 font-semibold text-gray-800">{summary.soldItems}</td>
                    </tr>
                    <tr className="font-black text-xl text-gray-900">
                        <td className="py-4 pr-4 border-t-2 border-gray-200 mt-2">Tổng tiền cần thanh toán:</td>
                        <td className="py-4 border-t-2 border-gray-200 mt-2">{formatCurrency(summary.totalTransferAmount)}</td>
                    </tr>
                </tbody>
           </table>
        </div>
      </div>
      
       <footer className="text-center mt-16 pt-6 border-t text-sm text-gray-400">
            Cảm ơn quý khách đã tin tưởng ký gửi tại Cherry Shop Kids!
      </footer>
    </div>
  );
};

export default ConsignmentTemplate;