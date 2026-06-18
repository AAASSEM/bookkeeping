import * as XLSX from 'xlsx-js-style';
import {
  ExcelColors,
  createHeaderStyle,
  createTitleStyle,
  createSubtotalStyle,
  createTotalStyle,
  createDateStyle,
  createAmountStyle,
  createDataStyle,
  applyCellStyle
} from '@/utils/excelStyles';
import { formatDate } from '@/utils/dateFormatter';
import type { Transaction, InventoryItem, Partner } from '@/types';
import {
  generateIncomeStatementData,
  generateBalanceSheetData,
  generateGeneralJournalData,
  generateInventoryLedgerData,
  generateSalesLedgerData,
  generateCashFlowStatementData,
  generateTrialBalanceData
} from './statementData';
import { calculateIncomeStatement } from './financialCalculations';

interface ExportParams {
  transactions: Transaction[];
  inventory: InventoryItem[];
  cash: number;
  partners: Partner[];
  additionalTransactions?: Transaction[];
}

// Builds the multi-sheet financial statements workbook and triggers a download.
// Throws on failure; callers handle success/error UI.
export const exportFinancialStatements = ({ transactions, inventory, cash, partners, additionalTransactions }: ExportParams) => {
  const allTransactions = [...transactions, ...(Array.isArray(additionalTransactions) ? additionalTransactions : [])];

  // Calculate net income
  const { netIncome } = calculateIncomeStatement(allTransactions);

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: false }] };

  // Income Statement with formatting
  const incomeStatementData = generateIncomeStatementData(allTransactions);
  const isSheet = XLSX.utils.aoa_to_sheet(incomeStatementData);

  // Set column widths
  isSheet['!cols'] = [{ wch: 35 }, { wch: 20 }];

  // Merge title (row 1)
  if (!isSheet['!merges']) isSheet['!merges'] = [];
  isSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

  // Apply formatting
  // Row 1: Title
  applyCellStyle(isSheet, 'A1', createTitleStyle(ExcelColors.deepGreen));

  // Row 3: Revenue header (deep green with white text)
  applyCellStyle(isSheet, 'A3', createHeaderStyle(ExcelColors.deepGreen, 'FFFFFFFF'));
  applyCellStyle(isSheet, 'B3', createHeaderStyle(ExcelColors.deepGreen, 'FFFFFFFF'));

  // Row 4: Sales Revenue (light green with black text)
  applyCellStyle(isSheet, 'A4', createDataStyle(ExcelColors.lightGreen));
  applyCellStyle(isSheet, 'B4', createAmountStyle(ExcelColors.lightGreen));

  // Row 6: COGS header (light red with BLACK text)
  applyCellStyle(isSheet, 'A6', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));
  applyCellStyle(isSheet, 'B6', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));

  // Row 7: COGS amount (light red)
  applyCellStyle(isSheet, 'A7', createDataStyle(ExcelColors.lightRed));
  applyCellStyle(isSheet, 'B7', createAmountStyle(ExcelColors.lightRed));

  // Row 8: Gross Profit (medium green subtotal with BLACK text) - CENTERED
  applyCellStyle(isSheet, 'A8', { ...createSubtotalStyle(ExcelColors.mediumGreen, 'FF000000'), alignment: { horizontal: 'center', vertical: 'center' } });
  applyCellStyle(isSheet, 'B8', { ...createAmountStyle(ExcelColors.mediumGreen), font: { bold: true, color: { rgb: 'FF000000' } } });

  // Row 9: Gains (light green)
  applyCellStyle(isSheet, 'A9', createDataStyle(ExcelColors.lightGreen));
  applyCellStyle(isSheet, 'B9', createAmountStyle(ExcelColors.lightGreen));

  // Row 10: Total Profitability (medium green with BLACK text) - CENTERED
  applyCellStyle(isSheet, 'A10', { ...createSubtotalStyle(ExcelColors.mediumGreen, 'FF000000'), alignment: { horizontal: 'center', vertical: 'center' } });
  applyCellStyle(isSheet, 'B10', { ...createAmountStyle(ExcelColors.mediumGreen), font: { bold: true, color: { rgb: 'FF000000' } } });

  // Row 12: Operating Expenses header (light red with BLACK text)
  applyCellStyle(isSheet, 'A12', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));
  applyCellStyle(isSheet, 'B12', createHeaderStyle(ExcelColors.lightRed, 'FF000000'));

  // Row 13-14: Expenses and Losses (light red)
  applyCellStyle(isSheet, 'A13', createDataStyle(ExcelColors.lightRed));
  applyCellStyle(isSheet, 'B13', createAmountStyle(ExcelColors.lightRed));
  applyCellStyle(isSheet, 'A14', createDataStyle(ExcelColors.lightRed));
  applyCellStyle(isSheet, 'B14', createAmountStyle(ExcelColors.lightRed));

  // Row 16: Net Income (dark green total with white text) - CENTERED
  applyCellStyle(isSheet, 'A16', { ...createTotalStyle(ExcelColors.darkGreen), alignment: { horizontal: 'center', vertical: 'center' } });
  applyCellStyle(isSheet, 'B16', { ...createAmountStyle(ExcelColors.darkGreen), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });

  XLSX.utils.book_append_sheet(wb, isSheet, "Income Statement");

  // Balance Sheet with side-by-side layout and color formatting
  const balanceSheetData = generateBalanceSheetData(inventory, cash, partners, netIncome, transactions);
  const bsSheet = XLSX.utils.aoa_to_sheet(balanceSheetData);

  // Set column widths for side-by-side layout
  bsSheet['!cols'] = [
    { wch: 25 },  // Assets account
    { wch: 18 },  // Assets amount
    { wch: 25 },  // Liabilities/Equity account
    { wch: 18 }   // Liabilities/Equity amount
  ];

  // Merge title (row 1)
  if (!bsSheet['!merges']) bsSheet['!merges'] = [];
  bsSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });

  // Row 1: Title
  applyCellStyle(bsSheet, 'A1', createTitleStyle(ExcelColors.navyBlue));

  // Row 3: Headers - Assets and Liabilities & Equity
  applyCellStyle(bsSheet, 'A3', createHeaderStyle(ExcelColors.navyBlue));
  applyCellStyle(bsSheet, 'B3', createHeaderStyle(ExcelColors.navyBlue));
  applyCellStyle(bsSheet, 'C3', createHeaderStyle(ExcelColors.navyBlue));
  applyCellStyle(bsSheet, 'D3', createHeaderStyle(ExcelColors.navyBlue));

  // Apply formatting to all data rows
  let bsRow = 4;
  while (bsSheet[`A${bsRow}`] || bsSheet[`B${bsRow}`] || bsSheet[`C${bsRow}`] || bsSheet[`D${bsRow}`]) {
    const cellA = bsSheet[`A${bsRow}`];
    const cellC = bsSheet[`C${bsRow}`];

    // Check if this is a total row
    const isAssetTotal = cellA && cellA.v && cellA.v.toString().startsWith('Total');
    const isLiabilityTotal = cellC && cellC.v && cellC.v.toString().startsWith('Total');

    if (isAssetTotal) {
      applyCellStyle(bsSheet, `A${bsRow}`, createTotalStyle(ExcelColors.darkBlue));
      applyCellStyle(bsSheet, `B${bsRow}`, { ...createAmountStyle(ExcelColors.darkBlue), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });
    } else if (cellA && cellA.v) {
      applyCellStyle(bsSheet, `A${bsRow}`, createDataStyle(ExcelColors.lightBlue));
      applyCellStyle(bsSheet, `B${bsRow}`, createAmountStyle(ExcelColors.lightBlue));
    }

    if (isLiabilityTotal) {
      applyCellStyle(bsSheet, `C${bsRow}`, createTotalStyle(ExcelColors.darkOrange));
      applyCellStyle(bsSheet, `D${bsRow}`, { ...createAmountStyle(ExcelColors.darkOrange), font: { bold: true, color: { rgb: 'FFFFFFFF' } } });
    } else if (cellC && cellC.v) {
      applyCellStyle(bsSheet, `C${bsRow}`, createDataStyle(ExcelColors.lightOrange));
      applyCellStyle(bsSheet, `D${bsRow}`, createAmountStyle(ExcelColors.lightOrange));
    }

    bsRow++;
  }

  XLSX.utils.book_append_sheet(wb, bsSheet, "Balance Sheet");

  // General Journal with comprehensive formatting
  const generalJournalData = generateGeneralJournalData(allTransactions);
  const gjSheet = XLSX.utils.aoa_to_sheet(generalJournalData);

  // Set column widths
  gjSheet['!cols'] = [
    { wch: 15 },  // Date column
    { wch: 40 },  // Description/Account column
    { wch: 18 },  // Debit column
    { wch: 18 },  // Credit column
    { wch: 30 }   // Note column
  ];

  // Merge title cell (A1:E1)
  if (!gjSheet['!merges']) gjSheet['!merges'] = [];
  gjSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

  // Apply title style (row 1)
  applyCellStyle(gjSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

  // Apply header row style (row 3)
  ['A3', 'B3'].forEach(cell => applyCellStyle(gjSheet, cell, createHeaderStyle(ExcelColors.darkBlue)));
  applyCellStyle(gjSheet, 'C3', createHeaderStyle(ExcelColors.mediumBlue));
  applyCellStyle(gjSheet, 'D3', createHeaderStyle(ExcelColors.mediumBlue));
  applyCellStyle(gjSheet, 'E3', createHeaderStyle(ExcelColors.darkBlue));

  // Apply formatting to data rows - get the actual range
  const range = gjSheet['!ref'];
  let maxRow = 4; // Start with header row
  if (range) {
    const rangeEnd = XLSX.utils.decode_range(range);
    maxRow = rangeEnd.e.r + 1; // Add 1 to ensure we style the last row
  }

  // Apply styles to ALL rows in the data range (NO BREAK - continue through empty rows)
  for (let row = 4; row <= maxRow; row++) {
    const cellA = gjSheet[`A${row}`];
    const cellB = gjSheet[`B${row}`];
    const cellC = gjSheet[`C${row}`];
    const cellD = gjSheet[`D${row}`];
    const cellE = gjSheet[`E${row}`];

    if (cellA && cellA.v) {
      // Date entry row - light green background
      applyCellStyle(gjSheet, `A${row}`, createDateStyle(ExcelColors.lightGreen));
      applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.lightGreen));
      applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.lightGreen));
    } else if (cellB && cellB.v) {
      // Account entry row - light gray background with yellow amounts
      applyCellStyle(gjSheet, `A${row}`, createDataStyle(ExcelColors.veryLightGray));

      // Check if credit account (has indent/spaces) for center alignment
      const accountText = cellB.v.toString();
      const isCredit = accountText.startsWith('    ');
      applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.veryLightGray, isCredit ? 'center' : 'left'));

      if (cellC && cellC.v) {
        applyCellStyle(gjSheet, `C${row}`, createAmountStyle(ExcelColors.lightYellow));
      } else {
        applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.veryLightGray));
      }
      if (cellD && cellD.v) {
        applyCellStyle(gjSheet, `D${row}`, createAmountStyle(ExcelColors.lightYellow));
      } else {
        applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.veryLightGray));
      }
      applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.veryLightGray));
    } else {
      // Handle empty rows (spacing rows) - apply white background to all columns
      applyCellStyle(gjSheet, `A${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `B${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `C${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `D${row}`, createDataStyle(ExcelColors.white));
      applyCellStyle(gjSheet, `E${row}`, createDataStyle(ExcelColors.white));
    }
  }

  XLSX.utils.book_append_sheet(wb, gjSheet, "General Journal");

  // Cash Flow Statement with color formatting
  const cashFlowStatementData = generateCashFlowStatementData(allTransactions, cash, partners);
  const cfSheet = XLSX.utils.aoa_to_sheet(cashFlowStatementData);

  // Set column widths
  cfSheet['!cols'] = [
    { wch: 45 },  // Description column
    { wch: 20 }   // Amount column
  ];

  // Merge title cell
  if (!cfSheet['!merges']) cfSheet['!merges'] = [];
  cfSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });

  // Apply title style
  applyCellStyle(cfSheet, 'A1', createTitleStyle(ExcelColors.teal));

  // Apply formatting to rows
  let cfRow = 3;
  let currentActivity = '';
  while (cfSheet[`A${cfRow}`] || cfSheet[`B${cfRow}`]) {
    const cellA = cfSheet[`A${cfRow}`];

    if (cellA && cellA.v) {
      const value = cellA.v.toString();

      // Activity section headers
      if (value.includes('Operating Activities') || value === 'OPERATING ACTIVITIES') {
        applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightTeal, 'FF000000'));
        applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightTeal, 'FF000000'));
        currentActivity = 'operating';
      } else if (value.includes('Investing Activities') || value === 'INVESTING ACTIVITIES') {
        applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightOrange, 'FF000000'));
        applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightOrange, 'FF000000'));
        currentActivity = 'investing';
      } else if (value.includes('Financing Activities') || value === 'FINANCING ACTIVITIES') {
        applyCellStyle(cfSheet, `A${cfRow}`, createHeaderStyle(ExcelColors.lightPurple, 'FF000000'));
        applyCellStyle(cfSheet, `B${cfRow}`, createHeaderStyle(ExcelColors.lightPurple, 'FF000000'));
        currentActivity = 'financing';
      } else if (value.startsWith('Net ') || value.includes('Total') || value.includes('Change in Cash')) {
        // Total/subtotal rows
        applyCellStyle(cfSheet, `A${cfRow}`, createSubtotalStyle(ExcelColors.mediumTeal, 'FF000000'));
        applyCellStyle(cfSheet, `B${cfRow}`, { ...createAmountStyle(ExcelColors.mediumTeal), font: { bold: true, color: { rgb: 'FF000000' } } });
      } else {
        // Regular data rows
        if (currentActivity === 'operating') {
          applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightTeal));
          applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightTeal));
        } else if (currentActivity === 'investing') {
          applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightOrange));
          applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightOrange));
        } else if (currentActivity === 'financing') {
          applyCellStyle(cfSheet, `A${cfRow}`, createDataStyle(ExcelColors.veryLightPurple));
          applyCellStyle(cfSheet, `B${cfRow}`, createAmountStyle(ExcelColors.veryLightPurple));
        }
      }
    }
    cfRow++;
  }

  XLSX.utils.book_append_sheet(wb, cfSheet, "Cash Flow Statement");

  // Trial Balance with color formatting
  const trialBalanceData = generateTrialBalanceData(allTransactions, inventory, cash, partners, netIncome);
  const tbSheet = XLSX.utils.aoa_to_sheet(trialBalanceData);

  // Set column widths
  tbSheet['!cols'] = [
    { wch: 35 },  // Account column
    { wch: 18 },  // Debit column
    { wch: 18 }   // Credit column
  ];

  // Merge title (row 1)
  if (!tbSheet['!merges']) tbSheet['!merges'] = [];
  tbSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

  // Row 1: Title
  applyCellStyle(tbSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

  // Apply header row style (row 3)
  applyCellStyle(tbSheet, 'A3', createHeaderStyle(ExcelColors.darkBlue));
  applyCellStyle(tbSheet, 'B3', createHeaderStyle(ExcelColors.mediumBlue));
  applyCellStyle(tbSheet, 'C3', createHeaderStyle(ExcelColors.mediumBlue));

  // Apply formatting to data rows
  let tbRow = 4;
  while (tbSheet[`A${tbRow}`]) {
    const cellA = tbSheet[`A${tbRow}`];
    const value = cellA.v?.toString() || '';

    if (value.startsWith('Total') || value.startsWith('TOTAL')) {
      // Total rows - dark blue with white text
      applyCellStyle(tbSheet, `A${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
      applyCellStyle(tbSheet, `B${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
      applyCellStyle(tbSheet, `C${tbRow}`, createTotalStyle(ExcelColors.darkBlue));
    } else {
      // Regular data rows - alternating light gray
      const bgColor = tbRow % 2 === 0 ? ExcelColors.veryLightGray : ExcelColors.white;
      applyCellStyle(tbSheet, `A${tbRow}`, createDataStyle(bgColor));
      applyCellStyle(tbSheet, `B${tbRow}`, createAmountStyle(bgColor));
      applyCellStyle(tbSheet, `C${tbRow}`, createAmountStyle(bgColor));
    }
    tbRow++;
  }

  XLSX.utils.book_append_sheet(wb, tbSheet, "Trial Balance");

  // Inventory Ledger with color formatting
  const inventoryLedgerData = generateInventoryLedgerData(inventory);
  const ilSheet = XLSX.utils.aoa_to_sheet(inventoryLedgerData);

  // Set column widths
  ilSheet['!cols'] = [
    { wch: 25 },  // Item name
    { wch: 15 },  // Type
    { wch: 15 },  // Quantity/Grams
    { wch: 18 },  // Unit Cost
    { wch: 18 }   // Total Value
  ];

  // Merge title (row 1)
  if (!ilSheet['!merges']) ilSheet['!merges'] = [];
  ilSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });

  // Row 1: Title
  applyCellStyle(ilSheet, 'A1', createTitleStyle(ExcelColors.darkGreen));

  // Apply header row style (row 3)
  ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell =>
    applyCellStyle(ilSheet, cell, createHeaderStyle(ExcelColors.mediumGreen))
  );

  // Apply formatting to data rows
  let ilRow = 4;
  while (ilSheet[`A${ilRow}`]) {
    const bgColor = ilRow % 2 === 0 ? ExcelColors.lightGreen : ExcelColors.white;
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      if (ilSheet[`${col}${ilRow}`]) {
        applyCellStyle(ilSheet, `${col}${ilRow}`,
          (col === 'D' || col === 'E') ? createAmountStyle(bgColor) : createDataStyle(bgColor)
        );
      }
    });
    ilRow++;
  }

  XLSX.utils.book_append_sheet(wb, ilSheet, "Inventory Ledger");

  // Sales Ledger with color formatting
  const salesLedgerData = generateSalesLedgerData(allTransactions);
  const slSheet = XLSX.utils.aoa_to_sheet(salesLedgerData);

  // Set column widths
  slSheet['!cols'] = [
    { wch: 15 },  // Date
    { wch: 25 },  // Product
    { wch: 15 },  // Quantity
    { wch: 18 },  // Unit Cost
    { wch: 18 },  // Unit Price
    { wch: 18 }   // Total Amount
  ];

  // Merge title (row 1) - from A1 to F1 (6 columns)
  if (!slSheet['!merges']) slSheet['!merges'] = [];
  slSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  // Row 1: Title
  applyCellStyle(slSheet, 'A1', createTitleStyle(ExcelColors.darkBlue));

  // Apply header row style (row 3)
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach(cell =>
    applyCellStyle(slSheet, cell, createHeaderStyle(ExcelColors.mediumBlue))
  );

  // Apply formatting to data rows
  let slRow = 4;
  while (slSheet[`A${slRow}`] || slSheet[`B${slRow}`] || slSheet[`C${slRow}`] || slSheet[`D${slRow}`] || slSheet[`E${slRow}`] || slSheet[`F${slRow}`]) {
    const cellA = slSheet[`A${slRow}`];
    const value = cellA?.v?.toString() || '';

    if (value.startsWith('Total') || value.startsWith('TOTAL')) {
      // Total rows
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
        applyCellStyle(slSheet, `${col}${slRow}`, createTotalStyle(ExcelColors.darkBlue));
      });
    } else {
      // Regular data rows - alternating colors
      const bgColor = slRow % 2 === 0 ? ExcelColors.lightBlue : ExcelColors.white;
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
        applyCellStyle(slSheet, `${col}${slRow}`,
          (col === 'D' || col === 'E' || col === 'F') ? createAmountStyle(bgColor) : createDataStyle(bgColor)
        );
      });
    }
    slRow++;
  }

  XLSX.utils.book_append_sheet(wb, slSheet, "Sales Ledger");

  // Write the workbook to a file
  XLSX.writeFile(wb, `Financial_Statements_${formatDate()}.xlsx`, {
    bookType: 'xlsx',
    type: 'binary'
  });
};
