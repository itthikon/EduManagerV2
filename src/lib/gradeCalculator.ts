import { Assignment, ScoreWeights, Student, Submission, StudentGradeSummary } from "../types";

export function calculateGrade(scorePercentage: number): string {
  if (scorePercentage >= 80) return "4.0";
  if (scorePercentage >= 75) return "3.5";
  if (scorePercentage >= 70) return "3.0";
  if (scorePercentage >= 65) return "2.5";
  if (scorePercentage >= 60) return "2.0";
  if (scorePercentage >= 55) return "1.5";
  if (scorePercentage >= 50) return "1.0";
  return "0.0";
}

export function calculateStudentGradeSummary(
  student: Student,
  assignments: Assignment[],
  submissions: Submission[],
  scoreWeights: ScoreWeights
): StudentGradeSummary {
  // Filter assignments for this student's classroom
  const relevantAssignments = assignments.filter(
    (a) =>
      !a.assignedClasses ||
      a.assignedClasses.length === 0 ||
      (student.classRoom && a.assignedClasses.includes(student.classRoom))
  );

  let preMidtermScore = 0;
  let preMidtermMax = 0;
  let midtermScore = 0;
  let midtermMax = 0;
  let postMidtermScore = 0;
  let postMidtermMax = 0;
  let finalScore = 0;
  let finalMax = 0;

  let submittedCount = 0;
  let missingCount = 0;

  relevantAssignments.forEach((assignment) => {
    const sub = submissions.find(
      (s) => s.assignmentId === assignment.id && s.studentId === student.studentId
    );

    const isSubmitted = sub && (sub.status === "graded" || sub.status === "submitted");
    if (isSubmitted) {
      submittedCount++;
    } else {
      missingCount++;
    }

    const scoreEarned = sub ? sub.score || 0 : 0;

    if (assignment.category === "preMidterm" || assignment.category === "formative") {
      preMidtermScore += scoreEarned;
      preMidtermMax += assignment.maxScore;
    } else if (assignment.category === "midterm") {
      midtermScore += scoreEarned;
      midtermMax += assignment.maxScore;
    } else if (assignment.category === "postMidterm") {
      postMidtermScore += scoreEarned;
      postMidtermMax += assignment.maxScore;
    } else if (assignment.category === "final") {
      finalScore += scoreEarned;
      finalMax += assignment.maxScore;
    }
  });

  // Calculate weighted percentages (default 30, 20, 30, 20)
  const weights: ScoreWeights = scoreWeights || { preMidterm: 30, midterm: 20, postMidterm: 30, final: 20 };
  const wPre = weights.preMidterm ?? (weights.formative ? weights.formative / 2 : 30);
  const wMid = weights.midterm ?? 20;
  const wPost = weights.postMidterm ?? (weights.formative ? weights.formative / 2 : 30);
  const wFin = weights.final ?? 20;

  const preMidtermPct = preMidtermMax > 0 ? (preMidtermScore / preMidtermMax) * wPre : 0;
  const midtermPct = midtermMax > 0 ? (midtermScore / midtermMax) * wMid : 0;
  const postMidtermPct = postMidtermMax > 0 ? (postMidtermScore / postMidtermMax) * wPost : 0;
  const finalPct = finalMax > 0 ? (finalScore / finalMax) * wFin : 0;

  const totalPercentage = Math.round((preMidtermPct + midtermPct + postMidtermPct + finalPct) * 100) / 100;
  const grade = calculateGrade(totalPercentage);

  return {
    student,
    preMidtermScore,
    preMidtermMax,
    midtermScore,
    midtermMax,
    postMidtermScore,
    postMidtermMax,
    finalScore,
    finalMax,
    totalPercentage,
    grade,
    submittedCount,
    totalAssignments: relevantAssignments.length,
    missingCount,
    formativeScore: preMidtermScore + postMidtermScore,
    formativeMax: preMidtermMax + postMidtermMax,
  };
}
