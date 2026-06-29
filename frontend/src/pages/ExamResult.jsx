import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import {
  FaCheck,
  FaXmark,
  FaTrophy,
  FaClock,
  FaTriangleExclamation,
  FaArrowLeft,
  FaEye,
  FaShield,
} from "react-icons/fa6";

function ExamResult() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/exam/attempt/${attemptId}/result`, {
        withCredentials: true,
      });
      setResult(res.data);
    } catch (error) {
      console.error("Error fetching result:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "critical":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
          <p className="text-gray-600 text-lg mb-4">Result not found</p>
          <button
            onClick={() => navigate("/studentexams")}
            className="flex items-center gap-2 text-black hover:underline"
          >
            <FaArrowLeft /> Back to Exams
          </button>
        </div>
        <Footer />
      </>
    );
  }

  // Backend returns flat structure - result contains attempt data directly
  const exam = result.exam || {};
  const answers = result.answers || [];
  // Calculate correct answers and marks
  const correctAnswersCount = answers.filter(ans => ans.isCorrect).length;
  const totalMarksObtained = answers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);
  const attempt = {
    ...result,
    isPassed: result.isPassed,
    totalMarksObtained,
    percentage: exam.totalMarks ? (totalMarksObtained / exam.totalMarks) * 100 : 0,
    startedAt: result.startedAt,
    submittedAt: result.completedAt,
    completedAt: result.completedAt,
    status: result.status,
    riskLevel: result.proctoring?.riskLevel,
    riskScore: result.proctoring?.riskScore,
    violations: result.proctoring?.violations || [],
    correctAnswers: correctAnswersCount,
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 pt-26 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate("/studentexams")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
          >
            <FaArrowLeft /> Back to My Exams
          </button>

          {/* Result Summary Card */}
          <div
            className={`rounded-2xl p-8 mb-8 ${
              attempt.isPassed
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            } text-white`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
                <p className="opacity-80">{exam.course?.title}</p>
              </div>
              <div className="text-center">
                {attempt.isPassed ? (
                  <FaTrophy className="w-16 h-16 mx-auto mb-2" />
                ) : (
                  <FaXmark className="w-16 h-16 mx-auto mb-2" />
                )}
                <p className="text-xl font-bold">{attempt.isPassed ? "PASSED" : "FAILED"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="text-center">
                <p className="text-4xl font-bold">{attempt.correctAnswers || 0}</p>
                <p className="text-sm opacity-80">out of {exam.totalQuestions || answers.length || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{((attempt.correctAnswers / (exam.totalQuestions || answers.length || 1)) * 100).toFixed(1)}%</p>
                <p className="text-sm opacity-80">Percentage</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{attempt.totalMarksObtained || 0}</p>
                <p className="text-sm opacity-80">Marks Obtained</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">
                  {result.timeSpent ? Math.round(result.timeSpent / 60) : (attempt.startedAt && attempt.completedAt ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 60000) : "--")}
                </p>
                <p className="text-sm opacity-80">Minutes Taken</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Exam Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">Exam Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-medium">{exam.duration || "N/A"} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Questions</span>
                  <span className="font-medium">{exam.totalQuestions || answers.length || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Passing Marks</span>
                  <span className="font-medium">{exam.passingMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted At</span>
                  <span className="font-medium">
                    {attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : "N/A"}
                  </span>
                </div>
                {attempt.status === "auto_submitted" && (
                  <div className="flex items-center gap-2 text-orange-600 pt-2 border-t">
                    <FaTriangleExclamation />
                    <span>Auto-submitted due to violations</span>
                  </div>
                )}
              </div>
            </div>

            {/* Proctoring Summary */}
            {result.proctoring?.enabled && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaShield /> Proctoring Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Risk Level</span>
                    <span className={`px-3 py-1 rounded-full font-medium ${getRiskColor(result.proctoring?.riskLevel)}`}>
                      {result.proctoring?.riskLevel || "Low"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Risk Score</span>
                    <span className="font-medium">{result.proctoring?.riskScore || 0} points</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Violations</span>
                    <span className="font-medium">{result.proctoring?.totalViolations || 0}</span>
                  </div>
                </div>

                {Array.isArray(result.proctoring?.violations) && result.proctoring.violations.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-600 mb-2">Violation Log:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {result.proctoring.violations.map((v, i) => (
                        <div key={i} className="text-xs text-gray-500 flex items-start gap-2">
                          <FaTriangleExclamation className="text-orange-500 mt-0.5 flex-shrink-0" />
                          <span>{v.eventType || v.type}: {v.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Show Answers Button */}
          {exam.allowReview !== false && (
            <div className="text-center mb-8">
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                <FaEye />
                {showAnswers ? "Hide Answers" : "Review Answers"}
              </button>
            </div>
          )}

          {/* Answers Review */}
          {showAnswers && answers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-800">Answer Review</h3>
              </div>
              <div className="divide-y">
                {answers.map((ans, index) => {
                  const q = ans.question || {};
                  const isCorrect = ans.isCorrect;

                  return (
                    <div key={q._id || index} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCorrect
                                ? "bg-green-100 text-green-600"
                                : ans.selectedOption || ans.textAnswer
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {isCorrect ? <FaCheck /> : (ans.selectedOption || ans.textAnswer) ? <FaXmark /> : index + 1}
                          </span>
                          <div>
                            <p className="text-gray-800 font-medium">{q.questionText}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {q.marks} marks • {q.questionType?.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {ans.marksObtained || 0}/{q.marks}
                        </span>
                      </div>

                      {q.questionType === "mcq" || q.questionType === "true_false" ? (
                        <div className="ml-11 space-y-2">
                          {(q.options || []).map((opt, i) => {
                            // selectedOption can be stored as:
                            // 1. Index (number): 0, 1, 2, 3
                            // 2. Text (string): "Facebook", "True", etc.
                            // 3. ID (string): matching opt._id
                            const selectedOpt = ans.selectedOption;
                            const isStudentChoice = selectedOpt !== null && selectedOpt !== undefined && (
                              selectedOpt === i ||  // Index match
                              selectedOpt === opt.optionText ||  // Text match
                              selectedOpt?.toString() === opt._id?.toString()  // ID match
                            );
                            const isCorrectOption = opt.isCorrect;

                            return (
                              <div
                                key={i}
                                className={`p-3 rounded-lg text-sm ${
                                  isCorrectOption && isStudentChoice
                                    ? "bg-green-50 border-2 border-green-400"
                                    : isCorrectOption
                                    ? "bg-green-50 border border-green-200"
                                    : isStudentChoice
                                    ? "bg-red-50 border border-red-200"
                                    : "bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && <FaCheck className="text-green-600" />}
                                  {isStudentChoice && !isCorrectOption && <FaXmark className="text-red-600" />}
                                  <span className={isStudentChoice ? "font-medium" : ""}>{opt.optionText}</span>
                                  <div className="ml-auto flex items-center gap-2">
                                    {isStudentChoice && (
                                      <span className={`text-xs px-2 py-1 rounded ${isCorrectOption ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        Your answer
                                      </span>
                                    )}
                                    {isCorrectOption && !isStudentChoice && (
                                      <span className="text-xs text-green-600">Correct answer</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="ml-11">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Your Answer:</p>
                            <p className="text-gray-800">
                              {ans.textAnswer || <em className="text-gray-400">Not answered</em>}
                            </p>
                          </div>
                          {q.explanation && (
                            <div className="bg-green-50 p-4 rounded-lg mt-2">
                              <p className="text-sm text-green-600 mb-1">Explanation:</p>
                              <p className="text-gray-800">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ExamResult;
