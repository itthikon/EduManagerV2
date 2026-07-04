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
  CheckSquare,
  RotateCcw,
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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [inputScore, setInputScore] = useState<number>(0);
  const [inputNote, setInputNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Set default classroom when subject changes
  useEffect(() => {
    if (currentSubject && currentSubject.classes && currentSubject.classes.length > 0) {
      if (!currentSubject.classes.includes(selectedClass)) {
        setSelectedClass(currentSubject.classes[0]);
      }
    }
  }, [selectedSubjectId, currentSubject]);

  // Available assignments for this subject & selected classroom
  const availableAssignments = assignments.filter(
    (a) =>
      a.subjectId === selectedSubjectId &&
      (!selectedClass || (a.assignedClasses && a.assignedClasses.includes(selectedClass)))
  );

  // Set default assignment when available assignments change
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

  // Students in selected classroom
  const roomStudents = students.filter((s) => s.classRoom === selectedClass);

  // Filter students by search
  const filteredStudents = roomStudents.filter((st) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      st.studentId.toLowerCase().includes(q) ||
      st.firstName.toLowerCase().includes(q) ||
      st.lastName.toLowerCase().includes(q)
    );
  });

  // Sound feedback on scan
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Handle scanned student ID
  const handleScannedId = (scannedCode: string) => {
    playBeep();
    setScanResult(scannedCode);

    // Find student in room
    const match = roomStudents.find(
      (s) => s.studentId === scannedCode.trim() || s.studentId.endsWith(scannedCode.trim())
    );

    if (match) {
      openGradeStudent(match);
    } else {
      // Search in overall student list
      const matchAny = students.find((s) => s.studentId === scannedCode.trim());
      if (matchAny) {
        setSelectedClass(matchAny.classRoom);
        openGradeStudent(matchAny);
      } else {
        alert(`ไม่พบนักเรียนรหัส "${scannedCode}" ในระบบ`);
      }
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
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScannedId(decodedText);
            stopCamera();
          },
          () => {}
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setIsCameraActive(false);
        alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์");
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

  // Open Grade Dialog for Student
  const openGradeStudent = (student: Student) => {
    setActiveStudent(student);

    if (currentAssignment) {
      // Find existing submission
      const existing = submissions.find(
        (s) => s.assignmentId === currentAssignment.id && s.studentId === student.studentId
      );
      if (existing) {
        setInputScore(existing.score);
        setInputNote(existing.note || "");
      } else {
        setInputScore(currentAssignment.maxScore); // default full score
        setInputNote("");
      }
    }
  };

  const handleSaveGrade = async () => {
    if (!activeStudent || !currentAssignment || !selectedSubjectId) {
      alert("กรุณาเลือกวิชา งาน และนักเรียนก่อนบันทึกคะแนน");
      return;
    }

    setSaving(true);
    try {
      await onSaveSubmission({
        teacherId: "",
        subjectId: selectedSubjectId,
        assignmentId: currentAssignment.id,
        studentId: activeStudent.studentId,
        classRoom: activeStudent.classRoom,
        score: Number(inputScore),
        status: "graded",
        note: inputNote.trim(),
        term: currentAssignment.term || activeStudent.term || "1",
        academicYear: currentAssignment.academicYear || activeStudent.academicYear || "2568",
      });

      setSuccessMessage(
        `บันทึกคะแนน ${activeStudent.prefix}${activeStudent.firstName} (${inputScore}/${currentAssignment.maxScore} คะแนน) สำเร็จ!`
      );
      setActiveStudent(null);

      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกคะแนน");
    } finally {
      setSaving(false);
    }
  };

  // Quick checkmark toggle for single student
  const handleToggleCheck = async (st: Student) => {
    if (!currentAssignment || !selectedSubjectId) return;

    const existing = submissions.find(
      (s) => s.assignmentId === currentAssignment.id && s.studentId === st.studentId
    );

    const isGraded = existing && existing.status === "graded" && existing.score > 0;

    try {
      if (isGraded) {
        // Toggle off -> set score to 0 / pending
        await onSaveSubmission({
          teacherId: "",
          subjectId: selectedSubjectId,
          assignmentId: currentAssignment.id,
          studentId: st.studentId,
          classRoom: st.classRoom,
          score: 0,
          status: "pending",
          note: "ยกเลิกการส่งงาน (ติ๊กออก)",
          term: currentAssignment.term || st.term || "1",
          academicYear: currentAssignment.academicYear || st.academicYear || "2568",
        });
      } else {
        // Toggle on ✓ -> set full score
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
      console.error("Toggle checkmark error:", err);
    }
  };

  // Check All Students in current room list
  const handleCheckAllInRoom = async () => {
    if (!currentAssignment || !selectedSubjectId) return;

    const pendingList = filteredStudents.filter((st) => {
      const sub = submissions.find(
        (s) => s.assignmentId === currentAssignment.id && s.studentId === st.studentId
      );
      return !sub || sub.status !== "graded" || sub.score === 0;
    });

    if (pendingList.length === 0) {
      alert("นักเรียนทุกคนในตารางได้รับการติ๊กถูกส่งงานครบถ้วนแล้ว");
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
    <div className="space-y-6 font-['Geist'] text-white">
      {/* Top Banner */}
      <div className="bg-[#18181B] p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-['Syne'] font-extrabold text-xl uppercase tracking-wide text-white">
              QR SCANNER & GRADING
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1 font-['Geist_Mono']">
            สแกน QR 40x40mm บนสมุดนักเรียน หรือค้นหารหัสนักเรียนเพื่อตรวจงานทันที
          </p>
        </div>

        <div className="flex items-center space-x-2 font-['Geist_Mono']">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="inline-flex items-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-extrabold px-4 py-2.5 rounded-md text-xs uppercase transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>START_CAMERA_SCAN</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2.5 rounded-md text-xs uppercase transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>CLOSE_CAMERA</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] font-['Geist_Mono'] text-xs font-semibold flex items-center space-x-2 shadow-[0_0_15px_rgba(0,255,102,0.1)]">
          <CheckCircle2 className="w-5 h-5 text-[#00FF66] flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Camera Modal Container */}
      {isCameraActive && (
        <div className="bg-[#18181B] text-white p-6 border border-white/20 flex flex-col items-center">
          <div className="text-center mb-4 font-['Geist_Mono']">
            <span className="px-3 py-1 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 text-xs font-bold inline-flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> CAMERA_SCANNING_ACTIVE
            </span>
            <p className="text-xs text-white/40 mt-1">
              นำกล้องไปจ่อที่ QR Code ประจำตัวนักเรียนทรงกลมขนาด 40x40mm
            </p>
          </div>

          <div id="reader" className="w-full max-w-sm border-2 border-[#00FF66] bg-black overflow-hidden" />

          <button
            onClick={stopCamera}
            className="mt-4 text-xs text-white/40 hover:text-white font-mono uppercase"
          >
            [CANCEL_SCAN]
          </button>
        </div>
      )}

      {/* Subject, Classroom, and Assignment Selector Bar */}
      <div className="bg-[#18181B] p-5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 font-['Geist_Mono']">
        {/* 1. Select Subject */}
        <div>
          <label className="block text-xs uppercase text-white/60 mb-1 flex items-center space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>1. SUBJECT:</span>
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-[#00FF66] focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Select Classroom */}
        <div>
          <label className="block text-xs uppercase text-white/60 mb-1 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>2. CLASSROOM:</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-white focus:outline-none"
          >
            {currentSubject?.classes?.map((cls) => (
              <option key={cls} value={cls}>
                CLASS {cls}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Select Assignment */}
        <div>
          <label className="block text-xs uppercase text-white/60 mb-1 flex items-center space-x-1">
            <GraduationCap className="w-3.5 h-3.5 text-[#00FF66]" />
            <span>3. ASSIGNMENT:</span>
          </label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-[#00FF66] focus:outline-none"
          >
            {availableAssignments.length === 0 && (
              <option value="">NO_ASSIGNMENTS</option>
            )}
            {availableAssignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.maxScore} PTS)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster & Search Table */}
      {!currentAssignment ? (
        <div className="bg-[#18181B] p-12 text-center border border-white/10 font-['Geist_Mono']">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-sm uppercase text-white/70">
            NO_ASSIGNMENTS_FOUND FOR CLASS {selectedClass || "-"}
          </h3>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto font-['Geist']">
            กรุณาไปที่เมนู "จัดการงาน/การบ้าน" เพื่อเพิ่มภาระงานให้กับห้องเรียนนี้ก่อน
          </p>
        </div>
      ) : (
        <div className="bg-[#18181B] border border-white/10 p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-['Geist_Mono'] font-bold px-2 py-0.5 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30">
                  MAX SCORE: {currentAssignment.maxScore} PTS
                </span>
                <span className="text-[10px] font-['Geist_Mono'] font-bold px-2 py-0.5 bg-white/10 text-white/80 border border-white/20">
                  {currentAssignment.category === "preMidterm" || currentAssignment.category === "formative"
                    ? "เก็บก่อนเรียน"
                    : currentAssignment.category === "midterm"
                    ? "กลางภาค"
                    : currentAssignment.category === "postMidterm"
                    ? "เก็บหลังกลางภาค"
                    : "ปลายภาค"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                ห้อง {selectedClass} — {currentAssignment.title}
              </h3>
            </div>

            {/* Checklist Action Controls */}
            <div className="flex flex-wrap items-center gap-2 font-['Geist_Mono']">
              <button
                type="button"
                onClick={handleCheckAllInRoom}
                disabled={batchProcessing}
                className="px-3 py-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-extrabold text-xs uppercase transition-all flex items-center space-x-1.5 shadow-[0_0_12px_rgba(0,255,102,0.15)] disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{batchProcessing ? "กำลังบันทึก..." : "ติ๊กถูกทั้งหมด (CHECK ALL ✓)"}</span>
              </button>

              {/* Quick Search Box */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ / รหัส..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
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
              <div className="bg-[#111113] p-3 border border-white/10 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-['Geist_Mono']">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#00FF66]">
                    ✓ ติ๊กถูกส่งงานแล้ว {gradedCount} / {totalCount} คน ({percentage}%)
                  </span>
                </div>
                <div className="w-full sm:w-48 bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00FF66] h-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Student Grading & Checklist Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-['Geist_Mono']">
              <thead className="bg-[#111113] text-white/60 font-bold border-b border-white/10">
                <tr>
                  <th className="px-3 py-3 text-center">NO</th>
                  <th className="px-3 py-3">STUDENT_ID</th>
                  <th className="px-3 py-3">NAME</th>
                  <th className="px-3 py-3 text-center">CHECKLIST (ติ๊กถูก)</th>
                  <th className="px-3 py-3 text-center">SCORE</th>
                  <th className="px-3 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-['Geist']">
                {filteredStudents
                  .sort((a, b) => a.number - b.number)
                  .map((st) => {
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
                          isGraded ? "bg-[#00FF66]/5 hover:bg-[#00FF66]/10" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="px-3 py-3 text-center font-bold text-white/40 font-mono">
                          {st.number}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-[#00FF66]">
                          {st.studentId}
                        </td>
                        <td className="px-3 py-3 font-semibold text-white">
                          {st.prefix}
                          {st.firstName} {st.lastName}
                        </td>

                        {/* Interactive Checkmark Toggle Button */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCheck(st)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-['Geist_Mono'] font-extrabold uppercase transition-all shadow-sm ${
                              isGraded
                                ? "bg-[#00FF66] text-black hover:bg-[#00DD55]"
                                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white border border-white/20"
                            }`}
                            title="คลิกเพื่อติ๊กถูกส่งงานทันที"
                          >
                            {isGraded ? (
                              <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>ส่งแล้ว (✓)</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5 text-white/40" />
                                <span>ติ๊กส่งงาน</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-3 text-center font-mono font-bold text-sm">
                          {sub && sub.status === "graded" ? (
                            <span className="text-[#00FF66]">
                              {sub.score} / {currentAssignment.maxScore}
                            </span>
                          ) : (
                            <span className="text-white/20">0 / {currentAssignment.maxScore}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openGradeStudent(st)}
                            className="px-2.5 py-1 text-[11px] font-mono text-white/60 hover:text-white underline hover:no-underline"
                          >
                            ใส่คะแนนละเอียด
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade Student Dialog / Modal */}
      {activeStudent && currentAssignment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/20 max-w-md w-full p-6 text-white font-['Geist']">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 font-['Geist_Mono']">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30">
                  CLASS {activeStudent.classRoom} | NO. {activeStudent.number}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-1">
                  GRADING: {activeStudent.prefix}{activeStudent.firstName}{" "}
                  {activeStudent.lastName}
                </h3>
              </div>
              <button
                onClick={() => setActiveStudent(null)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            <div className="bg-[#111113] p-3 border border-white/10 text-xs mb-4 space-y-1 font-['Geist_Mono']">
              <div className="font-semibold text-white/80">
                TASK: {currentAssignment.title}
              </div>
              <div className="text-white/40">
                ID: <span className="font-mono font-bold text-[#00FF66]">{activeStudent.studentId}</span>
              </div>
              <div className="text-[#00FF66] font-bold">
                MAX: {currentAssignment.maxScore} PTS
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                  SCORE (0 - {currentAssignment.maxScore}):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max={currentAssignment.maxScore}
                    value={inputScore}
                    onChange={(e) => setInputScore(Number(e.target.value))}
                    className="w-full text-center py-2.5 text-lg font-mono font-bold text-[#00FF66] bg-[#111113] border border-white/20 focus:border-[#00FF66] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setInputScore(currentAssignment.maxScore)}
                    className="px-3 py-2.5 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 font-['Geist_Mono'] text-xs font-bold whitespace-nowrap"
                  >
                    FULL_SCORE
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                  NOTES / FEEDBACK
                </label>
                <input
                  type="text"
                  placeholder="เช่น ทำงานเรียบร้อย, ส่งล่าช้า 1 วัน"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10 font-['Geist_Mono']">
                <button
                  type="button"
                  onClick={() => setActiveStudent(null)}
                  className="px-4 py-2 text-xs text-white/50 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-[#00FF66] hover:bg-[#00DD55] text-black transition-all flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "SAVING..." : "SAVE_SCORE"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
