import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import {
  FaArrowLeft,
  FaTrophy,
  FaXmark,
  FaChevronDown,
  FaChevronUp,
  FaCertificate,
  FaRotateRight,
  FaStar,
  FaLightbulb,
  FaCheck
} from "react-icons/fa6";
import { ClipLoader } from "react-spinners";

function CertificationResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [generatingCertificate, setGeneratingCertificate] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/api/certification/result/${sessionId}`,
        { withCredentials: true }
      );
      setResult(response.data);
    } catch (error) {
      console.error("Error fetching result:", error);
      toast.error(error.response?.data?.message || "Failed to fetch result");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCertificate(true);
    try {
      const response = await axios.post(
        `${serverUrl}/api/certification/generate-certificate`,
        { sessionId },
        { withCredentials: true }
      );
      
      toast.success("Certificate generated successfully!");
      
      // Refresh to show certificate
      await fetchResult();
      
      // Download certificate through backend endpoint
      if (response.data.certificate?._id) {
        const link = document.createElement('a');
        link.href = `${serverUrl}/api/certification/download/${response.data.certificate._id}`;
        link.download = `${response.data.certificate.certificateId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error(error.response?.data?.message || "Failed to generate certificate");
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleRetakeInterview = () => {
    navigate(`/certification-pre/${result?.session?.course?._id}`);
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ClipLoader size={40} />
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
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-black hover:underline"
          >
            <FaArrowLeft /> Go Home
          </button>
        </div>
        <Footer />
      </>
    );
  }

  const session = result.session;
  const passed = session.passStatus;
  const percentage = (session.averageScore * 10).toFixed(0);

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header Result Card */}
          <div className={`rounded-2xl p-8 mb-8 text-white ${
            passed 
              ? "bg-gradient-to-r from-green-500 to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-rose-600"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {passed ? "Congratulations!" : "Keep Learning!"}
                </h1>
                <p className="text-lg opacity-90 mb-4">
                  Here is your interview feedback
                </p>
                <p className="opacity-80">{session.course?.title}</p>
              </div>
              <div className="text-center">
                {passed ? (
                  <FaTrophy className="w-16 h-16 mx-auto mb-2" />
                ) : (
                  <FaXmark className="w-16 h-16 mx-auto mb-2" />
                )}
                <p className="text-xl font-bold">{passed ? "PASSED" : "FAILED"}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-8 text-center">
              <div>
                <p className="text-4xl font-bold">{percentage}%</p>
                <p className="text-sm opacity-80">Overall Score</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{session.totalQuestions}</p>
                <p className="text-sm opacity-80">Questions</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{session.courseDifficulty}</p>
                <p className="text-sm opacity-80">Difficulty</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            {passed && !result.hasCertificate && (
              <button
                onClick={handleGenerateCertificate}
                disabled={generatingCertificate}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {generatingCertificate ? (
                  <>
                    <ClipLoader size={16} color="#fff" /> Generating...
                  </>
                ) : (
                  <>
                    <FaCertificate /> Generate Certificate
                  </>
                )}
              </button>
            )}

            {passed && result.hasCertificate && (
              <a
                href={result.certificate?.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <FaCertificate /> Download Certificate
              </a>
            )}

            {!passed && (
              <button
                onClick={handleRetakeInterview}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <FaRotateRight /> Retake Certification Exam
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
            >
              Go Home
            </button>
          </div>

          {/* Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Strengths */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaStar className="text-yellow-500" /> Strengths
              </h3>
              <ul className="space-y-2">
                {session.strengths?.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <FaCheck className="text-green-500 mt-1 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
                {(!session.strengths || session.strengths.length === 0) && (
                  <li className="text-gray-500">No specific strengths identified</li>
                )}
              </ul>
            </div>

            {/* Areas to Improve */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaLightbulb className="text-orange-500" /> Areas to Improve
              </h3>
              <ul className="space-y-2">
                {session.areasToImprove?.map((area, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <FaLightbulb className="text-orange-400 mt-1 flex-shrink-0" />
                    <span>{area}</span>
                  </li>
                ))}
                {(!session.areasToImprove || session.areasToImprove.length === 0) && (
                  <li className="text-gray-500">No specific areas identified</li>
                )}
              </ul>
            </div>
          </div>

          {/* Overall Feedback */}
          {session.overallFeedback && (
            <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Overall Feedback</h3>
              <p className="text-gray-700 leading-relaxed">{session.overallFeedback}</p>
            </div>
          )}

          {/* Questions & Answers */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Interview Questions & Answers
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Click on each question to see details
              </p>
            </div>

            <div className="divide-y">
              {session.questions?.map((q, index) => (
                <div key={index} className="border-b last:border-b-0">
                  {/* Question Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => toggleQuestion(index)}
                  >
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium">
                        {q.question}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-sm px-2 py-1 rounded ${
                          q.score >= 8 ? "bg-green-100 text-green-700" :
                          q.score >= 5 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          Rating: {q.score}/10
                        </span>
                      </div>
                    </div>
                    {expandedQuestions[index] ? (
                      <FaChevronUp className="text-gray-400" />
                    ) : (
                      <FaChevronDown className="text-gray-400" />
                    )}
                  </div>

                  {/* Expanded Content */}
                  {expandedQuestions[index] && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Your Answer */}
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                          Your Answer:
                        </h4>
                        <p className="text-yellow-900 text-sm">
                          {q.answer || "No answer provided"}
                        </p>
                      </div>

                      {/* Correct Answer */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">
                          Correct Answer:
                        </h4>
                        <p className="text-green-900 text-sm">
                          {q.correctAnswer}
                        </p>
                      </div>

                      {/* Feedback */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">
                          Feedback:
                        </h4>
                        <p className="text-blue-900 text-sm">
                          {q.feedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default CertificationResult;
