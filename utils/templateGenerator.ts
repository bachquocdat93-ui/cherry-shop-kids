import * as XLSX from 'xlsx';

function downloadExcel(data: any[], headers: string[], filename: string) {
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
}

export function generateRevenueTemplate() {
    const headers = ['Ngày', 'Tên Khách Hàng', 'Tên Sản Phẩm', 'Giá Nhập', 'Giá Bán Lẻ', 'Số Lượng', 'Trạng Thái', 'Khách ký gửi', 'Note'];
    const today = new Date().toISOString().slice(0, 10);
    const data = [
        {
            'Ngày': today,
            'Tên Khách Hàng': 'Nguyễn Thu Trang',
            'Tên Sản Phẩm': 'Váy voan hoa nhí',
            'Giá Nhập': 120000,
            'Giá Bán Lẻ': 250000,
            'Số Lượng': 1,
            'Trạng Thái': 'Dồn đơn',
            'Khách ký gửi': '',
            'Note': 'Khách quen',
        },
    ];
    downloadExcel(data, headers, 'Mau_Nhap_Doanh_Thu.xlsx');
}

export function generateInvoicesTemplate() {
    const headers = ['Tên Khách Hàng', 'Tên Sản Phẩm', 'Giá Bán', 'Số Lượng', 'Đã Cọc', 'Trạng Thái'];
    const data = [
        {
            'Tên Khách Hàng': 'Lê Anh Dũng',
            'Tên Sản Phẩm': 'Quần Jean ống rộng',
            'Giá Bán': 380000,
            'Số Lượng': 1,
            'Đã Cọc': 100000,
            'Trạng Thái': 'Dồn đơn',
        },
    ];
    downloadExcel(data, headers, 'Mau_Nhap_Hoa_Don.xlsx');
}

export function generateConsignmentTemplate() {
    const headers = ['Tên Khách Hàng', 'Tên Sản Phẩm', 'Giá Gửi Bán', 'Số Lượng', 'Phí ký gửi (%)', 'Trạng Thái', 'Note'];
    const data = [
        {
            'Tên Khách Hàng': 'Phan Thị Thanh',
            'Tên Sản Phẩm': 'Giày sneaker trắng',
            'Giá Gửi Bán': 500000,
            'Số Lượng': 1,
            'Phí ký gửi (%)': 20,
            'Trạng Thái': 'Còn hàng',
            'Note': 'Size 38',
        },
    ];
    downloadExcel(data, headers, 'Mau_Nhap_Ky_Gui.xlsx');
}
