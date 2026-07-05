import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  Award,
  AlertCircle,
} from "lucide-react";
import { Assignment, Subject } from "../types";

interface AssignmentManagerProps {
  subjects: Subject[];
  assignments: Assignment[];
  onAddAssignment: (assignment: Omit<Assignment, "id" | "createdAt">) => Promise<void>;
  onUpdateAssignment: (id: string, assignment: Partial<Assignment>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  selectedTerm?: string;
  selectedAcademicYear?: string;
  academicYears?: string[];
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  subjects,
  assignments,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  selectedTerm = "1",
  selectedAcademicYear = "2568",
  academicYears = ["2568", "2567"],
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
    } else {
      setSelectedSubjectId("");
    }
  }, [subjects]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState<number>(10);
  const [category, setCategory] = useState<"preMidterm" | "midterm" | "postMidterm" | "final" | "formative">("preMidterm");
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [term, setTerm] = useState(selectedTerm === "ALL" ? "1" : selectedTerm);
  const [academicYear, setAcademicYear] = useState(selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Filter assignments
  const filteredAssignments = assignments.filter((a) => {
    const matchesSubject = !selectedSubjectId || a.subjectId === selectedSubjectId;
    const matchesClass =
      selectedClassFilter === "ALL" ||
      (a.assignedClasses && a.assignedClasses.includes(selectedClassFilter));
    return matchesSubject && matchesClass;
  });

  const handleOpenAdd = () => {
    if (!selectedSubjectId) {
      alert("กรุณาสร้างหรือเลือกรายวิชาก่อนเพิ่มงาน");
      return;
    }
    setEditingId(null);
    setTitle("");
    setDescription("");
    setMaxScore(10);
    setCategory("preMidterm");
    setAssignedClasses(currentSubject?.classes || []);
    setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setTerm(selectedTerm === "ALL" ? "1" : selectedTerm);
    setAcademicYear(selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear);
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Assignment) => {
    setEditingId(a.id);
    setTitle(a.title);
    setDescription(a.description || "");
    setMaxScore(a.maxScore);
    setCategory(a.category);
    setAssignedClasses(a.assignedClasses || []);
    setDueDate(a.dueDate || "");
    setTerm(a.term || "1");
    setAcademicYear(a.academicYear || "2568");
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubjectId || maxScore <= 0) {
      setError("กรุณากรอกชื่อภาระงาน วิชา และคะแนนเต็มให้ถูกต้อง");
      return;
    }

    if (assignedClasses.length === 0) {
      setError("กรุณาเลือกห้องเรียนที่มอบหมายงานอย่างน้อย 1 ห้อง");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await onUpdateAssignment(editingId, {
          title: title.trim(),
          description: description.trim(),
          maxScore: Number(maxScore),
          category,
          assignedClasses,
          dueDate,
          term: term.trim() || "1",
          academicYear: academicYear.trim() || "2568",
        });
      } else {
        await onAddAssignment({
          teacherId: "",
          subjectId: selectedSubjectId,
          title: title.trim(),
          description: description.trim(),
          maxScore: Number(maxScore),
          category,
          assignedClasses,
          dueDate,
          term: term.trim() || "1",
          academicYear: academicYear.trim() || "2568",
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกงาน");
    } finally {
      setLoading(false);
    }
  };

  const toggleClassSelect = (cls: string) => {
    if (assignedClasses.includes(cls)) {
      setAssignedClasses(assignedClasses.filter((c) => c !== cls));
    } else {
      setAssignedClasses([...assignedClasses, cls]);
    }
  };

  return (
    <div className="space-y-6 font-[#Geist] text-white">
      {/* Top Banner */}
      <div className="bg-[#18181B] p-6 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-['Syne'] font-extrabold text-xl uppercase tracking-wide text-white">
              ASSIGNMENTS & TASKS
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1 font-['Geist_Mono']">
            สร้างงาน กำหนดคะแนนเต็ม และสั่งงานแยกรายห้องเรียนตามวิชาที่สอน
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={subjects.length === 0}
          className="inline-flex items-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-['Geist_Mono'] font-extrabold px-4 py-2.5 rounded-md text-xs uppercase transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)] disabled:opacity-50"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>NEW_ASSIGNMENT</span>
        </button>
      </div>

      {/* Select Subject & Classroom Selector */}
      <div className="bg-[#18181B] p-4 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 font-['Geist_Mono']">
        <div>
          <label className="block text-xs uppercase text-white/60 mb-1">
            SUBJECT:
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedClassFilter("ALL");
            }}
            className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-bold text-[#00FF66] focus:outline-none"
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

        <div>
          <label className="block text-xs uppercase text-white/60 mb-1">
            FILTER_CLASSROOM:
          </label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
          >
            <option value="ALL">ALL CLASSROOMS</option>
            {currentSubject?.classes?.map((cls) => (
              <option key={cls} value={cls}>
                CLASS {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-[#18181B] p-12 text-center border border-white/10">
          <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-sm font-['Geist_Mono'] uppercase text-white/70">NO_ASSIGNMENTS_FOUND</h3>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto font-['Geist']">
            กดปุ่ม "NEW_ASSIGNMENT" เพื่อสร้างใบงาน การบ้าน หรือแบบทดสอบ
          </p>
          {subjects.length > 0 && (
            <button
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center space-x-2 bg-[#00FF66] text-black font-['Geist_Mono'] font-bold px-4 py-2 rounded-md text-xs uppercase"
            >
              <Plus className="w-4 h-4" />
              <span>CREATE_FIRST_ASSIGNMENT</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((a) => {
            const categoryBadge =
              a.category === "preMidterm" || a.category === "formative"
                ? { label: "เก็บก่อนเรียน", color: "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30" }
                : a.category === "midterm"
                ? { label: "กลางภาค", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" }
                : a.category === "postMidterm"
                ? { label: "เก็บหลังกลางภาค", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" }
                : { label: "ปลายภาค", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };

            return (
              <div
                key={a.id}
                className="bg-[#18181B] border border-white/10 p-5 hover:border-[#00FF66]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-['Geist_Mono'] font-bold px-2.5 py-0.5 border ${categoryBadge.color}`}
                      >
                        {categoryBadge.label}
                      </span>
                      <span className="text-[10px] font-['Geist_Mono'] px-2 py-0.5 bg-white/5 text-white/70 border border-white/10 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-sky-400" />
                        <span>เทอม {a.term || "1"}/{a.academicYear || "2568"}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="p-1.5 text-white/40 hover:text-[#00FF66] hover:bg-white/5 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`ต้องการลบงาน "${a.title}" หรือไม่?`)) {
                            onDeleteAssignment(a.id);
                          }
                        }}
                        className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-base mb-1">{a.title}</h3>
                  {a.description && (
                    <p className="text-xs text-white/50 mb-3 line-clamp-2">{a.description}</p>
                  )}

                  <div className="space-y-2 mt-4 text-xs font-['Geist_Mono']">
                    <div className="flex items-center justify-between bg-[#111113] p-2.5 border border-white/10 font-medium">
                      <span className="text-white/50 flex items-center space-x-1">
                        <Award className="w-4 h-4 text-[#00FF66]" />
                        <span>SCORE_MAX:</span>
                      </span>
                      <span className="font-bold text-[#00FF66]">{a.maxScore} PTS</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-wrap pt-1">
                      <Layers className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-[11px] text-white/40">CLASSES:</span>
                      {a.assignedClasses?.map((cls) => (
                        <span
                          key={cls}
                          className="text-[10px] font-bold bg-[#111113] text-white/80 px-2 py-0.5 border border-white/10"
                        >
                          {cls}
                        </span>
                      ))}
                    </div>

                    {a.dueDate && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-white/30 pt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>DUE: {a.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-white/20 max-w-lg w-full p-6 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 font-['Geist_Mono']">
              <h3 className="text-xs font-bold uppercase text-[#00FF66]">
                {editingId ? "[EDIT_ASSIGNMENT]" : "[NEW_ASSIGNMENT]"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2.5 bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2 font-['Geist_Mono']">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-['Geist']">
              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                  ชื่อภาระงาน / หัวข้อการบ้าน *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ใบงานที่ 1 เรื่อง โครงสร้างของเซลล์"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ทำลงในสมุด หน้าที่ 12-15"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    คะแนนเต็ม *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] font-mono font-bold text-[#00FF66] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    หมวดหมู่คะแนน *
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as "preMidterm" | "midterm" | "postMidterm" | "final" | "formative")
                    }
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono']"
                  >
                    <option value="preMidterm">คะแนนเก็บก่อนเรียน (ก่อนกลางภาค)</option>
                    <option value="midterm">คะแนนกลางภาค (Midterm)</option>
                    <option value="postMidterm">คะแนนเก็บหลังกลางภาค</option>
                    <option value="final">คะแนนปลายภาค (Final)</option>
                  </select>
                </div>
              </div>

              {/* Assign to Classrooms */}
              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1.5">
                  เลือกห้องเรียนที่มอบหมายงานนี้ *
                </label>
                <div className="flex flex-wrap gap-2">
                  {currentSubject?.classes?.map((cls) => {
                    const isSelected = assignedClasses.includes(cls);
                    return (
                      <button
                        type="button"
                        key={cls}
                        onClick={() => toggleClassSelect(cls)}
                        className={`px-3 py-1.5 text-xs font-['Geist_Mono'] font-bold border transition-all ${
                          isSelected
                            ? "bg-[#00FF66] text-black border-[#00FF66]"
                            : "bg-[#111113] text-white/60 border-white/20 hover:border-white/40"
                        }`}
                      >
                        CLASS {cls} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    กำหนดส่ง (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
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
                  {loading ? "SAVING..." : editingId ? "SAVE_CHANGES" : "ASSIGN_TASK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
