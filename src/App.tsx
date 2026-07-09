import React, { useState, useEffect, useRef } from "react";
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
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, SUPER_ADMIN_UID } from "./lib/firebase";
import {
  Assignment,
  LineConfig,
  ScheduledNotification,
  Student,
  Subject,
  Submission,
  UserProfile,
  SystemAccessControl,
  cleanYear,
  cleanTerm,
} from "./types";
import { buildNotificationMessage } from "./lib/notificationBuilder";
import { sendLineNotification } from "./lib/lineApi";
import { Navbar } from "./components/Navbar";
import { DashboardOverview } from "./components/DashboardOverview";
import { SubjectManager } from "./components/SubjectManager";
import { StudentManager } from "./components/StudentManager";
import { AssignmentManager } from "./components/AssignmentManager";
import { GradingScanner } from "./components/GradingScanner";
import { LineNotificationManager } from "./components/LineNotificationManager";
import { AcademicYearManagerModal } from "./components/AcademicYearManagerModal";
import { AdminUserManagement } from "./components/AdminUserManagement";
import { AccessDeniedScreen } from "./components/AccessDeniedScreen";
import { LoginScreen } from "./components/LoginScreen";

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
  const hasSeededYearsRef = useRef(false);

  // Auth User & System Security State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [accessControl, setAccessControl] = useState<SystemAccessControl>({
    restrictedMode: true,
    admins: [SUPER_ADMIN_UID],
    allowedUids: [SUPER_ADMIN_UID],
    allowedEmails: [],
    allowedDomains: [],
  });

  // App Data States
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [lineConfigs, setLineConfigs] = useState<LineConfig[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  // System Access Control Listener
  useEffect(() => {
    const unsubAccess = onSnapshot(
      doc(db, "systemSettings", "accessControl"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemAccessControl;
          setAccessControl({
            restrictedMode: data.restrictedMode ?? true,
            admins: Array.from(new Set([...(data.admins || []), SUPER_ADMIN_UID])),
            allowedUids: Array.from(new Set([...(data.allowedUids || []), SUPER_ADMIN_UID])),
            allowedEmails: data.allowedEmails || [],
            allowedDomains: data.allowedDomains || [],
          });
        }
      },
      (error) => {
        console.warn("System Access Control snapshot error:", error);
        handleFirestoreError(error, OperationType.GET, "systemSettings/accessControl");
      }
    );
    return () => unsubAccess();
  }, []);

  // Auth state change & Real-time User Profile Listener
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Subscribe to real-time changes of the user profile document in Firestore
        unsubUserDoc = onSnapshot(
          doc(db, "users", fbUser.uid),
          (snap) => {
            const isSuper = fbUser.uid === SUPER_ADMIN_UID;
            if (snap.exists()) {
              const uData = snap.data();
              setUser({
                uid: fbUser.uid,
                email: fbUser.email || uData.email || "",
                displayName: fbUser.displayName || uData.displayName || "ครูผู้สอน",
                photoURL: fbUser.photoURL || uData.photoURL || "",
                role: isSuper ? "admin" : (uData.role || "teacher"),
                status: isSuper ? "allowed" : (uData.status || "pending"),
              });
            } else {
              setUser({
                uid: fbUser.uid,
                email: fbUser.email || "",
                displayName: fbUser.displayName || "ครูผู้สอน",
                photoURL: fbUser.photoURL || "",
                role: isSuper ? "admin" : "teacher",
                status: isSuper ? "allowed" : "pending",
              });
            }
            setLoadingAuth(false);
          },
          (err) => {
            console.warn("User profile snapshot error:", err);
            setLoadingAuth(false);
            handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
          }
        );
      } else {
        if (unsubUserDoc) unsubUserDoc();
        setUser(null);
        setLoadingAuth(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Check user privileges and system access
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  const isAdmin = isSuperAdmin || user?.role === "admin" || accessControl.admins.includes(user?.uid || "");

  const isUserAllowed = (() => {
    if (!user) return true; // Let unauthenticated users see the navbar/login button
    if (isSuperAdmin || isAdmin) return true;
    if (!accessControl.restrictedMode) return true; // System is in public mode
    if (user.status === "allowed") return true;
    if (accessControl.allowedUids.includes(user.uid)) return true;
    if (user.email && accessControl.allowedEmails.includes(user.email.toLowerCase())) return true;
    if (user.email && accessControl.allowedDomains.some((d) => user.email.toLowerCase().endsWith(d))) return true;
    return false;
  })();

  const handleRequestAccess = async () => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, "accessRequests", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL || "",
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await setDoc(doc(db, "users", user.uid), { status: "pending" }, { merge: true });
    } catch (e) {
      console.error("Error sending access request:", e);
    }
  };

  // Firestore Realtime Subscriptions (Filtered per User Account)
  useEffect(() => {
    // 0. Academic Years Listener
    const unsubYears = onSnapshot(
      collection(db, "academicYears"),
      async (snapshot) => {
        if (snapshot.empty && !hasSeededYearsRef.current) {
          hasSeededYearsRef.current = true;
          try {
            await setDoc(doc(db, "academicYears", "yr_2568"), { id: "yr_2568", year: "2568", createdAt: new Date().toISOString() });
            await setDoc(doc(db, "academicYears", "yr_2567"), { id: "yr_2567", year: "2567", createdAt: new Date().toISOString() });
          } catch (e) {
            console.error("Error seeding initial academic years:", e);
          }
        } else {
          const yearsList = snapshot.docs.map((docSnap) => docSnap.data().year as string).filter(Boolean);
          const uniqueYears = Array.from(new Set(yearsList)).sort().reverse();
          setAcademicYears(uniqueYears);
        }
      },
      (error) => {
        console.warn("AcademicYears snapshot error:", error);
      }
    );

    const currentTeacherId = user?.uid || "demo";

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

    // 6. ScheduledNotifications Listener (User Isolated)
    const schedulesQuery = query(
      collection(db, "scheduledNotifications"),
      where("teacherId", "==", currentTeacherId)
    );
    const unsubSchedules = onSnapshot(
      schedulesQuery,
      (snapshot) => {
        const list: ScheduledNotification[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as ScheduledNotification[];
        setScheduledNotifications(list);
      },
      (error) => {
        console.warn("ScheduledNotifications snapshot error:", error);
      }
    );

    return () => {
      unsubYears();
      unsubSubjects();
      unsubStudents();
      unsubAssignments();
      unsubSubmissions();
      unsubLine();
      unsubSchedules();
    };
  }, [user?.uid]);

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

        const qYears = query(collection(db, "academicYears"), where("year", "==", yearToDelete));
        const snapYears = await getDocs(qYears);
        for (const yrDoc of snapYears.docs) {
          await deleteDoc(yrDoc.ref);
        }
      } catch (e) {
        console.error("Error deleting year config:", e);
      }

      setAcademicYears((prev) => {
        const updated = prev.filter((y) => y !== yearToDelete);
        if (selectedAcademicYear === yearToDelete) {
          setSelectedAcademicYear(updated.length > 0 ? updated[0] : "ALL");
        }
        return updated;
      });
    }

    // Update Local States
    setSubjects((prev) => prev.filter((item) => !matchesTarget(item)));
    setStudents((prev) => prev.filter((item) => !matchesTarget(item)));
    setAssignments((prev) => prev.filter((item) => !matchesTarget(item)));
    setSubmissions((prev) => prev.filter((item) => !matchesTarget(item)));
  };

  // Combined Academic Years list extracted from Firestore collection + subjects/students/assignments
  const combinedAcademicYears = Array.from(
    new Set([
      ...academicYears.map(cleanYear),
      ...subjects.map((s) => cleanYear(s.academicYear)),
      ...students.map((s) => cleanYear(s.academicYear)),
      ...assignments.map((a) => cleanYear(a.academicYear)),
      "2569",
      "2568",
      "2567",
    ])
  )
    .filter(Boolean)
    .sort()
    .reverse();

  // Filtered lists according to selectedAcademicYear and selectedTerm (plus teacherId check)
  const filterByTermAndYear = <T extends { academicYear?: string; term?: string; teacherId?: string }>(items: T[]) => {
    const selYr = cleanYear(selectedAcademicYear);
    const selTerm = cleanTerm(selectedTerm);

    return items.filter((item) => {
      if (user?.uid && item.teacherId && item.teacherId !== user.uid && item.teacherId !== "demo" && item.teacherId !== "") {
        return false;
      }
      const itemYr = cleanYear(item.academicYear);
      const itemTerm = cleanTerm(item.term);

      const matchTerm = selTerm === "ALL" || !itemTerm || itemTerm === selTerm;
      if (!matchTerm) return false;

      if (selYr === "ALL") return true;
      if (!itemYr) return true;
      if (itemYr === selYr) return true;

      const hasYearSpecificItems = items.some(
        (s) => cleanYear(s.academicYear) === selYr
      );
      return !hasYearSpecificItems;
    });
  };

  const filteredSubjects = filterByTermAndYear(subjects);

  const filteredStudents = students.filter((item) => {
    if (user?.uid && item.teacherId && item.teacherId !== user.uid && item.teacherId !== "demo" && item.teacherId !== "") {
      return false;
    }
    const selYr = cleanYear(selectedAcademicYear);
    const itemYr = cleanYear(item.academicYear);

    if (selYr === "ALL") return true;
    if (!itemYr) return true;
    if (itemYr === selYr) return true;

    const hasYearSpecificStudentsInRoom = students.some(
      (s) => s.classRoom === item.classRoom && cleanYear(s.academicYear) === selYr
    );
    return !hasYearSpecificStudentsInRoom;
  });

  const filteredAssignments = filterByTermAndYear(assignments);
  const filteredSubmissions = filterByTermAndYear(submissions);

  // Helper to sync Academic Year doc to Firestore
  const ensureAcademicYearDoc = async (year: string) => {
    const cYear = cleanYear(year);
    if (!cYear) return;
    try {
      await setDoc(
        doc(db, "academicYears", `yr_${cYear}`),
        {
          id: `yr_${cYear}`,
          year: cYear,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error("Error ensuring academic year doc:", e);
    }
  };

  // CRUD Handler - Subjects
  const handleAddSubject = async (data: Omit<Subject, "id" | "createdAt">) => {
    const currentTeacher = user?.uid || "demo";
    const activeYear = selectedAcademicYear !== "ALL" ? selectedAcademicYear : (combinedAcademicYears[0] || "2568");
    const activeTerm = selectedTerm !== "ALL" ? selectedTerm : "1";
    const newId = `sub_${Date.now()}`;
    const cleanY = cleanYear(data.academicYear || activeYear);
    const cleanT = cleanTerm(data.term || activeTerm);

    const newDoc: Subject = {
      ...data,
      academicYear: cleanY,
      term: cleanT,
      id: newId,
      teacherId: data.teacherId || currentTeacher,
      createdAt: new Date().toISOString(),
    };

    setSubjects((prev) => [...prev, newDoc]);
    try {
      await setDoc(doc(db, "subjects", newId), newDoc);
      await ensureAcademicYearDoc(cleanY);
    } catch (e) {
      console.error("Firestore save error:", e);
    }
  };

  const handleUpdateSubject = async (id: string, data: Partial<Subject>) => {
    const cleanData = { ...data };
    if (cleanData.academicYear !== undefined) cleanData.academicYear = cleanYear(cleanData.academicYear);
    if (cleanData.term !== undefined) cleanData.term = cleanTerm(cleanData.term);

    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...cleanData } : s)));
    try {
      await updateDoc(doc(db, "subjects", id), cleanData);
      if (cleanData.academicYear) await ensureAcademicYearDoc(cleanData.academicYear);
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
    const currentTeacher = user?.uid || "demo";
    const activeYear = selectedAcademicYear !== "ALL" ? selectedAcademicYear : (academicYears[0] || "2568");
    const activeTerm = selectedTerm !== "ALL" ? selectedTerm : "1";
    const newId = `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: Student = {
      ...data,
      academicYear: data.academicYear || activeYear,
      term: data.term || activeTerm,
      id: newId,
      teacherId: data.teacherId || currentTeacher,
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
    const currentTeacher = user?.uid || "demo";
    const activeYear = selectedAcademicYear !== "ALL" ? selectedAcademicYear : (academicYears[0] || "2568");
    const activeTerm = selectedTerm !== "ALL" ? selectedTerm : "1";
    const newDocs: Student[] = list.map((item, idx) => ({
      ...item,
      academicYear: item.academicYear || activeYear,
      term: item.term || activeTerm,
      id: `st_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      teacherId: item.teacherId || currentTeacher,
      createdAt: new Date().toISOString(),
    }));

    setStudents((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const filteredNew = newDocs.filter((d) => !existingIds.has(d.id));
      return [...prev, ...filteredNew];
    });

    try {
      const batch = writeBatch(db);
      newDocs.forEach((docData) => {
        const ref = doc(db, "students", docData.id);
        batch.set(ref, docData);
      });
      await batch.commit();
    } catch (e) {
      console.error("Firestore writeBatch error:", e);
      await Promise.all(
        newDocs.map((docData) =>
          setDoc(doc(db, "students", docData.id), docData).catch((err) =>
            console.error("Fallback setDoc error:", err)
          )
        )
      );
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
    const cleanClass = data.classRoom ? data.classRoom.trim() : "default";
    const cleanClassId = cleanClass.replace(/[^a-zA-Z0-9ก-๙_-]/g, "-").replace(/--+/g, "-");
    const cfgId = `line_${cleanClassId || "default"}`;

    const newDoc: LineConfig = {
      id: cfgId,
      teacherId: user?.uid || "demo",
      classRoom: cleanClass,
      channelAccessToken: data.channelAccessToken ? data.channelAccessToken.trim() : "",
      targetUserId: data.targetUserId ? data.targetUserId.trim().toLowerCase() : "",
      updatedAt: new Date().toISOString(),
    };

    setLineConfigs((prev) => {
      const idx = prev.findIndex((c) => c.classRoom === cleanClass);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDoc;
        return copy;
      }
      return [...prev, newDoc];
    });

    try {
      await setDoc(doc(db, "lineConfigs", cfgId), newDoc);
    } catch (e: any) {
      console.error("Firestore line config error:", e);
      throw new Error(e.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังระบบ");
    }
  };

  // CRUD Handler - Scheduled Notifications
  const handleSaveScheduledNotification = async (
    data: Omit<ScheduledNotification, "id" | "createdAt"> & { id?: string }
  ) => {
    const schId = data.id || `sch_${Date.now()}`;
    const newDoc: ScheduledNotification = {
      ...data,
      id: schId,
      teacherId: user?.uid || "demo",
      createdAt: new Date().toISOString(),
    };

    setScheduledNotifications((prev) => {
      const idx = prev.findIndex((s) => s.id === schId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newDoc;
        return copy;
      }
      return [...prev, newDoc];
    });

    try {
      await setDoc(doc(db, "scheduledNotifications", schId), newDoc);
    } catch (e) {
      console.error("Firestore save schedule error:", e);
    }
  };

  const handleDeleteScheduledNotification = async (id: string) => {
    setScheduledNotifications((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, "scheduledNotifications", id));
    } catch (e) {
      console.error("Firestore delete schedule error:", e);
    }
  };

  const handleToggleScheduledNotification = async (id: string, enabled: boolean) => {
    setScheduledNotifications((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled } : s))
    );
    try {
      await updateDoc(doc(db, "scheduledNotifications", id), { enabled });
    } catch (e) {
      console.error("Firestore toggle schedule error:", e);
    }
  };

  const handleExecuteScheduledNotification = async (sch: ScheduledNotification) => {
    const config = lineConfigs.find((c) => c.classRoom === sch.classRoom);
    if (!config || !config.channelAccessToken || !config.targetUserId) {
      return { success: false, error: `ยังไม่ได้ตั้งค่า Line Access Token และ Group ID สำหรับห้อง ${sch.classRoom}` };
    }

    const msg = buildNotificationMessage({
      reportType: sch.reportType,
      subjectId: sch.subjectId,
      classRoom: sch.classRoom,
      assignmentId: sch.assignmentId,
      subjects,
      students,
      assignments,
      submissions,
    });

    if (!msg) {
      return { success: false, error: "ไม่พบข้อมูลข้อความสำหรับการส่ง" };
    }

    try {
      const res = await sendLineNotification({
        channelAccessToken: config.channelAccessToken,
        targetId: config.targetUserId,
        message: msg,
      });

      if (res.success) {
        const nowIso = new Date().toISOString();
        setScheduledNotifications((prev) =>
          prev.map((s) => (s.id === sch.id ? { ...s, lastExecutedAt: nowIso } : s))
        );
        try {
          await updateDoc(doc(db, "scheduledNotifications", sch.id), {
            lastExecutedAt: nowIso,
          });
        } catch (e) {
          console.error("Firestore update lastExecutedAt error:", e);
        }
        return { success: true };
      } else {
        return { success: false, error: res.error || "เกิดข้อผิดพลาดจาก LINE API" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  };

  // Background Auto-Scheduler Loop (runs every 30s)
  useEffect(() => {
    const checkSchedules = async () => {
      if (scheduledNotifications.length === 0) return;

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const currentHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dayOfWeek = now.getDay();

      for (const sch of scheduledNotifications) {
        if (!sch.enabled) continue;

        if (sch.lastExecutedAt) {
          const lastRun = new Date(sch.lastExecutedAt);
          const diffMs = now.getTime() - lastRun.getTime();
          if (diffMs < 90000) continue;
        }

        let shouldRun = false;
        if (sch.scheduleType === "specific") {
          if (sch.scheduledDate === todayStr && sch.scheduledTime === currentHM) {
            shouldRun = true;
          }
        } else if (sch.scheduleType === "recurring") {
          if (sch.recurringDays?.includes(dayOfWeek) && sch.scheduledTime === currentHM) {
            shouldRun = true;
          }
        }

        if (shouldRun) {
          console.log(`⏰ Auto-running LINE schedule [${sch.title}] for class ${sch.classRoom}`);
          await handleExecuteScheduledNotification(sch);
        }
      }
    };

    const interval = setInterval(checkSchedules, 30000);
    return () => clearInterval(interval);
  }, [scheduledNotifications, subjects, students, assignments, submissions, lineConfigs]);

  // Available classrooms extracted across subjects and students
  const availableClasses = Array.from(
    new Set([
      ...subjects.flatMap((s) => s.classes || []),
      ...students.map((s) => s.classRoom),
    ])
  ).filter(Boolean);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#111113] text-white flex flex-col items-center justify-center font-['Geist'] space-y-4">
        <div className="w-12 h-12 border-4 border-[#00FF66] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono text-zinc-400 animate-pulse">กำลังตรวจสอบสิทธิ์การเข้าใช้งานระบบ...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isUserAllowed) {
    return <AccessDeniedScreen user={user} onRequestAccess={handleRequestAccess} />;
  }

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
        academicYears={combinedAcademicYears}
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
            academicYears={combinedAcademicYears}
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
            academicYears={combinedAcademicYears}
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
            academicYears={combinedAcademicYears}
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
            scheduledNotifications={scheduledNotifications}
            onSaveLineConfig={handleSaveLineConfig}
            onSaveScheduledNotification={handleSaveScheduledNotification}
            onDeleteScheduledNotification={handleDeleteScheduledNotification}
            onToggleScheduledNotification={handleToggleScheduledNotification}
            onExecuteScheduledNotification={handleExecuteScheduledNotification}
          />
        )}

        {activeTab === "admin-users" && isAdmin && (
          <AdminUserManagement currentUser={user!} />
        )}
      </main>

      <AcademicYearManagerModal
        isOpen={isYearManagerOpen}
        onClose={() => setIsYearManagerOpen(false)}
        academicYears={combinedAcademicYears}
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
