import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import {
  FaArrowLeftLong,
  FaTrash,
  FaCheck,
  FaXmark,
  FaClock,
  FaTriangleExclamation,
  FaShield,
  FaEye,
  FaImage,
  FaCircleExclamation,
} from "react-icons/fa6";

function ExamAttemptDetail() {
  const navigate = useNavigate();
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all"); // all, critical, high

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/exam/attempt/${attemptId}/details`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (error) {
      console.error("Error fetching attempt details:", error);
      toast.error(error.response?.data?.message || "Failed to load attempt details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttempt = async () => {
    try {
      setDeleting(true);
      await axios.delete(`${serverUrl}/api/exam/attempt/${attemptId}`, {
        withCredentials: true,
      });
      toast.success("Exam record deleted successfully");
      navigate(-1);
    } catch (error) {
      console.error("Error deleting attempt:", error);
      toast.error(error.response?.data?.message || "Failed to delete exam record");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-100 text-green-700 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "critical":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "low":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "high":
        return "bg-orange-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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

  const formatEventType = (type) => {
    const typeLabels = {
      no_face: "No Face Detected",
      multiple_faces: "Multiple Faces",
      phone_detected: "Phone Detected",
      book_detected: "Book Detected",
      looking_away: "Looking Away",
      suspicious_audio: "Suspicious Audio",
      tab_switch: "Tab Switch",
      screen_change: "Screen Change",
      copy_paste: "Copy/Paste Attempted",
      right_click: "Right Click",
      keyboard_shortcut: "Keyboard Shortcut",
      browser_resize: "Browser Resize",
      fullscreen_exit: "Fullscreen Exit",
      connection_lost: "Connection Lost",
      other: "Other Violation",
    };
    return typeLabels[type] || type;
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  const filteredViolations = data?.allViolations?.filter((v) => {
    if (filterSeverity === "all") return true;
    if (filterSeverity === "critical") return v.severity === "critical";
    if (filterSeverity === "high") return v.severity === "high" || v.severity === "critical";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Attempt not found</p>
      </div>
    );
  }

  const { attempt, exam, course, proctoring, criticalViolations } = data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <FaArrowLeftLong className="text-xl" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Exam Attempt Details</h1>
              <p className="text-gray-600">{exam?.title} - {course?.title}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <FaTrash /> Delete Record
          </button>
        </div>

        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img
                src={attempt.student?.photoUrl || "/default-avatar.png"}
                alt={attempt.student?.name}
                className="w-16 h-16 rounded-full object-cover bg-gray-200"
              />
              <div>
                <h2 className="text-xl font-semibold">{attempt.student?.name}</h2>
                <p className="text-gray-600">{attempt.student?.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(attempt.status)}`}>
                  {attempt.status?.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {attempt.totalMarksObtained}/{exam?.totalMarks}
              </div>
              <div className="text-gray-600">({attempt.percentage?.toFixed(1)}%)</div>
              <div className={`mt-2 flex items-center justify-end gap-2 ${attempt.isPassed ? "text-green-600" : "text-red-600"}`}>
                {attempt.isPassed ? <FaCheck /> : <FaXmark />}
                {attempt.isPassed ? "Passed" : "Failed"}
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <FaClock /> Started At
              </p>
              <p className="font-medium">{formatDate(attempt.startedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed At</p>
              <p className="font-medium">{formatDate(attempt.completedAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time Spent</p>
              <p className="font-medium">
                {attempt.timeSpent ? `${Math.floor(attempt.timeSpent / 60)}m ${attempt.timeSpent % 60}s` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Proctoring Summary Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaShield className="text-blue-600" /> Proctoring Summary
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{proctoring.totalViolations}</div>
              <div className="text-sm text-gray-600">Total Violations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{criticalViolations?.length || 0}</div>
              <div className="text-sm text-gray-600">Critical Violations</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{proctoring.riskScore}</div>
              <div className="text-sm text-gray-600">Risk Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(proctoring.riskLevel)}`}>
                {proctoring.riskLevel?.toUpperCase()} RISK
              </span>
            </div>
          </div>
          {attempt.autoSubmitReason && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <FaCircleExclamation />
              Auto-submitted: {attempt.autoSubmitReason}
            </div>
          )}
        </div>

        {/* Violations Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaTriangleExclamation className="text-orange-500" /> Violation Records
            </h3>
            <div className="flex gap-2">
              {["all", "critical", "high"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    filterSeverity === f
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {f === "all" ? "All" : f === "critical" ? "Critical Only" : "High & Critical"}
                </button>
              ))}
            </div>
          </div>

          {filteredViolations?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaShield className="text-4xl mx-auto mb-3 text-green-500" />
              <p>No violations found for this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredViolations?.map((violation) => (
                <div
                  key={violation._id}
                  className="border rounded-lg overflow-hidden hover:shadow-md transition"
                >
                  {/* Screenshot Preview */}
                  {violation.screenshotUrl ? (
                    <div
                      className="relative h-48 bg-gray-100 cursor-pointer"
                      onClick={() => setSelectedImage(violation.screenshotUrl)}
                    >
                      <img
                        src={violation.screenshotUrl}
                        alt="Violation screenshot"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white">
                        <FaEye />
                      </div>
                      <div className={`absolute top-2 left-2 px-2 py-1 rounded text-white text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                        {violation.severity?.toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                      <FaImage className="text-4xl" />
                    </div>
                  )}

                  {/* Violation Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">
                        {formatEventType(violation.eventType)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {violation.description || "No description"}
                    </p>
                    <div className="text-xs text-gray-500">
                      {formatDate(violation.occurredAt)}
                    </div>
                    {violation.confidence && (
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {(violation.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-600">
              <FaTriangleExclamation /> Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this exam record for{" "}
              <strong>{attempt.student?.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This action will:
            </p>
            <ul className="text-sm text-gray-500 mb-6 list-disc list-inside space-y-1">
              <li>Remove this attempt from exam analytics</li>
              <li>Delete all associated proctoring violations and screenshots</li>
              <li>Remove this exam from the student's history</li>
            </ul>
            <p className="text-sm text-red-600 font-medium mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAttempt}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash /> Delete Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] p-4">
            <img
              src={selectedImage}
              alt="Violation screenshot"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <p className="text-white text-center mt-4 text-sm">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamAttemptDetail;
