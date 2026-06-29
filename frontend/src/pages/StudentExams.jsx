import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { FaClock, FaCheck, FaBook, FaVideo, FaTriangleExclamation, FaArrowLeft } from "react-icons/fa6";

function StudentExams() {
  const navigate = useNavigate();
  const { courseId } = useParams(); // Get courseId from URL params (if viewing for a specific course)
  const { userData } = useSelector((state) => state.user);
  const [exams, setExams] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available");
  const [courseName, setCourseName] = useState(null);

  useEffect(() => {
    fetchExams();
    fetchHistory();
    if (courseId) {
      fetchCourseName();
    }
  }, [courseId]);

  const fetchCourseName = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/course/getcourse/${courseId}`, {
        withCredentials: true,
      });
      setCourseName(res.data.title);
    } catch (error) {
      console.error("Error fetching course name:", error);
    }
  };

  const fetchExams = async () => {
    try {
      // If courseId is provided, fetch only exams for that course
      const url = courseId
        ? `${serverUrl}/api/exam/student/available/${courseId}`
        : `${serverUrl}/api/exam/student/available`;
      
      const res = await axios.get(url, {
        withCredentials: true,
      });
      setExams(res.data);
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      // If courseId is provided, fetch only history for that course
      const url = courseId
        ? `${serverUrl}/api/exam/student/history/${courseId}`
        : `${serverUrl}/api/exam/student/history`;
      
      const res = await axios.get(url, {
        withCredentials: true,
      });
      setExamHistory(res.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };


  // Always go to permission page if proctoring is enabled, even for Continue Exam
  const handleStartExam = (exam) => {
    if (exam.proctoring?.enabled) {
      navigate(`/exampreinstructions/${exam._id}`);
    } else {
      navigate(`/takeexam/${exam._id}`);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-orange-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 pt-24 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => courseId ? navigate(`/viewcourse/${courseId}`) : navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
          >
            <FaArrowLeft /> {courseId ? "Back to Course" : "Back to Home"}
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            {courseId ? `${courseName || "Course"} - Exams` : "My Exams"}
          </h1>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab("available")}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                activeTab === "available"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Available Exams
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                activeTab === "history"
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Exam History
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : activeTab === "available" ? (
            // Available Exams
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-xl shadow-sm">
                  <FaBook className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No exams available</p>
                  <p className="text-gray-400 mt-2">Check back later or enroll in more courses</p>
                </div>
              ) : (
                exams.map((exam) => (
                    <div
                      key={exam._id}
                      className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition ${!exam.canAttempt ? 'opacity-75' : ''}`}
                    >
                      {/* Course thumbnail */}
                      <div className="h-32 bg-gradient-to-r from-gray-800 to-gray-900 relative">
                        {exam.course?.thumbnail && (
                          <img
                            src={exam.course.thumbnail}
                            alt={exam.course.title}
                            className="w-full h-full object-cover opacity-50"
                          />
                        )}
                        <div className="absolute inset-0 flex flex-col justify-end p-4">
                          <p className="text-white text-sm opacity-75">{exam.course?.title}</p>
                          <h3 className="text-white font-bold text-lg">{exam.title}</h3>
                        </div>
                        {exam.proctoring?.enabled && (
                          <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <FaVideo /> AI Proctored
                          </div>
                        )}
                        {exam.isExpired && (
                          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Expired
                          </div>
                        )}
                        {exam.isNotStartedYet && (
                          <div className="absolute top-3 left-3 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                            Upcoming
                          </div>
                        )}
                        {!exam.canAttempt && !exam.isExpired && !exam.isNotStartedYet && exam.remainingAttempts <= 0 && (
                          <div className="absolute top-3 left-3 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                            No Attempts Left
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {exam.description || "Complete this exam to test your knowledge."}
                        </p>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <FaClock /> {exam.duration} mins
                          </span>
                          <span>{exam.totalMarks} marks</span>
                          <span>Pass: {exam.passingMarks}</span>
                          <span className={exam.remainingAttempts > 0 ? "text-blue-600" : "text-red-600"}>
                            Attempts: {exam.attemptCount || 0}/{exam.maxAttempts || 1}
                          </span>
                        </div>

                        {exam.startTime && (
                          <p className="text-xs text-gray-400 mb-3">
                            Available: {new Date(exam.startTime).toLocaleString()} -{" "}
                            {new Date(exam.endTime).toLocaleString()}
                          </p>
                        )}

                        {exam.canAttempt ? (
                          <button
                            onClick={() => handleStartExam(exam)}
                            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                          >
                            {exam.attemptCount > 0 ? "Retry Exam" : "Start Exam"}
                          </button>
                        ) : exam.canContinue ? (
                          <button
                            onClick={() => handleStartExam(exam)}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                          >
                            Continue Exam
                          </button>
                        ) : (
                          <button
                            disabled
                            className={`w-full py-3 rounded-lg font-medium cursor-not-allowed ${
                              exam.isExpired ? "bg-red-100 text-red-600" : 
                              exam.isNotStartedYet ? "bg-yellow-100 text-yellow-600" :
                              "bg-gray-300 text-gray-500"
                            }`}
                          >
                            {exam.isExpired ? "Exam Expired" : 
                             exam.isNotStartedYet ? "Not Started Yet" :
                             exam.remainingAttempts <= 0 ? "Max Attempts Reached" : "Unavailable"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : (
            // Exam History
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {examHistory.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">No exam attempts yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Exam</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Course</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Score</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Result</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {examHistory.map((attempt) => (
                      <tr key={attempt._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{attempt.exam?.title}</p>
                          {attempt.riskLevel && attempt.riskLevel !== "low" && (
                            <span className={`text-xs ${getRiskColor(attempt.riskLevel)}`}>
                              <FaTriangleExclamation className="inline mr-1" />
                              {attempt.riskLevel} risk
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600">{attempt.course?.title}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {new Date(attempt.startedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {attempt.totalMarksObtained}/{attempt.exam?.totalMarks}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({attempt.percentage?.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {attempt.status === "submitted" || attempt.status === "auto_submitted" ? (
                            attempt.isPassed ? (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <FaCheck /> Passed
                              </span>
                            ) : (
                              <span className="text-red-600 font-medium">Failed</span>
                            )
                          ) : (
                            <span className="text-yellow-600">{attempt.status}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/examresult/${attempt._id}`)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default StudentExams;
