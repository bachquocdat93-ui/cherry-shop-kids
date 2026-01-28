import * as XLSX from 'xlsx';
import type { RevenueEntry, Invoice, InvoiceItem, ConsignmentItem } from '../types';
import { ConsignmentStatus, RevenueStatus } from '../types';
import { generateUniqueId } from './helpers';

// Helper to normalize header keys and handle common variations
const normalizeKey = (key: string) => {
    let normalized = key.trim().toLowerCase();
    normalized = normalized.replace(/\s+/g, '_');
    normalized = normalized.replace(/[()%.]/g, ''); 
    return normalized;
};

// Generic file parser
async function parseExcelFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as T[];
        resolve(json);
      } catch (error) {
        reject(new Error('File không hợp lệ hoặc không thể đọc.'));
      }
    };
    reader.onerror = (error) => reject(new Error('Lỗi khi đọc file.'));
    reader.readAsArrayBuffer(file);
  });
}

const getValue = (obj: any, keys: string[]) => {
    for (const key of keys) {
        const normalizedTarget = normalizeKey(key);
        if (obj[normalizedTarget] !== undefined) return obj[normalizedTarget];
    }
    return undefined;
};

export async function transformToRevenueData(file: File): Promise<RevenueEntry[]> {
  const rawData = await parseExcelFile<any>(file);
  
  return rawData.map((row, index) => {
    const normalizedRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    
    const productName = getValue(normalizedRow, ['Tên Sản Phẩm', 'Sản Phẩm', 'Product Name']);
    const retailPrice = getValue(normalizedRow, ['Giá Bán Lẻ', 'Giá Bán', 'Retail Price']);
    const quantity = getValue(normalizedRow, ['Số Lượng', 'SL', 'Quantity']);
    const dateRaw = getValue(normalizedRow, ['Ngày', 'Ngày bán', 'Date']);

    if (!productName || retailPrice === undefined || quantity === undefined) {
        throw new Error(`Dòng ${index + 2}: Thiếu thông tin bắt buộc (Tên SP, Giá bán hoặc SL).`);
    }

    let date = new Date().toISOString().slice(0, 10);
    if (dateRaw) {
        // Simple Excel date conversion if needed or string parsing
        const parsedDate = new Date(dateRaw);
        if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().slice(0, 10);
        }
    }

    const statusRaw = String(getValue(normalizedRow, ['Trạng Thái', 'Status']) || '').trim().toLowerCase();
    let status: RevenueStatus = RevenueStatus.HOLDING;
    if (statusRaw.includes('giao')) status = RevenueStatus.DELIVERED;
    else if (statusRaw.includes('đi đơn') || statusRaw.includes('đang đi')) status = RevenueStatus.SHIPPING;

    return {
      id: generateUniqueId(),
      date,
      productName: String(productName),
      customerName: String(getValue(normalizedRow, ['Tên Khách Hàng', 'Khách Hàng', 'Customer']) || ''),
      costPrice: Number(getValue(normalizedRow, ['Giá Nhập', 'Cost Price']) || 0),
      retailPrice: Number(retailPrice),
      quantity: Number(quantity),
      consignor: String(getValue(normalizedRow, ['Khách ký gửi', 'Ký gửi', 'Consignor']) || ''),
      note: String(getValue(normalizedRow, ['Ghi chú', 'Note']) || ''),
      status: status,
    };
  });
}

export async function transformToInvoiceData(file: File): Promise<Invoice[]> {
    const rawData = await parseExcelFile<any>(file);
    const groupedByCustomer: { [key: string]: any[] } = {};
    rawData.forEach((row, index) => {
        const normalizedRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
        const customerName = getValue(normalizedRow, ['Tên Khách Hàng', 'Khách Hàng', 'Customer']);
        if (!customerName) throw new Error(`Dòng ${index + 2}: Thiếu cột Tên Khách Hàng.`);
        const customerStr = String(customerName);
        if (!groupedByCustomer[customerStr]) groupedByCustomer[customerStr] = [];
        groupedByCustomer[customerStr].push(normalizedRow);
    });

    return Object.entries(groupedByCustomer).map(([customerName, items]) => {
        const invoiceItems: InvoiceItem[] = items.map((item) => {
            const statusRaw = String(getValue(item, ['Trạng Thái', 'Status']) || '').trim().toLowerCase();
            let status: RevenueStatus = RevenueStatus.HOLDING;
            if (statusRaw.includes('giao')) status = RevenueStatus.DELIVERED;
            else if (statusRaw.includes('đi đơn')) status = RevenueStatus.SHIPPING;
            return {
                id: generateUniqueId(),
                productName: String(getValue(item, ['Tên Sản Phẩm', 'Sản Phẩm']) || 'SP không tên'),
                sellingPrice: Number(getValue(item, ['Giá Bán', 'Đơn Giá']) || 0),
                quantity: Number(getValue(item, ['Số Lượng', 'SL']) || 1),
                status: status,
            };
        });
        return {
            id: generateUniqueId(),
            customerName,
            items: invoiceItems,
            deposit: Number(getValue(items[0], ['Đã Cọc', 'Tiền Cọc']) || 0)
        };
    });
}

export async function transformToConsignmentData(file: File): Promise<ConsignmentItem[]> {
    const rawData = await parseExcelFile<any>(file);
    return rawData.map((row, index) => {
        const normalizedRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
        const customerName = getValue(normalizedRow, ['Tên Khách Hàng', 'Khách Ký Gửi', 'Người Gửi']);
        const productName = getValue(normalizedRow, ['Tên Sản Phẩm', 'Sản Phẩm', 'Mặt Hàng']);
        const consignmentPrice = getValue(normalizedRow, ['Giá Gửi Bán', 'Giá Gửi', 'Giá Bán']);
        if (!customerName || !productName || consignmentPrice === undefined) {
            throw new Error(`Dòng ${index + 2}: Thiếu thông tin bắt buộc cho Ký gửi.`);
        }
        const statusRaw = String(getValue(normalizedRow, ['Trạng Thái', 'Status']) || 'Còn hàng').trim().toLowerCase();
        let status: ConsignmentStatus = statusRaw.includes('bán') ? ConsignmentStatus.SOLD : statusRaw.includes('cọc') ? ConsignmentStatus.DEPOSITED : ConsignmentStatus.IN_STOCK;
        const fee = getValue(normalizedRow, ['Phí ký gửi', 'Phí', 'Chiết khấu', 'Fee', 'Phí %']);
        return {
            id: generateUniqueId(),
            customerName: String(customerName),
            productName: String(productName),
            consignmentPrice: Number(consignmentPrice),
            quantity: Number(getValue(normalizedRow, ['Số Lượng', 'SL']) || 1),
            consignmentFee: Number(fee || 20),
            status,
            note: String(getValue(normalizedRow, ['Ghi chú', 'Note']) || '')
        };
    });
}
