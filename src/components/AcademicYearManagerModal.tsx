import React, { useState } from "react";
import {
  X,
  Calendar,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  Database,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Subject, Student, Assignment, Submission, cleanYear } from "../types";

interface AcademicYearManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTerm: string;
  setSelectedTerm: (term: string) => void;
  selectedAcademicYear: string;
  setSelectedAcademicYear: (year: string) => void;
  academicYears: string[];
  onAddAcademicYear: (year: string) => Promise<void>;
  onDeleteAcademicYearData: (year: string, term?: string) => Promise<void>;
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
}

export const AcademicYearManagerModal: React.FC<AcademicYearManagerModalProps> = ({
  isOpen,
  onClose,
  selectedTerm,
  setSelectedTerm,
  selectedAcademicYear,
  setSelectedAcademicYear,
  academicYears,
  onAddAcademicYear,
  onDeleteAcademicYearData,
  subjects,
  students,
  assignments,
  submissions,
}) => {
  const [newYearInput, setNewYearInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete Confirmation State
  const [purgeTarget, setPurgeTarget] = useState<{ year: string; term?: string } | null>(null);
  const [confirmInputText, setConfirmInputText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const cYear = cleanYear(newYearInput);
    if (!cYear) {
      setAddError("กรุณากรอกปีการศึกษา เช่น 2568, 2569");
      return;
    }

    if (academicYears.map(cleanYear).includes(cYear)) {
      setAddError(`ปีการศึกษา ${cYear} มีอยู่ในระบบแล้ว`);
      return;
    }

    setAdding(true);
    try {
      await onAddAcademicYear(cYear);
      setSelectedAcademicYear(cYear);
      setNewYearInput("");
    } catch (err: any) {
      setAddError(err.message || "เกิดข้อผิดพลาดในการเพิ่มปีการศึกษา");
    } finally {
      setAdding(false);
    }
  };

  const executePurgeData = async () => {
    if (!purgeTarget) return;
    const expectedConfirm = purgeTarget.term
      ? `${purgeTarget.term}/${purgeTarget.year}`
      : purgeTarget.year;

    if (confirmInputText.trim() !== expectedConfirm) {
      alert(`คำยืนยันไม่ถูกต้อง กรุณาพิมพ์ "${expectedConfirm}" ให้ตรงกัน`);
      return;
    }

    setDeleting(true);
    try {
      await onDeleteAcademicYearData(purgeTarget.year, purgeTarget.term);
      const label = purgeTarget.term
        ? `ภาคเรียนที่ ${purgeTarget.term} ปีการศึกษา ${purgeTarget.year}`
        : `ปีการศึกษา ${purgeTarget.year} ทั้งหมด`;
      setDeleteSuccessMsg(`ลบข้อมูลทั้งหมดที่เกี่ยวข้องกับ ${label} สำเร็จเรียบร้อยแล้ว`);
      setPurgeTarget(null);
      setConfirmInputText("");
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${err.message || err}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-['Geist']">
      <div className="bg-[#18181B] border border-white/20 max-w-2xl w-full p-6 text-white my-8 shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-5 font-['Geist_Mono']">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 rounded">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase text-white tracking-wide">
                จัดการภาคเรียนและปีการศึกษา (TERM & ACADEMIC YEAR MANAGEMENT)
              </h3>
              <p className="text-xs text-white/50">
                สลับภาคเรียน/ปีการศึกษาปัจจุบัน เพิ่มปีการศึกษาใหม่ หรือลบข้อมูลเก่าแยกตามภาคเรียนและปีการศึกษา
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {deleteSuccessMsg && (
          <div className="mb-4 p-3 bg-[#00FF66]/10 border border-[#00FF66]/40 text-[#00FF66] text-xs flex items-center space-x-2 font-['Geist_Mono']">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
        )}

        {/* Section 1: Add New Academic Year Form */}
        <form onSubmit={handleAddYear} className="mb-6 bg-[#111113] p-4 border border-white/10 space-y-3 font-['Geist_Mono']">
          <div className="text-xs font-bold text-[#00FF66] flex items-center space-x-1.5">
            <Plus className="w-4 h-4" />
            <span>เพิ่มปีการศึกษาใหม่ (ADD NEW ACADEMIC YEAR)</span>
          </div>

          {addError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2 border border-rose-500/30">
              {addError}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="เช่น 2568, 2569"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-[#18181B] border border-white/20 text-white focus:border-[#00FF66] focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="bg-[#00FF66] hover:bg-[#00DD55] text-black font-bold px-4 py-2 text-xs uppercase transition-all flex items-center space-x-1"
            >
              {adding && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              <span>เพิ่มปีการศึกษา</span>
            </button>
          </div>
        </form>

        {/* Section 2: Registered Academic Years & Terms Stats */}
        <div className="space-y-3 mb-6">
          <div className="text-xs font-bold text-white/70 font-['Geist_Mono'] uppercase tracking-wider flex items-center space-x-2">
            <Database className="w-4 h-4 text-sky-400" />
            <span>รายการปีการศึกษาและภาคเรียนที่บันทึกในระบบ</span>
          </div>

          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {academicYears.map((yr) => {
              const matchesYr = (itemYr?: string) => (itemYr || "2568") === yr;

              const subYrCount = subjects.filter((s) => matchesYr(s.academicYear)).length;
              const stuYrCount = students.filter((s) => matchesYr(s.academicYear)).length;
              const asgYrCount = assignments.filter((a) => matchesYr(a.academicYear)).length;
              const submYrCount = submissions.filter((s) => matchesYr(s.academicYear)).length;

              const isCurrentYearSelected = selectedAcademicYear === yr;

              return (
                <div
                  key={yr}
                  className={`bg-[#111113] p-4 border transition-all space-y-3 ${
                    isCurrentYearSelected
                      ? "border-[#00FF66] bg-[#00FF66]/5"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold font-['Geist_Mono'] text-white">
                        ปีการศึกษา {yr}
                      </span>
                      {isCurrentYearSelected ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#00FF66] text-black rounded uppercase font-['Geist_Mono'] flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>ใช้งานอยู่</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedAcademicYear(yr)}
                          className="px-2 py-0.5 text-[10px] bg-white/10 hover:bg-white/20 text-white/80 rounded uppercase font-['Geist_Mono'] transition-colors"
                        >
                          เลือกใช้งานปีนี้
                        </button>
                      )}
                    </div>

                    {/* Delete Year Button */}
                    <button
                      onClick={() => {
                        setDeleteSuccessMsg("");
                        setPurgeTarget({ year: yr });
                        setConfirmInputText("");
                      }}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-['Geist_Mono'] font-bold rounded flex items-center space-x-1 transition-all"
                      title={`ลบข้อมูลทั้งหมดประจำปีการศึกษา ${yr}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบข้อมูลทั้งปี {yr}</span>
                    </button>
                  </div>

                  {/* Terms Breakdown under this Year */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-['Geist_Mono']">
                    {["1", "2", "3"].map((t) => {
                      const tLabel = t === "3" ? "ฤดูร้อน" : `เทอม ${t}`;
                      const matchesTerm = (itemYr?: string, itemT?: string) =>
                        (itemYr || "2568") === yr && (itemT || "1") === t;

                      const tSub = subjects.filter((s) => matchesTerm(s.academicYear, s.term)).length;
                      const tStu = students.filter((s) => matchesTerm(s.academicYear, s.term)).length;
                      const tAsg = assignments.filter((a) => matchesTerm(a.academicYear, a.term)).length;
                      const tSubm = submissions.filter((s) => matchesTerm(s.academicYear, s.term)).length;

                      const isTermActive = selectedAcademicYear === yr && selectedTerm === t;

                      return (
                        <div
                          key={t}
                          className={`p-2.5 rounded border ${
                            isTermActive
                              ? "bg-[#00FF66]/10 border-[#00FF66]/50"
                              : "bg-[#18181B] border-white/10"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-[#00FF66]">{tLabel}</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedAcademicYear(yr);
                                  setSelectedTerm(t);
                                }}
                                className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  isTermActive ? "bg-[#00FF66] text-black font-bold" : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                              >
                                {isTermActive ? "ACTIVE" : "สลับ"}
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteSuccessMsg("");
                                  setPurgeTarget({ year: yr, term: t });
                                  setConfirmInputText("");
                                }}
                                className="text-rose-400 hover:text-rose-300 p-0.5"
                                title={`ลบข้อมูลเฉพาะเทอม ${t} ปี ${yr}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[10px] space-y-0.5 text-white/60">
                            <div>วิชา: <strong className="text-white">{tSub}</strong> | นักเรียน: <strong className="text-white">{tStu}</strong></div>
                            <div>งาน: <strong className="text-white">{tAsg}</strong> | ส่งแล้ว: <strong className="text-white">{tSubm}</strong></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary total for the Year */}
                  <div className="text-[10px] font-['Geist_Mono'] text-white/40 pt-1 flex justify-between border-t border-white/5">
                    <span>ยอดรวมทั้งปีการศึกษา {yr}:</span>
                    <span>{subYrCount} วิชา • {stuYrCount} นักเรียน • {asgYrCount} งาน • {submYrCount} คะแนน</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Modal Warning Popup for Executing Delete */}
        {purgeTarget && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#18181B] border-2 border-rose-500 max-w-md w-full p-6 text-white shadow-2xl space-y-4 font-['Geist']">
              <div className="flex items-center space-x-3 text-rose-500 font-['Geist_Mono']">
                <AlertTriangle className="w-8 h-8 flex-shrink-0 animate-bounce" />
                <div>
                  <h4 className="text-sm font-extrabold uppercase">
                    คำเตือน: ยืนยันลบข้อมูล {purgeTarget.term ? `เทอม ${purgeTarget.term}/${purgeTarget.year}` : `ปีการศึกษา ${purgeTarget.year} ทั้งหมด`}
                  </h4>
                  <p className="text-[11px] text-rose-300">
                    การดำเนินการนี้ไม่สามารถยกเลิกได้ (IRREVERSIBLE ACTION)
                  </p>
                </div>
              </div>

              <div className="bg-rose-950/30 p-3 border border-rose-500/30 text-xs text-white/80 space-y-2">
                <p>
                  ระบบจะทำการลบรายการต่อไปนี้ในฐานข้อมูล <strong>Firestore</strong>:
                </p>
                <ul className="list-disc list-inside text-[#ff8080] font-['Geist_Mono'] space-y-1">
                  <li>
                    รายวิชาเรียน (
                    {
                      subjects.filter(
                        (s) =>
                          (s.academicYear || "2568") === purgeTarget.year &&
                          (!purgeTarget.term || (s.term || "1") === purgeTarget.term)
                      ).length
                    }{" "}
                    วิชา)
                  </li>
                  <li>
                    ข้อมูลนักเรียน (
                    {
                      students.filter(
                        (s) =>
                          (s.academicYear || "2568") === purgeTarget.year &&
                          (!purgeTarget.term || (s.term || "1") === purgeTarget.term)
                      ).length
                    }{" "}
                    คน)
                  </li>
                  <li>
                    ภาระงานและการบ้าน (
                    {
                      assignments.filter(
                        (a) =>
                          (a.academicYear || "2568") === purgeTarget.year &&
                          (!purgeTarget.term || (a.term || "1") === purgeTarget.term)
                      ).length
                    }{" "}
                    งาน)
                  </li>
                  <li>
                    ประวัติผลคะแนนสแกน (
                    {
                      submissions.filter(
                        (s) =>
                          (s.academicYear || "2568") === purgeTarget.year &&
                          (!purgeTarget.term || (s.term || "1") === purgeTarget.term)
                      ).length
                    }{" "}
                    รายการ)
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-['Geist_Mono'] text-white/70 mb-1.5">
                  โปรดพิมพ์ <span className="text-rose-400 font-bold">"{purgeTarget.term ? `${purgeTarget.term}/${purgeTarget.year}` : purgeTarget.year}"</span> เพื่อยืนยันการลบ:
                </label>
                <input
                  type="text"
                  placeholder={purgeTarget.term ? `${purgeTarget.term}/${purgeTarget.year}` : purgeTarget.year}
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#111113] border border-rose-500/50 text-white font-mono focus:border-rose-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10 font-['Geist_Mono']">
                <button
                  type="button"
                  onClick={() => setPurgeTarget(null)}
                  className="px-4 py-2 text-xs text-white/60 hover:text-white"
                >
                  ยกเลิก (CANCEL)
                </button>

                <button
                  type="button"
                  onClick={executePurgeData}
                  disabled={
                    confirmInputText.trim() !==
                      (purgeTarget.term ? `${purgeTarget.term}/${purgeTarget.year}` : purgeTarget.year) || deleting
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase transition-all disabled:opacity-40 flex items-center space-x-1.5"
                >
                  {deleting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>ยืนยันลบข้อมูล</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs text-white/50 font-['Geist_Mono']">
          <div className="flex items-center space-x-1">
            <HelpCircle className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>สามารถสลับภาคเรียนและปีการศึกษาปัจจุบันเพื่อเลือกดูข้อมูลได้ตลอดเวลา</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded font-bold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
