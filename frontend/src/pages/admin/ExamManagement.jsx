import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong, FaPlus, FaTrash, FaPenToSquare, FaEye, FaUsers, FaChartBar } from "react-icons/fa6";
import { MdPublish, MdUnpublished } from "react-icons/md";

function ExamManagement() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { userData } = useSelector((state) => state.user);
  const [exams, setExams] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/exam/course/${courseId}`, {
        withCredentials: true,
      });
      setExams(res.data);
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchExams();
    fetchCourse();
  }, [courseId]);

  // Refetch when returning from edit page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchExams();
      }
    };

    // Also refetch on popstate (browser back/forward)
    const handlePopState = () => {
      fetchExams();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [fetchExams]);

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/course/getcourse/${courseId}`, {
        withCredentials: true,
      });
      setCourse(res.data);
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const handleTogglePublish = async (examId) => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/exam/${examId}/toggle-publish`,
        {},
        { withCredentials: true }
      );
      toast.success(res.data.message);
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update exam");
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;

    try {
      await axios.delete(`${serverUrl}/api/exam/${examId}`, {
        withCredentials: true,
      });
      toast.success("Exam deleted successfully");
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete exam");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <FaArrowLeftLong
            className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer hover:text-gray-600 flex-shrink-0"
            onClick={() => navigate(`/addcourses/${courseId}`)}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 line-clamp-1">Exam Management</h1>
            <p className="text-sm sm:text-base text-gray-600 line-clamp-1">{course?.title}</p>
          </div>
        </div>

        {/* Create Exam Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => navigate(`/createexam/${courseId}`)}
            className="flex items-center gap-2 bg-black text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-800 transition text-sm sm:text-base"
          >
            <FaPlus className="w-4 h-4" /> <span className="hidden sm:inline">Create New Exam</span><span className="sm:hidden">New Exam</span>
          </button>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500 text-lg">No exams created yet</p>
            <p className="text-gray-400 mt-2">Create your first exam to get started</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {exams.map((exam) => (
              <div
                key={exam._id}
                className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 line-clamp-2">{exam.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            exam.isPublished
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {exam.isPublished ? "Published" : "Draft"}
                        </span>
                        <span
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            exam.proctoring?.enabled
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {exam.proctoring?.enabled ? "AI Proctored" : "No Proctoring"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-500 line-clamp-2 mb-3">{exam.description}</p>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-6 text-xs sm:text-sm text-gray-600 mb-3">
                      <span className="whitespace-nowrap">Duration: {exam.duration}m</span>
                      <span className="whitespace-nowrap">Marks: {exam.totalMarks}</span>
                      <span className="whitespace-nowrap">Pass: {exam.passingMarks}</span>
                      <span className="whitespace-nowrap">Q: {exam.questions?.length || 0}</span>
                      <span className="whitespace-nowrap">Attempts: {exam.maxAttempts || 1}</span>
                    </div>

                    {exam.startTime && (
                      <div className="text-xs sm:text-sm text-gray-500 line-clamp-2">
                        <span className="block">
                          Start: {new Date(exam.startTime).toLocaleDateString()}
                        </span>
                        <span className="block">
                          End: {new Date(exam.endTime).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-32">
                    <button
                      onClick={() => navigate(`/editexam/${exam._id}`)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm"
                      title="Edit"
                    >
                      <FaPenToSquare className="w-4 h-4" />
                      <span className="sm:hidden">Edit</span>
                    </button>
                    <button
                      onClick={() => navigate(`/examquestions/${exam._id}`)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                      title="Questions"
                    >
                      <FaEye className="w-4 h-4" />
                      <span className="sm:hidden">Questions</span>
                    </button>
                    <button
                      onClick={() => navigate(`/examanalytics/${exam._id}`)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm"
                      title="Analytics"
                    >
                      <FaChartBar className="w-4 h-4" />
                      <span className="sm:hidden">Analytics</span>
                    </button>
                    <button
                      onClick={() => handleTogglePublish(exam._id)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                        exam.isPublished
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                      title={exam.isPublished ? "Unpublish" : "Publish"}
                    >
                      {exam.isPublished ? <MdUnpublished className="w-4 h-4" /> : <MdPublish className="w-4 h-4" />}
                      <span className="sm:hidden">{exam.isPublished ? "Unpublish" : "Publish"}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam._id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                      title="Delete"
                    >
                      <FaTrash className="w-4 h-4" />
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamManagement;
