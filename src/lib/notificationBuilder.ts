import { Assignment, Student, Subject, Submission } from "../types";
import { calculateStudentGradeSummary } from "./gradeCalculator";

export interface BuildMessageParams {
  reportType: "missing_subject" | "missing_task" | "completed" | "grades";
  subjectId: string;
  classRoom: string;
  assignmentId?: string;
  subjects: Subject[];
  students: Student[];
  assignments: Assignment[];
  submissions: Submission[];
}

export function buildNotificationMessage({
  reportType,
  subjectId,
  classRoom,
  assignmentId,
  subjects,
  students,
  assignments,
  submissions,
}: BuildMessageParams): string {
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  // Case 1: Overall Missing Tasks per Subject (สรุปค้างส่งทุกภาระงานในรายวิชา)
  if (reportType === "missing_subject") {
    const targetSubjects = subjectId === "ALL" ? subjects : selectedSubject ? [selectedSubject] : subjects;
    if (targetSubjects.length === 0) return "ไม่พบข้อมูลวิชาที่เลือก";

    let fullMsg = "";

    targetSubjects.forEach((subject, sIdx) => {
      const subjectAssignments = assignments.filter(
        (a) =>
          a.subjectId === subject.id &&
          (!a.assignedClasses ||
            a.assignedClasses.length === 0 ||
            a.assignedClasses.includes(classRoom) ||
            classRoom === "ALL")
      );

      const targetClasses =
        classRoom === "ALL"
          ? Array.from(new Set(students.map((s) => s.classRoom))).filter(Boolean)
          : [classRoom];

      let subjectBlock = `📢 [สรุปงานค้างส่งทุกภาระงาน]\n`;
      subjectBlock += `📘 วิชา: ${subject.code} ${subject.name}\n`;
      if (classRoom !== "ALL") {
        subjectBlock += `🏫 ห้องเรียน: ${classRoom}\n`;
      }
      subjectBlock += `--------------------------------\n`;

      let totalMissingStudentsInSubject = 0;
      let totalMissingTasksInSubject = 0;

      targetClasses.forEach((cls) => {
        const roomStudents = students
          .filter((s) => s.classRoom === cls)
          .sort((a, b) => a.number - b.number);

        const studentMissingList: { student: Student; missingTasks: Assignment[] }[] = [];

        roomStudents.forEach((st) => {
          const missing = subjectAssignments.filter((a) => {
            const sub = submissions.find(
              (s) => s.assignmentId === a.id && s.studentId === st.studentId
            );
            return !sub || (sub.status !== "graded" && sub.status !== "submitted");
          });

          if (missing.length > 0) {
            studentMissingList.push({ student: st, missingTasks: missing });
            totalMissingTasksInSubject += missing.length;
          }
        });

        if (studentMissingList.length > 0) {
          totalMissingStudentsInSubject += studentMissingList.length;
          if (classRoom === "ALL") {
            subjectBlock += `🏫 ห้อง ${cls} (ค้างส่ง ${studentMissingList.length} คน):\n`;
          }

          studentMissingList.forEach(({ student: st, missingTasks }, idx) => {
            subjectBlock += `${idx + 1}. [เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName} (รหัส: ${st.studentId})\n`;
            subjectBlock += `   ❌ ค้าง ${missingTasks.length} งาน:\n`;
            missingTasks.forEach((t) => {
              subjectBlock += `      • ${t.title} (${t.maxScore} คะแนน)\n`;
            });
            subjectBlock += `\n`;
          });
        }
      });

      if (totalMissingStudentsInSubject === 0) {
        subjectBlock += `🎉 ยินดีด้วย! นักเรียนทุกคนส่งงานครบทุกภาระงานเรียบร้อยแล้วครับ/ค่ะ\n`;
      } else {
        subjectBlock += `--------------------------------\n`;
        subjectBlock += `สรุป: มีนักเรียนค้างส่งรวม ${totalMissingStudentsInSubject} คน (${totalMissingTasksInSubject} ชิ้นงาน)\n`;
        subjectBlock += `กรุณาติดต่อส่งงานกับคุณครูผู้สอนเพื่อรักษาสิทธิ์คะแนนสะสมครับ/ค่ะ\n`;
      }

      if (sIdx > 0) fullMsg += `\n================================\n\n`;
      fullMsg += subjectBlock.trim();
    });

    return fullMsg;
  }

  // Case 2: Specific Single Assignment Missing Alert (สรุปค้างส่งงานเดี่ยว)
  if (reportType === "missing_task") {
    if (!selectedSubject) return "กรุณาเลือกวิชาที่ต้องการตรวจสอบ";
    const targetAssignment = assignments.find((a) => a.id === assignmentId);
    if (!targetAssignment) return "กรุณาเลือกภาระงานที่ต้องการติดตาม";

    const roomStudents = students
      .filter((s) => classRoom === "ALL" || s.classRoom === classRoom)
      .sort((a, b) => a.number - b.number);

    const missingStudents = roomStudents.filter((st) => {
      const sub = submissions.find(
        (s) => s.assignmentId === targetAssignment.id && s.studentId === st.studentId
      );
      return !sub || (sub.status !== "graded" && sub.status !== "submitted");
    });

    if (missingStudents.length === 0) {
      return `🎉 ยินดีด้วย! นักเรียนทุกคนในห้อง ${classRoom} ส่งงาน "${targetAssignment.title}" ครบเรียบร้อยแล้วครับ/ค่ะ`;
    }

    let msg = `📢 [แจ้งเตือนค้างส่งงาน] วิชา ${selectedSubject.code} ${selectedSubject.name}\n`;
    msg += `📌 ภาระงาน: ${targetAssignment.title} (${targetAssignment.maxScore} คะแนน)\n`;
    msg += `🏫 ห้องเรียน: ${classRoom}\n`;
    msg += `--------------------------------\n`;
    msg += `รายชื่อนักเรียนที่ค้างส่ง (${missingStudents.length}/${roomStudents.length} คน):\n`;

    missingStudents.forEach((st, idx) => {
      msg += `${idx + 1}. [เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName} (รหัส: ${st.studentId})\n`;
    });

    msg += `\nกรุณาส่งงานผ่านคุณครูผู้สอนเพื่อสะสมคะแนนครับ/ค่ะ`;
    return msg;
  }

  // Case 3: Completed Tasks Report (รายงานนักเรียนส่งงานครบ)
  if (reportType === "completed") {
    if (!selectedSubject) return "กรุณาเลือกวิชาที่ต้องการตรวจสอบ";
    const roomStudents = students
      .filter((s) => classRoom === "ALL" || s.classRoom === classRoom)
      .sort((a, b) => a.number - b.number);

    const subjectAssignments = assignments.filter(
      (a) =>
        a.subjectId === selectedSubject.id &&
        (a.assignedClasses?.includes(classRoom) ||
          !a.assignedClasses ||
          a.assignedClasses.length === 0 ||
          classRoom === "ALL")
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

    let msg = `🎉 [รายงานผลนักเรียนส่งงานครบ] วิชา ${selectedSubject.code} ${selectedSubject.name}\n`;
    msg += `🏫 ห้องเรียน: ${classRoom}\n`;
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

  // Case 4: Grades Summary Report (สรุปคะแนนและเกรดสะสม)
  if (reportType === "grades") {
    if (!selectedSubject) return "กรุณาเลือกวิชาที่ต้องการตรวจสอบ";
    const roomStudents = students
      .filter((s) => classRoom === "ALL" || s.classRoom === classRoom)
      .sort((a, b) => a.number - b.number);

    const subjectAssignments = assignments.filter((a) => a.subjectId === selectedSubject.id);

    let msg = `📊 [สรุปคะแนนสะสมและเกรดขณะนี้] วิชา ${selectedSubject.code} ${selectedSubject.name}\n`;
    msg += `🏫 ห้องเรียน: ${classRoom}\n`;
    msg += `--------------------------------\n`;

    roomStudents.forEach((st) => {
      const summary = calculateStudentGradeSummary(
        st,
        subjectAssignments,
        submissions,
        selectedSubject.scoreWeights
      );
      msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
      msg += `   • คะแนนรวม: ${summary.totalPercentage}% | เกรด: ${summary.grade}\n`;
      msg += `   • ส่งงานแล้ว: ${summary.submittedCount}/${summary.totalAssignments} ชิ้น | ค้างส่ง: ${summary.missingCount} ชิ้น\n\n`;
    });

    return msg.trim();
  }

  return "";
}
