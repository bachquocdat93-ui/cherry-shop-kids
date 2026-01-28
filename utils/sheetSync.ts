import * as XLSX from 'xlsx';
import type { RevenueEntry, Invoice, InvoiceItem, ConsignmentItem } from '../types';
import { ConsignmentStatus, RevenueStatus } from '../types';
import { generateUniqueId } from './helpers';

// --- EXPORT FUNCTIONALITY ---

export function exportDataToSheet() {
    // 1. Read data from localStorage
    const revenueData: RevenueEntry[] = JSON.parse(localStorage.getItem('revenueData') || '[]');
    const invoicesData: Invoice[] = JSON.parse(localStorage.getItem('invoicesData') || '[]');
    const consignmentData: ConsignmentItem[] = JSON.parse(localStorage.getItem('consignmentData') || '[]');

    // 2. Prepare data for sheets
    const revenueSheetData = revenueData.map(item => ({
        'ID': item.id,
        'Ngày': item.date,
        'Tên Khách Hàng': item.customerName,
        'Tên Sản Phẩm': item.productName,
        'Giá Nhập': item.costPrice,
        'Giá Bán Lẻ': item.retailPrice,
        'Số Lượng': item.quantity,
        'Trạng Thái': item.status,
        'Khách ký gửi': item.consignor,
        'Note': item.note,
    }));

    // Flatten invoices data for better sheet representation
    const invoicesSheetData = invoicesData.flatMap(invoice => 
        invoice.items.map((item, index) => ({
            'ID Hóa Đơn': invoice.id,
            'Tên Khách Hàng': invoice.customerName,
            'Đã Cọc': index === 0 ? invoice.deposit : '', 
            'ID Sản Phẩm': item.id,
            'Tên Sản Phẩm': item.productName,
            'Giá Bán': item.sellingPrice,
            'Số Lượng': item.quantity,
            'Trạng Thái': item.status,
        }))
    );
    
    const consignmentSheetData = consignmentData.map(item => ({
        'ID': item.id,
        'Tên Khách Hàng': item.customerName,
        'Tên Sản Phẩm': item.productName,
        'Giá Gửi Bán': item.consignmentPrice,
        'Số Lượng': item.quantity,
        'Phí ký gửi (%)': item.consignmentFee,
        'Trạng Thái': item.status,
        'Note': item.note,
    }));

    // 3. Create workbook and worksheets
    const wb = XLSX.utils.book_new();
    const wsRevenue = XLSX.utils.json_to_sheet(revenueSheetData);
    const wsInvoices = XLSX.utils.json_to_sheet(invoicesSheetData);
    const wsConsignment = XLSX.utils.json_to_sheet(consignmentSheetData);

    XLSX.utils.book_append_sheet(wb, wsRevenue, 'DoanhThu');
    XLSX.utils.book_append_sheet(wb, wsInvoices, 'HoaDon');
    XLSX.utils.book_append_sheet(wb, wsConsignment, 'KyGui');

    // 4. Record backup time
    const now = new Date().toISOString();
    localStorage.setItem('lastBackupAt', now);
    window.dispatchEvent(new Event('storage'));

    // 5. Trigger download
    XLSX.writeFile(wb, 'CherryShop_Backup.xlsx');
}


// --- IMPORT FUNCTIONALITY ---

