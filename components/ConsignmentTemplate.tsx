import React from 'react';
import type { ConsignmentItem } from '../types';
import { ConsignmentStatus } from '../types';

interface ConsignmentTemplateProps {
  customerName: string;
  items: ConsignmentItem[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
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
            return 'bg-yellow-100 text-yellow-900';
        case ConsignmentStatus.DEPOSITED:
            return 'bg-green-100 text-green-900';
        case ConsignmentStatus.IN_STOCK:
        default:
            return 'bg-white text-gray-800';
    }
};


const ConsignmentTemplate: React.FC<ConsignmentTemplateProps> = ({ customerName, items }) => {
  const summary = calculateSummary(items);
  
  return (
    <div className="bg-white p-10 font-sans border-t-8 border-primary" style={{ width: '800px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">CHERRY SHOP KIDS</h1>
          <p className="text-xs text-gray-500 mt-1">Quần áo & Phụ kiện trẻ em</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold text-gray-800 uppercase">Báo Cáo Ký Gửi</h2>
          <p className="text-gray-500 font-semibold mt-2 text-xs">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Báo cáo cho khách ký gửi:</h3>
        <div className="bg-gray-50 p-4 rounded-xl border flex justify-between items-center">
            <p className="text-2xl font-bold text-gray-900">{customerName}</p>
            <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Đối Soát Định Kỳ
            </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden mb-8 border border-gray-200">
        <table className="min-w-full text-[12px] table-fixed">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-10 px-4 py-3 text-center font-bold uppercase tracking-wider text-[10px]">STT</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Sản Phẩm</th>
              <th className="w-20 px-4 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Giá Gửi</th>
              <th className="w-10 px-4 py-3 text-center font-bold uppercase tracking-wider text-[10px]">SL</th>
              <th className="w-12 px-4 py-3 text-center font-bold uppercase tracking-wider text-[10px]">Phí %</th>
              <th className="w-20 px-4 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Tiền Nhận</th>
              <th className="w-28 px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Note</th>
              <th className="w-24 px-4 py-3 text-center font-bold uppercase tracking-wider text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, index) => {
                const amountAfterFee = item.consignmentPrice * (1 - item.consignmentFee / 100);
                return (
                  <tr key={item.id} className={getStatusRowClass(item.status)}>
                    <td className="px-4 py-4 text-gray-500 font-bold text-center align-top">{index + 1}</td>
                    <td className="px-4 py-4 font-bold align-top break-words">{item.productName}</td>
                    <td className="px-4 py-4 text-right text-gray-600 font-medium align-top">{formatCurrency(item.consignmentPrice)}</td>
                    <td className="px-4 py-4 text-center font-bold align-top">{item.quantity}</td>
                    <td className="px-4 py-4 text-center text-gray-500 text-[11px] align-top">{item.consignmentFee}%</td>
                    <td className="px-4 py-4 text-right font-extrabold text-blue-700 align-top">{formatCurrency(amountAfterFee)}</td>
                    <td className="px-4 py-4 text-gray-500 text-left align-top break-words">{item.note || '-'}</td>
                    <td className="px-4 py-4 text-center align-top">
                        <span className={`text-[9px] font-bold uppercase px-3 py-1.5 rounded-md ${item.status === ConsignmentStatus.SOLD ? 'bg-yellow-400 text-yellow-900' : item.status === ConsignmentStatus.DEPOSITED ? 'bg-green-400 text-green-900' : 'bg-gray-300 text-gray-800'}`}>
                            {item.status}
                        </span>
                    </td>
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-end mt-10 pt-6 border-t">
        <div className="text-sm space-y-2">
            <p className="font-bold uppercase tracking-wider text-gray-400 text-xs mb-2">Thống kê:</p>
            <p className="text-gray-600">Tổng sản phẩm gửi: <span className="font-extrabold text-lg text-gray-900">{summary.totalItems}</span></p>
            <p className="text-gray-600">Sản phẩm đã bán: <span className="font-extrabold text-lg text-yellow-600">{summary.soldItems}</span></p>
        </div>
        <div className="w-1/2 bg-gray-800 text-white rounded-2xl p-6 text-right shadow-lg">
             <p className="text-[10px] font-bold text-primary-400 uppercase tracking-[0.2em] mb-1">Tổng tiền cần thanh toán</p>
             <p className="text-4xl font-black tracking-tight">{formatCurrency(summary.totalTransferAmount)}</p>
             <p className="text-[10px] text-gray-400 mt-2 italic">* Tiền sẽ được chuyển sau khi đối soát xong</p>
        </div>
      </div>
      
       {/* Footer */}
       <footer className="text-center mt-16 pt-6 border-t flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            <p>Cherry Shop Kids</p>
            <p>Trân trọng cảm ơn sự tin tưởng của bạn!</p>
      </footer>
    </div>
  );
};

export default ConsignmentTemplate;