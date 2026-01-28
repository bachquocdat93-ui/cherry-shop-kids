import React, { useState, useRef } from 'react';
import { CloseIcon, UploadIcon } from './Icons';

interface ImportModalProps {
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  title: string;
  instructions: React.ReactNode;
  onDownloadTemplate?: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, title, instructions, onDownloadTemplate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn một file.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onImport(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi nhập file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 text-sm text-blue-800">
            <div className="flex justify-between items-center">
               <h4 className="font-bold mb-2">Hướng dẫn định dạng file:</h4>
               {onDownloadTemplate && (
                 <a href="#" onClick={(e) => { e.preventDefault(); onDownloadTemplate(); }} className="text-sm font-medium text-primary hover:underline">
                    Tải file mẫu
                 </a>
                )}
            </div>
            {instructions}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel (.xlsx, .csv):</label>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
              />
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={handleTriggerFileUpload}
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Tải file lên</span>
                    </button>
                    <p className="pl-1">hoặc kéo và thả</p>
                  </div>
                  <p className="text-xs text-gray-500">{file ? file.name : 'Chưa có file nào được chọn'}</p>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end pt-4 space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-700 disabled:bg-primary-300">
                {isLoading ? 'Đang xử lý...' : 'Nhập Dữ Liệu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
