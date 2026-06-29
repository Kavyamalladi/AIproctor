import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import {
  FaArrowLeftLong,
  FaMicrophone,
  FaVideo,
  FaPlay,
  FaClock,
  FaBook,
  FaGraduationCap,
  FaLayerGroup
} from "react-icons/fa6";
import { ClipLoader } from "react-spinners";

function CertificationPreInstructions() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courseInfo, setCourseInfo] = useState(null);
  const [completionStatus, setCompletionStatus] = useState(null);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [starting, setStarting] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [courseId]);

  // Attach stream to video element when camera is enabled
  useEffect(() => {
    if (permissions.camera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [permissions.camera]);

  const fetchData = async () => {
    try {
      const [completionRes, courseInfoRes] = await Promise.all([
        axios.get(`${serverUrl}/api/certification/completion/${courseId}`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/certification/course-info/${courseId}`, { withCredentials: true })
      ]);
      
      setCompletionStatus(completionRes.data);
      setCourseInfo(courseInfoRes.data);

      // Redirect if already has certificate
      if (completionRes.data.hasCertificate) {
        toast.info("You already have a certificate for this course");
        navigate(`/my-certificates`);
        return;
      }

      // Continue existing session if available
      if (completionRes.data.hasInterviewSession && completionRes.data.interviewSession?.status === "in_progress") {
        toast.info("Continuing your existing interview session");
        navigate(`/certification-interview/${completionRes.data.interviewSession._id}`);
        return;
      }

      // Redirect if interview completed but not passed - show result
      if (completionRes.data.hasInterviewSession && completionRes.data.interviewSession?.status === "completed") {
        navigate(`/certification-result/${completionRes.data.interviewSession._id}`);
        return;
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error.response?.data?.message || "Failed to load certification info");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissions(prev => ({ ...prev, camera: true }));
      toast.success("Camera access granted");
    } catch (error) {
      toast.error("Camera access denied. Please enable camera permissions.");
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissions(prev => ({ ...prev, microphone: true }));
      toast.success("Microphone access granted");
    } catch (error) {
      toast.error("Microphone access denied. Please enable microphone permissions.");
    }
  };

  const canStartInterview = () => {
    return permissions.camera && permissions.microphone && termsAccepted;
  };

  const handleStartInterview = async () => {
    if (!canStartInterview()) {
      toast.error("Please enable camera and microphone, and accept the terms");
      return;
    }

    setStarting(true);
    try {
      // Stop camera preview stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const response = await axios.post(
        `${serverUrl}/api/certification/start-interview`,
        { courseId },
        { withCredentials: true }
      );

      navigate(`/certification-interview/${response.data.session._id}`);
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error(error.response?.data?.message || "Failed to start interview");
      setStarting(false);
    }
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

  if (!completionStatus?.canTakeCertification && !completionStatus?.hasCertificate && !completionStatus?.hasInterviewSession) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 pt-24 pb-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaBook className="w-10 h-10 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Complete the Course First</h2>
              <p className="text-gray-600 mb-4">
                You need to complete at least 90% of the course lectures to take the AI Certification Interview.
              </p>
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-500 mb-2">Your Progress</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {completionStatus?.completedLectures || 0} / {completionStatus?.totalLectures || 0} lectures
                  </span>
                  <span className="text-lg font-semibold text-blue-600">
                    {(completionStatus?.completionPercentage || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${completionStatus?.completionPercentage || 0}%` }}
                  ></div>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                Continue Learning
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 pt-24 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
          >
            <FaArrowLeftLong /> Back to Course
          </button>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Let's Get Started</h1>
          <p className="text-gray-500 mb-8">AI Certification Interview</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Course Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaBook className="text-blue-600" /> Course Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Course Name:</span>
                    <p className="font-semibold text-gray-800">{courseInfo?.courseName}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-500">Course Description:</span>
                    <p className="text-gray-700 text-sm">{courseInfo?.courseDescription || "No description available"}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FaLayerGroup className="text-purple-600" />
                    <span className="text-sm text-gray-500">Difficulty Level:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      courseInfo?.difficulty === "Beginner" ? "bg-green-100 text-green-700" :
                      courseInfo?.difficulty === "Intermediate" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {courseInfo?.difficulty}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FaGraduationCap className="text-indigo-600" />
                    <span className="text-sm text-gray-500">Total Lectures:</span>
                    <span className="font-medium">{courseInfo?.totalLectures}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FaClock className="text-orange-600" />
                    <span className="text-sm text-gray-500">Estimated Interview Time:</span>
                    <span className="font-medium">{courseInfo?.estimatedInterviewTime}</span>
                  </div>
                </div>
              </div>

              {/* Information Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="text-yellow-700 font-semibold mb-2 flex items-center gap-2">
                  💡 Information
                </h3>
                <p className="text-yellow-700 text-sm">
                  Enable Video Web Cam and Microphone to Start your AI Certification Interview. 
                  It has {courseInfo?.difficulty === "Beginner" ? "10" : courseInfo?.difficulty === "Intermediate" ? "15" : "20"} questions 
                  which you can answer and at the end you will get the report on the basis of your answers. 
                  <span className="block mt-2 font-medium">
                    NOTE: You need to score 50% or more to pass and receive your certificate.
                  </span>
                </p>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">
                    I understand that this is an AI-based certification interview. I will answer questions 
                    honestly and to the best of my knowledge. I agree to have my camera and microphone 
                    enabled during the interview.
                  </span>
                </label>
              </div>
            </div>

            {/* Right Panel - Camera/Microphone Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Enable Web Cam and Microphone</h2>
                
                {/* Camera Preview */}
                <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center mb-6 overflow-hidden relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover rounded-lg ${permissions.camera ? 'block' : 'hidden'}`}
                  />
                  {!permissions.camera && (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaVideo className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Camera preview will appear here</p>
                    </div>
                  )}
                </div>

                {/* Permission Buttons */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={requestCameraPermission}
                    disabled={permissions.camera}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                      permissions.camera 
                        ? "bg-green-100 text-green-700 cursor-default" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <FaVideo />
                    {permissions.camera ? "Camera Enabled ✓" : "Enable Camera"}
                  </button>

                  <button
                    onClick={requestMicrophonePermission}
                    disabled={permissions.microphone}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                      permissions.microphone 
                        ? "bg-green-100 text-green-700 cursor-default" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <FaMicrophone />
                    {permissions.microphone ? "Mic Enabled ✓" : "Enable Microphone"}
                  </button>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartInterview}
                  disabled={!canStartInterview() || starting}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                    canStartInterview() && !starting
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {starting ? (
                    <>
                      <ClipLoader size={20} color="#fff" />
                      Starting Interview...
                    </>
                  ) : (
                    <>
                      <FaPlay /> Start Interview
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default CertificationPreInstructions;
