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
  Clock,
  Plus,
  Trash2,
  Play,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { Assignment, LineConfig, ScheduledNotification, Student, Subject, Submission } from "../types";
import { buildNotificationMessage } from "../lib/notificationBuilder";

interface LineNotificationManagerProps {
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
  lineConfigs: LineConfig[];
  scheduledNotifications?: ScheduledNotification[];
  onSaveLineConfig: (config: Omit<LineConfig, "id" | "updatedAt">) => Promise<void>;
  onSaveScheduledNotification?: (schedule: Omit<ScheduledNotification, "id" | "createdAt"> & { id?: string }) => Promise<void>;
  onDeleteScheduledNotification?: (id: string) => Promise<void>;
  onToggleScheduledNotification?: (id: string, enabled: boolean) => Promise<void>;
  onExecuteScheduledNotification?: (sch: ScheduledNotification) => Promise<{ success: boolean; error?: string }>;
}

export const LineNotificationManager: React.FC<LineNotificationManagerProps> = ({
  subjects,
  students,
  assignments,
  submissions,
  lineConfigs,
  scheduledNotifications = [],
  onSaveLineConfig,
  onSaveScheduledNotification,
  onDeleteScheduledNotification,
  onToggleScheduledNotification,
  onExecuteScheduledNotification,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("ม.1/1");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || "ALL"
  );

  // Line Configuration inputs
  const [channelToken, setChannelToken] = useState("");
  const [targetId, setTargetId] = useState("");
  const [notifyToken, setNotifyToken] = useState("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [activeNotifyTab, setActiveNotifyTab] = useState<"missing" | "completed" | "grades" | "schedule">("missing");
  const [missingMode, setMissingMode] = useState<"subject_all" | "single_task">("subject_all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  const [messageText, setMessageText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Scheduled Notification Form State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schTitle, setSchTitle] = useState("");
  const [schClassRoom, setSchClassRoom] = useState("ม.1/1");
  const [schSubjectId, setSchSubjectId] = useState(subjects[0]?.id || "ALL");
  const [schReportType, setSchReportType] = useState<"missing_subject" | "missing_task" | "completed" | "grades">("missing_subject");
  const [schAssignmentId, setSchAssignmentId] = useState("");
  const [schScheduleType, setSchScheduleType] = useState<"specific" | "recurring">("recurring");
  const [schDate, setSchDate] = useState(new Date().toISOString().split("T")[0]);
  const [schTime, setSchTime] = useState("16:30");
  const [schRecurringDays, setSchRecurringDays] = useState<number[]>([5]); // Default Friday (5)
  const [executingSchId, setExecutingSchId] = useState<string | null>(null);

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
    let repType: "missing_subject" | "missing_task" | "completed" | "grades" = "missing_subject";

    if (activeNotifyTab === "missing") {
      repType = missingMode === "subject_all" ? "missing_subject" : "missing_task";
    } else if (activeNotifyTab === "completed") {
      repType = "completed";
    } else if (activeNotifyTab === "grades") {
      repType = "grades";
    } else {
      return "";
    }

    return buildNotificationMessage({
      reportType: repType,
      subjectId: selectedSubjectId,
      classRoom: selectedClass,
      assignmentId: selectedAssignmentId,
      subjects,
      students,
      assignments,
      submissions,
    });
  }, [activeNotifyTab, missingMode, selectedSubjectId, selectedClass, selectedAssignmentId, subjects, students, assignments, submissions]);

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

  // Save LINE config for selected class
  const handleSaveConfig = async () => {
    if (!channelToken.trim() && !notifyToken.trim()) {
      setTestResult({
        type: "error",
        msg: "กรุณากรอก Line Channel Access Token หรือ Notify Token ก่อนบันทึก",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await onSaveLineConfig({
        classRoom: selectedClass,
        channelAccessToken: channelToken.trim(),
        targetUserId: targetId.trim(),
        notifyToken: notifyToken.trim(),
      });
      setTestResult({
        type: "success",
        msg: `บันทึกการตั้งค่า LINE สำหรับห้อง ${selectedClass} เรียบร้อยแล้ว`,
      });
    } catch (e: any) {
      setTestResult({
        type: "error",
        msg: `เกิดข้อผิดพลาดในการบันทึก: ${e.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  // Send Direct Test LINE Notification
  const handleSendDirectNotification = async () => {
    if (!messageText.trim()) return;

    if (!channelToken.trim() && !notifyToken.trim()) {
      setTestResult({
        type: "error",
        msg: `กรุณาตั้งค่า Line Access Token สำหรับห้อง ${selectedClass} ก่อนส่งข้อความ`,
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/line-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelAccessToken: channelToken.trim(),
          targetId: targetId.trim(),
          notifyToken: notifyToken.trim(),
          message: messageText,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setTestResult({
          type: "success",
          msg: `ส่งการแจ้งเตือนไปยังกลุ่ม LINE ห้อง ${selectedClass} สำเร็จ!`,
        });
      } else {
        setTestResult({
          type: "error",
          msg: resData.error || "เกิดข้อผิดพลาดจาก LINE API Server",
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        msg: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
      });
    } finally {
      setTesting(false);
    }
  };

  // Create or Update Scheduled Notification
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schTitle.trim()) return;

    if (onSaveScheduledNotification) {
      await onSaveScheduledNotification({
        title: schTitle.trim(),
        classRoom: schClassRoom,
        subjectId: schSubjectId,
        reportType: schReportType,
        assignmentId: schAssignmentId,
        scheduleType: schScheduleType,
        scheduledDate: schDate,
        scheduledTime: schTime,
        recurringDays: schRecurringDays,
        enabled: true,
      });
    }

    setIsScheduleModalOpen(false);
    setSchTitle("");
  };

  // Run Scheduled Notification Test
  const handleRunScheduleNow = async (sch: ScheduledNotification) => {
    setExecutingSchId(sch.id);
    if (onExecuteScheduledNotification) {
      const res = await onExecuteScheduledNotification(sch);
      if (res.success) {
        alert(`✅ ส่งการแจ้งเตือนตามตาราง "${sch.title}" เข้ากลุ่ม LINE ห้อง ${sch.classRoom} สำเร็จ!`);
      } else {
        alert(`❌ ไม่สามารถส่งข้อความได้: ${res.error}`);
      }
    }
    setExecutingSchId(null);
  };

  const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#18181B] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Bell className="w-3.5 h-3.5" /> LINE NOTIFICATION CENTER
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight font-['Space_Grotesk']">
              ระบบสรุปงานค้างส่ง & แจ้งเตือนอัตโนมัติเข้ากลุ่ม LINE
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              สร้างข้อความสรุปงานค้างส่งรายวิชา/รายห้อง ส่งแจ้งเตือนผ่าน LINE Messaging API และตั้งวันเวลาส่งอัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-400 font-medium whitespace-nowrap">
              เลือกห้องเรียน:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-black/50 border border-white/20 text-white rounded-lg px-4 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
            >
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  ห้อง {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel / Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Mode Tabs */}
          <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveNotifyTab("missing")}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                activeNotifyTab === "missing"
                  ? "bg-amber-500/10 border-t-2 border-amber-500 text-amber-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <AlertTriangle className="w-4 h-4" /> สรุปงานค้างส่ง
            </button>
            <button
              onClick={() => setActiveNotifyTab("completed")}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                activeNotifyTab === "completed"
                  ? "bg-emerald-500/10 border-t-2 border-emerald-500 text-emerald-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> รายงานส่งงานครบ
            </button>
            <button
              onClick={() => setActiveNotifyTab("grades")}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                activeNotifyTab === "grades"
                  ? "bg-indigo-500/10 border-t-2 border-indigo-500 text-indigo-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Award className="w-4 h-4" /> สรุปคะแนน & เกรด
            </button>
            <button
              onClick={() => setActiveNotifyTab("schedule")}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                activeNotifyTab === "schedule"
                  ? "bg-cyan-500/10 border-t-2 border-cyan-500 text-cyan-400"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4" /> ตั้งเวลาส่งอัตโนมัติ ({scheduledNotifications.length})
            </button>
          </div>

          {/* TAB 1: MISSING TASKS REPORT */}
          {activeNotifyTab === "missing" && (
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  การสรุปรายการงานค้างส่ง
                </h3>

                {/* Missing Mode Selector */}
                <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setMissingMode("subject_all")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      missingMode === "subject_all"
                        ? "bg-amber-500 text-black shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    สรุปค้างส่งทุกภาระงาน (รายวิชา)
                  </button>
                  <button
                    onClick={() => setMissingMode("single_task")}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      missingMode === "single_task"
                        ? "bg-amber-500 text-black shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    สรุปค้างส่งเฉพาะงานเดี่ยว
                  </button>
                </div>
              </div>

              {/* Subject & Class Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    เลือกรายวิชา:
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">ทุกวิชา (สรุปงานค้างรวม)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {missingMode === "single_task" && (
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">
                      เลือกภาระงานเดี่ยว:
                    </label>
                    <select
                      value={selectedAssignmentId}
                      onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {assignments
                        .filter((a) => selectedSubjectId === "ALL" || a.subjectId === selectedSubjectId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title} ({a.maxScore} คะแนน)
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                💡 <strong>เคล็ดลับ:</strong> โหมด &ldquo;สรุปค้างส่งทุกภาระงาน (รายวิชา)&rdquo; จะทำการรวบรวมรายชื่อนักเรียนและรายการใบงานที่ยังไม่ได้ส่งทั้งหมดในวิชานี้มาจัดรูปแบบแยกเป็นรายบุคคลง่ายต่อการติดตามในกลุ่มไลน์
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETED TASKS REPORT */}
          {activeNotifyTab === "completed" && (
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                รายงานผลนักเรียนที่ส่งงานครบทุกชิ้น
              </h3>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  เลือกรายวิชา:
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: GRADES & SCORES REPORT */}
          {activeNotifyTab === "grades" && (
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-white/10">
                <Award className="w-4 h-4 text-indigo-400" />
                สรุปคะแนนสะสมและเกรดขณะนี้
              </h3>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  เลือกรายวิชา:
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDULED NOTIFICATIONS AUTOMATION */}
          {activeNotifyTab === "schedule" && (
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    ตารางส่งการแจ้งเตือนอัตโนมัติเข้ากลุ่ม LINE
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    ตั้งวันเวลาส่งสรุปงานค้างส่งรายห้องล่วงหน้า ระบบจะส่งเข้า LINE กลุ่มห้องตามเวลานั้นโดยอัตโนมัติ
                  </p>
                </div>

                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-lg"
                >
                  <Plus className="w-4 h-4" /> เพิ่มตารางส่งอัตโนมัติ
                </button>
              </div>

              {/* Background Status Pulse Banner */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                    <div className="w-3 h-3 bg-cyan-400 rounded-full absolute top-0 left-0" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-cyan-300">
                      ระบบตรวจเช็คเวลาส่งอัตโนมัติเปิดใช้งานอยู่ (Real-time Background Engine)
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      เมื่อถึงเวลาที่กำหนด ระบบจะสร้างรายงานและส่งไปยัง LINE กลุ่มของห้องเรียนที่เลือกโดยอัตโนมัติ
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Item List */}
              {scheduledNotifications.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-xl p-6">
                  <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-300">ยังไม่มีการตั้งตารางส่งการแจ้งเตือน</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    คลิกปุ่ม &ldquo;เพิ่มตารางส่งอัตโนมัติ&rdquo; ด้านบนเพื่อกำหนดวันเวลาส่งรายงานเข้าไลน์กลุ่ม
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledNotifications.map((sch) => {
                    const subj = subjects.find((s) => s.id === sch.subjectId);
                    const reportTitle =
                      sch.reportType === "missing_subject"
                        ? "สรุปงานค้างส่งทุกภาระงาน"
                        : sch.reportType === "missing_task"
                        ? "สรุปค้างส่งงานเดี่ยว"
                        : sch.reportType === "completed"
                        ? "รายงานส่งงานครบ"
                        : "สรุปคะแนนและเกรด";

                    return (
                      <div
                        key={sch.id}
                        className={`border rounded-xl p-4 transition-all ${
                          sch.enabled
                            ? "bg-black/40 border-cyan-500/30 hover:border-cyan-500/50"
                            : "bg-black/20 border-white/5 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  sch.enabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                                }`}
                              />
                              <h4 className="text-sm font-bold text-white">{sch.title}</h4>
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-300">
                                ห้อง {sch.classRoom}
                              </span>
                              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-medium">
                                {reportTitle}
                              </span>
                            </div>

                            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>
                                📘 วิชา: {subj ? `${subj.code} ${subj.name}` : "ทุกวิชา"}
                              </span>
                              <span>
                                ⏰ เวลา:{" "}
                                {sch.scheduleType === "recurring"
                                  ? `ประจำทุกวัน ${sch.recurringDays?.map((d) => dayNames[d]).join(", ")} เวลา ${sch.scheduledTime} น.`
                                  : `${sch.scheduledDate} เวลา ${sch.scheduledTime} น.`}
                              </span>
                            </div>

                            {sch.lastExecutedAt && (
                              <div className="text-[11px] text-emerald-400/80 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                ส่งล่าสุดเมื่อ: {new Date(sch.lastExecutedAt).toLocaleString("th-TH")}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                            {/* Toggle Enable Button */}
                            <button
                              onClick={() =>
                                onToggleScheduledNotification &&
                                onToggleScheduledNotification(sch.id, !sch.enabled)
                              }
                              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                sch.enabled
                                  ? "text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-zinc-500 hover:bg-white/5"
                              }`}
                              title={sch.enabled ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                            >
                              {sch.enabled ? (
                                <ToggleRight className="w-6 h-6 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-zinc-500" />
                              )}
                            </button>

                            {/* Run Test Now Button */}
                            <button
                              disabled={executingSchId === sch.id}
                              onClick={() => handleRunScheduleNow(sch)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1 transition-all disabled:opacity-50"
                              title="ทดสอบส่งรายงานเข้าไลน์กลุ่มทันที"
                            >
                              {executingSchId === sch.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              ส่งทันที
                            </button>

                            {/* Delete Schedule Button */}
                            <button
                              onClick={() =>
                                onDeleteScheduledNotification && onDeleteScheduledNotification(sch.id)
                              }
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-all"
                              title="ลบตารางนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Generated Message Preview Area */}
          {activeNotifyTab !== "schedule" && (
            <div className="bg-[#18181B] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  ตัวอย่างข้อความแจ้งเตือนที่สร้างขึ้น
                </h3>

                <button
                  onClick={handleCopyMessage}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      คัดลอกเรียบร้อย!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      คัดลอกข้อความ
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={12}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
                placeholder="ข้อความแจ้งเตือนจะแสดงขึ้นอัตโนมัติ..."
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setMessageText(generateMessage())}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> รีเซ็ตข้อความต้นฉบับ
                </button>

                <button
                  disabled={testing || !messageText.trim()}
                  onClick={handleSendDirectNotification}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  ส่งเข้ากลุ่ม LINE (ห้อง {selectedClass})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <Settings className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                ตั้งค่า LINE API (ห้อง {selectedClass})
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  Line Channel Access Token (Messaging API):
                </label>
                <input
                  type="password"
                  value={channelToken}
                  onChange={(e) => setChannelToken(e.target.value)}
                  placeholder="Bearer Token จาก LINE Developers"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  Line Target User/Group ID:
                </label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="เช่น C1234567890abcdef..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  หรือ Line Notify Token (ทางเลือกรอง):
                </label>
                <input
                  type="password"
                  value={notifyToken}
                  onChange={(e) => setNotifyToken(e.target.value)}
                  placeholder="Token จาก notify-bot.line.me"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                disabled={testing}
                onClick={handleSaveConfig}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                บันทึกการตั้งค่า LINE สำหรับห้อง {selectedClass}
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs border ${
                    testResult.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#18181B] border border-white/10 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              📌 คำแนะนำการเชื่อมต่อ LINE
            </h4>
            <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside leading-relaxed">
              <li>คุณสามารถตั้งค่า Token แยกอิสระตามแต่ละห้องเรียนได้</li>
              <li>แนะนำให้ใช้ <strong>LINE Messaging API</strong> ร่วมกับ Group ID ของห้องเรียนนั้นๆ เพื่อความแม่นยำสูง</li>
              <li>สามารถกดปุ่ม <strong>&ldquo;คัดลอกข้อความ&rdquo;</strong> ไปวางในแชทกลุ่ม LINE ด้วยตนเองได้เช่นเดียวกัน</li>
            </ul>
          </div>
        </div>
      </div>

      {/* SCHEDULE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                ตั้งเวลาส่งการแจ้งเตือน LINE อัตโนมัติ
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  ชื่อตารางตั้งเวลา:
                </label>
                <input
                  type="text"
                  required
                  value={schTitle}
                  onChange={(e) => setSchTitle(e.target.value)}
                  placeholder="เช่น แจ้งเตือนงานค้างส่งห้อง ม.1/1 ทุกวันศุกร์ 16:30 น."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    ห้องเรียนเป้าหมาย:
                  </label>
                  <select
                    value={schClassRoom}
                    onChange={(e) => setSchClassRoom(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {allClasses.map((c) => (
                      <option key={c} value={c}>
                        ห้อง {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    วิชาเป้าหมาย:
                  </label>
                  <select
                    value={schSubjectId}
                    onChange={(e) => setSchSubjectId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">ทุกวิชา</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-medium block mb-1">
                  ประเภทรายงานที่จะส่ง:
                </label>
                <select
                  value={schReportType}
                  onChange={(e) => setSchReportType(e.target.value as any)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="missing_subject">สรุปงานค้างส่งทุกภาระงาน (รายวิชา)</option>
                  <option value="missing_task">สรุปงานค้างส่งเฉพาะภาระงานเดี่ยว</option>
                  <option value="completed">รายงานส่งงานครบทุกชิ้น</option>
                  <option value="grades">สรุปคะแนนสะสมและเกรด</option>
                </select>
              </div>

              {schReportType === "missing_task" && (
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    เลือกภาระงานเดี่ยว:
                  </label>
                  <select
                    value={schAssignmentId}
                    onChange={(e) => setSchAssignmentId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {assignments
                      .filter((a) => schSubjectId === "ALL" || a.subjectId === schSubjectId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.maxScore} คะแนน)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    รูปแบบการส่ง:
                  </label>
                  <select
                    value={schScheduleType}
                    onChange={(e) => setSchScheduleType(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="recurring">ประจำทุกสัปดาห์ (Recurring)</option>
                    <option value="specific">ระบุวันและเวลา (Specific Date)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    เวลาที่จะส่ง (HH:mm):
                  </label>
                  <input
                    type="time"
                    required
                    value={schTime}
                    onChange={(e) => setSchTime(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {schScheduleType === "specific" ? (
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    วันที่ส่ง:
                  </label>
                  <input
                    type="date"
                    required
                    value={schDate}
                    onChange={(e) => setSchDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-2">
                    เลือกวันในสัปดาห์ที่ต้องการส่งประจำ:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { num: 1, label: "จันทร์" },
                      { num: 2, label: "อังคาร" },
                      { num: 3, label: "พุธ" },
                      { num: 4, label: "พฤหัส" },
                      { num: 5, label: "ศุกร์" },
                      { num: 6, label: "เสาร์" },
                      { num: 0, label: "อาทิตย์" },
                    ].map((day) => {
                      const isSelected = schRecurringDays.includes(day.num);
                      return (
                        <button
                          key={day.num}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSchRecurringDays((prev) => prev.filter((d) => d !== day.num));
                            } else {
                              setSchRecurringDays((prev) => [...prev, day.num]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-cyan-500 text-black shadow"
                              : "bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20"
                >
                  บันทึกตารางส่งอัตโนมัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
