import React, { useState } from 'react';
import type { CustomerInfo } from '../types';
import { CloseIcon } from './Icons';

interface CustomerModalProps {
  customer: CustomerInfo;
  onSave: (customerInfo: CustomerInfo) => void;
  onClose: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ customer, onSave, onClose }) => {
  const [phone, setPhone] = useState(customer.phone || '');
  const [address, setAddress] = useState(customer.address || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: customer.name,
      phone,
      address,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h3 className="text-xl font-semibold text-gray-800">Cập nhật thông tin</h3>
                <p className="text-sm text-gray-500">{customer.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
            <div className="flex justify-end pt-4 space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700">Lưu thông tin</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;