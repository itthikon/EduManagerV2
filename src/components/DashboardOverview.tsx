import React from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  QrCode,
  CheckCircle2,
  Bell,
  Award,
  ArrowRight,
} from "lucide-react";
import { Assignment, Student, Subject, Submission } from "../types";
import { calculateStudentGradeSummary } from "../lib/gradeCalculator";

interface DashboardOverviewProps {
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  setActiveTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  subjects,
  students,
  assignments,
  submissions,
  setActiveTab,
}) => {
  // Statistics calculations
  const totalSubjects = subjects.length;
  const totalStudents = students.length;
  const totalAssignments = assignments.length;
  const totalSubmissions = submissions.length;

  // Grade distribution statistics
  const gradeCounts: Record<string, number> = {
    "4.0": 0,
    "3.5": 0,
    "3.0": 0,
    "2.5": 0,
    "2.0": 0,
    "1.5": 0,
    "1.0": 0,
    "0.0": 0,
  };

  if (subjects.length > 0) {
    const firstSub = subjects[0];
    const subAssignments = assignments.filter((a) => a.subjectId === firstSub.id);

    students.forEach((st) => {
      const summary = calculateStudentGradeSummary(
        st,
        subAssignments,
        submissions,
        firstSub.scoreWeights
      );
      if (gradeCounts[summary.grade] !== undefined) {
        gradeCounts[summary.grade]++;
      }
    });
  }

  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  return (
    <div className="space-y-8 font-['Geist'] text-white">
      {/* Header Top Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="font-['Geist_Mono'] text-xs uppercase tracking-widest text-[#00FF66] mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
            <span>CURRENT_TERMINAL: SCIENCE_CLASS_01</span>
          </div>
          <h1 className="font-['Syne'] font-extrabold text-3xl sm:text-5xl uppercase tracking-tight text-white">
            ระบบตรวจงาน & คะแนน
          </h1>
          <p className="text-sm text-white/50 max-w-2xl mt-2 font-['Geist'] leading-relaxed">
            สะสมคะแนน • ตรวจงานผ่าน QR Code 40x40mm • แจ้งเตือน LINE API
            <br />
            จัดการสัดส่วนคะแนนสะสม พิมพ์สติ๊กเกอร์ QR Code รูปวงกลม 40x40mm ติดสมุดนักเรียน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab("grading")}
            className="bg-[#00FF66] hover:bg-[#00DD55] text-black font-['Geist_Mono'] font-extrabold text-xs uppercase px-5 py-3 rounded-md transition-all shadow-[0_0_20px_rgba(0,255,102,0.2)] flex items-center space-x-2"
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" />
            <span>OPEN_CAMERA_SCAN</span>
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className="bg-[#18181B] hover:border-[#00FF66] text-white hover:text-[#00FF66] border border-white/10 font-['Geist_Mono'] text-xs uppercase px-5 py-3 rounded-md transition-all flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>PRINT_PDF_40MM</span>
          </button>
        </div>
      </div>

      {/* Grid Panels Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Left Column: Cards & Procedures */}
        <div className="lg:col-span-2 space-y-6">
          {/* High-Density Data Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab("subjects")}
              className="bg-[#18181B] border border-white/10 p-5 rounded-none hover:border-[#00FF66]/50 transition-all cursor-pointer group"
            >
              <div className="font-['Geist_Mono'] text-[11px] uppercase tracking-wider text-white/40 group-hover:text-[#00FF66] transition-colors flex justify-between items-center">
                <span>SUBJECTS_COUNT</span>
                <BookOpen className="w-4 h-4 opacity-50" />
              </div>
              <div className="font-['Geist_Mono'] text-3xl font-extrabold text-white mt-3">
                {String(totalSubjects).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setActiveTab("students")}
              className="bg-[#18181B] border border-white/10 p-5 rounded-none hover:border-[#00FF66]/50 transition-all cursor-pointer group"
            >
              <div className="font-['Geist_Mono'] text-[11px] uppercase tracking-wider text-white/40 group-hover:text-[#00FF66] transition-colors flex justify-between items-center">
                <span>STUDENTS_TOTAL</span>
                <Users className="w-4 h-4 opacity-50" />
              </div>
              <div className="font-['Geist_Mono'] text-3xl font-extrabold text-white mt-3">
                {String(totalStudents).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setActiveTab("assignments")}
              className="bg-[#18181B] border border-white/10 p-5 rounded-none hover:border-[#00FF66]/50 transition-all cursor-pointer group"
            >
              <div className="font-['Geist_Mono'] text-[11px] uppercase tracking-wider text-white/40 group-hover:text-[#00FF66] transition-colors flex justify-between items-center">
                <span>TASK_LOAD</span>
                <GraduationCap className="w-4 h-4 opacity-50" />
              </div>
              <div className="font-['Geist_Mono'] text-3xl font-extrabold text-white mt-3">
                {String(totalAssignments).padStart(2, "0")}
              </div>
            </div>

            <div
              onClick={() => setActiveTab("grading")}
              className="bg-[#18181B] border border-white/10 p-5 rounded-none hover:border-[#00FF66]/50 transition-all cursor-pointer group"
            >
              <div className="font-['Geist_Mono'] text-[11px] uppercase tracking-wider text-white/40 group-hover:text-[#00FF66] transition-colors flex justify-between items-center">
                <span>TASKS_COMPLETED</span>
                <CheckCircle2 className="w-4 h-4 opacity-50" />
              </div>
              <div className="font-['Geist_Mono'] text-3xl font-extrabold text-[#00FF66] mt-3">
                {String(totalSubmissions).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* System Procedures Action List */}
          <div className="bg-[#18181B] border border-white/10 p-6 space-y-4">
            <div className="font-['Geist_Mono'] text-xs uppercase tracking-widest text-[#00FF66] flex items-center justify-between">
              <span>SYSTEM_PROCEDURES</span>
              <span className="text-white/30 text-[10px]">[FAST_ACCESS]</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("grading")}
                className="w-full bg-[#111113] border border-white/10 hover:border-[#00FF66] text-white hover:text-[#00FF66] p-4 text-xs font-['Geist_Mono'] transition-all flex justify-between items-center group"
              >
                <span className="flex items-center space-x-3">
                  <QrCode className="w-4 h-4 text-[#00FF66]" />
                  <span>OPEN_CAMERA_SCAN (ตรวจงานผ่านสแกน QR Code)</span>
                </span>
                <span className="group-hover:translate-x-1 transition-transform">[RUN]</span>
              </button>

              <button
                onClick={() => setActiveTab("students")}
                className="w-full bg-[#111113] border border-white/10 hover:border-[#00FF66] text-white hover:text-[#00FF66] p-4 text-xs font-['Geist_Mono'] transition-all flex justify-between items-center group"
              >
                <span className="flex items-center space-x-3">
                  <Users className="w-4 h-4 text-[#00FF66]" />
                  <span>DOWNLOAD_PDF_40MM (พิมพ์สติ๊กเกอร์วงกลม)</span>
                </span>
                <span className="group-hover:translate-x-1 transition-transform">[FILE]</span>
              </button>

              <button
                onClick={() => setActiveTab("line-notify")}
                className="w-full bg-[#111113] border border-white/10 hover:border-[#00FF66] text-white hover:text-[#00FF66] p-4 text-xs font-['Geist_Mono'] transition-all flex justify-between items-center group"
              >
                <span className="flex items-center space-x-3">
                  <Bell className="w-4 h-4 text-[#00FF66]" />
                  <span>LINE_REPORT_SERVICE (แจ้งเตือนผู้ปกครอง/นักเรียน)</span>
                </span>
                <span className="group-hover:translate-x-1 transition-transform">[API]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Grade Distribution Chart & System Footer */}
        <div className="bg-[#18181B] border border-white/10 p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="font-['Geist_Mono'] text-xs uppercase tracking-widest text-[#00FF66] mb-4 flex items-center space-x-2">
              <Award className="w-4 h-4" />
              <span>GRADE_DISTRIBUTION</span>
            </div>

            <div className="space-y-3">
              {Object.entries(gradeCounts).map(([grade, count]) => {
                const percentage = Math.round((count / maxGradeCount) * 100);
                return (
                  <div key={grade} className="space-y-1">
                    <div className="flex justify-between items-center font-['Geist_Mono'] text-xs text-white/70">
                      <span>GRADE {grade}</span>
                      <span className="text-[#00FF66]">{count} PERSONS</span>
                    </div>
                    <div className="h-2 w-full bg-[#111113] border border-white/10 relative overflow-hidden">
                      <div
                        className="h-full bg-[#00FF66] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="font-['Geist'] text-xs text-white/40 mt-6 leading-relaxed">
              ประเมินผลอิงตามสัดส่วนคะแนนสะสมที่ครูผู้สอนตั้งค่าไว้
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 font-['Geist_Mono'] text-[10px] text-white/30 space-y-1">
            <div>QR GRADE TRACKER • QR CODE (40X40MM)</div>
            <div>POWERED BY FIREBASE & LINE MESSAGING API</div>
            <div>SERVER PROXY: EXPRESS (PORT 3000)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
