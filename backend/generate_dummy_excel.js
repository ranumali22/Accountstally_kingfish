const XLSX = require('xlsx');
const path = require('path');

const data = [
  {
    "Invoice No": "INV-001",
    "Invoice Date": "2026-04-01",
    "Name": "ABC Enterprises",
    "GST Number": "07AAAAA0000A1Z5",
    "State": "Delhi",
    "Item Name": "Wireless Mouse",
    "Qty": 10,
    "Price": 500,
    "Tax %": 18,
    "Grand Total": 5900,
    "Paid Amount": 5900
  },
  {
    "Invoice No": "INV-002",
    "Invoice Date": "2026-04-02",
    "Name": "Global Solutions",
    "GST Number": "08BBBBB1111B1Z2",
    "State": "Rajasthan",
    "Item Name": "Laptop Stand",
    "Qty": 5,
    "Price": 1200,
    "Tax %": 12,
    "Grand Total": 6720,
    "Paid Amount": 3000
  },
  {
    "Invoice No": "INV-003",
    "Invoice Date": "2026-04-03",
    "Name": "Modern Retailers",
    "GST Number": "09CCCCC2222C1Z3",
    "State": "Uttar Pradesh",
    "Item Name": "USB Cable",
    "Qty": 50,
    "Price": 150,
    "Tax %": 5,
    "Grand Total": 7875,
    "Paid Amount": 0
  },
  {
    "Invoice No": "INV-004",
    "Invoice Date": "2026-04-04",
    "Name": "Tech Hub",
    "GST Number": "10DDDDD3333D1Z4",
    "State": "Bihar",
    "Item Name": "Mechanical Keyboard",
    "Qty": 2,
    "Price": 2500,
    "Tax %": 18,
    "Grand Total": 5900,
    "Paid Amount": 5900
  },
  {
    "Invoice No": "INV-005",
    "Invoice Date": "2026-04-05",
    "Name": "Sunrise Traders",
    "GST Number": "11EEEEE4444E1Z1",
    "State": "Haryana",
    "Item Name": "Monitor Arm",
    "Qty": 3,
    "Price": 3000,
    "Tax %": 18,
    "Grand Total": 10620,
    "Paid Amount": 5000
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sales");

const filePath = path.join(process.cwd(), 'dummy_sales_data.xlsx');
XLSX.writeFile(wb, filePath);

console.log('Excel file created at:', filePath);