export async function importDataFromSheet(file: File): Promise<{
    revenueData: RevenueEntry[];
    invoicesData: Invoice[];
    consignmentData: ConsignmentItem[];
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                // Sheet validation
                const requiredSheets = ['DoanhThu', 'HoaDon', 'KyGui'];
                for (const sheetName of requiredSheets) {
                    if (!workbook.SheetNames.includes(sheetName)) {
                        throw new Error(`File Excel phải chứa sheet có tên: "${sheetName}"`);
                    }
                }

                // Process Revenue
                const revenueSheet = workbook.Sheets['DoanhThu'];
                const rawRevenue = XLSX.utils.sheet_to_json(revenueSheet) as any[];
                const revenueData = rawRevenue.map(row => {
                    const statusRaw = String(row['Trạng Thái'] || 'Dồn đơn').trim();
                    let status: RevenueStatus = RevenueStatus.HOLDING;
                    if (statusRaw === RevenueStatus.DELIVERED) status = RevenueStatus.DELIVERED;
                    else if (statusRaw === RevenueStatus.SHIPPING) status = RevenueStatus.SHIPPING;

                    return {
                        id: String(row['ID'] || generateUniqueId()),
                        date: String(row['Ngày'] || new Date().toISOString().slice(0, 10)),
                        customerName: String(row['Tên Khách Hàng'] || ''),
                        productName: String(row['Tên Sản Phẩm'] || ''),
                        costPrice: Number(row['Giá Nhập'] || 0),
                        retailPrice: Number(row['Giá Bán Lẻ'] || 0),
                        quantity: Number(row['Số Lượng'] || 1),
                        consignor: String(row['Khách ký gửi'] || ''),
                        note: String(row['Note'] || ''),
                        status: status,
                    };
                });

                // Process Invoices (un-flatten)
                const invoicesSheet = workbook.Sheets['HoaDon'];
                const rawInvoices = XLSX.utils.sheet_to_json(invoicesSheet) as any[];
                const groupedByInvoiceId: { [id: string]: Invoice } = {};
                rawInvoices.forEach((row, index) => {
                    const invoiceId = row['ID Hóa Đơn'] ? String(row['ID Hóa Đơn']) : null;
                    if (!invoiceId) {
                         throw new Error(`Dòng ${index + 2} trong sheet HoaDon thiếu "ID Hóa Đơn" bắt buộc.`);
                    }

                    if (!groupedByInvoiceId[invoiceId]) {
                        groupedByInvoiceId[invoiceId] = {
                            id: invoiceId,
                            customerName: String(row['Tên Khách Hàng']),
                            deposit: Number(row['Đã Cọc'] || 0),
                            items: [],
                        };
                    }

                    const statusRaw = String(row['Trạng Thái'] || 'Dồn đơn').trim();
                    let status: RevenueStatus = RevenueStatus.HOLDING;
                    if (statusRaw === RevenueStatus.DELIVERED) status = RevenueStatus.DELIVERED;
                    else if (statusRaw === RevenueStatus.SHIPPING) status = RevenueStatus.SHIPPING;

                    groupedByInvoiceId[invoiceId].items.push({
                        id: String(row['ID Sản Phẩm'] || generateUniqueId()),
                        productName: String(row['Tên Sản Phẩm']),
                        sellingPrice: Number(row['Giá Bán']),
                        quantity: Number(row['Số Lượng']),
                        status: status,
                    });
                });
                const invoicesData = Object.values(groupedByInvoiceId);

                // Process Consignment
                const consignmentSheet = workbook.Sheets['KyGui'];
                const rawConsignment = XLSX.utils.sheet_to_json(consignmentSheet) as any[];
                const consignmentData = rawConsignment.map(row => {
                     const statusRaw = String(row['Trạng Thái'] || 'Còn hàng').trim();
                      let status: ConsignmentStatus;
                        if (statusRaw === ConsignmentStatus.SOLD) {
                            status = ConsignmentStatus.SOLD;
                        } else if (statusRaw === ConsignmentStatus.DEPOSITED) {
                            status = ConsignmentStatus.DEPOSITED;
                        } else {
                            status = ConsignmentStatus.IN_STOCK;
                        }
                    return {
                        id: String(row['ID'] || generateUniqueId()),
                        customerName: String(row['Tên Khách Hàng']),
                        productName: String(row['Tên Sản Phẩm']),
                        consignmentPrice: Number(row['Giá Gửi Bán']),
                        quantity: Number(row['Số Lượng'] || 1),
                        consignmentFee: Number(row['Phí ký gửi (%)'] || 20),
                        status: status,
                        note: String(row['Note'] || ''),
                    };
                });
                
                resolve({ revenueData, invoicesData, consignmentData });

            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(new Error('Lỗi khi đọc file.'));
        reader.readAsArrayBuffer(file);
    });
}

// --- TEMPLATE GENERATION ---

export function generateSyncTemplate() {
    const wb = XLSX.utils.book_new();

    // DoanhThu Sheet
    const wsRevenue = XLSX.utils.json_to_sheet([
        { 
            'ID': 'rev_1688888888888-abcdef', 
            'Ngày': new Date().toISOString().slice(0, 10),
            'Tên Khách Hàng': 'Nguyễn Văn A', 
            'Tên Sản Phẩm': 'Áo Thun', 
            'Giá Nhập': 50000, 
            'Giá Bán Lẻ': 150000, 
            'Số Lượng': 2, 
            'Trạng Thái': 'Dồn đơn', 
            'Khách ký gửi': '', 
            'Note': 'Ghi chú' 
        }
    ]);
     XLSX.utils.book_append_sheet(wb, wsRevenue, 'DoanhThu');
    
    // HoaDon Sheet
    const wsInvoices = XLSX.utils.json_to_sheet([
        { 'ID Hóa Đơn': 'inv_1688888888888-pqrstuv', 'Tên Khách Hàng': 'Trần Thị B', 'Đã Cọc': 50000, 'ID Sản Phẩm': 'item_1688888888888-uvwxyz', 'Tên Sản Phẩm': 'Váy Hoa', 'Giá Bán': 200000, 'Số Lượng': 1, 'Trạng Thái': 'Đã giao hàng' },
        { 'ID Hóa Đơn': 'inv_1688888888888-pqrstuv', 'Tên Khách Hàng': 'Trần Thị B', 'Đã Cọc': '', 'ID Sản Phẩm': 'item_1688888888888-ghijkl', 'Tên Sản Phẩm': 'Kẹp Tóc', 'Giá Bán': 25000, 'Số Lượng': 2, 'Trạng Thái': 'Dồn đơn' },
    ]);
     XLSX.utils.book_append_sheet(wb, wsInvoices, 'HoaDon');

    // KyGui Sheet
    const wsConsignment = XLSX.utils.json_to_sheet([
        { 'ID': 'con_1688888888888-mnopqr', 'Tên Khách Hàng': 'Lê Văn C', 'Tên Sản Phẩm': 'Túi Da', 'Giá Gửi Bán': 500000, 'Số Lượng': 1, 'Phí ký gửi (%)': 20, 'Trạng Thái': 'Còn hàng', 'Note': 'Hàng mới' }
    ]);
     XLSX.utils.book_append_sheet(wb, wsConsignment, 'KyGui');

    XLSX.writeFile(wb, 'CherryShop_Backup_Mau.xlsx');
}
