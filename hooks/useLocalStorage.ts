import React, { useState } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    setStoredValue(currentValue => {
      const valueToStore = value instanceof Function ? value(currentValue) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        
        // Notify other components (using setTimeout to prevent React strict-mode/synchronous recursive state updates)
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('local-data-change', { detail: { key } }));
        }, 0);
        
        return valueToStore;
      } catch (error) {
        console.error("useLocalStorage Error:", error);
        if ((error as Error).name === 'QuotaExceededError' || String(error).toLowerCase().includes('quota')) {
          alert('Bộ nhớ đã đầy (lưu quá nhiều ảnh)! Vui lòng xoá bớt dữ liệu cũ hoặc xoá bớt ảnh trước khi thêm tiếp.');
        } else {
          alert('Lỗi lưu trữ dữ liệu!');
        }
        return currentValue;
      }
    });
  };

  React.useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error(error);
      }
    };

    const handleLocalDataChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        handleStorageChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-data-change', handleLocalDataChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-data-change', handleLocalDataChange as EventListener);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
