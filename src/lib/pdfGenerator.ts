import jsPDF from "jspdf";
import QRCode from "qrcode";
import JSZip from "jszip";
import { Student } from "../types";

export type ExportLayoutMode = "a4_grid" | "single_per_page";
export type PageDimension = "a4" | "a5" | "card_85x54" | "sticker_40x40";
export type ExportFileType = "pdf_combined" | "zip_pdf" | "zip_png";

export interface ExportQROptions {
  layoutMode: ExportLayoutMode;     // 'a4_grid' (24 ดวง/แผ่น) หรือ 'single_per_page' (1 คน ต่อ 1 แผ่น)
  dimension: PageDimension;        // 'a4', 'a5', 'card_85x54', 'sticker_40x40'
  fileType: ExportFileType;         // 'pdf_combined', 'zip_pdf', 'zip_png'
  title?: string;
}

/**
 * Creates high-res Canvas for circular 40x40mm QR sticker
 */
export async function createStickerCanvas(
  student: Student,
  sizePx: number = 400
): Promise<HTMLCanvasElement> {
  const qrDataUrl = await QRCode.toDataURL(student.studentId, {
    margin: 0,
    width: 250,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sizePx, sizePx);

      // Circle border
      const cx = sizePx / 2;
      const cy = sizePx / 2;
      const r = sizePx / 2 - 8;

      ctx.strokeStyle = "#4f46e5"; // Indigo
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Dashed outer guide line
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(2, 2, sizePx - 4, sizePx - 4);
      ctx.setLineDash([]);

      // Draw QR Code
      const qrSize = sizePx * 0.44;
      ctx.drawImage(img, cx - qrSize / 2, cy - qrSize * 0.72, qrSize, qrSize);

      // Student Info
      ctx.textAlign = "center";

      // Student ID
      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${Math.round(sizePx * 0.065)}px monospace, sans-serif`;
      ctx.fillText(`ID: ${student.studentId}`, cx, cy + sizePx * 0.16);

      // Full Name (Thai)
      const fullName = `${student.prefix || ""}${student.firstName} ${student.lastName}`;
      ctx.font = `bold ${Math.round(sizePx * 0.052)}px "Sarabun", "Noto Sans Thai", "Thonburi", sans-serif`;
      ctx.fillStyle = "#1e293b";
      ctx.fillText(fullName, cx, cy + sizePx * 0.26);

      // Class & Number
      ctx.font = `${Math.round(sizePx * 0.046)}px "Sarabun", "Noto Sans Thai", "Thonburi", sans-serif`;
      ctx.fillStyle = "#475569";
      ctx.fillText(`${student.classRoom} | เลขที่ ${student.number}`, cx, cy + sizePx * 0.35);

      resolve(canvas);
    };
    img.src = qrDataUrl;
  });
}

/**
 * Creates high-res Canvas for 1 Student Sheet (1 คน ต่อ 1 แผ่น)
 */
export async function createSingleStudentPageCanvas(
  student: Student,
  dimension: PageDimension = "a4",
  schoolTitle: string = "ระบบบันทึกคะแนนและเช็คชื่อ"
): Promise<HTMLCanvasElement> {
  const stickerCanvas = await createStickerCanvas(student, 400);

  let widthPx = 1240; // A4 width at ~150 DPI
  let heightPx = 1754; // A4 height at ~150 DPI

  if (dimension === "a5") {
    widthPx = 874;
    heightPx = 1240;
  } else if (dimension === "card_85x54") {
    widthPx = 1004; // 85mm
    heightPx = 638;  // 54mm
  } else if (dimension === "sticker_40x40") {
    widthPx = 600;
    heightPx = 600;
  }

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  if (dimension === "sticker_40x40") {
    // Direct sticker canvas
    ctx.drawImage(stickerCanvas, 0, 0, widthPx, heightPx);
    return canvas;
  }

  if (dimension === "card_85x54") {
    // ID Card Layout (85x54mm)
    // Outer Border / Card Frame
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, widthPx - 20, heightPx - 20);

    // Header bar
    ctx.fillStyle = "#18181b";
    ctx.fillRect(16, 16, widthPx - 32, 110);

    ctx.fillStyle = "#00FF66";
    ctx.font = 'bold 30px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText("บัตรประจำตัวนักเรียน / STUDENT ID CARD", 40, 60);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = '22px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText(`${schoolTitle} | ห้อง ${student.classRoom}`, 40, 98);

    // QR Code on right
    ctx.drawImage(stickerCanvas, widthPx - 380, 140, 340, 340);

    // Student Info on left
    const startX = 50;
    let startY = 200;

    ctx.fillStyle = "#0f172a";
    ctx.font = 'bold 42px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText(`${student.prefix || ""}${student.firstName} ${student.lastName}`, startX, startY);

    startY += 65;
    ctx.font = 'bold 36px monospace, sans-serif';
    ctx.fillStyle = "#4f46e5";
    ctx.fillText(`รหัสนักเรียน: ${student.studentId}`, startX, startY);

    startY += 55;
    ctx.font = '32px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillStyle = "#334155";
    ctx.fillText(`ห้องเรียน: ${student.classRoom}   |   เลขที่: ${student.number}`, startX, startY);

    // Footer bar
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(16, heightPx - 70, widthPx - 32, 54);
    ctx.fillStyle = "#64748b";
    ctx.font = 'bold 20px monospace, sans-serif';
    ctx.fillText(`VALID FOR SCANNING & GRADING SYSTEM | ID: ${student.studentId}`, 40, heightPx - 35);

    return canvas;
  }

  // A4 / A5 Sheet Layout (1 คน ต่อ 1 แผ่น)
  // Header Banner
  ctx.fillStyle = "#0f172a"; // Dark navy header
  ctx.fillRect(0, 0, widthPx, 180);

  // Thai Title Header
  ctx.fillStyle = "#00FF66";
  ctx.font = 'bold 42px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText("แผ่นข้อมูลคิวอาร์โค้ดประจำตัวนักเรียน (1 คน / 1 แผ่น)", 60, 80);

  ctx.fillStyle = "#94a3b8";
  ctx.font = '28px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText(`${schoolTitle} — ห้องเรียน ${student.classRoom}`, 60, 135);

  // Student Main Card Section
  const stSize = 240; // Uniform sticker size for all stickers on the page
  const cardX = 60;
  const cardY = 220;
  const cardW = widthPx - 120;
  const cardH = 310;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  // Sticker Canvas on Card (Exact same size stSize = 240 as the grid stickers)
  const topStickerY = cardY + Math.round((cardH - stSize) / 2);
  ctx.drawImage(stickerCanvas, cardX + 35, topStickerY, stSize, stSize);

  // Student Details on Right of Card
  const detailsX = cardX + stSize + 70;
  let textY = cardY + 80;

  ctx.fillStyle = "#0f172a";
  ctx.font = 'bold 44px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText(`${student.prefix || ""}${student.firstName} ${student.lastName}`, detailsX, textY);

  textY += 58;
  ctx.fillStyle = "#4f46e5";
  ctx.font = 'bold 36px monospace, sans-serif';
  ctx.fillText(`รหัสนักเรียน (ID): ${student.studentId}`, detailsX, textY);

  textY += 52;
  ctx.fillStyle = "#334155";
  ctx.font = '32px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText(`ชั้นเรียน: ${student.classRoom}   |   เลขที่: ${student.number}`, detailsX, textY);

  textY += 50;
  ctx.fillStyle = "#64748b";
  ctx.font = '26px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText("สถานะ: พร้อมใช้งานสำหรับสแกนให้คะแนน/เช็คชื่อ", detailsX, textY);

  // Sticker Sheets Copies Section (สติ๊กเกอร์ขนาดเท่ากันทั้งหมดสำหรับติดสมุด/งาน)
  const stickerSectionY = cardY + cardH + 50;
  ctx.fillStyle = "#0f172a";
  ctx.font = 'bold 32px "Sarabun", "Noto Sans Thai", sans-serif';
  ctx.fillText("สติ๊กเกอร์คิวอาร์โค้ดประจำตัวนักเรียน (ขนาดเท่ากันทั้งหมด สำหรับติดสมุด / ใบงาน):", 60, stickerSectionY);

  // Draw copies of circular QR stickers with exact same size (stSize = 240)
  const cols = 4;
  const rows = dimension === "a5" ? 2 : 4;
  const gapX = (cardW - cols * stSize) / (cols - 1);
  const gapY = 25;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = cardX + c * (stSize + gapX);
      const sy = stickerSectionY + 35 + r * (stSize + gapY);
      ctx.drawImage(stickerCanvas, sx, sy, stSize, stSize);
    }
  }

  // Footer / Sign-off line
  if (dimension === "a4") {
    const footerY = heightPx - 100;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, footerY);
    ctx.lineTo(widthPx - 60, footerY);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = '24px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText("ลงชื่อครูผู้สอน/ประจำชั้น: _____________________________________   วันที่: ______/______/________", 60, footerY + 50);
  }

  return canvas;
}

export async function generateStudentQRExport(
  students: Student[],
  className: string,
  options: ExportQROptions
): Promise<void> {
  const sorted = [...students].sort((a, b) => a.number - b.number);
  const title = options.title || "สมุดบันทึกนักเรียน";

  // Case 1: ZIP file with individual PDFs
  if (options.fileType === "zip_pdf") {
    const zip = new JSZip();
    for (let i = 0; i < sorted.length; i++) {
      const student = sorted[i];
      const pageCanvas = await createSingleStudentPageCanvas(student, options.dimension, title);
      const imgData = pageCanvas.toDataURL("image/png");

      let format: [number, number] = [210, 297]; // A4
      if (options.dimension === "a5") format = [148, 210];
      if (options.dimension === "card_85x54") format = [85, 54];
      if (options.dimension === "sticker_40x40") format = [40, 40];

      const doc = new jsPDF({
        orientation: options.dimension === "card_85x54" ? "landscape" : "portrait",
        unit: "mm",
        format: format,
      });

      const pW = doc.internal.pageSize.getWidth();
      const pH = doc.internal.pageSize.getHeight();
      doc.addImage(imgData, "PNG", 0, 0, pW, pH);

      const pdfArrayBuffer = doc.output("arraybuffer");
      const numStr = String(student.number).padStart(2, "0");
      const filename = `${numStr}_${student.studentId}_${student.firstName}_${student.lastName}.pdf`;
      zip.file(filename, pdfArrayBuffer);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `QR_Students_${className.replace(/\//g, "-")}_PDF_Individual.zip`;
    link.click();
    return;
  }

  // Case 2: ZIP file with individual PNG images
  if (options.fileType === "zip_png") {
    const zip = new JSZip();
    for (let i = 0; i < sorted.length; i++) {
      const student = sorted[i];
      const pageCanvas = await createSingleStudentPageCanvas(student, options.dimension, title);
      const base64Data = pageCanvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");

      const numStr = String(student.number).padStart(2, "0");
      const filename = `${numStr}_${student.studentId}_${student.firstName}_${student.lastName}.png`;
      zip.file(filename, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `QR_Students_${className.replace(/\//g, "-")}_PNG_Individual.zip`;
    link.click();
    return;
  }

  // Case 3: Combined PDF file
  if (options.layoutMode === "single_per_page") {
    // 1 Page per student in single combined PDF
    let format: [number, number] = [210, 297];
    if (options.dimension === "a5") format = [148, 210];
    if (options.dimension === "card_85x54") format = [85, 54];
    if (options.dimension === "sticker_40x40") format = [40, 40];

    const doc = new jsPDF({
      orientation: options.dimension === "card_85x54" ? "landscape" : "portrait",
      unit: "mm",
      format: format,
    });

    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) doc.addPage(format, options.dimension === "card_85x54" ? "landscape" : "portrait");
      const student = sorted[i];
      const pageCanvas = await createSingleStudentPageCanvas(student, options.dimension, title);
      const imgData = pageCanvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 0, 0, pW, pH);
    }

    doc.save(`QR_Students_${className.replace(/\//g, "-")}_1Person1Page_${options.dimension}.pdf`);
    return;
  }

  // Case 4: Standard A4 Grid (24 stickers per page)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const itemSize = 40; // 40x40 mm
  const cols = 4;
  const rows = 6;
  const itemsPerPage = cols * rows;

  const marginX = (pageWidth - cols * itemSize) / (cols + 1);
  const marginY = 22;
  const rowGap = (pageHeight - marginY - rows * itemSize - 10) / (rows + 1);

  // Generate Header Canvas with clean Thai text
  const createA4HeaderCanvas = (pageClassName: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 140;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#1e293b";
    ctx.font = 'bold 36px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText(`คิวอาร์โค้ดประจำตัวนักเรียน — ห้อง ${pageClassName}`, 620, 50);

    ctx.fillStyle = "#64748b";
    ctx.font = '22px "Sarabun", "Noto Sans Thai", sans-serif';
    ctx.fillText(`สติ๊กเกอร์ทรงกลมขนาด 40x40 มม. สำหรับติดสมุดนักเรียน (${title})`, 620, 95);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 125);
    ctx.lineTo(1200, 125);
    ctx.stroke();

    return canvas.toDataURL("image/png");
  };

  const headerImgData = createA4HeaderCanvas(className);

  for (let i = 0; i < sorted.length; i++) {
    const student = sorted[i];

    if (i > 0 && i % itemsPerPage === 0) {
      doc.addPage();
    }

    const indexOnPage = i % itemsPerPage;
    if (indexOnPage === 0) {
      doc.addImage(headerImgData, "PNG", 0, 2, pageWidth, 18);
    }

    const colIndex = indexOnPage % cols;
    const rowIndex = Math.floor(indexOnPage / cols);

    const x = marginX + colIndex * (itemSize + marginX / 2);
    const y = marginY + rowIndex * (itemSize + rowGap);

    const stickerCanvas = await createStickerCanvas(student, 400);
    const stickerImgData = stickerCanvas.toDataURL("image/png");

    doc.addImage(stickerImgData, "PNG", x, y, itemSize, itemSize);
  }

  doc.save(`QR_Students_${className.replace(/\//g, "-")}_Grid_A4.pdf`);
}

// Backward-compatibility export alias
export async function generateStudentQRPdf(
  students: Student[],
  className: string,
  schoolOrTeacherTitle: string = "สมุดบันทึกนักเรียน"
) {
  return generateStudentQRExport(students, className, {
    layoutMode: "a4_grid",
    dimension: "a4",
    fileType: "pdf_combined",
    title: schoolOrTeacherTitle,
  });
}
