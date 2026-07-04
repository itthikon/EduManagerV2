import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, X, Sparkles, Layers, FileText, Package, Check } from "lucide-react";
import { Student } from "../types";
import {
  generateStudentQRExport,
  ExportLayoutMode,
  PageDimension,
  ExportFileType,
} from "../lib/pdfGenerator";

interface StudentQRModalProps {
  students: Student[];
  classRoom: string;
  onClose: () => void;
}

export const StudentQRModal: React.FC<StudentQRModalProps> = ({
  students,
  classRoom,
  onClose,
}) => {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  // Configuration options
  const [layoutMode, setLayoutMode] = useState<ExportLayoutMode>("single_per_page");
  const [dimension, setDimension] = useState<PageDimension>("a4");
  const [fileType, setFileType] = useState<ExportFileType>("pdf_combined");

  // Generate QR code base64 images for preview
  useEffect(() => {
    const generateQrs = async () => {
      const map: Record<string, string> = {};
      for (const st of students) {
        try {
          const url = await QRCode.toDataURL(st.studentId, {
            width: 160,
            margin: 0,
            color: { dark: "#000000", light: "#ffffff" },
          });
          map[st.id] = url;
        } catch (e) {
          console.error(e);
        }
      }
      setQrMap(map);
    };
    generateQrs();
  }, [students]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateStudentQRExport(students, classRoom, {
        layoutMode,
        dimension,
        fileType,
      });
    } catch (err) {
      console.error("Export error:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ โปรดลองอีกครั้ง");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-['Geist']">
      <div className="bg-[#18181B] border border-white/20 max-w-4xl w-full p-6 text-white my-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5 font-['Geist_Mono']">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 font-bold text-xs">
                CLASS: {classRoom}
              </span>
              <h3 className="text-sm font-bold uppercase text-white tracking-wide">
                QR CODE & STICKER EXPORTER ({students.length} STUDENTS)
              </h3>
            </div>
            <p className="text-xs text-white/50 mt-1">
              พิมพ์ติดสมุด / สร้างบัตรนักเรียน / พิมพ์แยก 1 คน ต่อ 1 แผ่น
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Panel */}
        <div className="bg-[#111113] p-4 border border-white/10 mb-5 space-y-4">
          <div className="text-xs font-bold text-[#00FF66] font-['Geist_Mono'] flex items-center space-x-1.5">
            <Layers className="w-4 h-4" />
            <span>ตั้งค่ารูปแบบการพิมพ์และส่งออกไฟล์ (EXPORT OPTIONS)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Layout Mode Selection */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">
                1. รูปแบบการจัดวาง:
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode("single_per_page")}
                  className={`w-full text-left px-3 py-2 text-xs border transition-all flex items-center justify-between ${
                    layoutMode === "single_per_page"
                      ? "bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66] font-bold"
                      : "bg-[#18181B] border-white/10 text-white/70 hover:border-white/30"
                  }`}
                >
                  <span>📄 1 คน ต่อ 1 แผ่น</span>
                  {layoutMode === "single_per_page" && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode("a4_grid");
                    setDimension("a4");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs border transition-all flex items-center justify-between ${
                    layoutMode === "a4_grid"
                      ? "bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66] font-bold"
                      : "bg-[#18181B] border-white/10 text-white/70 hover:border-white/30"
                  }`}
                >
                  <span>📑 แผ่นรวม A4 (24 ดวง/แผ่น)</span>
                  {layoutMode === "a4_grid" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 2. Paper Dimension Selection */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">
                2. ขนาดกระดาษ / การ์ด:
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value as PageDimension)}
                disabled={layoutMode === "a4_grid"}
                className="w-full px-3 py-2 text-xs bg-[#18181B] border border-white/20 text-white focus:border-[#00FF66] focus:outline-none disabled:opacity-40"
              >
                <option value="a4">กระดาษ A4 (210 x 297 มม.)</option>
                <option value="a5">กระดาษ A5 (148 x 210 มม.)</option>
                <option value="card_85x54">บัตรประจำตัว (85 x 54 มม.)</option>
                <option value="sticker_40x40">สติ๊กเกอร์เดี่ยว (40 x 40 มม.)</option>
              </select>
              <p className="text-[10px] text-white/40 mt-1">
                {layoutMode === "a4_grid"
                  ? "โหมดแผ่นรวมบังคับใช้ขนาด A4"
                  : "เลือกขนาดที่ต้องการพิมพ์สำหรับ 1 คน/1 แผ่น"}
              </p>
            </div>

            {/* 3. Export File Type */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">
                3. ชนิดไฟล์ที่ส่งออก:
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as ExportFileType)}
                className="w-full px-3 py-2 text-xs bg-[#18181B] border border-white/20 text-white focus:border-[#00FF66] focus:outline-none"
              >
                <option value="pdf_combined">
                  📥 ไฟล์ PDF เดียวรวมทุกคน ({students.length} หน้า/รายการ)
                </option>
                <option value="zip_pdf">
                  📦 ไฟล์ ZIP บรรจุ PDF แยก 1 ไฟล์ต่อ 1 คน
                </option>
                <option value="zip_png">
                  🖼️ ไฟล์ ZIP บรรจุรูป PNG แยก 1 รูปต่อ 1 คน
                </option>
              </select>
              <p className="text-[10px] text-white/40 mt-1">
                {fileType === "pdf_combined"
                  ? "เหมาะสำหรับสั่งพิมพ์ทางปริ้นเตอร์ในครั้งเดียว"
                  : "แยกเป็นไฟล์ละ 1 คนใน ZIP เหมาะสำหรับส่งให้นักเรียนเป็นรายบุคคล"}
              </p>
            </div>
          </div>

          {/* Download Action Trigger */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-white/70 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-[#00FF66]" />
              <span>
                กำลังเลือก: <strong className="text-[#00FF66]">
                  {layoutMode === "single_per_page" ? "1 คน ต่อ 1 แผ่น" : "แผ่นรวม A4"}
                </strong> | ขนาด: <strong className="text-white">{dimension.toUpperCase()}</strong>
              </span>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading || students.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-bold px-6 py-2.5 text-xs uppercase transition-all shadow-[0_0_20px_rgba(0,255,102,0.3)] disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{downloading ? "กำลังสร้างไฟล์..." : "ดาวน์โหลดไฟล์ (DOWNLOAD)"}</span>
            </button>
          </div>
        </div>

        {/* Circular QR Sticker Preview Grid */}
        <div className="bg-[#111113] p-6 max-h-[45vh] overflow-y-auto border border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-items-center">
            {students.map((st) => (
              <div
                key={st.id}
                className="bg-white text-black rounded-full border-4 border-[#00FF66] p-3 shadow-[0_0_15px_rgba(0,255,102,0.15)] flex flex-col items-center justify-center text-center transition-transform hover:scale-105"
                style={{ width: "150px", height: "150px" }}
              >
                {/* QR Code */}
                {qrMap[st.id] ? (
                  <img
                    src={qrMap[st.id]}
                    alt={st.studentId}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 rounded animate-pulse" />
                )}

                {/* Info Text inside circle */}
                <div className="mt-1 space-y-0.5 font-['Geist']">
                  <div className="text-[11px] font-extrabold text-black leading-tight font-mono">
                    ID: {st.studentId}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-800 truncate max-w-[120px]">
                    {st.prefix}{st.firstName} {st.lastName}
                  </div>
                  <div className="text-[9px] text-slate-600 font-bold font-mono">
                    {st.classRoom} | NO. {st.number}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Guidance */}
        <div className="mt-4 p-3 bg-[#111113] border border-white/10 text-xs text-white/60 flex items-center justify-between font-['Geist_Mono']">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#00FF66] flex-shrink-0" />
            <span>
              รองรับทั้งแบบสติ๊กเกอร์รวม (A4 24 ดวง) และแบบแยก 1 แผ่น/1 คน รองรับการแสดงผลภาษาไทยสมบูรณ์แบบไม่เพี้ยน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
