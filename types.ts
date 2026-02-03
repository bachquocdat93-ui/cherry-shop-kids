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
  status: RevenueStatus;
}

export enum RevenueStatus {
  DELIVERED = 'Đã giao hàng',
  SHIPPING = 'Đang đi đơn',
  HOLDING = 'Dồn đơn',
}

export interface InvoiceItem {
  id: string;
  productName: string;
  sellingPrice: number;
  quantity: number;
  status: RevenueStatus;
  shopItemId?: string; // Link to Shop Inventory
}

export interface Invoice {
  id: string;
  customerName: string;
  items: InvoiceItem[];
  deposit: number;
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
  consignmentFee: number; // Percentage
  status: ConsignmentStatus;
  note?: string;
}

export interface CustomerInfo {
  name: string;
  phone?: string;
  address?: string;
}

export interface ShopItem {
  id: string;
  productName: string;
  importPrice: number;
  retailPrice: number;
  quantity: number;
  note?: string;
}

export type Page = 'dashboard' | 'revenue' | 'invoices' | 'consignment' | 'reports' | 'customers' | 'inventory';