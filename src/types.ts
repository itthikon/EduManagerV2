export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface ScoreWeights {
  preMidterm: number;  // คะแนนเก็บก่อนเรียน / ก่อนกลางภาค (e.g. 30%)
  midterm: number;     // คะแนนกลางภาค (e.g. 20%)
  postMidterm: number; // คะแนนเก็บหลังกลางภาค (e.g. 30%)
  final: number;       // คะแนนปลายภาค (e.g. 20%)
  formative?: number;  // สำหรับรองรับข้อมูลเดิม (legacy)
}

export interface AcademicYearInfo {
  id: string;
  year: string; // e.g. "2568", "2567"
  term?: string; // e.g. "1", "2", "3" (ภาคเรียนที่ 1, 2, ฤดูร้อน)
  isDefault?: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  teacherId: string;
  code: string;       // รหัสวิชา e.g. ว21101
  name: string;       // ชื่อวิชา e.g. วิทยาศาสตร์ 1
  classes: string[];  // ห้องเรียนที่เรียนวิชานี้ e.g. ["ม.1/1", "ม.1/2"]
  scoreWeights: ScoreWeights;
  term?: string;      // ภาคเรียน e.g. "1", "2"
  academicYear?: string; // ปีการศึกษา e.g. "2568"
  createdAt: string;
}

export interface Student {
  id: string;
  teacherId: string;
  studentId: string;  // รหัสนักเรียน (ยึดเป็นหลักสำหรับ QR Code)
  prefix: string;     // เด็กชาย, เด็กหญิง, นาย, นางสาว
  firstName: string;
  lastName: string;
  classRoom: string;  // ห้องเรียน e.g. ม.1/1
  number: number;     // เลขที่
  term?: string;      // ภาคเรียน e.g. "1", "2"
  academicYear?: string; // ปีการศึกษา e.g. "2568"
  createdAt: string;
}

export interface Assignment {
  id: string;
  teacherId: string;
  subjectId: string;
  title: string;          // ชื่อภาระงาน/การบ้าน
  description?: string;   // รายละเอียด
  maxScore: number;       // คะแนนเต็ม
  category: 'preMidterm' | 'midterm' | 'postMidterm' | 'final' | 'formative'; // หมวดหมู่คะแนน
  assignedClasses: string[]; // ห้องเรียนที่ได้รับมอบหมายงานนี้
  dueDate?: string;
  term?: string;          // ภาคเรียน e.g. "1", "2"
  academicYear?: string; // ปีการศึกษา e.g. "2568"
  createdAt: string;
}

export interface Submission {
  id: string; // `${assignmentId}_${studentId}`
  teacherId: string;
  subjectId: string;
  assignmentId: string;
  studentId: string;      // รหัสนักเรียน
  classRoom: string;
  score: number;          // คะแนนที่ได้
  status: 'submitted' | 'graded' | 'missing';
  note?: string;          // หมายเหตุ
  term?: string;          // ภาคเรียน e.g. "1", "2"
  academicYear?: string; // ปีการศึกษา e.g. "2568"
  updatedAt: string;
}

export interface LineConfig {
  id: string;
  teacherId: string;
  classRoom: string;
  channelAccessToken?: string; // Line Messaging API Channel Access Token
  targetUserId?: string;       // Line User ID or Group ID for Push Message
  notifyToken?: string;        // Line Notify Token (Alternative)
  updatedAt: string;
}

export interface ScheduledNotification {
  id: string;
  teacherId: string;
  title: string;                 // ชื่อรายการตั้งเวลา
  classRoom: string;            // ห้องเรียน e.g. "ม.1/1"
  subjectId: string;            // ID วิชา หรือ "ALL" (ทุกวิชา)
  reportType: "missing_subject" | "missing_task" | "completed" | "grades"; // ประเภทรายงาน
  assignmentId?: string;        // กรณีเลือกภาระงานเดี่ยว
  scheduleType: "specific" | "recurring"; // ชนิดการตั้งเวลา: ระบุวันเวลา หรือ ประจำสัปดาห์
  scheduledDate?: string;       // e.g. "2026-07-10"
  scheduledTime: string;        // e.g. "09:00", "16:30"
  recurringDays?: number[];     // e.g. [1, 2, 3, 4, 5] (1=Monday...7/0=Sunday)
  enabled: boolean;             // เปิด/ปิด การใช้งาน
  lastExecutedAt?: string;      // วันเวลาที่ส่งล่าสุด
  createdAt: string;
}

export interface StudentGradeSummary {
  student: Student;
  preMidtermScore: number;    // คะแนนเก็บก่อนเรียน/ก่อนกลางภาค ที่ได้
  preMidtermMax: number;      // คะแนนเก็บก่อนเรียนเต็ม
  midtermScore: number;       // คะแนนกลางภาค ที่ได้
  midtermMax: number;         // คะแนนกลางภาคเต็ม
  postMidtermScore: number;   // คะแนนเก็บหลังกลางภาค ที่ได้
  postMidtermMax: number;     // คะแนนเก็บหลังกลางภาคเต็ม
  finalScore: number;         // คะแนนปลายภาค ที่ได้
  finalMax: number;           // คะแนนปลายภาคเต็ม
  totalPercentage: number;    // คะแนนสะสมคิดเป็น % หรือเต็ม 100
  grade: string;              // เกรดที่ได้ตอนนี้ (0 - 4.0)
  submittedCount: number;     // จำนวนงานที่ส่งแล้ว
  totalAssignments: number;   // จำนวนงานทั้งหมด
  missingCount: number;       // จำนวนงานที่ค้างส่ง
  formativeScore?: number;    // สำหรับรองรับข้อมูลเดิม
  formativeMax?: number;
}
