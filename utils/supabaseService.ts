import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CloudConfig {
  url: string;
  key: string;
}

export const getCloudConfig = (): CloudConfig | null => {
  const cfg = localStorage.getItem('supabase_config');
  return cfg ? JSON.parse(cfg) : null;
};

export const saveCloudConfig = (config: CloudConfig) => {
  localStorage.setItem('supabase_config', JSON.stringify(config));
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = () => {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    const config = getCloudConfig();
    if (config?.url && config.key) {
        supabaseInstance = createClient(config.url, config.key);
        return supabaseInstance;
    }
    console.warn("Supabase client not initialized. Check your cloud config.");
    return null;
}

export const resetSupabaseClient = () => {
    supabaseInstance = null;
    getSupabaseClient(); // Immediately try to create a new one
}


export const pushToCloud = async (data: {
  revenue: any[];
  invoices: any[];
  consignment: any[];
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Chưa cấu hình Supabase");

  // Xóa dữ liệu cũ và đẩy dữ liệu mới (Cách đơn giản cho shop nhỏ)
  // Trong thực tế nên dùng upsert, nhưng ở đây chúng ta ưu tiên tính đồng nhất
  
  const { error: err1 } = await supabase.from('shop_data').upsert({ 
    id: 'current_store_data', 
    content: data,
    updated_at: new Date().toISOString()
  });

  if (err1) throw err1;
  
  localStorage.setItem('lastCloudSyncAt', new Date().toISOString());
  return true;
};

export const pullFromCloud = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Chưa cấu hình Supabase");

  const { data, error } = await supabase
    .from('shop_data')
    .select('content')
    .eq('id', 'current_store_data')
    .single();

  if (error) throw error;
  return data.content;
};

export const SQL_INSTRUCTIONS = `
-- Chạy lệnh này trong SQL Editor của Supabase:

-- (Nếu bạn đã cài đặt trước đó) Xóa bảng cũ để bắt đầu lại:
-- DROP TABLE IF EXISTS shop_data;

-- BƯỚC 1: Tạo bảng lưu trữ dữ liệu mới (không cần cột user_id)
CREATE TABLE IF NOT EXISTS shop_data (
  id TEXT PRIMARY KEY,
  content JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BƯỚC 2: Bật Row Level Security (RLS)
ALTER TABLE shop_data ENABLE ROW LEVEL SECURITY;

-- BƯỚC 3: Tạo Policy cho phép ứng dụng đọc/ghi công khai
-- Lưu ý: Điều này cho phép bất kỳ ai có URL và anon key của bạn truy cập dữ liệu.
CREATE POLICY "Public Access"
ON shop_data
FOR ALL
USING (true)
WITH CHECK (true);
`;