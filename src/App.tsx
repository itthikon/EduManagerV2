import React, { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import {
  Assignment,
  LineConfig,
  Student,
  Subject,
  Submission,
  UserProfile,
} from "./types";
import { Navbar } from "./components/Navbar";
import { DashboardOverview } from "./components/DashboardOverview";
import { SubjectManager } from "./components/SubjectManager";
import { StudentManager } from "./components/StudentManager";
import { AssignmentManager } from "./components/AssignmentManager";
import { GradingScanner } from "./components/GradingScanner";
import { LineNotificationManager } from "./components/LineNotificationManager";
import { AcademicYearManagerModal } from "./components/AcademicYearManagerModal";

// Initial Demo Seed Data
const INITIAL_SUBJECTS: Subject[] = [
  {
    id: "sub_1",
    teacherId: "demo",
    code: "ว21101",
    name: "วิทยาศาสตร์ 1",
    classes: ["ม.1/1", "ม.1/2"],
    scoreWeights: { preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 },
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: "st_1",
    teacherId: "demo",
    studentId: "10001",
    prefix: "เด็กชาย",
    firstName: "กิตติพงษ์",
    lastName: "มั่นคง",
    classRoom: "ม.1/1",
    number: 1,
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
  {
    id: "st_2",
    teacherId: "demo",
    studentId: "10002",
    prefix: "เด็กชาย",
    firstName: "ชินวุฒิ",
    lastName: "สุขเจริญ",
    classRoom: "ม.1/1",
    number: 2,
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
  {
    id: "st_3",
    teacherId: "demo",
    studentId: "10003",
    prefix: "เด็กหญิง",
    firstName: "ณัฐนิชา",
    lastName: "ประเสริฐศิลป์",
    classRoom: "ม.1/1",
    number: 3,
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
  {
    id: "st_4",
    teacherId: "demo",
    studentId: "10004",
    prefix: "เด็กหญิง",
    firstName: "ธนพร",
    lastName: "วิเศษกุล",
    classRoom: "ม.1/1",
    number: 4,
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
  {
    id: "st_5",
    teacherId: "demo",
    studentId: "10005",
    prefix: "เด็กชาย",
    firstName: "ปัณณธร",
    lastName: "เลิศวรชัย",
    classRoom: "ม.1/1",
    number: 5,
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: "as_1",
    teacherId: "demo",
    subjectId: "sub_1",
    title: "ใบงานที่ 1 เรื่อง โครงสร้างและหน้าที่ของเซลล์",
    description: "วาดภาพเซลล์พืชและเซลล์สัตว์พร้อมระบุออร์แกเนลล์ลงในสมุด",
    maxScore: 10,
    category: "preMidterm",
    assignedClasses: ["ม.1/1", "ม.1/2"],
    dueDate: "2026-07-15",
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
  {
    id: "as_2",
    teacherId: "demo",
    subjectId: "sub_1",
    title: "การบ้านที่ 2 เรื่อง การใช้กล้องจุลทรรศน์ใช้แสง",
    description: "ตอบคำถามท้ายบทเรียนหน้าที่ 24",
    maxScore: 10,
    category: "preMidterm",
    assignedClasses: ["ม.1/1"],
    dueDate: "2026-07-20",
    academicYear: "2568",
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Academic Year & Term State
  const [selectedTerm, setSelectedTerm] = useState<string>("1");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2568");
  const [academicYears, setAcademicYears] = useState<string[]>(["2568", "2567"]);
  const [isYearManagerOpen, setIsYearManagerOpen] = useState(false);

  // Auth User state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App Data States
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [lineConfigs, setLineConfigs] = useState<LineConfig[]>([]);

  // Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || "ครูผู้สอน",
          photoURL: fbUser.photoURL || "",
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Firestore Realtime Subscriptions
  useEffect(() => {
    // 0. Academic Years Listener
    const unsubYears = onSnapshot(
      collection(db, "academicYears"),
      (snapshot) => {
        if (!snapshot.empty) {
          const yearsList = snapshot.docs.map((docSnap) => docSnap.data().year as string).filter(Boolean);
          if (yearsList.length > 0) {
            // Deduplicate and sort descending
            const uniqueYears = Array.from(new Set([...yearsList, "2568", "2567"])).sort().reverse();
            setAcademicYears(uniqueYears);
          }
        }
      },
      (error) => {
        console.warn("AcademicYears snapshot error:", error);
      }
    );

    // 1. Subjects Listener
    const unsubSubjects = onSnapshot(
      collection(db, "subjects"),
      (snapshot) => {
        const list: Subject[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Subject[];
        setSubjects(list);
      },
      (error) => {
        console.warn("Subjects snapshot error:", error);
      }
    );

    // 2. Students Listener
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const list: Student[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Student[];
        setStudents(list);
      },
      (error) => {
        console.warn("Students snapshot error:", error);
      }
    );

    // 3. Assignments Listener
    const unsubAssignments = onSnapshot(
      collection(db, "assignments"),
      (snapshot) => {
        const list: Assignment[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Assignment[];
        setAssignments(list);
      },
      (error) => {
        console.warn("Assignments snapshot error:", error);
      }
    );

    // 4. Submissions Listener
    const unsubSubmissions = onSnapshot(
      collection(db, "submissions"),
      (snapshot) => {
        const list: Submission[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Submission[];
        setSubmissions(list);
      },
      (error) => {
        console.warn("Submissions snapshot error:", error);
      }
    );

    // 5. LineConfigs Listener
    const unsubLine = onSnapshot(
      collection(db, "lineConfigs"),
      (snapshot) => {
        const list: LineConfig[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as LineConfig[];
        setLineConfigs(list);
      },
      (error) => {
        console.warn("LineConfigs snapshot error:", error);
      }
    );

    return () => {
      unsubYears();
      unsubSubjects();
      unsubStudents();
      unsubAssignments();
      unsubSubmissions();
      unsubLine();
    };
  }, []);

  // Academic Year Handlers
  const handleAddAcademicYear = async (year: string) => {
    const yrId = `yr_${year.replace(/\//g, "-")}`;
    const newYearDoc = {
      id: yrId,
      year: year.trim(),
      createdAt: new Date().toISOString(),
    };

    setAcademicYears((prev) => Array.from(new Set([year.trim(), ...prev])).sort().reverse());

    try {
      await setDoc(doc(db, "academicYears", yrId), newYearDoc);
    } catch (e) {
      console.error("Firestore save academicYear error:", e);
    }
  };

  const handleDeleteAcademicYearData = async (yearToDelete: string, termToDelete?: string) => {
    const matchesTarget = (item: { academicYear?: string; term?: string }) => {
      const itemYr = item.academicYear || "2568";
      const itemTerm = item.term || "1";
      if (termToDelete) {
        return itemYr === yearToDelete && itemTerm === termToDelete;
      }
      return itemYr === yearToDelete;
    };

    // Identify items belonging to this academic year / term
    const subjectsToDelete = subjects.filter(matchesTarget);
    const studentsToDelete = students.filter(matchesTarget);
    const assignmentsToDelete = assignments.filter(matchesTarget);
    const submissionsToDelete = submissions.filter(matchesTarget);

    // Delete Subjects
    for (const sub of subjectsToDelete) {
      try {
        await deleteDoc(doc(db, "subjects", sub.id));
      } catch (e) {
        console.error("Error deleting subject:", e);
      }
    }

    // Delete Students
    for (const st of studentsToDelete) {
      try {
        await deleteDoc(doc(db, "students", st.id));
      } catch (e) {
        console.error("Error deleting student:", e);
      }
    }

    // Delete Assignments
    for (const asg of assignmentsToDelete) {
      try {
        await deleteDoc(doc(db, "assignments", asg.id));
      } catch (e) {
        console.error("Error deleting assignment:", e);
      }
    }

    // Delete Submissions
    for (const subm of submissionsToDelete) {
      try {
        await deleteDoc(doc(db, "submissions", subm.id));
      } catch (e) {
        console.error("Error deleting submission:", e);
      }
    }

    // If deleting entire year without specific term, also delete year doc
    if (!termToDelete) {
      try {
        const yrId = `yr_${yearToDelete.replace(/\//g, "-")}`;
        await deleteDoc(doc(db, "academicYears", yrId));
      } catch (e) {
        console.error("Error deleting year config:", e);
      }
      setAcademicYears((prev) => prev.filter((y) => y !== yearToDelete));
    }

    // Update Local States
    setSubjects((prev) => prev.filter((item) => !matchesTarget(item)));
    setStudents((prev) => prev.filter((item) => !matchesTarget(item)));
    setAssignments((prev) => prev.filter((item) => !matchesTarget(item)));
    setSubmissions((prev) => prev.filter((item) => !matchesTarget(item)));
  };

  // Filtered lists according to selectedAcademicYear and selectedTerm
  const filterByTermAndYear = <T extends { academicYear?: string; term?: string }>(items: T[]) => {
    return items.filter((item) => {
      const matchYear = selectedAcademicYear === "ALL" || (item.academicYear || "2568") === selectedAcademicYear;
      const matchTerm = selectedTerm === "ALL" || (item.term || "1") === selectedTerm;
      return matchYear && matchTerm;
    });
  };

  const filteredSubjects = filterByTermAndYear(subjects);
  const filteredStudents = filterByTermAndYear(students);
  const filteredAssignments = filterByTermAndYear(assignments);
  const filteredSubmissions = filterByTermAndYear(submissions);

  // CRUD Handler - Subjects
  const handleAddSubject = async (data: Omit<Subject, "id" | "createdAt">) => {
    const newId = `sub_${Date.now()}`;
    const newDoc: Subject = {
      ...data,
      id: newId,
      teacherId: user?.uid || "demo",
      createdAt: new Date().toISOString(),
    };

    setSubjects((prev) => [...prev, newDoc]);
    try {
      await setDoc(doc(db, "subjects", newId), newDoc);
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  };

  const handleUpdateSubject = async (id: string, data: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    try {
      await updateDoc(doc(db, "subjects", id), data);
    } catch (e) {
      console.error("Firestore update error:", e);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, "subjects", id));
    } catch (e) {
      console.error("Firestore delete error:", e);
    }
  };

  // CRUD Handler - Students
  const handleAddStudent = async (data: Omit<Student, "id" | "createdAt">) => {
    const newId = `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: Student = {
      ...data,
      id: newId,
      teacherId: user?.uid || "demo",
      createdAt: new Date().toISOString(),
    };

    setStudents((prev) => [...prev, newDoc]);
    try {
      await setDoc(doc(db, "students", newId), newDoc);
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  };

  const handleBatchAddStudents = async (list: Omit<Student, "id" | "createdAt">[]) => {
    const newDocs: Student[] = list.map((item, idx) => ({
      ...item,
      id: `st_${Date.now()}_${idx}`,
      teacherId: user?.uid || "demo",
      createdAt: new Date().toISOString(),
    }));

    setStudents((prev) => [...prev, ...newDocs]);
    for (const docData of newDocs) {
      try {
        await setDoc(doc(db, "students", docData.id), docData);
      } catch (e) {
        console.error("Firestore batch error:", e);
      }
    }
  };

  const handleUpdateStudent = async (id: string, data: Partial<Student>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    try {
      await updateDoc(doc(db, "students", id), data);
    } catch (e) {
      console.error("Firestore update error:", e);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, "students", id));
    } catch (e) {
      console.error("Firestore delete error:", e);
    }
  };

  const handleBatchDeleteStudents = async (studentIds: string[]) => {
    setStudents((prev) => prev.filter((s) => !studentIds.includes(s.id)));
    for (const id of studentIds) {
      try {
        await deleteDoc(doc(db, "students", id));
      } catch (e) {
        console.error("Firestore batch delete student error:", e);
      }
    }
  };

  const handleDeleteClassroom = async (classRoomName: string) => {
    const studentIdsToDelete = students.filter((s) => s.classRoom === classRoomName).map((s) => s.id);
    if (studentIdsToDelete.length > 0) {
      await handleBatchDeleteStudents(studentIdsToDelete);
    }

    for (const sub of subjects) {
      if (sub.classes && sub.classes.includes(classRoomName)) {
        const updatedClasses = sub.classes.filter((c) => c !== classRoomName);
        await handleUpdateSubject(sub.id, { classes: updatedClasses });
      }
    }

    const lineCfgId = `line_${classRoomName.replace(/\//g, "-")}`;
    try {
      await deleteDoc(doc(db, "lineConfigs", lineCfgId));
    } catch (e) {
      // lineConfig might not exist
    }
  };

  // CRUD Handler - Assignments
  const handleAddAssignment = async (data: Omit<Assignment, "id" | "createdAt">) => {
    const newId = `as_${Date.now()}`;
    const newDoc: Assignment = {
      ...data,
      id: newId,
      teacherId: user?.uid || "demo",
      createdAt: new Date().toISOString(),
    };

    setAssignments((prev) => [...prev, newDoc]);
    try {
      await setDoc(doc(db, "assignments", newId), newDoc);
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  };

  const handleUpdateAssignment = async (id: string, data: Partial<Assignment>) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    try {
      await updateDoc(doc(db, "assignments", id), data);
    } catch (e) {
      console.error("Firestore update error:", e);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteDoc(doc(db, "assignments", id));
    } catch (e) {
      console.error("Firestore delete error:", e);
    }
  };

  // CRUD Handler - Submissions
  const handleSaveSubmission = async (
    data: Omit<Submission, "id" | "updatedAt">
  ) => {
    const subId = `${data.assignmentId}_${data.studentId}`;
    const newDoc: Submission = {
      ...data,
      id: subId,
      teacherId: user?.uid || "demo",
      updatedAt: new Date().toISOString(),
    };

    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === subId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDoc;
        return copy;
      }
      return [...prev, newDoc];
    });

    try {
      await setDoc(doc(db, "submissions", subId), newDoc);
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  };

  // CRUD Handler - Line Configuration
  const handleSaveLineConfig = async (
    data: Omit<LineConfig, "id" | "updatedAt">
  ) => {
    const cfgId = `line_${data.classRoom.replace(/\//g, "-")}`;
    const newDoc: LineConfig = {
      ...data,
      id: cfgId,
      teacherId: user?.uid || "demo",
      updatedAt: new Date().toISOString(),
    };

    setLineConfigs((prev) => {
      const idx = prev.findIndex((c) => c.classRoom === data.classRoom);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDoc;
        return copy;
      }
      return [...prev, newDoc];
    });

    try {
      await setDoc(doc(db, "lineConfigs", cfgId), newDoc);
    } catch (e) {
      console.error("Firestore line config error:", e);
    }
  };

  // Available classrooms extracted across subjects and students
  const availableClasses = Array.from(
    new Set([
      ...subjects.flatMap((s) => s.classes || []),
      ...students.map((s) => s.classRoom),
      "ม.1/1",
      "ม.1/2",
    ])
  ).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#111113] text-white flex flex-col font-['Geist']">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        loadingAuth={loadingAuth}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        academicYears={academicYears}
        onOpenYearManager={() => setIsYearManagerOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardOverview
            subjects={filteredSubjects}
            students={filteredStudents}
            assignments={filteredAssignments}
            submissions={filteredSubmissions}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "subjects" && (
          <SubjectManager
            subjects={filteredSubjects}
            onAddSubject={handleAddSubject}
            onUpdateSubject={handleUpdateSubject}
            onDeleteSubject={handleDeleteSubject}
            selectedTerm={selectedTerm}
            selectedAcademicYear={selectedAcademicYear}
            academicYears={academicYears}
          />
        )}

        {activeTab === "students" && (
          <StudentManager
            students={filteredStudents}
            availableClasses={availableClasses}
            onAddStudent={handleAddStudent}
            onBatchAddStudents={handleBatchAddStudents}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onBatchDeleteStudents={handleBatchDeleteStudents}
            onDeleteClassroom={handleDeleteClassroom}
            selectedTerm={selectedTerm}
            selectedAcademicYear={selectedAcademicYear}
            academicYears={academicYears}
          />
        )}

        {activeTab === "assignments" && (
          <AssignmentManager
            subjects={filteredSubjects}
            assignments={filteredAssignments}
            onAddAssignment={handleAddAssignment}
            onUpdateAssignment={handleUpdateAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            selectedTerm={selectedTerm}
            selectedAcademicYear={selectedAcademicYear}
            academicYears={academicYears}
          />
        )}

        {activeTab === "grading" && (
          <GradingScanner
            subjects={filteredSubjects}
            students={filteredStudents}
            assignments={filteredAssignments}
            submissions={filteredSubmissions}
            onSaveSubmission={handleSaveSubmission}
          />
        )}

        {activeTab === "line-notify" && (
          <LineNotificationManager
            subjects={filteredSubjects}
            students={filteredStudents}
            assignments={filteredAssignments}
            submissions={filteredSubmissions}
            lineConfigs={lineConfigs}
            onSaveLineConfig={handleSaveLineConfig}
          />
        )}
      </main>

      <AcademicYearManagerModal
        isOpen={isYearManagerOpen}
        onClose={() => setIsYearManagerOpen(false)}
        academicYears={academicYears}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        selectedAcademicYear={selectedAcademicYear}
        setSelectedAcademicYear={setSelectedAcademicYear}
        onAddAcademicYear={handleAddAcademicYear}
        onDeleteAcademicYearData={handleDeleteAcademicYearData}
        subjects={subjects}
        students={students}
        assignments={assignments}
        submissions={submissions}
      />

      <footer className="bg-[#18181B] border-t border-white/10 py-6 text-center text-xs text-white/40 font-['Geist_Mono']">
        <p className="font-bold text-white/60 uppercase">
          QR TRACKER — HIGH DENSITY GRADING & LINE MESSAGING SYSTEM
        </p>
        <p className="mt-1 text-white/30 text-[11px]">
          POWERED BY GOOGLE AUTH, FIREBASE FIRESTORE & EXPRESS SERVER PROXY
        </p>
      </footer>
    </div>
  );
}
