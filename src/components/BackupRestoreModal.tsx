import React, { useState, useRef } from "react";
import {
  Database,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  HardDrive,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  Assignment,
  Student,
  Subject,
  Submission,
  LineConfig,
  ScheduledNotification,
} from "../types";

export interface BackupPayloadData {
  subjects?: Subject[];
  students?: Student[];
  assignments?: Assignment[];
  submissions?: Submission[];
  lineConfigs?: LineConfig[];
  scheduledNotifications?: ScheduledNotification[];
  academicYears?: string[];
}

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  lineConfigs: LineConfig[];
  scheduledNotifications: ScheduledNotification[];
  academicYears: string[];
  selectedTerm: string;
  selectedAcademicYear: string;
  onRestoreData: (
    data: BackupPayloadData,
    mode: "overwrite" | "merge"
  ) => Promise<{ success: boolean; message: string }>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  subjects,
  students,
  assignments,
  submissions,
  lineConfigs,
  scheduledNotifications,
  academicYears,
  selectedTerm,
  selectedAcademicYear,
  onRestoreData,
}) => {
  const [activeTab, setActiveTab] = useState<"backup" | "restore">("backup");
  const [exportFormat, setExportFormat] = useState<"db" | "json">("db");
  const [customFilename, setCustomFilename] = useState(
    `edu_manager_backup_${selectedAcademicYear}_term${selectedTerm}_${new Date()
      .toISOString()
      .slice(0, 10)}.db`
  );

  // Switch format
  const handleFormatChange = (fmt: "db" | "json") => {
    setExportFormat(fmt);
    setCustomFilename((prev) => {
      const base = prev.replace(/\.(db|json)$/i, "");
      return `${base}.${fmt}`;
    });
  };

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<BackupPayloadData | null>(null);
  const [fileMetadata, setFileMetadata] = useState<{
    exportedAt?: string;
    system?: string;
    version?: string;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<"overwrite" | "merge">("overwrite");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export / Download .db File
  const handleDownloadBackup = () => {
    const payload = {
      version: "1.0",
      system: "QR_TRACKER_SYS_EDU_MANAGER",
      exportedAt: new Date().toISOString(),
      metadata: {
        selectedTerm,
        selectedAcademicYear,
        totalSubjects: subjects.length,
        totalStudents: students.length,
        totalAssignments: assignments.length,
        totalSubmissions: submissions.length,
        totalLineConfigs: lineConfigs.length,
        totalScheduledNotifications: scheduledNotifications.length,
      },
      data: {
        subjects,
        students,
        assignments,
        submissions,
        lineConfigs,
        scheduledNotifications,
        academicYears,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    let filename = customFilename.trim();
    if (!filename) {
      filename = `edu_manager_backup_${selectedAcademicYear}_term${selectedTerm}.${exportFormat}`;
    }
    if (!filename.endsWith(".db") && !filename.endsWith(".json")) {
      filename += `.${exportFormat}`;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle File Selection and Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setParsedData(null);
    setFileMetadata(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let dataToUse: BackupPayloadData = {};
        if (parsed.data) {
          dataToUse = parsed.data;
          setFileMetadata({
            exportedAt: parsed.exportedAt,
            system: parsed.system,
            version: parsed.version,
          });
        } else {
          // Direct JSON structure without payload wrapper
          dataToUse = parsed;
        }

        // Check if there's any recognized collection
        const hasSubjects = Array.isArray(dataToUse.subjects);
        const hasStudents = Array.isArray(dataToUse.students);
        const hasAssignments = Array.isArray(dataToUse.assignments);
        const hasSubmissions = Array.isArray(dataToUse.submissions);

        if (!hasSubjects && !hasStudents && !hasAssignments && !hasSubmissions) {
          setParseError("รูปแบบไฟล์ .db ไม่ถูกต้อง หรือไม่พบข้อมูลในไฟล์สำรองนี้");
          return;
        }

        setParsedData(dataToUse);
      } catch (err: any) {
        setParseError(`ไม่สามารถอ่านไฟล์ได้: ${err.message || "ไฟล์ชำรุดหรือรูปแบบไม่ถูกต้อง"}`);
      }
    };

    reader.readAsText(file);
  };

  // Handle Restore Execution
  const handleExecuteRestore = async () => {
    if (!parsedData) return;

    if (
      restoreMode === "overwrite" &&
      !window.confirm(
        "⚠️ คำเตือน: การเลือกโหมด 'เขียนทับข้อมูลทั้งหมด' จะแทนที่ข้อมูลที่มีอยู่ปัจจุบัน คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?"
      )
    ) {
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const result = await onRestoreData(parsedData, restoreMode);
      if (result.success) {
        setRestoreResult({
          type: "success",
          msg: result.message || "นำข้อมูลกลับสู่ระบบสำเร็จเรียบร้อยแล้ว!",
        });
      } else {
        setRestoreResult({
          type: "error",
          msg: result.message || "เกิดข้อผิดพลาดในการนำข้อมูลกลับสู่ระบบ",
        });
      }
    } catch (err: any) {
      setRestoreResult({
        type: "error",
        msg: err.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุในการกู้คืนข้อมูล",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-['Space_Grotesk']">
                สำรอง & กู้คืนข้อมูลระบบ (.db / .json)
              </h2>
              <p className="text-xs text-zinc-400">
                ดาวน์โหลดไฟล์สำรองข้อมูล (.db หรือ .json) หรือนำไฟล์กลับมาอัพโหลดเข้าสู่ระบบ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Nav Tabs */}
        <div className="flex border-b border-white/10 bg-black/20 px-6">
          <button
            onClick={() => setActiveTab("backup")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "backup"
                ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/5"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" /> 1. สำรองข้อมูล (Export .db)
          </button>
          <button
            onClick={() => setActiveTab("restore")}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "restore"
                ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="w-4 h-4" /> 2. นำข้อมูลกลับมาอัพโหลด (Restore .db)
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: BACKUP / EXPORT */}
          {activeTab === "backup" && (
            <div className="space-y-5">
              <div className="bg-[#00FF66]/5 border border-[#00FF66]/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#00FF66] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-1">
                  <div className="font-bold text-white">ข้อมูลที่จะถูกรวบรวมไว้ในไฟล์สำรอง .db:</div>
                  <p>
                    วิชาและน้ำหนักคะแนน, รายชื่อนักเรียน, ภาระงาน/ใบงาน, คะแนนส่งงานทั้งหมด, การตั้งค่า LINE Token และตารางเวลาแจ้งเตือนอัตโนมัติ
                  </p>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">📘 รายวิชา</div>
                  <div className="text-lg font-bold text-white">{subjects.length} วิชา</div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">👨‍🎓 นักเรียน</div>
                  <div className="text-lg font-bold text-white">{students.length} คน</div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">📝 ภาระงาน</div>
                  <div className="text-lg font-bold text-white">{assignments.length} ชิ้น</div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">📤 ผลงาน/คะแนน</div>
                  <div className="text-lg font-bold text-white">{submissions.length} รายการ</div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">🔔 LINE Configs</div>
                  <div className="text-lg font-bold text-white">{lineConfigs.length} ห้อง</div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-zinc-400 mb-1">⏰ ตารางแจ้งเตือน</div>
                  <div className="text-lg font-bold text-white">{scheduledNotifications.length} ตาราง</div>
                </div>
              </div>

              {/* Format Selection & Filename Input */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-300 block">
                  เลือกนามสกุลไฟล์สำรองข้อมูล (Export Format):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFormatChange("db")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      exportFormat === "db"
                        ? "bg-[#00FF66]/10 border-[#00FF66] text-[#00FF66]"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    ไฟล์ .db (Database Package)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange("json")}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      exportFormat === "json"
                        ? "bg-amber-500/10 border-amber-500 text-amber-400"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <FileJson className="w-4 h-4" />
                    ไฟล์ .json (Standard JSON)
                  </button>
                </div>

                <label className="text-xs font-semibold text-zinc-300 block pt-1">
                  ระบุชื่อไฟล์สำรองข้อมูล:
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white font-['Geist_Mono'] focus:outline-none focus:border-[#00FF66]"
                  placeholder="เช่น backup_2568.db"
                />
              </div>

              {/* Export Button */}
              <button
                onClick={handleDownloadBackup}
                className="w-full py-3.5 rounded-xl bg-[#00FF66] hover:bg-[#00DD55] text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)]"
              >
                <Download className="w-5 h-5 stroke-[2.5]" />
                ดาวน์โหลดไฟล์สำรองข้อมูล (.{exportFormat.toUpperCase()})
              </button>
            </div>
          )}

          {/* TAB 2: RESTORE / IMPORT */}
          {activeTab === "restore" && (
            <div className="space-y-5">
              {/* File Dropzone / Selector */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-black/30 hover:bg-black/50 transition-all space-y-2 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".db,.json,application/json,text/plain"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {selectedFile ? selectedFile.name : "คลิกเพื่อเลือกไฟล์สำรองข้อมูล (.db)"}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    รองรับไฟล์นามสกุล <span className="text-cyan-400 font-mono font-bold">.db</span> หรือ <span className="text-cyan-400 font-mono font-bold">.json</span> ที่ถูกส่งออกจากระบบนี้
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center gap-3 text-rose-400 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>{parseError}</div>
                </div>
              )}

              {/* Parsed Preview */}
              {parsedData && (
                <div className="space-y-4 bg-black/40 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ตรวจสอบข้อมูลในไฟล์สำรองสำเร็จ
                    </div>
                    {fileMetadata?.exportedAt && (
                      <span className="text-[11px] text-zinc-400 font-mono">
                        ส่งออกเมื่อ: {new Date(fileMetadata.exportedAt).toLocaleString("th-TH")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">📘 วิชา</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.subjects?.length || 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">👨‍🎓 นักเรียน</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.students?.length || 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">📝 ภาระงาน</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.assignments?.length || 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">📤 ส่งงาน/คะแนน</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.submissions?.length || 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">🔔 LINE Configs</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.lineConfigs?.length || 0} รายการ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2.5 text-center">
                      <div className="text-[11px] text-zinc-400">⏰ ตารางแจ้งเตือน</div>
                      <div className="text-sm font-bold text-white">
                        {parsedData.scheduledNotifications?.length || 0} รายการ
                      </div>
                    </div>
                  </div>

                  {/* Restore Mode Select */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <label className="text-xs font-bold text-zinc-300 block">
                      เลือกรูปแบบการกู้คืนข้อมูล (Restore Mode):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          restoreMode === "overwrite"
                            ? "bg-rose-500/10 border-rose-500 text-white"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === "overwrite"}
                          onChange={() => setRestoreMode("overwrite")}
                          className="mt-1 accent-rose-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">
                            🔴 เขียนทับข้อมูลทั้งหมด (Overwrite)
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            ลบข้อมูลเดิมที่มีอยู่ทั้งหมด และแทนที่ด้วยข้อมูลจากไฟล์สำรองนี้
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          restoreMode === "merge"
                            ? "bg-cyan-500/10 border-cyan-500 text-white"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === "merge"}
                          onChange={() => setRestoreMode("merge")}
                          className="mt-1 accent-cyan-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">
                            🔵 รวมข้อมูลเดิมเข้าด้วยกัน (Merge)
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            เพิ่มหรืออัพเดทข้อมูลใหม่เข้าไปโดยไม่ลบรายการเดิมที่ไม่มีในไฟล์
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        กำลังนำข้อมูลกลับเข้าสู่ระบบ...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 stroke-[2.5]" />
                        ยืนยันการนำข้อมูลกลับมา (Restore Data)
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Execution Result Banner */}
              {restoreResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
                    restoreResult.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {restoreResult.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>{restoreResult.msg}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
