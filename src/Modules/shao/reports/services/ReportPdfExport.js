import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// The built-in PDF fonts (Helvetica) only cover Latin-1 plus a few typographic
// characters. Anything else would print as garbage, so map the symbols the
// reports use and drop the rest.
const CHARACTER_REPLACEMENTS = {
  "≤": "<=", // ≤
  "≥": ">=", // ≥
  "₡": "CRC ", // ₡
  " ": " ", // no-break space (Intl number grouping)
  " ": " ", // narrow no-break space (Intl number grouping)
  " ": " ", // thin space
};
const EXTRA_SUPPORTED = "–—‘’“”•…€";

function pdfText(value) {
  if (value === null || value === undefined) return "";
  return Array.from(String(value))
    .map((char) => {
      if (CHARACTER_REPLACEMENTS[char] !== undefined) return CHARACTER_REPLACEMENTS[char];
      if (char.charCodeAt(0) <= 0xff || EXTRA_SUPPORTED.includes(char)) return char;
      return "";
    })
    .join("");
}

function safeFileName(name) {
  const cleaned = String(name || "report")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "report";
}

const BRAND_COLOR = [36, 86, 166];
const MUTED_COLOR = [102, 112, 133];
const TEXT_COLOR = [16, 24, 40];

/**
 * Builds the report as a PDF document and downloads it.
 *
 * @param {object} report
 * @param {string} report.title
 * @param {string} [report.description]
 * @param {string[]} [report.filters]   lines describing the applied filters
 * @param {{label: string, value: any}[]} [report.tiles]  summary values
 * @param {{header: string, numeric?: boolean}[]} report.columns
 * @param {any[][]} report.rows        cell values, already formatted
 * @param {string} [report.note]
 * @param {object} labels              translated texts
 * @param {string} labels.generated    e.g. "Generated"
 * @param {string} labels.summary      e.g. "Summary"
 * @param {string} labels.noData       e.g. "No data available."
 * @param {string} labels.page         e.g. "Page"
 * @param {string} [locale]            for the generation date
 */
export function exportReportPdf(report, labels, locale) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 48;

  // ----- Title block -----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(pdfText(report.title), marginX, cursorY);
  cursorY += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED_COLOR);

  if (report.description) {
    const lines = doc.splitTextToSize(pdfText(report.description), contentWidth);
    doc.text(lines, marginX, cursorY);
    cursorY += lines.length * 13;
  }

  const generatedAt = new Date().toLocaleString(locale);
  doc.text(pdfText(`${labels.generated}: ${generatedAt}`), marginX, cursorY);
  cursorY += 13;

  (report.filters || []).forEach((line) => {
    const lines = doc.splitTextToSize(pdfText(line), contentWidth);
    doc.text(lines, marginX, cursorY);
    cursorY += lines.length * 13;
  });

  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(1.5);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 16;

  // ----- Summary tiles as a two-column key/value table -----
  const tiles = report.tiles || [];
  if (tiles.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [[pdfText(labels.summary), ""]],
      body: tiles.map((tile) => [pdfText(tile.label), pdfText(tile.value)]),
      theme: "plain",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 4, textColor: TEXT_COLOR },
      headStyles: { fontStyle: "bold", textColor: BRAND_COLOR },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      tableWidth: Math.min(320, contentWidth),
    });
    cursorY = doc.lastAutoTable.finalY + 18;
  }

  // ----- Detail table -----
  const columns = report.columns || [];
  const rows = report.rows || [];
  const columnStyles = {};
  columns.forEach((column, index) => {
    if (column.numeric) columnStyles[index] = { halign: "right" };
  });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX, bottom: 48 },
    head: [columns.map((column) => pdfText(column.header))],
    body:
      rows.length > 0
        ? rows.map((row) => row.map(pdfText))
        : [[{ content: pdfText(labels.noData), colSpan: Math.max(columns.length, 1), styles: { halign: "center", textColor: MUTED_COLOR } }]],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: TEXT_COLOR, overflow: "linebreak" },
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles,
    // Align numeric headers with their right-aligned values.
    didParseCell: (data) => {
      if (data.section === "head" && columns[data.column.index]?.numeric) {
        data.cell.styles.halign = "right";
      }
    },
  });
  cursorY = doc.lastAutoTable.finalY + 18;

  // ----- Note -----
  if (report.note) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_COLOR);
    const lines = doc.splitTextToSize(pdfText(report.note), contentWidth);
    if (cursorY + lines.length * 12 > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      cursorY = 48;
    }
    doc.text(lines, marginX, cursorY);
  }

  // ----- Page numbers -----
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(pdfText(`${labels.page} ${page} / ${pageCount}`), pageWidth - marginX, pageHeight - 24, { align: "right" });
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`${safeFileName(report.title)}-${date}.pdf`);
}
