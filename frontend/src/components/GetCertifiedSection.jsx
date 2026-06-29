import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../config/serverUrl";
import {
  FaCertificate,
  FaTrophy,
  FaArrowRight,
  FaDownload,
  FaCircleCheck
} from "react-icons/fa6";
import { ClipLoader } from "react-spinners";

function GetCertifiedSection({ courseId, userId, refreshTrigger }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState(null);

  useEffect(() => {
    if (courseId && userId) {
      fetchCompletionStatus(completionData === null);
    }
  }, [courseId, userId, refreshTrigger]);

  const fetchCompletionStatus = async (showLoader = true) => {
    // Only show loading on initial load, not on refreshes
    if (showLoader) setLoading(true);
    try {
      const response = await axios.get(
        `${serverUrl}/api/certification/completion/${courseId}`,
        { withCredentials: true }
      );
      setCompletionData(response.data);
    } catch (error) {
      console.error("Error checking completion status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mt-6">
        <div className="flex items-center justify-center py-4">
          <ClipLoader size={24} color="#3B82F6" />
        </div>
      </div>
    );
  }

  // Don't show if user hasn't completed the course
  if (!completionData?.isCompleted && !completionData?.hasCertificate && !completionData?.hasInterviewSession) {
    // Show progress indicator
    return (
      <div className="bg-gray-50 rounded-xl p-6 border mt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <FaCertificate className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">Get Certified</h3>
            <p className="text-gray-500 text-sm mt-1">
              Complete at least 90% of the course to unlock AI Certification Interview
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Progress</span>
                <span>{(completionData?.completionPercentage || 0).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionData?.completionPercentage || 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {completionData?.completedLectures || 0} / {completionData?.totalLectures || 0} lectures completed
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User already has a certificate
  if (completionData?.hasCertificate) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <FaTrophy className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-green-800">Certified!</h3>
              <FaCircleCheck className="text-green-600" />
            </div>
            <p className="text-green-700 text-sm mt-1">
              You have successfully completed the AI Certification Interview for this course.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <a
                href={completionData.certificate?.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <FaDownload /> Download Certificate
              </a>
              <button
                onClick={() => navigate("/my-certificates")}
                className="flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 text-sm font-medium"
              >
                View All Certificates
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User has an in-progress or completed interview session (without certificate)
  if (completionData?.hasInterviewSession) {
    const session = completionData.interviewSession;
    
    if (session.status === "in_progress") {
      return (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200 mt-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
              <FaCertificate className="w-7 h-7 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800">Continue Your Interview</h3>
              <p className="text-yellow-700 text-sm mt-1">
                You have an interview in progress. Continue where you left off.
              </p>
              <button
                onClick={() => navigate(`/certification-interview/${session._id}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium mt-4"
              >
                Continue Interview <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Completed but failed - allow retake
    if (session.status === "completed" && !session.passStatus) {
      return (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-6 border border-red-200 mt-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
              <FaCertificate className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Retake Available</h3>
              <p className="text-red-700 text-sm mt-1">
                You scored {(session.averageScore * 10).toFixed(0)}% in your last attempt. 
                You need 50% to pass. Try again!
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => navigate(`/certification-pre/${courseId}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Retake Certification Exam <FaArrowRight />
                </button>
                <button
                  onClick={() => navigate(`/certification-result/${session._id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                  View Previous Result
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Course completed, can take certification
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mt-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
          <FaCertificate className="w-7 h-7 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
            🎉 Get Certified
          </h3>
          <p className="text-blue-700 text-sm mt-1">
            You have completed this course. Take the AI Certification Interview to get your certificate!
          </p>
          <ul className="text-blue-600 text-sm mt-3 space-y-1">
            <li>• AI-powered interview questions based on course content</li>
            <li>• Get instant feedback and scoring</li>
            <li>• Earn a downloadable certificate upon passing</li>
          </ul>
          <button
            onClick={() => navigate(`/certification-pre/${courseId}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium mt-4"
          >
            Take Certification Exam <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GetCertifiedSection;
