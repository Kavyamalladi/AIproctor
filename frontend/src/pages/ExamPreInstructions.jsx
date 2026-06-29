import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../config/serverUrl";
import Nav from "../components/Nav";
import {
  FaVideo,
  FaMicrophone,
  FaExpand,
  FaEye,
  FaMobileScreen,
  FaVolumeHigh,
  FaCheck,
  FaTriangleExclamation,
  FaArrowLeftLong,
} from "react-icons/fa6";

function ExamPreInstructions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    fullscreen: false,
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checking, setChecking] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetchExamDetails();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [examId]);

  // Removed automatic permission prompts; user must click buttons to enable permissions

  const fetchExamDetails = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/exam/${examId}`, {
        withCredentials: true,
      });
      setExam(res.data);
    } catch (error) {
      toast.error("Failed to load exam details");
      navigate("/studentexams");
    } finally {
      setLoading(false);
    }
  };

  const checkCameraPermission = async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setPermissions((prev) => ({ ...prev, camera: true }));
      toast.success("Camera access granted");
    } catch (error) {
      toast.error("Camera access denied. Please enable camera permissions.");
      setPermissions((prev) => ({ ...prev, camera: false }));
    }
    setChecking(false);
  };

  // Effect to attach stream to video element when camera permission is granted
  useEffect(() => {
    if (permissions.camera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.log("Video play error:", err));
    }
  }, [permissions.camera]);

  const checkMicrophonePermission = async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissions((prev) => ({ ...prev, microphone: true }));
      toast.success("Microphone access granted");
    } catch (error) {
      toast.error("Microphone access denied. Please enable microphone permissions.");
      setPermissions((prev) => ({ ...prev, microphone: false }));
    }
    setChecking(false);
  };

  const checkFullscreenPermission = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setPermissions((prev) => ({ ...prev, fullscreen: true }));
      toast.success("Fullscreen mode enabled");
      // Exit fullscreen after check
      setTimeout(() => {
        document.exitFullscreen?.();
      }, 1000);
    } catch (error) {
      toast.error("Fullscreen not supported or blocked");
    }
  };

  const canStartExam = () => {
    const proctoring = exam?.proctoring;
    if (!proctoring?.enabled) return termsAccepted;

    const cameraRequired = proctoring.faceDetection || proctoring.phoneDetection || proctoring.eyeTracking;
    const micRequired = proctoring.audioDetection;
    const fullscreenRequired = proctoring.fullscreenRequired;

    return (
      termsAccepted &&
      (!cameraRequired || permissions.camera) &&
      (!micRequired || permissions.microphone) &&
      (!fullscreenRequired || permissions.fullscreen)
    );
  };

  const handleStartExam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate(`/takeexam/${examId}`);
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </>
    );
  }

  const proctoring = exam?.proctoring;

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto mt-12">
          {/* Back Arrow */}
          <button
            className="mb-4 flex items-center gap-2 text-gray-700 hover:text-black text-lg font-medium"
            onClick={() => navigate(-1)}
            aria-label="Go Back"
          >
            <FaArrowLeftLong className="w-5 h-5" /> Back
          </button>
          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{exam?.title}</h1>
            <p className="text-gray-500">{exam?.course?.title}</p>
            <div className="flex gap-6 mt-4 text-sm text-gray-600">
              <span>Duration: {exam?.duration} minutes</span>
              <span>Total Marks: {exam?.totalMarks}</span>
              <span>Passing: {exam?.passingMarks}</span>
            </div>
          </div>

          {/* Proctoring Notice */}
          {proctoring?.enabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FaVideo /> AI Proctoring Enabled
              </h2>
              <p className="text-blue-700 text-sm mb-4">
                This exam uses AI-based proctoring to ensure academic integrity. The following
                monitoring features are active:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {proctoring.faceDetection && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaEye /> Face Detection
                  </div>
                )}
                {proctoring.phoneDetection && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaMobileScreen /> Phone Detection
                  </div>
                )}
                {proctoring.eyeTracking && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaEye /> Eye Tracking
                  </div>
                )}
                {proctoring.audioDetection && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaVolumeHigh /> Audio Detection
                  </div>
                )}
                {proctoring.tabSwitchDetection && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaTriangleExclamation /> Tab Switch Detection
                  </div>
                )}
                {proctoring.fullscreenRequired && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <FaExpand /> Fullscreen Required
                  </div>
                )}
              </div>
              {proctoring.autoSubmitOnViolation && (
                <p className="text-orange-600 text-sm mt-4 flex items-center gap-2">
                  <FaTriangleExclamation />
                  Exam will auto-submit after {proctoring.maxViolations || 5} violations.
                </p>
              )}
            </div>
          )}

          {/* Permission Checks */}
          {proctoring?.enabled && (
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Permission Checks</h2>
              <p className="text-gray-600 text-sm mb-6">
                Please grant the following permissions before starting the exam:
              </p>

              <div className="space-y-4">
                {/* Camera Check */}
                {(proctoring.faceDetection || proctoring.phoneDetection || proctoring.eyeTracking) && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaVideo className="text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">Camera Access</p>
                        <p className="text-sm text-gray-500">Required for face and phone detection</p>
                      </div>
                    </div>
                    {permissions.camera ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <FaCheck /> Granted
                      </span>
                    ) : (
                      <button
                        onClick={checkCameraPermission}
                        disabled={checking}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        Allow Camera
                      </button>
                    )}
                  </div>
                )}

                {/* Microphone Check */}
                {proctoring.audioDetection && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaMicrophone className="text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">Microphone Access</p>
                        <p className="text-sm text-gray-500">Required for audio detection</p>
                      </div>
                    </div>
                    {permissions.microphone ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <FaCheck /> Granted
                      </span>
                    ) : (
                      <button
                        onClick={checkMicrophonePermission}
                        disabled={checking}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        Allow Microphone
                      </button>
                    )}
                  </div>
                )}

                {/* Fullscreen Check */}
                {proctoring.fullscreenRequired && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FaExpand className="text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">Fullscreen Mode</p>
                        <p className="text-sm text-gray-500">Exam will run in fullscreen</p>
                      </div>
                    </div>
                    {permissions.fullscreen ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <FaCheck /> Verified
                      </span>
                    ) : (
                      <button
                        onClick={checkFullscreenPermission}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                      >
                        Test Fullscreen
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Preview */}
              {permissions.camera && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-2">Camera Preview:</p>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-48 h-36 rounded-lg bg-black object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Exam Instructions</h2>
            {exam?.instructions ? (
              <div className="prose prose-sm max-w-none text-gray-600">
                <p style={{ whiteSpace: "pre-line" }}>{exam.instructions}</p>
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Read each question carefully before answering.</li>
                <li>• You can navigate between questions using the question palette.</li>
                <li>• You can flag questions for review.</li>
                <li>• Once submitted, you cannot change your answers.</li>
                <li>• Ensure stable internet connection throughout the exam.</li>
                {proctoring?.enabled && (
                  <>
                    <li className="text-orange-600">
                      • Do not switch tabs or minimize the browser window.
                    </li>
                    <li className="text-orange-600">
                      • Keep your face visible in the camera at all times.
                    </li>
                    <li className="text-orange-600">
                      • No phones or other devices allowed in the camera view.
                    </li>
                  </>
                )}
              </ul>
            )}
          </div>

          {/* Terms Acceptance */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">
                I have read and understood the exam instructions. I agree to abide by the exam rules
                and understand that any violation may result in automatic submission or
                disqualification.
              </span>
            </label>
          </div>

          {/* Start Button */}
          <div className="flex justify-center">
            <button
              onClick={handleStartExam}
              disabled={!canStartExam()}
              className="px-8 py-4 bg-black text-white text-lg font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Exam
            </button>
          </div>

          {!canStartExam() && termsAccepted && proctoring?.enabled && (
            <p className="text-center text-orange-600 text-sm mt-4">
              Please grant all required permissions before starting the exam.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default ExamPreInstructions;
