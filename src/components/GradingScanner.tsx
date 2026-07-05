import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  Camera,
  BookOpen,
  Layers,
  GraduationCap,
  Save,
  Check,
  CheckCheck,
  Square,
  RotateCcw,
  UserCheck,
  Smartphone,
  Plus,
  Minus,
  SlidersHorizontal,
  ArrowRight,
  Award,
  FileText,
  Volume2,
  RefreshCw,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { Assignment, Student, Subject, Submission } from "../types";

interface GradingScannerProps {
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  onSaveSubmission: (submission: Omit<Submission, "id" | "updatedAt">) => Promise<void>;
}

export const GradingScanner: React.FC<GradingScannerProps> = ({
  subjects,
  students,
  assignments,
  submissions,
  onSaveSubmission,
}) => {
  // Global View Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // Roster View Mode: 'card' (Mobile-first cards) or 'table' (Desktop table)
  const [rosterViewMode, setRosterViewMode] = useState<"card" | "table">("card");

  // Camera QR Scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Auto-sync selectedSubjectId when subjects load
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
    } else {
      setSelectedSubjectId("");
    }
  }, [subjects]);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Scanned/Selected Active Student for Multi-Task Grading
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeStudentSubjectId, setActiveStudentSubjectId] = useState<string>("");

  // Local state for multi-task grading modal: Map<assignmentId, { score: number; note: string; status: 'graded' | 'missing' | 'submitted' }>
  const [studentTaskScores, setStudentTaskScores] = useState<
    Record<string, { score: number; note: string; isModified?: boolean }>
  >({});

  const [saving, setSaving] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Default class selection based on active subject
  useEffect(() => {
    if (currentSubject && currentSubject.classes && currentSubject.classes.length > 0) {
      if (!currentSubject.classes.includes(selectedClass)) {
        setSelectedClass(currentSubject.classes[0]);
      }
    } else if (!selectedClass && students.length > 0) {
      setSelectedClass(students[0].classRoom || "ม.1/1");
    }
  }, [selectedSubjectId, currentSubject, students]);

  // Available assignments for active main filters
  const availableAssignments = assignments.filter(
    (a) =>
      a.subjectId === selectedSubjectId &&
      (!selectedClass || !a.assignedClasses || a.assignedClasses.length === 0 || a.assignedClasses.includes(selectedClass))
  );

  // Sync default active assignment
  useEffect(() => {
    if (availableAssignments.length > 0) {
      if (!availableAssignments.some((a) => a.id === selectedAssignmentId)) {
        setSelectedAssignmentId(availableAssignments[0].id);
      }
    } else {
      setSelectedAssignmentId("");
    }
  }, [selectedSubjectId, selectedClass, assignments]);

  const currentAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Room students list
  const roomStudents = students
    .filter((s) => !selectedClass || s.classRoom === selectedClass)
    .sort((a, b) => a.number - b.number);

  // Filter students by search
  const filteredStudents = roomStudents.filter((st) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      st.studentId.toLowerCase().includes(q) ||
      st.firstName.toLowerCase().includes(q) ||
      st.lastName.toLowerCase().includes(q) ||
      `${st.prefix}${st.firstName} ${st.lastName}`.toLowerCase().includes(q)
    );
  });

  // Sound feedback on scan
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1046.5; // High C beep
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Handle scanned student QR Code ID
  const handleScannedId = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    playBeep();
    setScanResult(cleanCode);

    // 1. Search in current classroom
    let match = roomStudents.find(
      (s) => s.studentId === cleanCode || s.studentId.endsWith(cleanCode)
    );

    // 2. Search in overall student list
    if (!match) {
      match = students.find((s) => s.studentId === cleanCode || s.studentId.endsWith(cleanCode));
    }

    if (match) {
      setSelectedClass(match.classRoom);
      openMultiTaskStudentModal(match, selectedSubjectId || subjects[0]?.id || "");
    } else {
      alert(`⚠️ ไม่พบนักเรียนที่มีรหัส QR "${cleanCode}" ในระบบ`);
    }
  };

  // Camera QR Scanner control
  const startCamera = async () => {
    setIsCameraActive(true);
    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode("reader");
        html5QrcodeRef.current = qrScanner;
        await qrScanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            handleScannedId(decodedText);
            stopCamera();
          },
          () => {}
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setIsCameraActive(false);
        alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องถ่ายภาพในเบราว์เซอร์");
      }
    }, 100);
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Open Multi-Task Inspector for Student
  const openMultiTaskStudentModal = (student: Student, subjectId: string) => {
    setActiveStudent(student);
    const targetSubId = subjectId || selectedSubjectId || subjects[0]?.id || "";
    setActiveStudentSubjectId(targetSubId);

    // Initialize task scores state for ALL assignments in the selected subject
    const subjectTasks = assignments.filter((a) => a.subjectId === targetSubId);
    const initialScores: Record<string, { score: number; note: string; isModified?: boolean }> = {};

    subjectTasks.forEach((task) => {
      const existingSub = submissions.find(
        (s) => s.assignmentId === task.id && s.studentId === student.studentId
      );
      if (existingSub) {
        initialScores[task.id] = {
          score: existingSub.score,
          note: existingSub.note || "",
          isModified: false,
        };
      } else {
        initialScores[task.id] = {
          score: 0,
          note: "",
          isModified: false,
        };
      }
    });

    setStudentTaskScores(initialScores);
  };

  // Handle changing subject inside Student Modal
  const handleStudentSubjectChange = (newSubId: string) => {
    if (!activeStudent) return;
    setActiveStudentSubjectId(newSubId);

    const subjectTasks = assignments.filter((a) => a.subjectId === newSubId);
    const updatedScores: Record<string, { score: number; note: string; isModified?: boolean }> = {};

    subjectTasks.forEach((task) => {
      const existingSub = submissions.find(
        (s) => s.assignmentId === task.id && s.studentId === activeStudent.studentId
      );
      if (existingSub) {
        updatedScores[task.id] = {
          score: existingSub.score,
          note: existingSub.note || "",
          isModified: false,
        };
      } else {
        updatedScores[task.id] = {
          score: 0,
          note: "",
          isModified: false,
        };
      }
    });

    setStudentTaskScores(updatedScores);
  };

  // Set single score inside student modal
  const handleUpdateStudentTaskScore = (taskId: string, newScore: number, note?: string) => {
    setStudentTaskScores((prev) => ({
      ...prev,
      [taskId]: {
        score: Math.max(0, newScore),
        note: note !== undefined ? note : prev[taskId]?.note || "",
        isModified: true,
      },
    }));
  };

  // Quick action: Give full score to all tasks in modal
  const handleGiveFullScoreAllTasks = () => {
    const subjectTasks = assignments.filter((a) => a.subjectId === activeStudentSubjectId);
    setStudentTaskScores((prev) => {
      const next = { ...prev };
      subjectTasks.forEach((task) => {
        next[task.id] = {
          score: task.maxScore,
          note: next[task.id]?.note || "ตรวจรับงานเรียบร้อย (คะแนนเต็ม)",
          isModified: true,
        };
      });
      return next;
    });
  };

  // Quick action: Clear scores all tasks
  const handleClearAllTasks = () => {
    const subjectTasks = assignments.filter((a) => a.subjectId === activeStudentSubjectId);
    setStudentTaskScores((prev) => {
      const next = { ...prev };
      subjectTasks.forEach((task) => {
        next[task.id] = {
          score: 0,
          note: "ยังไม่ส่งงาน",
          isModified: true,
        };
      });
      return next;
    });
  };

  // Save all updated scores for active student in modal
  const handleSaveAllStudentScores = async (scanNextImmediately: boolean = false) => {
    if (!activeStudent || !activeStudentSubjectId) return;

    setSaving(true);
    try {
      const subjectTasks = assignments.filter((a) => a.subjectId === activeStudentSubjectId);

      for (const task of subjectTasks) {
        const item = studentTaskScores[task.id];
        if (item) {
          await onSaveSubmission({
            teacherId: "",
            subjectId: activeStudentSubjectId,
            assignmentId: task.id,
            studentId: activeStudent.studentId,
            classRoom: activeStudent.classRoom,
            score: Number(item.score),
            status: item.score > 0 ? "graded" : "missing",
            note: item.note,
            term: task.term || activeStudent.term || "1",
            academicYear: task.academicYear || activeStudent.academicYear || "2568",
          });
        }
      }

      setSuccessMessage(
        `✅ บันทึกคะแนนของ ${activeStudent.prefix}${activeStudent.firstName} ${activeStudent.lastName} เรียบร้อยแล้ว!`
      );
      setTimeout(() => setSuccessMessage(""), 3500);

      setActiveStudent(null);

      if (scanNextImmediately) {
        setTimeout(() => {
          startCamera();
        }, 300);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกคะแนน");
    } finally {
      setSaving(false);
    }
  };

  // Quick toggle single checkmark for student in active assignment
  const handleToggleCheckSingle = async (st: Student) => {
    if (!currentAssignment || !selectedSubjectId) return;

    const existing = submissions.find(
      (s) => s.assignmentId === currentAssignment.id && s.studentId === st.studentId
    );
    const isGraded = existing && existing.status === "graded" && existing.score > 0;

    try {
      if (isGraded) {
        await onSaveSubmission({
          teacherId: "",
          subjectId: selectedSubjectId,
          assignmentId: currentAssignment.id,
          studentId: st.studentId,
          classRoom: st.classRoom,
          score: 0,
          status: "missing",
          note: "ยกเลิกการส่งงาน",
          term: currentAssignment.term || st.term || "1",
          academicYear: currentAssignment.academicYear || st.academicYear || "2568",
        });
      } else {
        await onSaveSubmission({
          teacherId: "",
          subjectId: selectedSubjectId,
          assignmentId: currentAssignment.id,
          studentId: st.studentId,
          classRoom: st.classRoom,
          score: currentAssignment.maxScore,
          status: "graded",
          note: "ตรวจรับงานเรียบร้อย (ติ๊กถูก)",
          term: currentAssignment.term || st.term || "1",
          academicYear: currentAssignment.academicYear || st.academicYear || "2568",
        });
      }
    } catch (err) {
      console.error("Toggle check error:", err);
    }
  };

  // Check all students in current filtered list
  const handleCheckAllInRoom = async () => {
    if (!currentAssignment || !selectedSubjectId) return;

    const pendingList = filteredStudents.filter((st) => {
      const sub = submissions.find(
        (s) => s.assignmentId === currentAssignment.id && s.studentId === st.studentId
      );
      return !sub || sub.status !== "graded" || sub.score === 0;
    });

    if (pendingList.length === 0) {
      alert("นักเรียนทุกคนในตารางได้รับการตรวจรับงานครบถ้วนแล้ว");
      return;
    }

    if (!confirm(`ยืนยันติ๊กถูก [ส่งงานแล้ว] ให้กับนักเรียน ${pendingList.length} คน?`)) {
      return;
    }

    setBatchProcessing(true);
    try {
      for (const st of pendingList) {
        await onSaveSubmission({
          teacherId: "",
          subjectId: selectedSubjectId,
          assignmentId: currentAssignment.id,
          studentId: st.studentId,
          classRoom: st.classRoom,
          score: currentAssignment.maxScore,
          status: "graded",
          note: "ตรวจรับงานเรียบร้อย (ติ๊กถูกทั้งหมด)",
          term: currentAssignment.term || st.term || "1",
          academicYear: currentAssignment.academicYear || st.academicYear || "2568",
        });
      }
      setSuccessMessage(`ติ๊กถูกส่งงานให้นักเรียน ${pendingList.length} คน เรียบร้อยแล้ว!`);
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลแบบกลุ่ม");
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-white pb-24">
      {/* Top Banner & Quick Camera Trigger */}
      <div className="bg-[#18181B] p-5 md:p-6 border border-white/10 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <QrCode className="w-3.5 h-3.5" /> SMART QR SCANNER & GRADING
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              สแกน QR Code ตรวจงานรายคน & สรุปทุกภาระงาน
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              สแกน QR ประจำตัวนักเรียน เพื่อเลือกรายวิชาและเปิดตรวจภาระงานทุกงานในวิชานั้นได้ทันที
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-5 py-3 rounded-xl text-sm uppercase transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>เปิดกล้องสแกน QR CODE</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-xl text-sm uppercase transition-all active:scale-95"
              >
                <XCircle className="w-5 h-5" />
                <span>ปิดกล้องสแกน</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Camera Viewfinder Container */}
      {isCameraActive && (
        <div className="bg-[#18181B] text-white p-5 md:p-6 border-2 border-emerald-500/50 rounded-2xl flex flex-col items-center shadow-2xl relative">
          <div className="text-center mb-4 space-y-1">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center rounded-full">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-400" />
              กล้องสแกนกำลังทำงาน...
            </span>
            <p className="text-xs text-zinc-400">
              นำกล้องไปจ่อที่สติกเกอร์ QR Code บนสมุดหรือบัตรประจำตัวนักเรียน
            </p>
          </div>

          <div className="relative w-full max-w-sm rounded-xl overflow-hidden border-2 border-emerald-400 bg-black shadow-inner">
            <div id="reader" className="w-full min-h-[260px]" />
          </div>

          <button
            onClick={stopCamera}
            className="mt-4 px-4 py-2 text-xs text-zinc-400 hover:text-white font-mono bg-white/5 hover:bg-white/10 rounded-lg transition-all"
          >
            [ ยกเลิกการสแกน ]
          </button>
        </div>
      )}

      {/* Global Filter Bar (Subject, Classroom, Assignment) */}
      <div className="bg-[#18181B] p-4 md:p-5 border border-white/10 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* 1. Select Subject */}
        <div>
          <label className="block text-xs uppercase text-zinc-400 font-semibold mb-1 flex items-center space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. เลือกรายวิชาหลัก:</span>
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 font-bold text-emerald-400 rounded-xl focus:outline-none"
          >
            {subjects.length === 0 ? (
              <option value="">NO_SUBJECTS</option>
            ) : (
              subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name || "วิชาที่เลือก"}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. Select Classroom */}
        <div>
          <label className="block text-xs uppercase text-zinc-400 font-semibold mb-1 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. เลือกห้องเรียน:</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 font-bold text-white rounded-xl focus:outline-none"
          >
            {currentSubject?.classes?.map((cls) => (
              <option key={cls} value={cls}>
                ห้อง {cls}
              </option>
            ))}
            {(!currentSubject?.classes || currentSubject.classes.length === 0) &&
              Array.from(new Set(students.map((s) => s.classRoom)))
                .filter(Boolean)
                .map((cls) => (
                  <option key={cls} value={cls}>
                    ห้อง {cls}
                  </option>
                ))}
          </select>
        </div>

        {/* 3. Select Active Single Assignment (For Quick Table View) */}
        <div>
          <label className="block text-xs uppercase text-zinc-400 font-semibold mb-1 flex items-center space-x-1">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. เลือกงานสำหรับมุมมองรวดเร็ว:</span>
          </label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 font-bold text-emerald-400 rounded-xl focus:outline-none"
          >
            {availableAssignments.length === 0 && <option value="">ไม่มีภาระงานในวิชานี้</option>}
            {availableAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.maxScore} คะแนน)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Controls & View Switcher */}
      <div className="bg-[#18181B] border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              รายชื่อนักเรียน ห้อง {selectedClass || "-"}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              คลิกปุ่ม &ldquo;ตรวจทุกงานรายคน&rdquo; เพื่อเลือกตรวจภาระงานทั้งหมดของนักเรียนคนนั้น
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setRosterViewMode("card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  rosterViewMode === "card"
                    ? "bg-emerald-500 text-black font-bold shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                การ์ดมือถือ (Mobile)
              </button>
              <button
                onClick={() => setRosterViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  rosterViewMode === "table"
                    ? "bg-emerald-500 text-black font-bold shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                ตาราง (Desktop)
              </button>
            </div>

            {/* Batch Check All */}
            {currentAssignment && (
              <button
                type="button"
                onClick={handleCheckAllInRoom}
                disabled={batchProcessing}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                <span>ติ๊กถูกทั้งห้อง</span>
              </button>
            )}

            {/* Quick Search */}
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ / รหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 text-white rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Progress Summary Bar */}
        {currentAssignment && (
          <div className="bg-black/40 p-3.5 border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            {(() => {
              const gradedCount = filteredStudents.filter((st) => {
                const sub = submissions.find(
                  (s) => s.assignmentId === currentAssignment.id && s.studentId === st.studentId
                );
                return sub && sub.status === "graded" && sub.score > 0;
              }).length;
              const totalCount = filteredStudents.length;
              const percentage = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

              return (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-emerald-400">
                      ✓ ติ๊กถูกส่งงานแล้ว {gradedCount} / {totalCount} คน ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full sm:w-48 bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* MOBILE CARD VIEW (ROSTER) */}
        {rosterViewMode === "card" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStudents.length === 0 ? (
              <div className="col-span-full text-center py-10 border border-dashed border-white/10 rounded-xl">
                <p className="text-sm text-zinc-400">ไม่พบนายชื่อนักเรียนในเงื่อนไขการค้นหา</p>
              </div>
            ) : (
              filteredStudents.map((st) => {
                // Calculate student overall submissions in selected subject
                const subjectTasks = assignments.filter((a) => a.subjectId === selectedSubjectId);
                const gradedCount = subjectTasks.filter((task) => {
                  const sub = submissions.find(
                    (s) => s.assignmentId === task.id && s.studentId === st.studentId
                  );
                  return sub && sub.status === "graded" && sub.score > 0;
                }).length;

                // Active assignment submission
                const currentSub = currentAssignment
                  ? submissions.find(
                      (s) =>
                        s.assignmentId === currentAssignment.id && s.studentId === st.studentId
                    )
                  : null;
                const isCurrentGraded = currentSub && currentSub.status === "graded" && currentSub.score > 0;

                return (
                  <div
                    key={st.id}
                    className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {st.number}
                        </div>
                        <div>
                          <div className="text-xs font-mono text-emerald-400 font-bold">
                            รหัส: {st.studentId}
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {st.prefix}
                            {st.firstName} {st.lastName}
                          </h4>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                        ห้อง {st.classRoom}
                      </span>
                    </div>

                    {/* Progress Badge for Subject */}
                    <div className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">ส่งงานวิชานี้แล้ว:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {gradedCount} / {subjectTasks.length} งาน
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Open Multi-Task Inspector Button */}
                      <button
                        type="button"
                        onClick={() => openMultiTaskStudentModal(st, selectedSubjectId)}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>ตรวจทุกงาน</span>
                      </button>

                      {/* Quick Single Checkmark Toggle */}
                      {currentAssignment && (
                        <button
                          type="button"
                          onClick={() => handleToggleCheckSingle(st)}
                          className={`w-full py-2 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            isCurrentGraded
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-white/10 hover:bg-white/20 text-zinc-300"
                          }`}
                        >
                          {isCurrentGraded ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                              <span>ส่งแล้ว ✓</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5 text-zinc-500" />
                              <span>ติ๊กส่งงาน</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* DESKTOP TABLE VIEW */}
        {rosterViewMode === "table" && currentAssignment && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 text-zinc-400 font-bold border-b border-white/10">
                <tr>
                  <th className="px-3 py-3 text-center">เลขที่</th>
                  <th className="px-3 py-3">รหัสนักเรียน</th>
                  <th className="px-3 py-3">ชื่อ - นามสกุล</th>
                  <th className="px-3 py-3 text-center">ส่งงานแล้ว (ติ๊กถูก)</th>
                  <th className="px-3 py-3 text-center">คะแนนงานนี้</th>
                  <th className="px-3 py-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((st) => {
                  const sub = submissions.find(
                    (s) =>
                      s.assignmentId === currentAssignment.id &&
                      s.studentId === st.studentId
                  );
                  const isGraded = sub && sub.status === "graded" && sub.score > 0;

                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        isGraded ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "hover:bg-white/5"
                      }`}
                    >
                      <td className="px-3 py-3 text-center font-bold text-zinc-500">
                        {st.number}
                      </td>
                      <td className="px-3 py-3 font-bold text-emerald-400">
                        {st.studentId}
                      </td>
                      <td className="px-3 py-3 font-semibold text-white">
                        {st.prefix}
                        {st.firstName} {st.lastName}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCheckSingle(st)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                            isGraded
                              ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md"
                              : "bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white"
                          }`}
                        >
                          {isGraded ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>ส่งแล้ว (✓)</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5 text-zinc-500" />
                              <span>ติ๊กส่งงาน</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-3 text-center font-bold text-sm">
                        {sub && sub.status === "graded" ? (
                          <span className="text-emerald-400">
                            {sub.score} / {currentAssignment.maxScore}
                          </span>
                        ) : (
                          <span className="text-zinc-600">0 / {currentAssignment.maxScore}</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openMultiTaskStudentModal(st, selectedSubjectId)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
                          <span>ตรวจทุกงานรายคน</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FLOATING QUICK SCAN BUTTON FOR MOBILE */}
      <button
        onClick={startCamera}
        className="fixed bottom-6 right-6 z-40 md:hidden bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold p-4 rounded-full shadow-2xl shadow-emerald-500/40 flex items-center gap-2 border-2 border-black active:scale-95 transition-all"
        title="สแกน QR Code"
      >
        <Camera className="w-6 h-6 stroke-[2.5]" />
        <span className="text-xs uppercase font-['Space_Grotesk']">สแกน QR</span>
      </button>

      {/* ========================================================= */}
      {/* MULTI-TASK STUDENT INSPECTION & GRADING MODAL / DRAWER    */}
      {/* ========================================================= */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-[#18181B] border border-white/20 rounded-2xl max-w-2xl w-full p-4 md:p-6 text-white space-y-5 shadow-2xl relative my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-lg shadow-inner">
                  {activeStudent.number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                      รหัส: {activeStudent.studentId}
                    </span>
                    <span className="text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded">
                      ห้อง {activeStudent.classRoom} | เลขที่ {activeStudent.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {activeStudent.prefix}
                    {activeStudent.firstName} {activeStudent.lastName}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveStudent(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Subject Selector Bar Inside Modal */}
            <div className="bg-black/50 p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 whitespace-nowrap">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>เลือกรายวิชาที่จะตรวจ:</span>
              </label>

              <select
                value={activeStudentSubjectId}
                onChange={(e) => handleStudentSubjectChange(e.target.value)}
                className="w-full sm:w-auto bg-[#18181B] border border-white/20 text-emerald-400 font-bold text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Task Progress & Fast Batch Presets */}
            {(() => {
              const subjectTasks = assignments.filter((a) => a.subjectId === activeStudentSubjectId);
              const maxTotal = subjectTasks.reduce((acc, t) => acc + t.maxScore, 0);
              const currentEarned = subjectTasks.reduce((acc, t) => {
                const item = studentTaskScores[t.id];
                return acc + (item ? Number(item.score) : 0);
              }, 0);
              const completedCount = subjectTasks.filter((t) => {
                const item = studentTaskScores[t.id];
                return item && item.score > 0;
              }).length;

              return (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" />
                      คะแนนรวมวิชานี้:{" "}
                      <span className="text-sm font-bold font-mono text-white">
                        {currentEarned} / {maxTotal} คะแนน
                      </span>{" "}
                      ({maxTotal > 0 ? Math.round((currentEarned / maxTotal) * 100) : 0}%)
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      ตรวจรับงานแล้ว {completedCount} / {subjectTasks.length} งาน
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGiveFullScoreAllTasks}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      คะแนนเต็มทุกงาน
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllTasks}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10 rounded-lg text-xs font-semibold transition-all"
                    >
                      ล้างคะแนน
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Assignments Scrollable List for this Selected Student */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1 min-h-[220px]">
              {(() => {
                const subjectTasks = assignments.filter((a) => a.subjectId === activeStudentSubjectId);

                if (subjectTasks.length === 0) {
                  return (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
                      <GraduationCap className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">ยังไม่มีภาระงานสร้างไว้ในรายวิชานี้</p>
                    </div>
                  );
                }

                return subjectTasks.map((task) => {
                  const scoreItem = studentTaskScores[task.id] || { score: 0, note: "" };
                  const isGraded = scoreItem.score > 0;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isGraded
                          ? "bg-black/50 border-emerald-500/30 shadow-sm"
                          : "bg-black/30 border-white/10"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-semibold">
                              {task.category === "preMidterm" || task.category === "formative"
                                ? "เก็บก่อนเรียน"
                                : task.category === "midterm"
                                ? "กลางภาค"
                                : task.category === "postMidterm"
                                ? "เก็บหลังกลางภาค"
                                : "ปลายภาค"}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              คะแนนเต็ม {task.maxScore} คะแนน
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{task.title}</h4>
                        </div>

                        {/* Quick Full / Zero Buttons */}
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentTaskScore(task.id, task.maxScore)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              scoreItem.score === task.maxScore
                                ? "bg-emerald-500 text-black shadow"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            ✓ เต็ม {task.maxScore}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStudentTaskScore(task.id, 0)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              scoreItem.score === 0
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-white/5 hover:bg-white/10 text-zinc-400"
                            }`}
                          >
                            0 ไม่ส่ง
                          </button>
                        </div>
                      </div>

                      {/* Score Input Stepper & Note Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-white/5">
                        <div className="sm:col-span-6 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStudentTaskScore(task.id, scoreItem.score - 1)
                            }
                            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-all active:scale-95"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            max={task.maxScore}
                            value={scoreItem.score}
                            onChange={(e) =>
                              handleUpdateStudentTaskScore(task.id, Number(e.target.value))
                            }
                            className="w-full text-center py-2 text-base font-mono font-bold text-emerald-400 bg-black/60 border border-white/20 focus:border-emerald-500 rounded-lg focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStudentTaskScore(
                                task.id,
                                Math.min(task.maxScore, scoreItem.score + 1)
                              )
                            }
                            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-all active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            placeholder="หมายเหตุ / ข้อเสนอแนะ..."
                            value={scoreItem.note}
                            onChange={(e) =>
                              handleUpdateStudentTaskScore(task.id, scoreItem.score, e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs bg-black/60 border border-white/15 focus:border-emerald-500 text-white rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleSaveAllStudentScores(true)}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>บันทึก & สแกนคนถัดไป</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveStudent(null)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs text-zinc-400 hover:text-white font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAllStudentScores(false)}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>บันทึกคะแนนทั้งหมด</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
