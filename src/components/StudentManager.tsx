import React, { useState } from "react";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileSpreadsheet,
  QrCode,
  UserPlus,
  Sparkles,
  Filter,
  Upload,
  Download,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Student } from "../types";
import { StudentQRModal } from "./StudentQRModal";

interface StudentManagerProps {
  students: Student[];
  availableClasses: string[];
  onAddStudent: (student: Omit<Student, "id" | "createdAt">) => Promise<void>;
  onBatchAddStudents: (students: Omit<Student, "id" | "createdAt">[]) => Promise<void>;
  onUpdateStudent: (id: string, student: Partial<Student>) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  selectedTerm?: string;
  selectedAcademicYear?: string;
  academicYears?: string[];
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  availableClasses,
  onAddStudent,
  onBatchAddStudents,
  onUpdateStudent,
  onDeleteStudent,
  selectedTerm = "1",
  selectedAcademicYear = "2568",
  academicYears = ["2568", "2567"],
}) => {
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [previewQrClass, setPreviewQrClass] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Single Student Form State
  const [studentId, setStudentId] = useState("");
  const [prefix, setPrefix] = useState("เด็กชาย");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [classRoom, setClassRoom] = useState(availableClasses[0] || "ม.1/1");
  const [number, setNumber] = useState<number>(1);
  const [term, setTerm] = useState(selectedTerm === "ALL" ? "1" : selectedTerm);
  const [academicYear, setAcademicYear] = useState(selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Batch Import State
  const [importMode, setImportMode] = useState<"excel" | "text">("excel");
  const [batchText, setBatchText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<Omit<Student, "id" | "createdAt">[]>([]);
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [excelError, setExcelError] = useState<string>("");

  // Extract all distinct classrooms from current students plus availableClasses
  const allClasses = Array.from(
    new Set([...availableClasses, ...students.map((s) => s.classRoom)])
  ).filter(Boolean);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClass === "ALL" || s.classRoom === selectedClass;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      s.studentId.toLowerCase().includes(query) ||
      s.firstName.toLowerCase().includes(query) ||
      s.lastName.toLowerCase().includes(query) ||
      s.classRoom.toLowerCase().includes(query);
    return matchesClass && matchesQuery;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setStudentId(`${10001 + students.length}`);
    setPrefix("เด็กชาย");
    setFirstName("");
    setLastName("");
    setClassRoom(allClasses[0] || "ม.1/1");
    setNumber(students.filter((s) => s.classRoom === (allClasses[0] || "ม.1/1")).length + 1);
    setTerm(selectedTerm === "ALL" ? "1" : selectedTerm);
    setAcademicYear(selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear);
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingId(student.id);
    setStudentId(student.studentId);
    setPrefix(student.prefix || "เด็กชาย");
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setClassRoom(student.classRoom);
    setNumber(student.number);
    setTerm(student.term || "1");
    setAcademicYear(student.academicYear || "2568");
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !firstName.trim() || !lastName.trim() || !classRoom.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await onUpdateStudent(editingId, {
          studentId: studentId.trim(),
          prefix,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          classRoom: classRoom.trim(),
          number: Number(number),
          term: term.trim() || "1",
          academicYear: academicYear.trim() || "2568",
        });
      } else {
        await onAddStudent({
          teacherId: "",
          studentId: studentId.trim(),
          prefix,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          classRoom: classRoom.trim(),
          number: Number(number),
          term: term.trim() || "1",
          academicYear: academicYear.trim() || "2568",
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel File Selection
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    setExcelError("");
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setExcelError("ไม่พบ Sheet ข้อมูลในไฟล์ Excel");
        setLoading(false);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: "" });

      if (rows.length === 0) {
        setExcelError("ไฟล์ Excel ว่างเปล่า ไม่มีข้อมูลนักเรียน");
        setLoading(false);
        return;
      }

      // Check header row
      const firstRow = rows[0].map((cell: any) => String(cell).trim().toLowerCase());
      const hasHeader = firstRow.some((cell: string) =>
        ["รหัส", "id", "ชื่อ", "name", "คำนำหน้า", "ห้อง", "class", "เลขที่", "number"].some((keyword) => cell.includes(keyword))
      );

      const parsed: Omit<Student, "id" | "createdAt">[] = [];
      const startIdx = hasHeader ? 1 : 0;

      const targetTerm = selectedTerm === "ALL" ? "1" : selectedTerm;
      const targetYr = selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear;

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every((c: any) => String(c).trim() === "")) continue;

        let sId = "";
        let pfx = "เด็กชาย";
        let fName = "";
        let lName = "";
        let cls = selectedClass !== "ALL" ? selectedClass : allClasses[0] || "ม.1/1";
        let num = parsed.length + 1;

        if (hasHeader) {
          const headerRow = rows[0].map((c: any) => String(c).trim());
          headerRow.forEach((h: string, colIdx: number) => {
            const val = String(row[colIdx] || "").trim();
            const hl = h.toLowerCase();
            if (hl.includes("รหัส") || hl.includes("id")) sId = val;
            else if (hl.includes("คำนำหน้า") || hl.includes("prefix")) pfx = val;
            else if (hl.includes("ชื่อ") && !hl.includes("นามสกุล") && !hl.includes("คำนำหน้า")) fName = val;
            else if (hl.includes("นามสกุล") || hl.includes("surname") || hl.includes("lastname")) lName = val;
            else if (hl.includes("ห้อง") || hl.includes("class")) cls = val;
            else if (hl.includes("เลขที่") || hl.includes("number") || hl.includes("no")) num = Number(val) || num;
          });
        }

        // Fallbacks by position if incomplete
        if (!sId && row[0]) sId = String(row[0]).trim();
        if (!fName) {
          if (row[2]) fName = String(row[2]).trim();
          else if (row[1]) fName = String(row[1]).trim();
        }
        if (!lName && row[3]) lName = String(row[3]).trim();
        if (!cls && row[4]) cls = String(row[4]).trim();
        if (row[5] && !isNaN(Number(row[5]))) num = Number(row[5]);

        // Clean up prefix
        if (pfx) {
          if (pfx.startsWith("ด.ช") || pfx.includes("เด็กชาย")) pfx = "เด็กชาย";
          else if (pfx.startsWith("ด.ญ") || pfx.includes("เด็กหญิง")) pfx = "เด็กหญิง";
          else if (pfx.includes("นาย")) pfx = "นาย";
          else if (pfx.includes("นางสาว") || pfx.startsWith("น.ส.")) pfx = "นางสาว";
        }

        if (sId && fName) {
          parsed.push({
            teacherId: "",
            studentId: sId,
            prefix: pfx || "เด็กชาย",
            firstName: fName,
            lastName: lName || "",
            classRoom: cls || (selectedClass !== "ALL" ? selectedClass : "ม.1/1"),
            number: Number(num) || parsed.length + 1,
            term: targetTerm,
            academicYear: targetYr,
          });
        }
      }

      if (parsed.length === 0) {
        setExcelError("ไม่สามารถดึงข้อมูลรายชื่อนักเรียนจากไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบคอลัมน์");
      } else {
        setParsedPreview(parsed);
      }
    } catch (err: any) {
      console.error(err);
      setExcelError("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + (err.message || "รูปแบบไฟล์ไม่ถูกต้อง"));
    } finally {
      setLoading(false);
    }
  };

  // Download Excel Template
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      ["รหัสนักเรียน", "คำนำหน้า", "ชื่อ", "นามสกุล", "ห้องเรียน", "เลขที่"],
      ["10001", "เด็กชาย", "กิตติพงษ์", "มั่นคง", "ม.1/1", 1],
      ["10002", "เด็กชาย", "ชินวุฒิ", "สุขเจริญ", "ม.1/1", 2],
      ["10003", "เด็กหญิง", "ณัฐนิชา", "ประเสริฐศิลป์", "ม.1/1", 3],
      ["10004", "เด็กหญิง", "ธนพร", "วิเศษกุล", "ม.1/1", 4],
      ["10005", "เด็กชาย", "ปัณณธร", "เลิศวรชัย", "ม.1/1", 5],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน");

    // Set column widths
    ws["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 8 },
    ];

    XLSX.writeFile(wb, "แบบฟอร์มนำเข้านักเรียน_Excel.xlsx");
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let listToImport: Omit<Student, "id" | "createdAt">[] = [];

    if (importMode === "excel") {
      if (parsedPreview.length === 0) {
        alert("กรุณาเลือกไฟล์ Excel และตรวจสอบตัวอย่างข้อมูลก่อนกดยืนยัน");
        return;
      }
      listToImport = parsedPreview;
    } else {
      if (!batchText.trim()) return;

      const lines = batchText.trim().split("\n");
      const targetTerm = selectedTerm === "ALL" ? "1" : selectedTerm;
      const targetYr = selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear;

      lines.forEach((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length >= 4) {
          const sId = parts[0];
          let pfx = parts[1];
          let fName = parts[2];
          let lName = parts[3];
          let cls = parts[4] || (selectedClass !== "ALL" ? selectedClass : allClasses[0] || "ม.1/1");
          let num = Number(parts[5]) || listToImport.length + 1;

          if (sId && fName) {
            listToImport.push({
              teacherId: "",
              studentId: sId,
              prefix: pfx || "เด็กชาย",
              firstName: fName,
              lastName: lName || "",
              classRoom: cls,
              number: num,
              term: targetTerm,
              academicYear: targetYr,
            });
          }
        }
      });

      if (listToImport.length === 0) {
        alert("ไม่พบรูปแบบข้อมูลที่ถูกต้อง (ตัวอย่าง: 10001, เด็กชาย, สมชาย, ใจดี, ม.1/1, 1)");
        return;
      }
    }

    setLoading(true);
    try {
      await onBatchAddStudents(listToImport);
      setIsBatchOpen(false);
      setBatchText("");
      setParsedPreview([]);
      setImportedFileName("");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเพิ่มข้อมูลนักเรียน");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSampleData = async () => {
    const sampleClass = "ม.1/1";
    const sampleList: Omit<Student, "id" | "createdAt">[] = [
      { teacherId: "", studentId: "10001", prefix: "เด็กชาย", firstName: "กิตติพงษ์", lastName: "มั่นคง", classRoom: sampleClass, number: 1 },
      { teacherId: "", studentId: "10002", prefix: "เด็กชาย", firstName: "ชินวุฒิ", lastName: "สุขเจริญ", classRoom: sampleClass, number: 2 },
      { teacherId: "", studentId: "10003", prefix: "เด็กหญิง", firstName: "ณัฐนิชา", lastName: "ประเสริฐศิลป์", classRoom: sampleClass, number: 3 },
      { teacherId: "", studentId: "10004", prefix: "เด็กหญิง", firstName: "ธนพร", lastName: "วิเศษกุล", classRoom: sampleClass, number: 4 },
      { teacherId: "", studentId: "10005", prefix: "เด็กชาย", firstName: "ปัณณธร", lastName: "เลิศวรชัย", classRoom: sampleClass, number: 5 },
    ];
    await onBatchAddStudents(sampleList);
  };

  return (
    <div className="space-y-6 font-[#Geist] text-white">
      {/* Top Action Banner */}
      <div className="bg-[#18181B] p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-['Syne'] font-extrabold text-xl uppercase tracking-wide text-white">
              STUDENT ROSTER & QR GENERATOR (40x40mm)
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1 font-['Geist_Mono']">
            จัดการข้อมูลนักเรียน นำเข้าผ่านไฟล์ Excel / CSV และพิมพ์ QR Code ประจำตัวขนาด 40x40 มม.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2 font-['Geist_Mono']">
          {selectedClass !== "ALL" && (
            <button
              onClick={() => setPreviewQrClass(selectedClass)}
              className="inline-flex items-center space-x-1.5 bg-[#00FF66] hover:bg-[#00DD55] text-black px-3.5 py-2 rounded-md text-xs font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]"
            >
              <QrCode className="w-4 h-4 stroke-[2.5]" />
              <span>PRINT_QR_CLASS_{selectedClass}</span>
            </button>
          )}

          <button
            onClick={() => {
              setParsedPreview([]);
              setImportedFileName("");
              setExcelError("");
              setIsBatchOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-[#00FF66] border border-[#00FF66]/40 px-3.5 py-2 rounded-md text-xs font-bold uppercase transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXCEL_BATCH_IMPORT</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 bg-[#00FF66] hover:bg-[#00DD55] text-black px-3.5 py-2 rounded-md text-xs font-extrabold uppercase transition-all"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>ADD_STUDENT</span>
          </button>
        </div>
      </div>

      {/* Classroom Filter Bar & Search */}
      <div className="bg-[#18181B] p-4 border border-white/10 space-y-3 font-['Geist_Mono']">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          {/* Class Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs text-white/40 flex items-center space-x-1 whitespace-nowrap uppercase">
              <Filter className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>CLASSROOM:</span>
            </span>

            <button
              onClick={() => setSelectedClass("ALL")}
              className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap uppercase transition-all border ${
                selectedClass === "ALL"
                  ? "bg-[#00FF66] text-black border-[#00FF66]"
                  : "bg-[#111113] text-white/70 border-white/10 hover:border-white/30"
              }`}
            >
              ALL ({students.length})
            </button>

            {allClasses.map((cls) => {
              const count = students.filter((s) => s.classRoom === cls).length;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap uppercase transition-all border ${
                    selectedClass === cls
                      ? "bg-[#00FF66] text-black border-[#00FF66]"
                      : "bg-[#111113] text-white/70 border-white/10 hover:border-white/30"
                  }`}
                >
                  {cls} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="SEARCH_STUDENT_ID_OR_NAME..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none uppercase font-mono"
            />
          </div>
        </div>
      </div>

      {/* Roster Table */}
      {filteredStudents.length === 0 ? (
        <div className="bg-[#18181B] p-12 text-center border border-white/10">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-sm font-['Geist_Mono'] uppercase text-white/70">NO_STUDENT_DATA_FOUND</h3>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto font-['Geist']">
            {students.length === 0
              ? "ยังไม่มีข้อมูลนักเรียนในระบบ สามารถกดยอดปุ่มนำเข้าไฟล์ Excel หรือสร้างข้อมูลตัวอย่างได้"
              : "ไม่พบนักเรียนตรงตามเงื่อนไขการค้นหา"}
          </p>
          {students.length === 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  setParsedPreview([]);
                  setImportedFileName("");
                  setIsBatchOpen(true);
                }}
                className="inline-flex items-center space-x-2 bg-[#00FF66] text-black px-4 py-2 text-xs font-['Geist_Mono'] font-extrabold uppercase hover:bg-[#00DD55] transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>นำเข้าไฟล์ EXCEL</span>
              </button>
              <button
                onClick={handleGenerateSampleData}
                className="inline-flex items-center space-x-2 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] px-4 py-2 text-xs font-['Geist_Mono'] font-bold uppercase hover:bg-[#00FF66]/20 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#00FF66]" />
                <span>สร้างข้อมูลตัวอย่าง (ม.1/1)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#18181B] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-['Geist']">
              <thead className="bg-[#111113] text-white/50 font-['Geist_Mono'] font-bold border-b border-white/10 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center">NO.</th>
                  <th className="px-4 py-3">STUDENT ID (QR)</th>
                  <th className="px-4 py-3">NAME - SURNAME</th>
                  <th className="px-4 py-3 text-center">CLASSROOM</th>
                  <th className="px-4 py-3 text-center">QR BADGE (40x40mm)</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredStudents
                  .sort((a, b) => a.number - b.number)
                  .map((st) => (
                    <tr key={st.id} className="hover:bg-white/[0.02] transition-colors font-['Geist']">
                      <td className="px-4 py-3 font-mono text-center text-white/50 font-bold">
                        {st.number}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#00FF66] font-mono">
                        {st.studentId}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {st.prefix}
                        {st.firstName} {st.lastName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-0.5 bg-[#111113] text-white/80 font-mono font-bold border border-white/10 text-[10px]">
                          {st.classRoom}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setPreviewQrClass(st.classRoom)}
                          className="inline-flex items-center space-x-1 text-[11px] text-[#00FF66] hover:underline font-mono"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>PREVIEW_40x40mm</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-white/40 hover:text-[#00FF66] hover:bg-white/5 rounded transition-colors"
                            title="EDIT"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `ลบนักเรียน ${st.prefix}${st.firstName} ${st.lastName} หรือไม่?`
                                )
                              ) {
                                onDeleteStudent(st.id);
                              }
                            }}
                            className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 rounded transition-colors"
                            title="DELETE"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Single Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/20 max-w-md w-full p-6 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 font-['Geist_Mono']">
              <h3 className="text-xs font-bold uppercase text-[#00FF66]">
                {editingId ? "[EDIT_STUDENT_DATA]" : "[NEW_STUDENT_DATA]"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2.5 bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-['Geist_Mono']">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 font-['Geist']">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    รหัสนักเรียน (QR ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-[#00FF66] focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    คำนำหน้า *
                  </label>
                  <select
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                  >
                    <option value="เด็กชาย">เด็กชาย</option>
                    <option value="เด็กหญิง">เด็กหญิง</option>
                    <option value="นาย">นาย</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    ชื่อ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="สมชาย"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    นามสกุล *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เรียนดี"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    ห้องเรียน *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ม.1/1"
                    value={classRoom}
                    onChange={(e) => setClassRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono']"
                  />
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    เลขที่ *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={number}
                    onChange={(e) => setNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono']"
                  />
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    ภาคเรียน *
                  </label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-[#00FF66] focus:outline-none font-['Geist_Mono'] font-bold"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                    <option value="3">ภาคเรียนที่ 3 (ฤดูร้อน)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    ปีการศึกษา *
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono'] font-bold text-sky-400"
                  >
                    {academicYears.map((yr) => (
                      <option key={yr} value={yr}>
                        ปี {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10 font-['Geist_Mono']">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-white/50 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-[#00FF66] hover:bg-[#00DD55] text-black transition-all"
                >
                  {loading ? "SAVING..." : editingId ? "SAVE_CHANGES" : "CREATE_STUDENT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal (Excel / CSV) */}
      {isBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/20 max-w-2xl w-full p-6 text-white max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 font-['Geist_Mono']">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-[#00FF66]" />
                <h3 className="text-xs font-bold uppercase text-[#00FF66]">
                  นำเข้าข้อมูลนักเรียนแบบกลุ่ม (EXCEL / CSV IMPORT)
                </h3>
              </div>
              <button
                onClick={() => setIsBatchOpen(false)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            {/* Import Mode Switcher */}
            <div className="flex border-b border-white/10 mb-4 font-['Geist_Mono'] text-xs">
              <button
                type="button"
                onClick={() => setImportMode("excel")}
                className={`px-4 py-2 font-bold uppercase flex items-center space-x-2 border-b-2 transition-all ${
                  importMode === "excel"
                    ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/5"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>อัปโหลดไฟล์ Excel (.xlsx / .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("text")}
                className={`px-4 py-2 font-bold uppercase flex items-center space-x-2 border-b-2 transition-all ${
                  importMode === "text"
                    ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/5"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>คัดลอก/วางข้อความ CSV</span>
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="space-y-4 font-['Geist'] flex-1 overflow-y-auto pr-1">
              {importMode === "excel" ? (
                <div className="space-y-4">
                  {/* Download Template & Instructions */}
                  <div className="p-3 bg-[#111113] border border-white/10 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-white font-['Geist_Mono']">
                        📥 ไฟล์ตัวอย่างสำหรับนำเข้าข้อมูล
                      </p>
                      <p className="text-[11px] text-white/50 font-['Geist'] mt-0.5">
                        คอลัมน์มาตรฐาน: รหัสนักเรียน, คำนำหน้า, ชื่อ, นามสกุล, ห้องเรียน, เลขที่
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#00FF66] border border-[#00FF66]/30 font-['Geist_Mono'] font-bold text-xs uppercase rounded transition-all flex items-center space-x-1.5 flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)</span>
                    </button>
                  </div>

                  {/* Excel Upload Area */}
                  <div className="border-2 border-dashed border-white/20 hover:border-[#00FF66] rounded-lg p-6 text-center bg-[#111113] transition-colors relative cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-8 h-8 text-[#00FF66] mx-auto mb-2" />
                    <p className="text-xs font-bold font-['Geist_Mono'] text-white">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ Excel (.xlsx, .csv) มาวางที่นี่
                    </p>
                    <p className="text-[11px] text-white/40 mt-1 font-['Geist']">
                      ระบบจะอ่านข้อมูลและแยกคอลัมน์ให้อัตโนมัติ
                    </p>
                    {importedFileName && (
                      <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 font-mono text-xs font-bold rounded">
                        <Check className="w-3.5 h-3.5" />
                        <span>ไฟล์ที่เลือก: {importedFileName}</span>
                      </div>
                    )}
                  </div>

                  {excelError && (
                    <div className="p-3 bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-['Geist_Mono'] flex items-center space-x-2 rounded">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                      <span>{excelError}</span>
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedPreview.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-['Geist_Mono'] text-white/70">
                        <span className="font-bold text-[#00FF66]">
                          ✓ พบข้อมูลนักเรียนพร้อมนำเข้า {parsedPreview.length} คน:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setParsedPreview([]);
                            setImportedFileName("");
                          }}
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          ล้างรายการ
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-white/10 rounded bg-[#111113]">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead className="bg-white/5 text-white/50 sticky top-0 border-b border-white/10 uppercase">
                            <tr>
                              <th className="p-2 text-center">เลขที่</th>
                              <th className="p-2">รหัส</th>
                              <th className="p-2">ชื่อ - นามสกุล</th>
                              <th className="p-2 text-center">ห้องเรียน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {parsedPreview.map((st, idx) => (
                              <tr key={idx} className="hover:bg-white/5">
                                <td className="p-2 text-center font-bold text-white/50">{st.number}</td>
                                <td className="p-2 text-[#00FF66] font-bold">{st.studentId}</td>
                                <td className="p-2">{st.prefix}{st.firstName} {st.lastName}</td>
                                <td className="p-2 text-center text-sky-400">{st.classRoom}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-white/50 font-['Geist_Mono']">
                    วางข้อมูลข้อความจาก Excel หรือ CSV รูปแบบ:
                    <br />
                    <code className="text-[#00FF66] bg-[#111113] px-2 py-0.5 border border-white/10 font-mono text-[11px] block mt-1">
                      รหัสนักเรียน, คำนำหน้า, ชื่อ, นามสกุล, ห้องเรียน, เลขที่
                    </code>
                  </p>

                  <textarea
                    rows={8}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder={`10001, เด็กชาย, สมชาย, ใจดี, ม.1/1, 1\n10002, เด็กหญิง, สมหญิง, รักเรียน, ม.1/1, 2\n10003, นาย, ปรัชญา, มั่นคง, ม.1/1, 3`}
                    className="w-full p-3 text-xs font-mono bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none rounded"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setBatchText(
                        `10001, เด็กชาย, กิตติพงษ์, มั่นคง, ม.1/1, 1\n10002, เด็กชาย, ชินวุฒิ, สุขเจริญ, ม.1/1, 2\n10003, เด็กหญิง, ณัฐนิชา, ประเสริฐศิลป์, ม.1/1, 3`
                      )
                    }
                    className="text-xs text-[#00FF66] hover:underline font-medium font-['Geist_Mono']"
                  >
                    LOAD_SAMPLE_CSV
                  </button>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/10 font-['Geist_Mono']">
                <button
                  type="button"
                  onClick={() => setIsBatchOpen(false)}
                  className="px-4 py-2 text-xs text-white/50 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading || (importMode === "excel" && parsedPreview.length === 0)}
                  className="px-5 py-2 text-xs font-bold bg-[#00FF66] hover:bg-[#00DD55] text-black disabled:opacity-40 transition-all flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {loading
                      ? "IMPORTING..."
                      : importMode === "excel"
                      ? `ยืนยันนำเข้า (${parsedPreview.length} รายชื่อ)`
                      : "CONFIRM_IMPORT"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Circle PDF Preview Modal */}
      {previewQrClass && (
        <StudentQRModal
          classRoom={previewQrClass}
          students={students.filter((s) => s.classRoom === previewQrClass)}
          onClose={() => setPreviewQrClass(null)}
        />
      )}
    </div>
  );
};
