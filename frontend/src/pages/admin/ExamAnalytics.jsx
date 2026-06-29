import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong, FaUser, FaTriangleExclamation, FaEye, FaCheck, FaXmark } from "react-icons/fa6";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

function ExamAnalytics() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filter, setFilter] = useState("all"); // all, passed, failed, suspicious

  useEffect(() => {
    fetchAnalytics();
  }, [examId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/exam/${examId}/analytics`, {
        withCredentials: true,
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "bg-green-100 text-green-700";
      case "auto_submitted":
        return "bg-orange-100 text-orange-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "started":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredStudents = analytics?.students.filter((student) => {
    switch (filter) {
      case "passed":
        return student.isPassed;
      case "failed":
        return !student.isPassed && (student.status === "submitted" || student.status === "auto_submitted");
      case "suspicious":
        return student.riskLevel === "high" || student.riskLevel === "critical";
      default:
        return true;
    }
  });

  const COLORS = ["#10B981", "#F59E0B", "#F97316", "#EF4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const riskDistributionData = analytics
    ? [
        { name: "Low", value: analytics.analytics.riskDistribution?.low || 0 },
        { name: "Medium", value: analytics.analytics.riskDistribution?.medium || 0 },
        { name: "High", value: analytics.analytics.riskDistribution?.high || 0 },
        { name: "Critical", value: analytics.analytics.riskDistribution?.critical || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const scoreDistribution = analytics
    ? [
        { range: "0-20", count: filteredStudents.filter((s) => s.percentage <= 20).length },
        { range: "21-40", count: filteredStudents.filter((s) => s.percentage > 20 && s.percentage <= 40).length },
        { range: "41-60", count: filteredStudents.filter((s) => s.percentage > 40 && s.percentage <= 60).length },
        { range: "61-80", count: filteredStudents.filter((s) => s.percentage > 60 && s.percentage <= 80).length },
        { range: "81-100", count: filteredStudents.filter((s) => s.percentage > 80).length },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <FaArrowLeftLong
            className="w-5 h-5 sm:w-6 sm:h-6 cursor-pointer hover:text-gray-600 flex-shrink-0"
            onClick={() => navigate(-1)}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Exam Analytics</h1>
            <p className="text-sm sm:text-base text-gray-600 line-clamp-1">{analytics?.exam?.title}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Total Enrolled</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800">{analytics?.analytics?.totalEnrolled}</p>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Attempted</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{analytics?.analytics?.totalAttempts}</p>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Not Attempted</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-600">{analytics?.analytics?.notAttemptedCount}</p>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Passed</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{analytics?.analytics?.passedCount}</p>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Pass Rate</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{analytics?.analytics?.passRate}%</p>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">Avg Score</p>
            <p className="text-xl sm:text-2xl font-bold text-purple-600">{analytics?.analytics?.averageScore}%</p>
          </div>
        </div>

        {/* Proctoring Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaTriangleExclamation className="text-red-500 w-4 h-4 sm:w-5 sm:h-5" />
              <p className="text-xs sm:text-sm text-red-700 font-medium">Suspicious Cases</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{analytics?.analytics?.suspiciousCasesCount}</p>
            <p className="text-xs sm:text-sm text-red-500 mt-1">High/Critical risk students</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-orange-700 font-medium mb-2">Total Violations</p>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">{analytics?.analytics?.totalViolations}</p>
            <p className="text-xs sm:text-sm text-orange-500 mt-1">Across all attempts</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-yellow-700 font-medium mb-2">Auto-Submitted</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
              {analytics?.students?.filter((s) => s.status === "auto_submitted").length || 0}
            </p>
            <p className="text-xs sm:text-sm text-yellow-500 mt-1">Due to violations</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Score Distribution */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Score Distribution</h3>
            <div className="overflow-x-auto">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#000" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Risk Level Distribution</h3>
            {riskDistributionData.length > 0 ? (
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-500">
                No proctoring data available
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all", label: "All" },
            { key: "passed", label: "Passed" },
            { key: "failed", label: "Failed" },
            { key: "suspicious", label: "Suspicious" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg transition text-xs sm:text-sm ${
                filter === f.key
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Students Table - Mobile & Desktop View */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {filteredStudents?.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No students found matching the filter
              </div>
            ) : (
              filteredStudents?.map((student) => (
                <div key={student._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <img
                        src={student.student?.photoUrl || "/default-avatar.png"}
                        alt={student.student?.name}
                        className="w-10 h-10 rounded-full object-cover bg-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800 truncate">{student.student?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{student.student?.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(student.status)}`}>
                      {student.status?.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-500">Score</p>
                      <p className="font-semibold text-gray-800">{student.score}/{analytics?.exam?.totalMarks}</p>
                      <p className="text-xs text-gray-400">({student.percentage?.toFixed(1)}%)</p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-500">Result</p>
                      {student.status === "submitted" || student.status === "auto_submitted" ? (
                        student.isPassed ? (
                          <p className="font-semibold text-green-600">Passed</p>
                        ) : (
                          <p className="font-semibold text-red-600">Failed</p>
                        )
                      ) : (
                        <p className="text-gray-400">-</p>
                      )}
                    </div>
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="font-semibold text-gray-800">{student.timeSpent ? `${Math.floor(student.timeSpent / 60)}m` : "-"}</p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <p className="text-xs text-gray-500">Risk</p>
                      <span className={`text-xs font-medium px-1 rounded ${getRiskColor(student.riskLevel)}`}>
                        {student.riskLevel}
                      </span>
                    </div>
                  </div>

                  {student.totalViolations > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-600">
                        <strong>{student.totalViolations}</strong> violations detected
                        {student.tabSwitchCount > 0 && ` (${student.tabSwitchCount} tab switches)`}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/examattempt/${student._id}`)}
                      className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      View Details
                    </button>
                    {student.totalViolations > 0 && (
                      <button
                        onClick={() => navigate(`/proctoringreport/${student._id}`)}
                        className="flex-1 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Result</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Time Spent</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Risk</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Violations</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents?.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.student?.photoUrl || "/default-avatar.png"}
                          alt={student.student?.name}
                          className="w-10 h-10 rounded-full object-cover bg-gray-200"
                        />
                        <div>
                          <p className="font-medium text-gray-800">{student.student?.name}</p>
                          <p className="text-sm text-gray-500">{student.student?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
                        {student.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">
                        {student.score}/{analytics?.exam?.totalMarks}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">({student.percentage?.toFixed(1)}%)</span>
                    </td>
                    <td className="px-6 py-4">
                      {student.status === "submitted" || student.status === "auto_submitted" ? (
                        student.isPassed ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <FaCheck /> Passed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <FaXmark /> Failed
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {student.timeSpent ? `${Math.floor(student.timeSpent / 60)}m ${student.timeSpent % 60}s` : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(student.riskLevel)}`}>
                        {student.riskLevel} ({student.riskScore})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${student.totalViolations > 0 ? "text-red-600" : "text-gray-600"}`}>
                          {student.totalViolations}
                        </span>
                        {student.tabSwitchCount > 0 && (
                          <span className="text-xs text-orange-600">({student.tabSwitchCount} tabs)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/examattempt/${student._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {student.totalViolations > 0 && (
                          <button
                            onClick={() => navigate(`/proctoringreport/${student._id}`)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Proctoring Report"
                          >
                            <FaTriangleExclamation />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStudents?.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                No students found matching the filter
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamAnalytics;
