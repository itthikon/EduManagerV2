import React, { useState } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Award,
  Settings,
  Copy,
  Check,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Assignment, LineConfig, Student, Subject, Submission } from "../types";
import { calculateStudentGradeSummary } from "../lib/gradeCalculator";

interface LineNotificationManagerProps {
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  lineConfigs: LineConfig[];
  onSaveLineConfig: (config: Omit<LineConfig, "id" | "updatedAt">) => Promise<void>;
}

export const LineNotificationManager: React.FC<LineNotificationManagerProps> = ({
  subjects,
  students,
  assignments,
  submissions,
  lineConfigs,
  onSaveLineConfig,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("ม.1/1");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );

  // Line Configuration inputs
  const [channelToken, setChannelToken] = useState("");
  const [targetId, setTargetId] = useState("");
  const [notifyToken, setNotifyToken] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [activeNotifyTab, setActiveNotifyTab] = useState<"missing" | "completed" | "grades">("missing");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  const [messageText, setMessageText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Available classrooms
  const allClasses = Array.from(
    new Set([...students.map((s) => s.classRoom), "ม.1/1", "ม.1/2", "ม.1/3"])
  ).filter(Boolean);

  // Sync stored configuration for selected class
  const currentConfig = lineConfigs.find((c) => c.classRoom === selectedClass);

  React.useEffect(() => {
    if (currentConfig) {
      setChannelToken(currentConfig.channelAccessToken || "");
      setTargetId(currentConfig.targetUserId || "");
      setNotifyToken(currentConfig.notifyToken || "");
    } else {
      setChannelToken("");
      setTargetId("");
      setNotifyToken("");
    }
  }, [selectedClass, currentConfig]);

  // Sync default selectedAssignmentId when selectedSubjectId changes
  React.useEffect(() => {
    const matchingAssignments = assignments.filter((a) => a.subjectId === selectedSubjectId);
    if (matchingAssignments.length > 0) {
      if (!matchingAssignments.some((a) => a.id === selectedAssignmentId)) {
        setSelectedAssignmentId(matchingAssignments[0].id);
      }
    } else {
      setSelectedAssignmentId("");
    }
  }, [selectedSubjectId, assignments]);

  // Auto-generate notification message
  const generateMessage = React.useCallback(() => {
    if (!currentSubject) return "";

    if (activeNotifyTab === "missing") {
      const targetAssignment = assignments.find((a) => a.id === selectedAssignmentId);
      if (!targetAssignment) return "กรุณาเลือกงานที่ต้องการติดตาม";

      const roomStudents = students.filter((s) => s.classRoom === selectedClass);
      const missingStudents = roomStudents.filter((st) => {
        const sub = submissions.find(
          (s) => s.assignmentId === targetAssignment.id && s.studentId === st.studentId
        );
        return !sub || (sub.status !== "graded" && sub.status !== "submitted");
      });

      if (missingStudents.length === 0) {
        return `🎉 ยินดีด้วย! นักเรียนทุกคนในห้อง ${selectedClass} ส่งงาน "${targetAssignment.title}" ครบเรียบร้อยแล้วครับ/ค่ะ`;
      }

      let msg = `📢 [แจ้งเตือนค้างส่งงาน] วิชา ${currentSubject.code} ${currentSubject.name}\n`;
      msg += `📌 ภาระงาน: ${targetAssignment.title}\n`;
      msg += `🏫 ห้องเรียน: ${selectedClass}\n`;
      msg += `--------------------------------\n`;
      msg += `รายชื่อนักเรียนที่ค้างส่ง (${missingStudents.length} คน):\n`;

      missingStudents.forEach((st, idx) => {
        msg += `${idx + 1}. [เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName} (รหัส: ${st.studentId})\n`;
      });

      msg += `\nกรุณาส่งงานผ่านคุณครูผู้สอนเพื่อสะสมคะแนนครับ/ค่ะ`;
      return msg;
    }

    if (activeNotifyTab === "completed") {
      const roomStudents = students.filter((s) => s.classRoom === selectedClass);
      const subjectAssignments = assignments.filter(
        (a) => a.subjectId === selectedSubjectId && (a.assignedClasses?.includes(selectedClass) || !a.assignedClasses || a.assignedClasses.length === 0)
      );

      const completedStudents = roomStudents.filter((st) => {
        if (subjectAssignments.length === 0) return false;
        return subjectAssignments.every((a) => {
          const sub = submissions.find(
            (s) => s.assignmentId === a.id && s.studentId === st.studentId
          );
          return sub && (sub.status === "graded" || sub.status === "submitted");
        });
      });

      let msg = `🎉 [รายงานผลนักเรียนส่งงานครบ] วิชา ${currentSubject.code} ${currentSubject.name}\n`;
      msg += `🏫 ห้องเรียน: ${selectedClass}\n`;
      msg += `--------------------------------\n`;
      msg += `นักเรียนที่ส่งงานครบทุกชิ้น (${completedStudents.length}/${roomStudents.length} คน):\n`;

      if (completedStudents.length === 0) {
        msg += `ยังไม่มีนักเรียนที่ส่งงานครบทุกชิ้นในวิชานี้`;
      } else {
        completedStudents.forEach((st, idx) => {
          msg += `✨ ${idx + 1}. [เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
        });
      }
      return msg;
    }

    if (activeNotifyTab === "grades") {
      const roomStudents = students.filter((s) => s.classRoom === selectedClass);
      const subjectAssignments = assignments.filter((a) => a.subjectId === selectedSubjectId);

      let msg = `📊 [สรุปคะแนนสะสมและเกรดขณะนี้] วิชา ${currentSubject.code} ${currentSubject.name}\n`;
      msg += `🏫 ห้องเรียน: ${selectedClass}\n`;
      msg += `--------------------------------\n`;

      roomStudents
        .sort((a, b) => a.number - b.number)
        .forEach((st) => {
          const summary = calculateStudentGradeSummary(
            st,
            subjectAssignments,
            submissions,
            currentSubject.scoreWeights
          );
          msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
          msg += `   • ก่อนเรียน: ${summary.preMidtermScore}/${summary.preMidtermMax} | กลางภาค: ${summary.midtermScore}/${summary.midtermMax}\n`;
          msg += `   • หลังกลางภาค: ${summary.postMidtermScore}/${summary.postMidtermMax} | ปลายภาค: ${summary.finalScore}/${summary.finalMax}\n`;
          msg += `   • คะแนนรวม: ${summary.totalPercentage}% | เกรด: ${summary.grade}\n`;
          msg += `   • ส่งงานแล้ว: ${summary.submittedCount}/${summary.totalAssignments} ชิ้น\n\n`;
        });

      return msg.trim();
    }

    return "";
  }, [activeNotifyTab, selectedSubjectId, selectedClass, selectedAssignmentId, subjects, students, assignments, submissions, currentSubject]);

  // Update preview message when selection changes
  React.useEffect(() => {
    setMessageText(generateMessage());
  }, [generateMessage]);

  // Copy text to clipboard
  const handleCopyMessage = async () => {
    if (!messageText) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = messageText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    try {
      await onSaveLineConfig({
        teacherId: "",
        classRoom: selectedClass,
        channelAccessToken: channelToken.trim(),
        targetUserId: targetId.trim(),
        notifyToken: notifyToken.trim(),
      });
      setTestResult({ type: "success", msg: `บันทึกการตั้งค่า LINE สำหรับห้อง ${selectedClass} เรียบร้อย` });
    } catch (err: any) {
      setTestResult({ type: "error", msg: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    }
  };

  // Test Line Notification API
  const handleTestSend = async () => {
    if (!channelToken.trim() && !notifyToken.trim()) {
      alert("กรุณากรอก Line Channel Access Token หรือ Notify Token ก่อนทดสอบ");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/line-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: channelToken.trim(),
          targetId: targetId.trim(),
          notifyToken: notifyToken.trim(),
          message: `🔔 [ทดสอบการเชื่อมต่อ LINE] ระบบตรวจงาน & สะสมคะแนนนักเรียน ห้อง ${selectedClass}\nการเชื่อมต่อสมบูรณ์เรียบร้อย!`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ type: "success", msg: "ส่งข้อความทดสอบเข้า LINE สำเร็จแล้ว!" });
      } else {
        setTestResult({ type: "error", msg: data.error || "เกิดข้อผิดพลาดในการส่ง LINE" });
      }
    } catch (err: any) {
      setTestResult({ type: "error", msg: err.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setTesting(false);
    }
  };

  // Helper send Line request
  const sendCustomLineMessage = async () => {
    if (!messageText.trim()) {
      alert("ไม่มีข้อความแจ้งเตือนให้ส่ง");
      return;
    }

    if (!channelToken.trim() && !notifyToken.trim()) {
      setTestResult({
        type: "error",
        msg: "ยังไม่ได้ตั้งค่า Line Access Token สามารถคัดลอกข้อความด้านล่างไปส่งด้วยตนเองได้เลย",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/line-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: channelToken.trim(),
          targetId: targetId.trim(),
          notifyToken: notifyToken.trim(),
          message: messageText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ type: "success", msg: "ส่งรายงานเข้ากลุ่ม LINE เรียบร้อยแล้ว!" });
      } else {
        setTestResult({ type: "error", msg: data.error || "เกิดข้อผิดพลาดในการส่ง LINE" });
      }
    } catch (err: any) {
      setTestResult({ type: "error", msg: err.message || "ไม่สามารถส่งข้อความได้" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 font-['Geist'] text-white">
      {/* Header Banner */}
      <div className="bg-[#18181B] p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-[#Syne] font-extrabold text-xl uppercase tracking-wide text-white">
              LINE NOTIFICATION MANAGER
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1 font-['Geist_Mono']">
            ติดตามงานนักเรียนค้างส่ง ส่งรายงานงานครบ และส่งผลคะแนนเข้า LINE รายห้อง หรือคัดลอกข้อความส่งเอง
          </p>
        </div>

        {/* Classroom selector */}
        <div className="flex items-center space-x-2 font-['Geist_Mono']">
          <span className="text-xs uppercase text-white/60">CLASSROOM:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-[#00FF66] focus:outline-none"
          >
            {allClasses.map((cls) => (
              <option key={cls} value={cls}>
                CLASS {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LINE API Settings Card */}
      <div className="bg-[#18181B] p-6 border border-white/10 space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 font-['Geist_Mono']">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-[#00FF66]" />
            <h3 className="font-bold text-white text-xs uppercase">
              LINE MESSAGING API CONFIGURATION: CLASS {selectedClass}
            </h3>
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-1.5 bg-[#00FF66] hover:bg-[#00DD55] text-black font-bold text-xs uppercase transition-all"
          >
            SAVE_CONFIG
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-['Geist_Mono']">
          <div>
            <label className="block text-white/60 uppercase mb-1">
              Line Channel Access Token (Messaging API):
            </label>
            <input
              type="password"
              placeholder="Long-lived Channel Access Token"
              value={channelToken}
              onChange={(e) => setChannelToken(e.target.value)}
              className="w-full px-3 py-2 bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-white/60 uppercase mb-1">
              Target User ID / Group ID (Push Message):
            </label>
            <input
              type="text"
              placeholder="U123456789... or C123456789..."
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Alternative Line Notify token */}
        <div className="pt-2 text-xs font-['Geist_Mono']">
          <label className="block text-white/40 uppercase mb-1">
            Line Notify Token (Alternative):
          </label>
          <input
            type="password"
            placeholder="Line Notify Token"
            value={notifyToken}
            onChange={(e) => setNotifyToken(e.target.value)}
            className="w-full px-3 py-2 bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center justify-between pt-2 font-['Geist_Mono']">
          <button
            onClick={handleTestSend}
            disabled={testing}
            className="inline-flex items-center space-x-2 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 px-4 py-2 text-xs font-bold uppercase transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testing ? "TESTING..." : "TEST_LINE_CONNECTION"}</span>
          </button>

          {testResult && (
            <div
              className={`text-xs font-bold flex items-center space-x-1 px-3 py-1.5 border ${
                testResult.type === "success"
                  ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              <span>{testResult.msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Notification Trigger Section */}
      <div className="bg-[#18181B] p-6 border border-white/10 space-y-6">
        {/* Action Selector Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 font-['Geist_Mono']">
          <button
            onClick={() => setActiveNotifyTab("missing")}
            className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center space-x-2 border ${
              activeNotifyTab === "missing"
                ? "bg-rose-500/20 text-rose-400 border-rose-500/50"
                : "bg-[#111113] text-white/50 border-white/10 hover:border-white/30"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>1. MISSING_TASKS_ALERT</span>
          </button>

          <button
            onClick={() => setActiveNotifyTab("completed")}
            className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center space-x-2 border ${
              activeNotifyTab === "completed"
                ? "bg-[#00FF66]/20 text-[#00FF66] border-[#00FF66]/50"
                : "bg-[#111113] text-white/50 border-white/10 hover:border-white/30"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>2. COMPLETED_TASKS_REPORT</span>
          </button>

          <button
            onClick={() => setActiveNotifyTab("grades")}
            className={`px-4 py-2 text-xs font-bold uppercase transition-all flex items-center space-x-2 border ${
              activeNotifyTab === "grades"
                ? "bg-sky-500/20 text-sky-400 border-sky-500/50"
                : "bg-[#111113] text-white/50 border-white/10 hover:border-white/30"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>3. GRADES_SUMMARY_REPORT</span>
          </button>
        </div>

        {/* Filters according to active tab */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-['Geist_Mono']">
          <div>
            <label className="block text-xs uppercase text-white/60 mb-1">
              SUBJECT:
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {activeNotifyTab === "missing" && (
            <div>
              <label className="block text-xs uppercase text-white/60 mb-1">
                ASSIGNMENT TO TRACK:
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-rose-400 focus:outline-none"
              >
                {assignments
                  .filter((a) => a.subjectId === selectedSubjectId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.maxScore} PTS)
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Message Preview & Copy Box */}
        <div className="bg-[#111113] border border-white/15 p-4 rounded-lg space-y-3 font-['Geist_Mono']">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#00FF66]" />
              <span className="text-xs font-bold uppercase text-white tracking-wide">
                ตัวอย่างข้อความที่จะส่ง (MESSAGE PREVIEW)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMessageText(generateMessage())}
                className="px-2.5 py-1 text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded transition-all flex items-center space-x-1"
                title="สร้างข้อความตามแม่แบบใหม่"
              >
                <RefreshCw className="w-3 h-3" />
                <span>รีเซ็ตข้อความ</span>
              </button>

              <button
                onClick={handleCopyMessage}
                className={`px-3 py-1 text-xs font-bold rounded transition-all flex items-center space-x-1.5 ${
                  copied
                    ? "bg-[#00FF66] text-black"
                    : "bg-[#00FF66]/20 hover:bg-[#00FF66]/30 text-[#00FF66] border border-[#00FF66]/50"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "คัดลอกเรียบร้อย!" : "คัดลอกข้อความ"}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-white/50 font-['Geist']">
            คุณสามารถปรับแก้ไขข้อความในกล่องนี้ได้ตามต้องการ และกดปุ่ม <strong className="text-[#00FF66]">คัดลอกข้อความ</strong> เพื่อนำไปวางส่งใน LINE Group, Facebook Messenger หรือแอปอื่น ๆ ด้วยตนเอง
          </p>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={8}
            className="w-full p-3 bg-[#18181B] border border-white/15 rounded text-xs text-white font-mono leading-relaxed focus:border-[#00FF66] focus:outline-none resize-y"
            placeholder="ข้อความแจ้งเตือนจะแสดงที่นี่..."
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={handleCopyMessage}
              className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase rounded transition-all flex items-center justify-center space-x-2 ${
                copied
                  ? "bg-[#00FF66] text-black shadow-lg shadow-[#00FF66]/20"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-[#00FF66]" />}
              <span>{copied ? "คัดลอกแล้วเรียบร้อย!" : "คัดลอกข้อความทั้งหมด"}</span>
            </button>

            <button
              onClick={sendCustomLineMessage}
              disabled={testing || !messageText.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#00FF66] hover:bg-[#00DD55] text-black font-extrabold text-xs uppercase transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{testing ? "กำลังส่ง..." : "ส่งแจ้งเตือนเข้า LINE"}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 text-xs font-bold border rounded flex items-start space-x-2 ${
                testResult.type === "success"
                  ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              {testResult.type === "error" ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#00FF66] flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div>{testResult.msg}</div>
                {testResult.type === "error" && (
                  <div className="text-[11px] font-normal text-white/70">
                    💡 <strong>คำแนะนำ:</strong> หากการส่งผ่านระบบอัตโนมัติขัดข้อง ท่านสามารถกดปุ่ม <span className="text-[#00FF66] font-bold">"คัดลอกข้อความ"</span> ด้านบน เพื่อนำข้อความไปวางส่งในแชตกลุ่มด้วยตนเองได้ทันที
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
