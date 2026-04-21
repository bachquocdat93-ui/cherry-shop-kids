export interface RevenueEntry {
  id: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  productName: string;
  costPrice: number;
  retailPrice: number;
  quantity: number;
  note?: string;
  consignor?: string;
  shopItemId?: string; // Link to Shop Inventory
  consignmentItemId?: string; // Link to Consignment Inventory
  imageUrl?: string;
  status: RevenueStatus;
}

export enum RevenueStatus {
  DELIVERED = 'Đã giao hàng',
  SHIPPING = 'Đang đi đơn',
  HOLDING = 'Dồn đơn',
  RETURNED = 'Đã hoàn',
}

export interface InvoiceItem {
  id: string;
  productName: string;
  sellingPrice: number;
  quantity: number;
  status: RevenueStatus;
  shopItemId?: string; // Link to Shop Inventory
  revenueEntryId?: string; // Link to Revenue Entry
  consignmentItemId?: string; // Link to Consignment Inventory
}

export interface Invoice {
  id: string;
  customerName: string;
  items: InvoiceItem[];
  deposit: number;
  shippingFee?: number;
  discount?: number;
}

export enum ConsignmentStatus {
  IN_STOCK = 'Còn hàng',
  DEPOSITED = 'Mới cọc',
  SOLD = 'Đã bán',
  RETURNED = 'Trả hàng',
}

export interface ConsignmentItem {
  id: string;
  customerName: string;
  productName: string;
  consignmentPrice: number;
  quantity: number;
  soldQuantity?: number;
  consignmentFee: number; // Percentage
  status: ConsignmentStatus;
  note?: string;
  imageUrl?: string;
  isFee?: boolean; // Nếu true, đây là khoản phí trừ trực tiếp vào tiền thanh toán
}

export interface CustomerInfo {
  name: string;
  phone?: string;
  address?: string;
}

export type UserRole = 'ADMIN' | 'STAFF';

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // Storing plain string for offline/mock auth
  role: UserRole;
  fullName: string;
}

export interface ShopItem {
  id: string;
  productName: string;
  importPrice: number;
  retailPrice: number;
  quantity: number;
  note?: string;
  imageUrl?: string;
}

export type AuditLogCategory = 'DOANH_THU' | 'HOA_DON' | 'KY_GUI' | 'KHO_HANG' | 'NHAN_SU' | 'HE_THONG';

export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  userFullName: string;
  userRole: UserRole;
  category: AuditLogCategory;
  action: string;
  details?: string;
}

export type Page = 'dashboard' | 'revenue' | 'invoices' | 'consignment' | 'reports' | 'customers' | 'inventory' | 'staff' | 'logs';