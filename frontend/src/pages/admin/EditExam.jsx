import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong } from "react-icons/fa6";

// Helper function to format date for datetime-local input (in local timezone)
const formatDateTimeLocal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function EditExam() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    duration: 30,
    totalMarks: 100,
    passingMarks: 40,
    startTime: "",
    endTime: "",
    shuffleQuestions: false,
    showResultToStudent: true,
    allowReview: true,
    maxAttempts: 1,
    proctoring: {
      enabled: false,
      faceDetection: false,
      phoneDetection: false,
      eyeTracking: false,
      audioDetection: false,
      tabSwitchDetection: false,
      fullscreenRequired: false,
      autoSubmitOnViolation: false,
      maxViolations: 5,
    },
  });

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/exam/${examId}`, {
        withCredentials: true,
      });
      const exam = res.data;

      setFormData({
        title: exam.title || "",
        description: exam.description || "",
        instructions: exam.instructions || "",
        duration: exam.duration || 30,
        totalMarks: exam.totalMarks || 100,
        passingMarks: exam.passingMarks || 40,
        startTime: formatDateTimeLocal(exam.startTime),
        endTime: formatDateTimeLocal(exam.endTime),
        shuffleQuestions: exam.shuffleQuestions || false,
        showResultToStudent: exam.showResultToStudent !== false,
        allowReview: exam.allowReview !== false,
        maxAttempts: exam.maxAttempts || 1,
        proctoring: {
          enabled: exam.proctoring?.enabled || false,
          faceDetection: exam.proctoring?.faceDetection || false,
          phoneDetection: exam.proctoring?.phoneDetection || false,
          eyeTracking: exam.proctoring?.eyeTracking || false,
          audioDetection: exam.proctoring?.audioDetection || false,
          tabSwitchDetection: exam.proctoring?.tabSwitchDetection || false,
          fullscreenRequired: exam.proctoring?.fullscreenRequired || false,
          autoSubmitOnViolation: exam.proctoring?.autoSubmitOnViolation || false,
          maxViolations: exam.proctoring?.maxViolations || 5,
        },
      });
    } catch (error) {
      toast.error("Failed to load exam details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProctoringChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await axios.put(`${serverUrl}/api/exam/${examId}`, formData, {
        withCredentials: true,
      });
      console.log("Update response:", res.data);
      toast.success("Exam updated successfully!");
      // Navigate back with a new key to trigger refetch
      navigate(-1, { replace: true });
    } catch (error) {
      console.error("Update error:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to update exam");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <FaArrowLeftLong className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Exam</h1>
            <p className="text-gray-500">Update exam settings and configuration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  name="instructions"
                  value={formData.instructions}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter exam instructions for students..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Exam Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Exam Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  name="maxAttempts"
                  value={formData.maxAttempts}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Marks *
                </label>
                <input
                  type="number"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Marks *
                </label>
                <input
                  type="number"
                  name="passingMarks"
                  value={formData.passingMarks}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-gray-700">Shuffle questions for each student</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="showResultToStudent"
                  checked={formData.showResultToStudent}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-gray-700">Show results to students after submission</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowReview"
                  checked={formData.allowReview}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-gray-700">Allow students to review answers</span>
              </label>
            </div>
          </div>

          {/* Proctoring Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">AI Proctoring</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.proctoring.enabled}
                  onChange={handleProctoringChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-gray-700 font-medium">Enable Proctoring</span>
              </label>
            </div>

            {formData.proctoring.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="faceDetection"
                      checked={formData.proctoring.faceDetection}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Face Detection</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="phoneDetection"
                      checked={formData.proctoring.phoneDetection}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Phone Detection</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="eyeTracking"
                      checked={formData.proctoring.eyeTracking}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Eye Tracking</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="audioDetection"
                      checked={formData.proctoring.audioDetection}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Audio Detection</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="tabSwitchDetection"
                      checked={formData.proctoring.tabSwitchDetection}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Tab Switch Detection</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      name="fullscreenRequired"
                      checked={formData.proctoring.fullscreenRequired}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Fullscreen Required</span>
                  </label>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="autoSubmitOnViolation"
                      checked={formData.proctoring.autoSubmitOnViolation}
                      onChange={handleProctoringChange}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-700">Auto-submit on max violations</span>
                  </label>

                  {formData.proctoring.autoSubmitOnViolation && (
                    <div className="ml-7">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Violations Before Auto-Submit
                      </label>
                      <input
                        type="number"
                        name="maxViolations"
                        value={formData.proctoring.maxViolations}
                        onChange={handleProctoringChange}
                        min="1"
                        max="20"
                        className="w-32 px-4 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditExam;
