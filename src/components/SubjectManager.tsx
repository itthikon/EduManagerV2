import React, { useState } from "react";
import { BookOpen, Plus, Edit2, Trash2, AlertCircle, Layers, Calendar } from "lucide-react";
import { Subject, ScoreWeights, cleanYear, cleanTerm } from "../types";

interface SubjectManagerProps {
  subjects: Subject[];
  onAddSubject: (subject: Omit<Subject, "id" | "createdAt">) => Promise<void>;
  onUpdateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
  selectedTerm?: string;
  selectedAcademicYear?: string;
  academicYears?: string[];
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  subjects,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  selectedTerm = "1",
  selectedAcademicYear = "2568",
  academicYears = ["2568", "2567"],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [classesInput, setClassesInput] = useState("");
  const [term, setTerm] = useState(selectedTerm === "ALL" ? "1" : selectedTerm);
  const [academicYear, setAcademicYear] = useState(selectedAcademicYear === "ALL" ? "2568" : selectedAcademicYear);
  const [scoreWeights, setScoreWeights] = useState<ScoreWeights>({
    preMidterm: 30,
    midterm: 20,
    postMidterm: 30,
    final: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setClassesInput("ม.1/1, ม.1/2");
    setTerm(selectedTerm === "ALL" ? "1" : cleanTerm(selectedTerm));
    setAcademicYear(selectedAcademicYear === "ALL" ? (academicYears[0] || "2568") : cleanYear(selectedAcademicYear));
    setScoreWeights({ preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 });
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setCode(subject.code);
    setName(subject.name);
    setClassesInput(subject.classes.join(", "));
    setTerm(cleanTerm(subject.term) || "1");
    setAcademicYear(cleanYear(subject.academicYear) || "2568");
    const w: ScoreWeights = subject.scoreWeights || { preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 };
    setScoreWeights({
      preMidterm: w.preMidterm ?? (w.formative ? Math.round(w.formative / 2) : 30),
      midterm: w.midterm ?? 20,
      postMidterm: w.postMidterm ?? (w.formative ? Math.round(w.formative / 2) : 30),
      final: w.final ?? 20,
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim() || !name.trim()) {
      setError("กรุณากรอกรหัสวิชาและชื่อวิชา");
      return;
    }

    const totalWeight =
      Number(scoreWeights.preMidterm) +
      Number(scoreWeights.midterm) +
      Number(scoreWeights.postMidterm) +
      Number(scoreWeights.final);

    if (totalWeight !== 100) {
      setError(`สัดส่วนคะแนนรวมกันต้องเท่ากับ 100% (ขณะนี้รวมกันได้ ${totalWeight}%)`);
      return;
    }

    const classesArray = classesInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (classesArray.length === 0) {
      setError("กรุณาระบุห้องเรียนอย่างน้อย 1 ห้อง");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await onUpdateSubject(editingId, {
          code: code.trim(),
          name: name.trim(),
          classes: classesArray,
          term: cleanTerm(term) || "1",
          academicYear: cleanYear(academicYear) || "2568",
          scoreWeights: {
            preMidterm: Number(scoreWeights.preMidterm),
            midterm: Number(scoreWeights.midterm),
            postMidterm: Number(scoreWeights.postMidterm),
            final: Number(scoreWeights.final),
          },
        });
      } else {
        await onAddSubject({
          teacherId: "",
          code: code.trim(),
          name: name.trim(),
          classes: classesArray,
          term: cleanTerm(term) || "1",
          academicYear: cleanYear(academicYear) || "2568",
          scoreWeights: {
            preMidterm: Number(scoreWeights.preMidterm),
            midterm: Number(scoreWeights.midterm),
            postMidterm: Number(scoreWeights.postMidterm),
            final: Number(scoreWeights.final),
          },
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-[#Geist] text-white">
      {/* Header Banner */}
      <div className="bg-[#18181B] p-6 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-[#00FF66]" />
            <h2 className="font-['Syne'] font-extrabold text-xl uppercase tracking-wide text-white">
              SUBJECTS & SCORE WEIGHTS
            </h2>
          </div>
          <p className="text-xs text-white/40 mt-1 font-['Geist_Mono']">
            กำหนดอัตราส่วนคะแนนเก็บ กลางภาค ปลายภาค และระบุห้องเรียนสำหรับวิชาที่สอน
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 bg-[#00FF66] hover:bg-[#00DD55] text-black font-['Geist_Mono'] font-extrabold px-4 py-2.5 rounded-md text-xs uppercase transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>ADD_SUBJECT</span>
        </button>
      </div>

      {/* List of Subjects */}
      {subjects.length === 0 ? (
        <div className="bg-[#18181B] p-12 text-center border border-white/10">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-sm font-['Geist_Mono'] uppercase text-white/70">NO_SUBJECTS_DEFINED</h3>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto font-['Geist']">
            กดปุ่ม "ADD_SUBJECT" เพื่อสร้างวิชาเรียน ตั้งค่าสัดส่วนคะแนน และกำหนดห้องเรียน
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center space-x-2 bg-[#00FF66] text-black font-['Geist_Mono'] font-bold px-4 py-2 rounded-md text-xs uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE_FIRST_SUBJECT</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => {
            const weights = sub.scoreWeights || { formative: 60, midterm: 20, final: 20 };
            return (
              <div
                key={sub.id}
                className="bg-[#18181B] border border-white/10 p-5 hover:border-[#00FF66]/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-['Geist_Mono'] text-xs font-bold px-2.5 py-1 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 uppercase">
                        {sub.code}
                      </span>
                      <span className="text-[10px] font-['Geist_Mono'] px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-sky-400" />
                        <span>เทอม {sub.term || "1"}/{sub.academicYear || "2568"}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1.5 text-white/40 hover:text-[#00FF66] hover:bg-white/5 rounded transition-colors"
                        title="EDIT_SUBJECT"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`คุณต้องการลบรายวิชา ${sub.code} ${sub.name} หรือไม่?`)) {
                            onDeleteSubject(sub.id);
                          }
                        }}
                        className="p-1.5 text-white/40 hover:text-rose-400 hover:bg-white/5 rounded transition-colors"
                        title="DELETE_SUBJECT"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-base mb-1">{sub.name}</h3>

                  {/* Assigned Classrooms */}
                  <div className="flex items-center space-x-1.5 flex-wrap my-3 font-['Geist_Mono'] text-xs">
                    <Layers className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-white/40">CLASSES:</span>
                    {sub.classes && sub.classes.length > 0 ? (
                      sub.classes.map((cls) => (
                        <span
                          key={cls}
                          className="text-[10px] font-medium bg-[#111113] text-white/80 px-2 py-0.5 border border-white/10 rounded"
                        >
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/30">N/A</span>
                    )}
                  </div>

                  {/* Score Weight Bar */}
                  <div className="mt-4 bg-[#111113] p-3 border border-white/10 space-y-2 font-['Geist_Mono']">
                    <div className="flex justify-between items-center text-xs text-white/70">
                      <span>WEIGHT_DISTRIBUTION</span>
                      <span className="text-[#00FF66]">100%</span>
                    </div>

                    {(() => {
                      const wPre = weights.preMidterm ?? (weights.formative ? Math.round(weights.formative / 2) : 30);
                      const wMid = weights.midterm ?? 20;
                      const wPost = weights.postMidterm ?? (weights.formative ? Math.round(weights.formative / 2) : 30);
                      const wFin = weights.final ?? 20;
                      return (
                        <>
                          <div className="w-full bg-white/10 h-2 flex overflow-hidden">
                            <div
                              style={{ width: `${wPre}%` }}
                              className="bg-[#00FF66] h-full"
                              title={`คะแนนเก็บก่อนเรียน ${wPre}%`}
                            />
                            <div
                              style={{ width: `${wMid}%` }}
                              className="bg-sky-400 h-full"
                              title={`กลางภาค ${wMid}%`}
                            />
                            <div
                              style={{ width: `${wPost}%` }}
                              className="bg-purple-400 h-full"
                              title={`คะแนนเก็บหลังกลางภาค ${wPost}%`}
                            />
                            <div
                              style={{ width: `${wFin}%` }}
                              className="bg-amber-400 h-full"
                              title={`ปลายภาค ${wFin}%`}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9px] text-center pt-1 font-mono">
                            <div className="bg-[#00FF66]/10 text-[#00FF66] p-1 border border-[#00FF66]/20">
                              ก่อนเรียน: {wPre}%
                            </div>
                            <div className="bg-sky-500/10 text-sky-400 p-1 border border-sky-500/20">
                              กลางภาค: {wMid}%
                            </div>
                            <div className="bg-purple-500/10 text-purple-400 p-1 border border-purple-500/20">
                              หลังกลางภาค: {wPost}%
                            </div>
                            <div className="bg-amber-500/10 text-amber-400 p-1 border border-amber-500/20">
                              ปลายภาค: {wFin}%
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#18181B] border border-white/20 max-w-lg w-full p-6 text-white my-8">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4 font-['Geist_Mono']">
              <h3 className="text-sm font-bold uppercase text-[#00FF66]">
                {editingId ? "[EDIT_SUBJECT_PARAMETERS]" : "[NEW_SUBJECT_PARAMETERS]"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-mono"
              >
                [ESC]
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2 font-['Geist_Mono']">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-['Geist']">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    รหัสวิชา *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ว21101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono']"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                    ชื่อวิชา *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="วิทยาศาสตร์และเทคโนโลยี 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist']"
                  />
                </div>

                <div className="col-span-1">
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

                <div className="col-span-1">
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

              <div>
                <label className="block text-xs font-['Geist_Mono'] uppercase text-white/60 mb-1">
                  ห้องเรียนที่สอน (คั่นด้วยเครื่องหมายจุลภาค ,) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ม.1/1, ม.1/2, ม.1/3"
                  value={classesInput}
                  onChange={(e) => setClassesInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#111113] border border-white/20 focus:border-[#00FF66] text-white focus:outline-none font-['Geist_Mono']"
                />
                <p className="text-[10px] text-white/30 mt-1 font-['Geist_Mono']">
                  EXAMPLE: ม.1/1, ม.1/2
                </p>
              </div>

              {/* Score Weights Settings */}
              <div className="bg-[#111113] p-4 border border-white/10 space-y-3 font-['Geist_Mono']">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#00FF66]">SCORE_WEIGHTS (%)</span>
                  <span className="text-white/60">
                    TOTAL:{" "}
                    {Number(scoreWeights.preMidterm || 0) +
                      Number(scoreWeights.midterm || 0) +
                      Number(scoreWeights.postMidterm || 0) +
                      Number(scoreWeights.final || 0)}
                    %
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">คะแนนเก็บก่อนเรียน (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreWeights.preMidterm}
                      onChange={(e) =>
                        setScoreWeights({ ...scoreWeights, preMidterm: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-[#18181B] border border-white/20 focus:border-[#00FF66] text-center font-bold text-[#00FF66] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">คะแนนกลางภาค (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreWeights.midterm}
                      onChange={(e) =>
                        setScoreWeights({ ...scoreWeights, midterm: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-[#18181B] border border-white/20 focus:border-sky-400 text-center font-bold text-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">คะแนนเก็บหลังกลางภาค (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreWeights.postMidterm}
                      onChange={(e) =>
                        setScoreWeights({ ...scoreWeights, postMidterm: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-[#18181B] border border-white/20 focus:border-purple-400 text-center font-bold text-purple-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/50 mb-1">คะแนนปลายภาค (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreWeights.final}
                      onChange={(e) =>
                        setScoreWeights({ ...scoreWeights, final: Number(e.target.value) })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-[#18181B] border border-white/20 focus:border-amber-400 text-center font-bold text-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10 font-['Geist_Mono']">
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
                  className="px-5 py-2 text-xs font-bold bg-[#00FF66] hover:bg-[#00DD55] text-black transition-all flex items-center space-x-2"
                >
                  {loading && <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                  <span>{editingId ? "SAVE_CHANGES" : "CREATE_SUBJECT"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
