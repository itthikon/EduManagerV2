import { Assignment, Student, Subject, Submission } from "../types";
import { calculateStudentGradeSummary } from "./gradeCalculator";

export interface BuildMessageParams {
  reportType: "missing_subject" | "missing_task" | "completed" | "grades" | "midterm_exam" | "final_exam";
  subjectId: string;
  classRoom: string;
  assignmentId?: string;
  passThresholdPct?: number;
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
  passThresholdPct = 50,
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

  // Case 5: Midterm Exam Scores Notification (แจ้งคะแนนสอบกลางภาค)
  if (reportType === "midterm_exam") {
    if (!selectedSubject) return "กรุณาเลือกวิชาที่ต้องการตรวจสอบ";
    const roomStudents = students
      .filter((s) => classRoom === "ALL" || s.classRoom === classRoom)
      .sort((a, b) => a.number - b.number);

    const midtermAssignments = assignments.filter(
      (a) =>
        a.subjectId === selectedSubject.id &&
        (a.category === "midterm" ||
          a.title.toLowerCase().includes("กลางภาค") ||
          a.title.toLowerCase().includes("midterm"))
    );

    let msg = `📝 [แจ้งผลคะแนนสอบกลางภาค] วิชา ${selectedSubject.code} ${selectedSubject.name}\n`;
    if (classRoom !== "ALL") msg += `🏫 ห้องเรียน: ${classRoom}\n`;
    msg += `--------------------------------\n`;

    if (midtermAssignments.length === 0) {
      msg += `ยังไม่มีการสร้างรายการคะแนนสอบกลางภาคในวิชานี้ครับ/ค่ะ`;
      return msg;
    }

    const totalMidtermMax = midtermAssignments.reduce((acc, a) => acc + a.maxScore, 0);
    const passPct = passThresholdPct ?? 50;
    const passScoreNeeded = totalMidtermMax > 0 ? (totalMidtermMax * passPct) / 100 : 0;
    msg += `📌 คะแนนสอบกลางภาคเต็ม: ${totalMidtermMax} คะแนน (เกณฑ์ผ่าน ${passPct}% / ${passScoreNeeded} คะแนน)\n`;
    msg += `--------------------------------\n`;

    let totalScoreSum = 0;
    let gradedCount = 0;
    let passCount = 0;

    roomStudents.forEach((st) => {
      let studentMidtermScore = 0;
      let hasGraded = false;

      midtermAssignments.forEach((a) => {
        const sub = submissions.find(
          (s) => s.assignmentId === a.id && s.studentId === st.studentId
        );
        if (sub && (sub.status === "graded" || sub.status === "submitted")) {
          studentMidtermScore += sub.score || 0;
          hasGraded = true;
        }
      });

      if (hasGraded) {
        gradedCount++;
        totalScoreSum += studentMidtermScore;
        const pct = totalMidtermMax > 0 ? (studentMidtermScore / totalMidtermMax) * 100 : 0;
        const isPass = pct >= passPct;
        if (isPass) passCount++;

        msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
        msg += `   • คะแนนสอบกลางภาค: ${studentMidtermScore} / ${totalMidtermMax} คะแนน (${Math.round(pct)}%) ${isPass ? "✅ ผ่าน" : "⚠️ ไม่ผ่าน"}\n\n`;
      } else {
        msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
        msg += `   • คะแนนสอบกลางภาค: ยังไม่มีผลสอบ/ยังไม่ได้ตรวจ\n\n`;
      }
    });

    const avgScore = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : "0";
    msg += `--------------------------------\n`;
    msg += `📊 สรุปภาพรวม: ตรวจแล้ว ${gradedCount}/${roomStudents.length} คน | ผ่านเกณฑ์ (${passPct}%) ${passCount} คน | คะแนนเฉลี่ย ${avgScore} คะแนน`;

    return msg.trim();
  }

  // Case 6: Final Exam Scores Notification (แจ้งคะแนนสอบปลายภาค)
  if (reportType === "final_exam") {
    if (!selectedSubject) return "กรุณาเลือกวิชาที่ต้องการตรวจสอบ";
    const roomStudents = students
      .filter((s) => classRoom === "ALL" || s.classRoom === classRoom)
      .sort((a, b) => a.number - b.number);

    const finalAssignments = assignments.filter(
      (a) =>
        a.subjectId === selectedSubject.id &&
        (a.category === "final" ||
          a.title.toLowerCase().includes("ปลายภาค") ||
          a.title.toLowerCase().includes("final"))
    );

    let msg = `🏁 [แจ้งผลคะแนนสอบปลายภาค] วิชา ${selectedSubject.code} ${selectedSubject.name}\n`;
    if (classRoom !== "ALL") msg += `🏫 ห้องเรียน: ${classRoom}\n`;
    msg += `--------------------------------\n`;

    if (finalAssignments.length === 0) {
      msg += `ยังไม่มีการสร้างรายการคะแนนสอบปลายภาคในวิชานี้ครับ/ค่ะ`;
      return msg;
    }

    const totalFinalMax = finalAssignments.reduce((acc, a) => acc + a.maxScore, 0);
    const passPct = passThresholdPct ?? 50;
    const passScoreNeeded = totalFinalMax > 0 ? (totalFinalMax * passPct) / 100 : 0;
    msg += `📌 คะแนนสอบปลายภาคเต็ม: ${totalFinalMax} คะแนน (เกณฑ์ผ่าน ${passPct}% / ${passScoreNeeded} คะแนน)\n`;
    msg += `--------------------------------\n`;

    let totalScoreSum = 0;
    let gradedCount = 0;
    let passCount = 0;

    const subjectAssignments = assignments.filter((a) => a.subjectId === selectedSubject.id);

    roomStudents.forEach((st) => {
      let studentFinalScore = 0;
      let hasGraded = false;

      finalAssignments.forEach((a) => {
        const sub = submissions.find(
          (s) => s.assignmentId === a.id && s.studentId === st.studentId
        );
        if (sub && (sub.status === "graded" || sub.status === "submitted")) {
          studentFinalScore += sub.score || 0;
          hasGraded = true;
        }
      });

      const summary = calculateStudentGradeSummary(
        st,
        subjectAssignments,
        submissions,
        selectedSubject.scoreWeights
      );

      if (hasGraded) {
        gradedCount++;
        totalScoreSum += studentFinalScore;
        const pct = totalFinalMax > 0 ? (studentFinalScore / totalFinalMax) * 100 : 0;
        const isPass = pct >= passPct;
        if (isPass) passCount++;

        msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
        msg += `   • คะแนนสอบปลายภาค: ${studentFinalScore} / ${totalFinalMax} คะแนน (${Math.round(pct)}%) ${isPass ? "✅ ผ่าน" : "⚠️ ไม่ผ่าน"}\n`;
        msg += `   • คะแนนสะสมรวม: ${summary.totalPercentage}% | เกรดสุทธิ: ${summary.grade}\n\n`;
      } else {
        msg += `[เลขที่ ${st.number}] ${st.prefix || ""}${st.firstName} ${st.lastName}\n`;
        msg += `   • คะแนนสอบปลายภาค: ยังไม่มีผลสอบ/ยังไม่ได้ตรวจ\n\n`;
      }
    });

    const avgScore = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : "0";
    msg += `--------------------------------\n`;
    msg += `📊 สรุปภาพรวม: ตรวจแล้ว ${gradedCount}/${roomStudents.length} คน | ผ่านเกณฑ์ (${passPct}%) ${passCount} คน | คะแนนเฉลี่ย ${avgScore} คะแนน`;

    return msg.trim();
  }

  return "";
}
