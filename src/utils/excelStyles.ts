// Excel styling utility functions for financial statements

export const ExcelColors = {
  // General Journal
  darkBlue: 'FF1F4E79',
  mediumBlue: 'FF4472C4',
  lightGreen: 'FFE2EFDA',
  lightYellow: 'FFFFF2CC',
  veryLightGray: 'FFF8F9FA',
  white: 'FFFFFFFF',

  // Income Statement
  deepGreen: 'FF375623',
  mediumGreen: 'FFA9D18E',
  darkGreen: 'FF70AD47',
  lightRed: 'FFFCE5CD',

  // Balance Sheet
  navyBlue: 'FF1F4E79',
  lightBlue: 'FFD9E2F3',
  lightOrange: 'FFFCE5CD',
  lightPurple: 'FFE1D5F0',

  // Cash Flow
  teal: 'FF0F5132',
  darkTeal: 'FF20C997',
  lightTeal: 'FF17A2B8',
  mediumTeal: 'FF5DADE2',
  veryLightTeal: 'FFD1F2EB',
  lightCyan: 'FFCFF4FC',
  lightPink: 'FFF8D7DA',
  veryLightOrange: 'FFFFF9E6',
  veryLightPurple: 'FFF3EBFF',

  // Additional colors for totals
  darkOrange: 'FFE67E22',
  darkPurple: 'FF8E44AD',
};

export const createHeaderStyle = (bgColor: string, textColor: string = 'FFFFFFFF') => ({
  font: { bold: true, sz: 12, color: { rgb: textColor } },
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'FF000000' } },
    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

export const createTitleStyle = (bgColor: string, textColor: string = 'FFFFFFFF') => ({
  font: { bold: true, sz: 14, color: { rgb: textColor } },
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'medium', color: { rgb: 'FF000000' } },
    bottom: { style: 'medium', color: { rgb: 'FF000000' } },
    left: { style: 'medium', color: { rgb: 'FF000000' } },
    right: { style: 'medium', color: { rgb: 'FF000000' } }
  }
});

export const createSubtotalStyle = (bgColor: string, textColor: string = 'FF000000') => ({
  font: { bold: true, sz: 11, color: { rgb: textColor } },
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'FF000000' } },
    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

export const createTotalStyle = (bgColor: string) => ({
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFFFF' } },
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: {
    top: { style: 'double', color: { rgb: 'FF000000' } },
    bottom: { style: 'double', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

export const createDataStyle = (bgColor: string, align: 'left' | 'center' | 'right' = 'left') => ({
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: align, vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'FF000000' } },
    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

export const createAmountStyle = (bgColor: string) => ({
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
  border: {
    top: { style: 'thin', color: { rgb: 'FF000000' } },
    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

export const createDateStyle = (bgColor: string) => ({
  fill: { fgColor: { rgb: bgColor } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: {
    top: { style: 'thin', color: { rgb: 'FF000000' } },
    bottom: { style: 'thin', color: { rgb: 'FF000000' } },
    left: { style: 'thin', color: { rgb: 'FF000000' } },
    right: { style: 'thin', color: { rgb: 'FF000000' } }
  }
});

// Helper to apply style to a cell
export const applyCellStyle = (sheet: any, cellRef: string, style: any) => {
  if (!sheet[cellRef]) {
    // Create empty cell if it doesn't exist
    sheet[cellRef] = { t: 's', v: '' };
  }
  sheet[cellRef].s = style;
};

// Helper to apply style to a range
export const applyRangeStyle = (sheet: any, startRow: number, endRow: number, startCol: number, endCol: number, style: any) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      applyCellStyle(sheet, cellRef, style);
    }
  }
};

// Import XLSX for cell encoding
import * as XLSX from 'xlsx-js-style';
