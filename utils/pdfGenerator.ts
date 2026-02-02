import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, ConsignmentItem, ConsignmentStatus } from '../types';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Helper: Load font to support Vietnamese
const loadFont = async (doc: jsPDF) => {
    try {
        // Load local font from public/fonts folder
        const response = await fetch('/fonts/Roboto-Regular.ttf');
        if (!response.ok) {
            throw new Error(`Failed to load font: ${response.statusText}`);
        }
        const fontBuffer = await response.arrayBuffer();

        // Convert array buffer to base64
        const base64String = btoa(
            new Uint8Array(fontBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        doc.addFileToVFS('Roboto-Regular.ttf', base64String);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto');
        return true;
    } catch (error) {
        console.error("Error loading font:", error);
        // Fallback to standard font (might have encoding issues but better than crashing)
        return false;
    }
};

export const generateInvoicePDF = async (invoice: Invoice) => {
    const doc = new jsPDF();
    await loadFont(doc);
    doc.setFont('Roboto'); // Ensure font is active

    // Header
    doc.setFontSize(22);
    // Pink brand color [236, 72, 153] (Tailwind Pink-500)
    doc.setTextColor(236, 72, 153);
    doc.setFont('Roboto', 'bold');
    doc.text('CHERRY SHOP KIDS', 105, 20, { align: 'center' });

    // Reset font for body
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.setLineWidth(0.5);
    doc.setDrawColor(236, 72, 153); // Pink line
    doc.line(20, 28, 190, 28);

    // Invoice Info
    doc.setFontSize(16);
    doc.text('HÓA ĐƠN BÁN HÀNG', 105, 38, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`Khách hàng: ${invoice.customerName}`, 20, 50);
    doc.text(`Ngày: ${new Date().toLocaleDateString('vi-VN')}`, 140, 50);

    // Table
    const tableColumn = ["STT", "Sản Phẩm", "Đơn Giá", "SL", "Thành Tiền"];
    const tableRows = invoice.items.map((item, index) => [
        index + 1,
        item.productName,
        formatCurrency(item.sellingPrice),
        item.quantity,
        formatCurrency(item.sellingPrice * item.quantity)
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: 'plain', // Remove default striping
        styles: {
            font: 'Roboto',
            fontSize: 10,
            cellPadding: 5,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [236, 72, 153] // Pink border
        },
        headStyles: {
            fillColor: [236, 72, 153], // Pink header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center' }, // STT
            1: { halign: 'left' },   // Sản Phẩm
            2: { halign: 'right' },  // Đơn Giá
            3: { halign: 'center' }, // SL
            4: { halign: 'right' }   // Thành Tiền
        },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 3;

    // Totals
    const totalAmount = invoice.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    const remaining = totalAmount - invoice.deposit;

    // Check if summary fits on page (A4 height is 297mm)
    const pageHeight = doc.internal.pageSize.height || 297;
    if (finalY + 50 > pageHeight) {
        doc.addPage();
        finalY = 20; // Start at top of new page
    }

    // Summary Box
    doc.setFillColor(248, 250, 252); // Very light gray/slate
    doc.setDrawColor(226, 232, 240); // Light border
    doc.rect(20, finalY, 170, 45, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.setFont('Roboto', 'normal'); // Use normal to ensure Vietnamese renders
    doc.text(`TỔNG KẾT`, 30, finalY + 10);

    // Row 1: Total Amount
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`Tổng tiền hàng:`, 30, finalY + 20);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`${formatCurrency(totalAmount)}`, 180, finalY + 20, { align: 'right' });

    // Row 2: Deposit
    doc.setTextColor(71, 85, 105);
    doc.text(`Đã cọc:`, 30, finalY + 28);
    // Keep green for deposit as it indicates paid amount
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text(`${formatCurrency(invoice.deposit)}`, 180, finalY + 28, { align: 'right' });

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(30, finalY + 32, 180, finalY + 32);

    // Row 3: Remaining (Final)
    doc.setFontSize(12);
    // Red-600 to match "Total Transfer" in Consignment image
    doc.setTextColor(220, 38, 38);
    doc.text(`Còn lại:`, 30, finalY + 40);
    doc.setFontSize(14);
    doc.setFont('Roboto', 'normal'); // Use normal to ensure Vietnamese renders
    doc.text(`${formatCurrency(remaining)}`, 180, finalY + 40, { align: 'right' });

    // Save
    doc.save(`HD_${invoice.customerName.replace(/\s+/g, '_')}.pdf`);
};

export const generateConsignmentPDF = async (customerName: string, items: ConsignmentItem[]) => {
    const doc = new jsPDF();
    await loadFont(doc);

    // Calculates
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const soldItems = items.filter(i => i.status === ConsignmentStatus.SOLD);
    const soldQuantity = soldItems.reduce((sum, item) => sum + item.quantity, 0);
    const returnedItems = items.filter(i => i.status === ConsignmentStatus.RETURNED);
    const returnedQuantity = returnedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalTransfer = soldItems.reduce((sum, item) => sum + (item.consignmentPrice * (1 - item.consignmentFee / 100)) * item.quantity, 0);

    // Header
    doc.setFontSize(22);
    // Pink brand color
    doc.setTextColor(236, 72, 153);
    doc.setFont('Roboto', 'bold');
    doc.text('CHERRY SHOP KIDS', 105, 20, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.setFont('Roboto', 'normal');
    doc.text('BÁO CÁO KÝ GỬI', 105, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Khách hàng: ${customerName}`, 20, 42);
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 20, 49);

    // Table
    const tableColumn = ["Sản Phẩm", "Giá Bán", "SL", "Phí %", "Thực nhận/SP", "Trạng Thái", "Ghi chú"];
    const tableRows = items.map(item => [
        item.productName,
        formatCurrency(item.consignmentPrice),
        item.quantity,
        `${item.consignmentFee}%`,
        formatCurrency(item.consignmentPrice * (1 - item.consignmentFee / 100)),
        item.status === ConsignmentStatus.SOLD ? 'Đã bán' :
            (item.status === ConsignmentStatus.DEPOSITED ? 'Mới cọc' :
                (item.status === ConsignmentStatus.RETURNED ? 'Trả hàng' : 'Còn hàng')),
        item.note || ''
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'plain',
        styles: {
            font: 'Roboto',
            fontSize: 10,
            cellPadding: 6,
            valign: 'middle',
            lineWidth: 0.1,
            lineColor: [236, 72, 153]
        },
        headStyles: {
            fillColor: [236, 72, 153], // Pink header
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'left' },   // Tên SP
            1: { halign: 'right' },  // Giá bán
            2: { halign: 'center' }, // SL
            3: { halign: 'center' }, // Phí
            4: { halign: 'right' },  // Thực nhận
            5: { halign: 'center' },  // Trạng thái
            6: { halign: 'left', cellWidth: 30 } // Ghi chú
        },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const item = items[data.row.index];
                if (item.status === ConsignmentStatus.SOLD) {
                    data.cell.styles.fillColor = [254, 243, 199]; // Yellow-100 equivalent
                    data.cell.styles.textColor = [146, 64, 14];   // Yellow-900 equivalent
                } else if (item.status === ConsignmentStatus.DEPOSITED) {
                    data.cell.styles.fillColor = [220, 252, 231]; // Green-100 equivalent
                    data.cell.styles.textColor = [20, 83, 45];    // Green-900 equivalent
                } else if (item.status === ConsignmentStatus.RETURNED) {
                    data.cell.styles.fillColor = [254, 226, 226]; // Red-100 equivalent
                    data.cell.styles.textColor = [127, 29, 29];   // Red-900 equivalent
                }
            }
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 3;

    // Check if summary fits on page (A4 height is 297mm)
    // Need slightly more space now (approx 60mm)
    const pageHeight = doc.internal.pageSize.height || 297;
    if (finalY + 60 > pageHeight) {
        doc.addPage();
        finalY = 20; // Start at top of new page
    }

    // Summary Box
    doc.setFillColor(248, 250, 252); // Very light gray/slate
    doc.setDrawColor(226, 232, 240); // Light border
    doc.rect(20, finalY, 170, 52, 'FD'); // Increased height to 52

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85); // Slate-700
    doc.text(`TỔNG KẾT`, 30, finalY + 10);

    doc.setFontSize(10);
    // Row 1: Total
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`Tổng số lượng ký gửi:`, 30, finalY + 20);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(`${totalItems}`, 80, finalY + 20);

    // Row 2: Sold
    doc.setTextColor(71, 85, 105);
    doc.text(`Đã bán:`, 30, finalY + 28);
    doc.setTextColor(180, 83, 9); // Amber-700 for sold count
    doc.text(`${soldQuantity}`, 80, finalY + 28);

    // Row 3: Returned (New)
    doc.setTextColor(71, 85, 105);
    doc.text(`Đã trả lại:`, 30, finalY + 36);
    doc.setTextColor(220, 38, 38); // Red-600 for returned count
    doc.text(`${returnedQuantity}`, 80, finalY + 36);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(30, finalY + 40, 180, finalY + 40);

    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text(`Tổng tiền shop thanh toán:`, 30, finalY + 48);
    doc.setFontSize(14);
    doc.text(`${formatCurrency(totalTransfer)}`, 180, finalY + 48, { align: 'right' });

    doc.save(`KyGui_${customerName.replace(/\s+/g, '_')}.pdf`);
};
