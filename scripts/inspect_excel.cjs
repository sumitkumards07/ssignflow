
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'users.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length > 0) {
        console.log("Excel Headers:", JSON.stringify(data[0]));
        console.log("First Row Data:", JSON.stringify(data[1]));
    } else {
        console.log("Excel file is empty.");
    }
} catch (error) {
    console.error("Error reading Excel file:", error.message);
}
