import React, { useState } from 'react';
import { SettingsIcon, TrashIcon as CloseIcon } from './Icons';

interface ColumnTogglerProps {
  columns: { key: string; label: string }[];
  visibleColumns: string[];
  onToggle: (columns: string[]) => void;
}

const ColumnToggler: React.FC<ColumnTogglerProps> = ({ columns, visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle a column
  const handleCheckboxChange = (columnKey: string) => {
    const newVisibleColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    onToggle(newVisibleColumns);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-bold text-sm border border-gray-200"
      >
        <SettingsIcon className="w-4 h-4" />
        Tùy chỉnh cột
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-800">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="p-2 overflow-y-auto">
              {columns.map(col => (
                <label
                  key={col.key}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors select-none"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => handleCheckboxChange(col.key)}
                    />
                  </div>
                  <span className="ml-3 font-medium text-gray-700">{col.label}</span>
                </label>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ColumnToggler;