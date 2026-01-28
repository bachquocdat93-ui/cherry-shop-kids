import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon, UploadIcon, TrashIcon, SyncIcon, CheckCircleIcon } from './Icons';
import { exportDataToSheet, importDataFromSheet, generateSyncTemplate } from '../utils/sheetSync';
import { getCloudConfig, saveCloudConfig, pushToCloud, pullFromCloud, SQL_INSTRUCTIONS, resetSupabaseClient } from '../utils/supabaseService';
import type { RevenueEntry, Invoice, ConsignmentItem } from '../types';

interface SheetSyncModalProps {
  onClose: () => void;
  onImportSuccess: (data: {
    revenueData: RevenueEntry[];
    invoicesData: Invoice[];
    consignmentData: ConsignmentItem[];
  }) => void;
}

const SheetSyncModal: React.FC<SheetSyncModalProps> = ({ onClose, onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'cloud'>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [showSql, setShowSql] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cfg = getCloudConfig();
    if (cfg) {
      setCloudUrl(cfg.url);
      setCloudKey(cfg.key);
    }
  }, []);

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (!window.confirm('Hành động này sẽ thay thế dữ liệu hiện tại bằng file Excel. Tiếp tục?')) return;

    setIsLoading(true);
    try {
      const data = await importDataFromSheet(file);
      onImportSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCloudConfig = () => {
    saveCloudConfig({ url: cloudUrl, key: cloudKey });
    resetSupabaseClient(); // Re-initialize client with new config
    alert('Đã lưu cấu hình Cloud! Client đã được cập nhật.');
  };

  const handlePushCloud = async () => {
    if (!window.confirm('Đẩy toàn bộ dữ liệu hiện tại lên Cloud? (Sẽ ghi đè dữ liệu cũ trên Cloud)')) return;
    setIsLoading(true);
    setError(null);
    try {
      const revenue = JSON.parse(localStorage.getItem('revenueData') || '[]');
      const invoices = JSON.parse(localStorage.getItem('invoicesData') || '[]');
      const consignment = JSON.parse(localStorage.getItem('consignmentData') || '[]');
      
      await pushToCloud({ revenue, invoices, consignment });
      alert('Đã đồng bộ lên Cloud thành công!');
    } catch (err: any) {
      setError('Lỗi Cloud: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullCloud = async () => {
    if (!window.confirm('Tải dữ liệu từ Cloud về máy này? (Sẽ xóa dữ liệu hiện tại trên máy này)')) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await pullFromCloud();
      onImportSuccess({
        revenueData: data.revenue,
        invoicesData: data.invoices,
        consignmentData: data.consignment
      });
    // FIX: Add curly braces to the catch block to fix syntax error.
    } catch (err: any) {
      setError('Lỗi Cloud: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Đồng bộ dữ liệu</h3>
            <p className="text-xs text-gray-500 font-medium">Chọn phương thức lưu trữ của bạn</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><CloseIcon /></button>
        </div>

        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('excel')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'excel' ? 'border-primary text-primary bg-primary-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Excel & Local
          </button>
          <button 
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-4 ${activeTab === 'cloud' ? 'border-purple-600 text-purple-600 bg-purple-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            ☁️ Cloud Sync (Supabase)
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {activeTab === 'excel' ? (
            <div className="space-y-6">
              <div className="p-5 border-2 border-dashed border-green-200 bg-green-50/50 rounded-2xl flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-green-800">Sao lưu ra Excel</h4>
                    <p className="text-xs text-green-600">Tải toàn bộ dữ liệu về máy dưới dạng file .xlsx</p>
                </div>
                <button onClick={exportDataToSheet} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-200 transition-all">Xuất File</button>
              </div>

              <form onSubmit={handleExcelImport} className="space-y-4">
                <div className="p-5 border-2 border-dashed border-gray-200 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">Nhập từ Excel</h4>
                        <button type="button" onClick={generateSyncTemplate} className="text-[10px] font-black uppercase text-primary hover:underline">Tải mẫu</button>
                    </div>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".xlsx" />
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer py-8 border-2 border-gray-100 border-dashed rounded-xl bg-white hover:bg-gray-50 transition-all text-center"
                    >
                        <UploadIcon className="mx-auto mb-2 text-gray-300 w-10 h-10" />
                        <p className="text-xs font-bold text-gray-500">{file ? file.name : "Nhấn để chọn file backup .xlsx"}</p>
                    </div>
                    {file && (
                        <button type="submit" disabled={isLoading} className="w-full mt-4 bg-primary text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 transition-all">
                            {isLoading ? "Đang xử lý..." : "Nhập & Ghi đè dữ liệu máy này"}
                        </button>
                    )}
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
                <h4 className="font-black text-purple-800 text-sm uppercase mb-4 tracking-tight">Cấu hình kết nối Supabase</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">Project URL</label>
                    <input 
                      type="text" 
                      value={cloudUrl} 
                      onChange={(e) => setCloudUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      className="w-full p-3 rounded-xl border-purple-200 text-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">API Key (Anon Key)</label>
                    <input 
                      type="password" 
                      value={cloudKey} 
                      onChange={(e) => setCloudKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1..."
                      className="w-full p-3 rounded-xl border-purple-200 text-sm focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <button onClick={handleSaveCloudConfig} className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                    Lưu cấu hình Cloud
                  </button>
                </div>
              </div>

              {cloudUrl && cloudKey && (
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handlePushCloud} disabled={isLoading} className="flex flex-col items-center justify-center p-6 border-2 border-purple-100 rounded-3xl hover:bg-purple-50 transition-all group">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <UploadIcon className="text-purple-600" />
                    </div>
                    <span className="text-xs font-black uppercase text-purple-900 tracking-tight">Đẩy lên Cloud</span>
                    <span className="text-[10px] text-purple-400 mt-1">Ghi đè bản lưu online</span>
                  </button>
                  <button onClick={handlePullCloud} disabled={isLoading} className="flex flex-col items-center justify-center p-6 border-2 border-blue-100 rounded-3xl hover:bg-blue-50 transition-all group">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <SyncIcon className="text-blue-600" />
                    </div>
                    <span className="text-xs font-black uppercase text-blue-900 tracking-tight">Tải từ Cloud</span>
                    <span className="text-[10px] text-blue-400 mt-1">Cập nhật về máy này</span>
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setShowSql(!showSql)} 
                  className="text-[10px] font-bold text-gray-400 hover:text-purple-600 flex items-center gap-1"
                >
                  {showSql ? "Ẩn hướng dẫn thiết lập DB" : "Hướng dẫn thiết lập Supabase lần đầu"}
                </button>
                {showSql && (
                  <div className="mt-4 bg-gray-900 p-4 rounded-xl relative">
                    <p className="text-[10px] text-gray-500 mb-2 italic">Copy mã này dán vào SQL Editor của Supabase:</p>
                    <pre className="text-[10px] text-purple-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {SQL_INSTRUCTIONS}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {error && <div className="mt-4 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
            <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-300 transition-all">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default SheetSyncModal;