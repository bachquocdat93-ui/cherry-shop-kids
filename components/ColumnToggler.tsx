import React, { useState, useRef, useEffect } from 'react';
import { SettingsIcon } from './Icons';

interface ColumnTogglerProps {
  columns: { key: string; label: string }[];
  visibleColumns: string[];
  onToggle: (newVisibleColumns: string[]) => void;
}

const ColumnToggler: React.FC<ColumnTogglerProps> = ({ columns, visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);


  const handleCheckboxChange = (columnKey: string) => {
    const newVisibleColumns = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    onToggle(newVisibleColumns);
  };

  return (
    <div className="relative inline-block text-left" ref={wrapperRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm font-bold text-sm border border-gray-200"
        >
          <SettingsIcon className="w-4 h-4" />
          Tùy chỉnh cột
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20" onClick={(e) => e.stopPropagation()}>
          <div className="py-2" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase">Hiển thị các cột</div>
            {columns.map(col => (
              <label key={col.key} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                  checked={visibleColumns.includes(col.key)}
                  onChange={() => handleCheckboxChange(col.key)}
                />
                <span className="ml-3 font-medium">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnToggler;