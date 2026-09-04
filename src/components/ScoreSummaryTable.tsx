import React, { useState, useMemo } from "react";
import {
  Award,
  BookOpen,
  Users,
  Search,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  Check,
  Filter,
} from "lucide-react";
import { Assignment, Student, Subject, Submission, StudentGradeSummary } from "../types";
import { calculateStudentGradeSummary } from "../lib/gradeCalculator";

interface ScoreSummaryTableProps {
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  selectedTerm: string;
  selectedAcademicYear: string;
}

export const ScoreSummaryTable: React.FC<ScoreSummaryTableProps> = ({
  subjects,
  students,
  assignments,
  submissions,
  selectedTerm,
  selectedAcademicYear,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedClassRoom, setSelectedClassRoom] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [passThresholdPct, setPassThresholdPct] = useState<number>(50);
  const [copied, setCopied] = useState<boolean>(false);

  // Filter subjects based on term & year if applicable
  const filteredSubjects = useMemo(() => {
    const list = subjects.filter((sub) => {
      const matchTerm = selectedTerm === "ALL" || sub.term === selectedTerm || !sub.term;
      const matchYear =
        selectedAcademicYear === "ALL" ||
        !sub.academicYear ||
        sub.academicYear === selectedAcademicYear;
      return matchTerm && matchYear;
    });
    return list.length > 0 ? list : subjects;
  }, [subjects, selectedTerm, selectedAcademicYear]);

  // Ensure selectedSubjectId is valid on change
  React.useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!selectedSubjectId || !filteredSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(filteredSubjects[0].id);
      }
    } else if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
    } else {
      setSelectedSubjectId("");
    }
  }, [filteredSubjects, subjects]);

  const currentSubject = useMemo(() => {
    const list = filteredSubjects.length > 0 ? filteredSubjects : subjects;
    return (
      list.find((s) => s.id === selectedSubjectId) ||
      list[0] ||
      null
    );
  }, [filteredSubjects, subjects, selectedSubjectId]);

  const subjectWeights = currentSubject?.scoreWeights || { preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 };
  const wPre = subjectWeights.preMidterm ?? 30;
  const wMid = subjectWeights.midterm ?? 20;
  const wPost = subjectWeights.postMidterm ?? 30;
  const wFin = subjectWeights.final ?? 20;

  // Available classrooms for the current subject
  const availableClasses = useMemo(() => {
    if (!currentSubject) return [];
    if (currentSubject.classes && currentSubject.classes.length > 0) {
      return currentSubject.classes;
    }
    const set = new Set(students.map((st) => st.classRoom).filter(Boolean));
    return Array.from(set).sort();
  }, [currentSubject, students]);

  // Filter students by classroom and search query
  const displayedStudents = useMemo(() => {
    return students.filter((st) => {
      const matchClass =
        selectedClassRoom === "ALL" || st.classRoom === selectedClassRoom;
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${st.prefix || ""} ${st.firstName} ${st.lastName}`.toLowerCase();
      const stId = (st.studentId || "").toLowerCase();
      const stNum = String(st.number || "");
      const matchQuery =
        !q || fullName.includes(q) || stId.includes(q) || stNum.includes(q);
      return matchClass && matchQuery;
    });
  }, [students, selectedClassRoom, searchQuery]);

  // Assignments for current subject
  const subjectAssignments = useMemo(() => {
    if (!currentSubject) return [];
    return assignments.filter((a) => a.subjectId === currentSubject.id);
  }, [assignments, currentSubject]);

  // Calculate summaries for each student
  const studentSummaries = useMemo(() => {
    if (!currentSubject) return [];
    return displayedStudents.map((st) => {
      const summary = calculateStudentGradeSummary(
        st,
        subjectAssignments,
        submissions,
        currentSubject.scoreWeights
      );
      const isPass = summary.totalPercentage >= passThresholdPct;
      return {
        ...summary,
        isPass,
      };
    });
  }, [displayedStudents, subjectAssignments, submissions, currentSubject, passThresholdPct]);

  // Overview statistics
  const stats = useMemo(() => {
    const total = studentSummaries.length;
    const passed = studentSummaries.filter((s) => s.isPass).length;
    const failed = total - passed;
    const avgScore =
      total > 0
        ? studentSummaries.reduce((acc, s) => acc + s.totalPercentage, 0) / total
        : 0;
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      avgScore,
    };
  }, [studentSummaries]);

  // Format and Copy LINE Message Report
  const handleCopyLineReport = () => {
    if (!currentSubject) return;

    let text = `📊 รายงานสรุปผลการเรียนและคะแนนรายวิชา\n`;
    text += `📚 วิชา: [${currentSubject.code}] ${currentSubject.name}\n`;
    text += `🏫 ห้องเรียน: ${selectedClassRoom === "ALL" ? "ทุกห้องเรียน" : selectedClassRoom}\n`;
    text += `🎯 เกณฑ์ผ่านการประเมิน: ตั้งไว้ที่ ${passThresholdPct}%\n`;
    text += `--------------------------------\n`;
    text += `👥 นักเรียนทั้งหมด: ${stats.total} คน\n`;
    text += `✅ ผ่านเกณฑ์: ${stats.passed} คน (${stats.passRate.toFixed(1)}%)\n`;
    text += `❌ ไม่ผ่านเกณฑ์: ${stats.failed} คน\n`;
    text += `📈 คะแนนเฉลี่ยรวม: ${stats.avgScore.toFixed(1)}%\n`;
    text += `--------------------------------\n`;
    text += `📋 รายละเอียดรายบุคคล:\n\n`;

    studentSummaries.forEach((s, idx) => {
      const statusIcon = s.isPass ? "✅" : "❌";
      const weights = currentSubject?.scoreWeights || { preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 };
      const wPre = weights.preMidterm ?? 30;
      const wMid = weights.midterm ?? 20;
      const wPost = weights.postMidterm ?? 30;
      const wFin = weights.final ?? 20;

      const preWeighted = s.preMidtermMax > 0 ? ((s.preMidtermScore / s.preMidtermMax) * wPre).toFixed(1) : "0.0";
      const midWeighted = s.midtermMax > 0 ? ((s.midtermScore / s.midtermMax) * wMid).toFixed(1) : "0.0";
      const postWeighted = s.postMidtermMax > 0 ? ((s.postMidtermScore / s.postMidtermMax) * wPost).toFixed(1) : "0.0";
      const finWeighted = s.finalMax > 0 ? ((s.finalScore / s.finalMax) * wFin).toFixed(1) : "0.0";

      text += `${idx + 1}. [เลขที่ ${s.student.number || "-"}] ${s.student.prefix || ""}${s.student.firstName} ${s.student.lastName}\n`;
      text += `   • ก่อนกลางภาค: ${s.preMidtermScore}/${s.preMidtermMax} (ได้ ${preWeighted}/${wPre}%)\n`;
      text += `   • กลางภาค: ${s.midtermScore}/${s.midtermMax} (ได้ ${midWeighted}/${wMid}%)\n`;
      text += `   • หลังกลางภาค: ${s.postMidtermScore}/${s.postMidtermMax} (ได้ ${postWeighted}/${wPost}%)\n`;
      text += `   • ปลายภาค: ${s.finalScore}/${s.finalMax} (ได้ ${finWeighted}/${wFin}%)\n`;
      text += `   • รวมสะสม: ${s.totalPercentage}% (เกรด ${s.grade}) ${statusIcon} ${s.isPass ? "ผ่านเกณฑ์" : "ต่ำกว่าเกณฑ์"}\n\n`;
    });

    text += `📌 ระบบจัดการคะแนนและตรวจงาน QR Tracker`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 font-['Geist'] text-white">
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="font-['Geist_Mono'] text-xs uppercase tracking-widest text-[#00FF66] mb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00FF66]" />
            <span>COMPREHENSIVE_SCORE_SUMMARY_TABLE</span>
          </div>
          <h2 className="font-['Syne'] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-white">
            สรุปผลคะแนน 5 ส่วน & เกณฑ์การผ่าน
          </h2>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            วิเคราะห์คะแนนเก็บก่อนกลางภาค, กลางภาค, หลังกลางภาค, ปลายภาค พร้อมเกณฑ์ประเมินและคัดลอกรายงานส่ง LINE
          </p>
        </div>

        <button
          onClick={handleCopyLineReport}
          disabled={studentSummaries.length === 0}
          className="bg-[#00FF66] hover:bg-[#00DD55] disabled:opacity-50 text-black font-['Geist_Mono'] font-extrabold text-xs uppercase px-5 py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>คัดลอกสำเร็จแล้ว!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span>คัดลอกรายงานส่ง LINE</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Subject Selector */}
          <div>
            <label className="text-xs font-['Geist_Mono'] text-zinc-400 block mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00FF66]" /> เลือกรายวิชา:
            </label>
            <select
              value={currentSubject?.id || ""}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00FF66]"
            >
              {filteredSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  [{sub.code}] {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Classroom Selector */}
          <div>
            <label className="text-xs font-['Geist_Mono'] text-zinc-400 block mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> เลือกห้องเรียน:
            </label>
            <select
              value={selectedClassRoom}
              onChange={(e) => setSelectedClassRoom(e.target.value)}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">-- ทุกห้องเรียนในวิชานี้ --</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  ห้อง {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Passing Threshold Percentage */}
          <div>
            <label className="text-xs font-['Geist_Mono'] text-zinc-400 block mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" /> เกณฑ์ผ่าน (%):
            </label>
            <div className="flex items-center gap-2">
              {[50, 60, 70, 80].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPassThresholdPct(pct)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    passThresholdPct === pct
                      ? "bg-amber-500 text-black font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      : "bg-black/60 border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={100}
                value={passThresholdPct}
                onChange={(e) =>
                  setPassThresholdPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
                className="w-14 bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs text-amber-400 text-center font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-xs font-['Geist_Mono'] text-zinc-400 block mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-purple-400" /> ค้นหานักเรียน:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ชื่อ, นามสกุล, หรือรหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Statistical Summary Pills */}
        {currentSubject && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-white/10">
            <div className="bg-black/40 border border-white/10 rounded-xl p-3">
              <div className="text-[11px] text-zinc-400 font-['Geist_Mono']">👥 นักเรียนทั้งหมด</div>
              <div className="text-lg font-bold text-white mt-1">{stats.total} คน</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <div className="text-[11px] text-emerald-400 font-['Geist_Mono']">✅ ผ่านเกณฑ์ ({passThresholdPct}%)</div>
              <div className="text-lg font-bold text-emerald-300 mt-1">
                {stats.passed} คน ({stats.passRate.toFixed(1)}%)
              </div>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <div className="text-[11px] text-rose-400 font-['Geist_Mono']">❌ ต่ำกว่าเกณฑ์</div>
              <div className="text-lg font-bold text-rose-300 mt-1">{stats.failed} คน</div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
              <div className="text-[11px] text-cyan-400 font-['Geist_Mono']">📈 คะแนนเฉลี่ย</div>
              <div className="text-lg font-bold text-cyan-300 mt-1">{stats.avgScore.toFixed(1)}%</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-purple-400 font-['Geist_Mono']">⚖️ สัดส่วนคะแนน (ก่อน/กลาง/หลัง/ปลาย)</div>
              <div className="text-xs font-bold text-purple-200 mt-1 font-['Geist_Mono']">
                {currentSubject.scoreWeights.preMidterm || 30}% / {currentSubject.scoreWeights.midterm || 20}% / {currentSubject.scoreWeights.postMidterm || 30}% / {currentSubject.scoreWeights.final || 20}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-[#18181B] border border-white/10 rounded-xl overflow-hidden shadow-xl">
        {currentSubject ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/10 font-['Geist_Mono'] text-[11px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">เลขที่</th>
                  <th className="py-3.5 px-4">รหัส / ชื่อ - นามสกุล</th>
                  <th className="py-3.5 px-4 text-center">ห้อง</th>
                  <th className="py-3.5 px-4 text-center bg-white/[0.02]">
                    1. ก่อนกลางภาค
                    <span className="block text-[9px] text-zinc-500 font-normal">
                      ({currentSubject.scoreWeights.preMidterm || 30}%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center bg-white/[0.04]">
                    2. กลางภาค
                    <span className="block text-[9px] text-zinc-500 font-normal">
                      ({currentSubject.scoreWeights.midterm || 20}%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center bg-white/[0.02]">
                    3. หลังกลางภาค
                    <span className="block text-[9px] text-zinc-500 font-normal">
                      ({currentSubject.scoreWeights.postMidterm || 30}%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center bg-white/[0.04]">
                    4. ปลายภาค
                    <span className="block text-[9px] text-zinc-500 font-normal">
                      ({currentSubject.scoreWeights.final || 20}%)
                    </span>
                  </th>
                  <th className="py-3.5 px-4 text-center">รวมสะสม</th>
                  <th className="py-3.5 px-4 text-center">เกรด</th>
                  <th className="py-3.5 px-4 text-center">
                    5. สรุปผลตามเกณฑ์ ({passThresholdPct}%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {studentSummaries.length > 0 ? (
                  studentSummaries.map((s, idx) => (
                    <tr
                      key={s.student.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] text-zinc-400">
                        {s.student.number || idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">
                          {s.student.prefix || ""} {s.student.firstName} {s.student.lastName}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-['Geist_Mono']">
                          ID: {s.student.studentId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] text-zinc-300">
                        {s.student.classRoom}
                      </td>

      {/* 1. Pre-midterm */}
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] bg-white/[0.02]">
                        <div className="font-bold text-white">
                          {s.preMidtermScore} / {s.preMidtermMax}
                        </div>
                        <div className="text-[10px] text-[#00FF66] font-bold mt-0.5">
                          ได้ {s.preMidtermMax > 0 ? ((s.preMidtermScore / s.preMidtermMax) * wPre).toFixed(1) : "0.0"} / {wPre}%
                        </div>
                      </td>

                      {/* 2. Midterm */}
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] bg-white/[0.04]">
                        <div className="font-bold text-purple-300">
                          {s.midtermScore} / {s.midtermMax}
                        </div>
                        <div className="text-[10px] text-purple-400 font-bold mt-0.5">
                          ได้ {s.midtermMax > 0 ? ((s.midtermScore / s.midtermMax) * wMid).toFixed(1) : "0.0"} / {wMid}%
                        </div>
                      </td>

                      {/* 3. Post-midterm */}
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] bg-white/[0.02]">
                        <div className="font-bold text-white">
                          {s.postMidtermScore} / {s.postMidtermMax}
                        </div>
                        <div className="text-[10px] text-[#00FF66] font-bold mt-0.5">
                          ได้ {s.postMidtermMax > 0 ? ((s.postMidtermScore / s.postMidtermMax) * wPost).toFixed(1) : "0.0"} / {wPost}%
                        </div>
                      </td>

                      {/* 4. Final */}
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] bg-white/[0.04]">
                        <div className="font-bold text-rose-300">
                          {s.finalScore} / {s.finalMax}
                        </div>
                        <div className="text-[10px] text-rose-400 font-bold mt-0.5">
                          ได้ {s.finalMax > 0 ? ((s.finalScore / s.finalMax) * wFin).toFixed(1) : "0.0"} / {wFin}%
                        </div>
                      </td>

                      {/* Total Percentage */}
                      <td className="py-3 px-4 text-center font-['Geist_Mono'] font-extrabold text-white">
                        {s.totalPercentage}%
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] font-['Geist_Mono'] font-bold text-xs">
                          {s.grade}
                        </span>
                      </td>

                      {/* Pass / Fail based on Threshold */}
                      <td className="py-3 px-4 text-center">
                        {s.isPass ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านเกณฑ์
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> ต่ำกว่าเกณฑ์
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-zinc-500 font-['Geist_Mono']">
                      ไม่พบข้อมูลนักเรียนในเงื่อนไขการค้นหานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 font-['Geist_Mono']">
            กรุณาสร้างหรือเลือกรายวิชาเพื่อดูตารางสรุปผลคะแนน
          </div>
        )}
      </div>
    </div>
  );
};
