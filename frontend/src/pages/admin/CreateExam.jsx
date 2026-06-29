import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong } from "react-icons/fa6";

function CreateExam() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    examType: "mcq",
    duration: 60,
    totalMarks: 100,
    passingMarks: 40,
    startTime: "",
    endTime: "",
    instructions: "Please read all questions carefully before answering. Ensure you have a stable internet connection.",
    shuffleQuestions: false,
    showResultImmediately: true,
    showProctoringReport: false,
    allowReview: true,
    proctoring: {
      enabled: true,
      faceDetection: true,
      multipleFaceDetection: true,
      phoneDetection: true,
      eyeTracking: true,
      audioDetection: true,
      tabSwitchDetection: true,
      screenMonitoring: true,
      autoSubmitOnViolation: false,
      maxViolations: 5,
    },
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProctoringChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        [name]: checked,
      },
    }));
  };

  const handleMaxViolationsChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      proctoring: {
        ...prev.proctoring,
        maxViolations: parseInt(e.target.value) || 5,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("Please enter exam title");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${serverUrl}/api/exam/create/${courseId}`,
        formData,
        { withCredentials: true }
      );

      toast.success("Exam created successfully!");
      navigate(`/examquestions/${res.data.exam._id}`);
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error(error.response?.data?.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <FaArrowLeftLong
            className="w-6 h-6 cursor-pointer hover:text-gray-600"
            onClick={() => navigate(`/exammanagement/${courseId}`)}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Exam</h1>
            <p className="text-gray-600">{course?.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter exam title"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  rows="3"
                  placeholder="Describe the exam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Type
                </label>
                <select
                  name="examType"
                  value={formData.examType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="mixed">Mixed (MCQ + Descriptive)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  min="5"
                  max="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks
                </label>
                <input
                  type="number"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks
                </label>
                <input
                  type="number"
                  name="passingMarks"
                  value={formData.passingMarks}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  min="0"
                  max={formData.totalMarks}
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Schedule (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Exam Instructions</h2>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              rows="4"
              placeholder="Enter instructions for students"
            />
          </div>

          {/* Exam Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Exam Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded"
                />
                <span>Shuffle questions for each student</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="showResultImmediately"
                  checked={formData.showResultImmediately}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded"
                />
                <span>Show result immediately after submission</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="allowReview"
                  checked={formData.allowReview}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded"
                />
                <span>Allow students to review answers after submission</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="showProctoringReport"
                  checked={formData.showProctoringReport}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded"
                />
                <span>Show proctoring report to students</span>
              </label>
            </div>
          </div>

          {/* AI Proctoring Settings */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">AI Proctoring Settings</h2>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className={formData.proctoring.enabled ? "text-green-600 font-medium" : "text-gray-500"}>
                  {formData.proctoring.enabled ? "Enabled" : "Disabled"}
                </span>
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.proctoring.enabled}
                  onChange={handleProctoringChange}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {formData.proctoring.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="faceDetection"
                      checked={formData.proctoring.faceDetection}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Face Detection</span>
                      <p className="text-sm text-gray-500">Detect if face is visible</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="multipleFaceDetection"
                      checked={formData.proctoring.multipleFaceDetection}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Multiple Face Detection</span>
                      <p className="text-sm text-gray-500">Detect multiple persons</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="phoneDetection"
                      checked={formData.proctoring.phoneDetection}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Phone Detection</span>
                      <p className="text-sm text-gray-500">Detect mobile phone usage</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="eyeTracking"
                      checked={formData.proctoring.eyeTracking}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Eye Tracking</span>
                      <p className="text-sm text-gray-500">Track gaze direction</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="audioDetection"
                      checked={formData.proctoring.audioDetection}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Audio Detection</span>
                      <p className="text-sm text-gray-500">Detect suspicious sounds</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="tabSwitchDetection"
                      checked={formData.proctoring.tabSwitchDetection}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Tab Switch Detection</span>
                      <p className="text-sm text-gray-500">Detect tab/window changes</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="screenMonitoring"
                      checked={formData.proctoring.screenMonitoring}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium">Screen Monitoring</span>
                      <p className="text-sm text-gray-500">Monitor fullscreen mode</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-50 rounded-lg">
                    <input
                      type="checkbox"
                      name="autoSubmitOnViolation"
                      checked={formData.proctoring.autoSubmitOnViolation}
                      onChange={handleProctoringChange}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-medium text-red-700">Auto-Submit on Violations</span>
                      <p className="text-sm text-red-500">Auto-submit when max violations reached</p>
                    </div>
                  </label>
                </div>

                {formData.proctoring.autoSubmitOnViolation && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Violations Before Auto-Submit
                    </label>
                    <input
                      type="number"
                      value={formData.proctoring.maxViolations}
                      onChange={handleMaxViolationsChange}
                      className="w-32 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      min="1"
                      max="20"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/exammanagement/${courseId}`)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Exam & Add Questions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateExam;
