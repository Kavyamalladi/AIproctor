import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { serverUrl } from "../config/serverUrl";
import {
  setCurrentAttempt,
  setAnswer,
  addViolation,
  setExamActive,
  setProctoringStatus,
  updateRiskScore,
  clearViolations,
} from "../redux/examSlice";
import { FaClock, FaFlag, FaChevronLeft, FaChevronRight, FaVideo, FaTriangleExclamation } from "react-icons/fa6";

// TensorFlow.js for ML-based object detection
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

function TakeExam() {
        // Overlay canvas for drawing detections
        const overlayCanvasRef = useRef(null);
      // Global copy/paste prevention for all elements (including input/textarea)
      useEffect(() => {
        const handleCopy = (e) => {
          e.preventDefault();
          recordViolation && recordViolation('copy_attempt', 'Copy action detected');
          toast && toast.error('Copying is not allowed during the exam!', { autoClose: 2000 });
        };
        const handlePaste = (e) => {
          e.preventDefault();
          recordViolation && recordViolation('paste_attempt', 'Paste action detected');
          toast && toast.error('Pasting is not allowed during the exam!', { autoClose: 2000 });
        };
        document.addEventListener('copy', handleCopy, true);
        document.addEventListener('paste', handlePaste, true);
        return () => {
          document.removeEventListener('copy', handleCopy, true);
          document.removeEventListener('paste', handlePaste, true);
        };
      }, []);
    // Global copy/paste prevention for all elements (including input/textarea)
    useEffect(() => {
      const handleCopy = (e) => {
        e.preventDefault();
        recordViolation && recordViolation('copy_attempt', 'Copy action detected');
        toast && toast.error('Copying is not allowed during the exam!', { autoClose: 2000 });
      };
      const handlePaste = (e) => {
        e.preventDefault();
        recordViolation && recordViolation('paste_attempt', 'Paste action detected');
        toast && toast.error('Pasting is not allowed during the exam!', { autoClose: 2000 });
      };
      document.addEventListener('copy', handleCopy, true);
      document.addEventListener('paste', handlePaste, true);
      return () => {
        document.removeEventListener('copy', handleCopy, true);
        document.removeEventListener('paste', handlePaste, true);
      };
    }, []);
  const { examId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { currentAttempt, answers, isExamActive, proctoringStatus, violations, riskScore } = useSelector(
    (state) => state.exam
  );

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // For mic level visualization
  const [isFullscreen, setIsFullscreen] = useState(false); // Fullscreen state
  const [showAutoSubmitCountdown, setShowAutoSubmitCountdown] = useState(false); // Show countdown before auto-submit
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(3); // Countdown seconds
  const [autoSubmitReason, setAutoSubmitReason] = useState(''); // Reason for auto-submit
  const [localViolationCount, setLocalViolationCount] = useState(0); // Local count for immediate UI updates

  const socketRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const proctoringRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const isExamActiveRef = useRef(false); // Ref to avoid stale closure in intervals
  const violationCountRef = useRef(0); // Local counter for violations (more reliable than Redux state)
  const currentAttemptRef = useRef(null); // Store attempt immediately to avoid async state issues

  // Keep ref in sync with Redux state
  useEffect(() => {
    isExamActiveRef.current = isExamActive;
  }, [isExamActive]);

  // Sync violation count ref with Redux violations (in case of page reload or initial load)
  useEffect(() => {
    if (violations.length > violationCountRef.current) {
      violationCountRef.current = violations.length;
      setLocalViolationCount(violations.length);
      console.log(`📊 Synced violation count from Redux: ${violationCountRef.current}`);
    }
  }, [violations.length]);

  // Initialize exam
  useEffect(() => {
    startExam();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      stopProctoring();
    };
  }, [examId]);

  // Timer - runs when exam is active and time left is > 0
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (timeLeft > 0 && isExamActive) {
      console.log(`⏰ Timer started with ${timeLeft} seconds`);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleAutoSubmit("Time expired");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isExamActive, timeLeft > 0]); // Only restart when status changes or time becomes available

  // Auto-submit countdown effect
  useEffect(() => {
    if (showAutoSubmitCountdown && autoSubmitCountdown > 0) {
      const countdownTimer = setTimeout(() => {
        setAutoSubmitCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(countdownTimer);
    } else if (showAutoSubmitCountdown && autoSubmitCountdown === 0) {
      // Countdown finished, auto-submit and redirect
      performAutoSubmit(autoSubmitReason);
    }
  }, [showAutoSubmitCountdown, autoSubmitCountdown]);

  // Tab switch detection
  useEffect(() => {
    if (!isExamActive || !exam?.proctoring?.tabSwitchDetection) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("tab_switch", "Switched away from exam tab");
      }
    };

    const handleBlur = () => {
      recordViolation("tab_switch", "Window lost focus");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isExamActive, exam]);

  // Fullscreen detection and enforcement
  useEffect(() => {
    if (!isExamActive) return;

    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      if (!isNowFullscreen && exam?.proctoring?.fullscreenRequired) {
        recordViolation("fullscreen_exit", "Exited fullscreen mode");
        toast.warning("⚠️ Fullscreen is required! Click anywhere to resume fullscreen.", { autoClose: false });
      }
    };

    // Check initial fullscreen state
    setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isExamActive, exam]);

  // Attach media stream to video element when it becomes available
  useEffect(() => {
    if (exam?.proctoring?.enabled && mediaStreamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [exam, loading]);

  // Resume audio context on user interaction (browser policy requires this)
  useEffect(() => {
    const resumeAudioContext = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('🎤 Audio context resumed by user interaction');
        }).catch(err => console.error('Failed to resume audio context:', err));
      }
    };
    
    // Add click listener to resume audio
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);
    
    return () => {
      document.removeEventListener('click', resumeAudioContext);
      document.removeEventListener('keydown', resumeAudioContext);
    };
  }, []);

  const startExam = async () => {
      // Reset violation count and local state for new attempt
      violationCountRef.current = 0;
      setLocalViolationCount(0);
      setShowAutoSubmitCountdown(false);
      setAutoSubmitCountdown(3);
      setAutoSubmitReason("");
      // Clear violations in Redux so UI always starts at 0
      dispatch(clearViolations());
    try {
      const res = await axios.post(
        `${serverUrl}/api/exam/${examId}/start`,
        {},
        { withCredentials: true }
      );

      const { attempt, exam: examData } = res.data;
      const examQuestions = examData.questions || [];

      setExam(examData);
      setQuestions(examQuestions);
      setTimeLeft(examData.duration * 60);
      dispatch(setCurrentAttempt(attempt));
      dispatch(setExamActive(true));
      isExamActiveRef.current = true; // Set ref immediately to avoid stale closure
      currentAttemptRef.current = attempt; // Store attempt in ref immediately for recordViolation
      console.log('✅ Exam started! Attempt ID:', attempt._id);

      // Connect socket
      socketRef.current = io(serverUrl);
      socketRef.current.emit("join-exam", {
        attemptId: attempt._id,
        examId: examData._id,
        studentId: userData._id,
      });

      // Initialize proctoring if enabled
      if (examData.proctoring?.enabled) {
        await initializeProctoring(examData);
      }

      setLoading(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start exam");
      navigate("/studentexams");
    }
  };

  const initializeProctoring = async (examData) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: examData.proctoring.audioDetection,
      });

      // Store stream in ref so we can attach it when video element mounts
      mediaStreamRef.current = stream;

      // Try to attach immediately, will also be done in useEffect when video element mounts
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      dispatch(setProctoringStatus({ webcamActive: true, micActive: examData.proctoring.audioDetection }));

      // Load COCO-SSD model for ML-based object detection
      if (!cocoModelRef.current) {
        setModelLoading(true);
        console.log("Loading COCO-SSD model for proctoring...");
        try {
          // Ensure TensorFlow.js is ready
          await tf.ready();
          cocoModelRef.current = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Optimized model - good balance of speed and accuracy
          });
          setModelLoaded(true);
          console.log("COCO-SSD model (lite_mobilenet_v2) loaded successfully");
        } catch (modelError) {
          console.error("Failed to load COCO-SSD model:", modelError);
          toast.warning("Object detection model failed to load - using basic detection");
        }
        setModelLoading(false);
      }

      // Start audio level detection if enabled
      if (examData.proctoring.audioDetection) {
        startAudioDetection(stream);
      }

      // Start proctoring checks (simplified - in production would use ML models)
      proctoringRef.current = setInterval(() => {
        // Heartbeat to server
        if (socketRef.current) {
          socketRef.current.emit("heartbeat", {
            attemptId: currentAttempt?._id,
            timestamp: new Date(),
          });
        }
      }, 5000);

      // Start ML-based detection if enabled
      if (examData.proctoring.faceDetection) {
        startMLDetection();
        startYOLOBackendDetection(); // Also start YOLO backend for more accurate detection
      }

      // Request fullscreen if required
      if (examData.proctoring.fullscreenRequired) {
        requestFullscreen();
      }
    } catch (error) {
      console.error("Proctoring initialization failed:", error);
      toast.error("Camera/microphone access required for proctored exam");
      dispatch(setProctoringStatus({ webcamActive: false, micActive: false }));
    }
  };

  const faceDetectionRef = useRef(null);
  const phoneDetectionRef = useRef(null);
  const yoloDetectionRef = useRef(null); // YOLO backend detection interval
  const yoloAnalysisInProgress = useRef(false); // Prevent overlapping YOLO calls
  const noFaceCountRef = useRef(0);
  const multiFaceCountRef = useRef(0);
  const phoneCountRef = useRef(0);
  const bookCountRef = useRef(0);
  const multiplePeopleCountRef = useRef(0); // Consecutive detections of multiple people
  const canvasRef = useRef(document.createElement('canvas'));
  const lastFaceDetectionRef = useRef({ faces: 1, timestamp: Date.now() });
  
  // Cooldown refs to prevent spam alerts (10 second cooldown)
  const lastPhoneAlertRef = useRef(0);
  const lastMultipleFaceAlertRef = useRef(0);
  const lastBookAlertRef = useRef(0);
  const lastNoFaceAlertRef = useRef(0);
  const ALERT_COOLDOWN = 10000; // 10 seconds between same type alerts
  
  // ML Model refs
  const cocoModelRef = useRef(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Capture screenshot and send to server
  const captureAndSendScreenshot = async (violationType, description) => {
    if (!videoRef.current) return null;
    
    try {
      const attempt = currentAttemptRef.current || currentAttempt;
      if (!attempt?._id || !exam?._id) {
        console.warn('Cannot capture screenshot - missing attempt or exam');
        return null;
      }
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Add timestamp and violation type to screenshot
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, 40);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${violationType.toUpperCase()} - ${new Date().toLocaleString()}`, 10, 27);
      
      // Convert to base64
      const screenshot = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send to server
      await axios.post(
        `${serverUrl}/api/proctoring/screenshot`,
        {
          attemptId: attempt._id,
          examId: exam._id,
          violationType,
          description,
          screenshot,
          timestamp: new Date().toISOString(),
        },
        { withCredentials: true }
      );
      
      return screenshot;
    } catch (error) {
      console.error('Failed to capture/send screenshot:', error);
      return null;
    }
  };

  // ML-based detection using TensorFlow.js COCO-SSD with overlay
  const startMLDetection = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;
    console.log("🚀 Starting ML-based detection... (every 1000ms for faster detection)");
    let frameCount = 0;
    faceDetectionRef.current = setInterval(async () => {
      frameCount++;
      if (!videoRef.current || !isExamActiveRef.current) return;
      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      if (overlayCanvas && overlayCtx) {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
      let personBoxes = [];
      let phoneDetected = false;
      let bookDetected = false;
      
      // Helper function to calculate IoU (Intersection over Union) for bounding box deduplication
      const calculateIoU = (box1, box2) => {
        const x1 = Math.max(box1[0], box2[0]);
        const y1 = Math.max(box1[1], box2[1]);
        const x2 = Math.min(box1[0] + box1[2], box2[0] + box2[2]);
        const y2 = Math.min(box1[1] + box1[3], box2[1] + box2[3]);
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = box1[2] * box1[3];
        const area2 = box2[2] * box2[3];
        const union = area1 + area2 - intersection;
        return union > 0 ? intersection / union : 0;
      };
      if (cocoModelRef.current) {
        try {
          const detectConfig = {
            maxNumBoxes: 10,
            minScore: 0.05 // Lowered to 5% for max sensitivity
          };
          let predictions;
          try {
            predictions = await cocoModelRef.current.detect(video, detectConfig.maxNumBoxes, detectConfig.minScore);
          } catch (videoDetectError) {
            predictions = await cocoModelRef.current.detect(canvas, detectConfig.maxNumBoxes, detectConfig.minScore);
          }
          if (overlayCtx) {
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
          }
          for (const prediction of predictions) {
            const className = prediction.class.toLowerCase();
            const confidence = prediction.score;
            // Draw bounding box and label
            if (overlayCtx) {
              overlayCtx.strokeStyle = className === 'person' ? 'lime' : (className.includes('phone') ? 'red' : (className === 'book' ? 'orange' : 'blue'));
              overlayCtx.lineWidth = 3;
              overlayCtx.strokeRect(...prediction.bbox);
              overlayCtx.font = '18px Arial';
              overlayCtx.fillStyle = overlayCtx.strokeStyle;
              overlayCtx.fillText(`${className} (${Math.round(confidence*100)}%)`, prediction.bbox[0], prediction.bbox[1] - 5);
            }
            // Person detection
            const boxArea = prediction.bbox[2] * prediction.bbox[3];
            const canvasArea = canvas.width * canvas.height;
            const areaRatio = boxArea / canvasArea;
            if (className === 'person' && confidence > 0.40 && areaRatio > 0.01) {
              personBoxes.push({ bbox: prediction.bbox, confidence });
            }
            // Phone detection - improved sensitivity
            const phoneClasses = ['cell phone', 'cellphone', 'phone', 'mobile', 'smartphone', 'remote', 'cell', 'iphone', 'android'];
            const isPhoneClass = phoneClasses.some(pc => className.includes(pc));
            // Lower threshold to 0.5% (0.005) for maximum phone detection
            if (isPhoneClass && confidence > 0.005) {
              phoneDetected = true;
            }
            // Book detection - improved sensitivity
            // Lower threshold to 1% for better book detection
            if (className === 'book' && confidence > 0.01) {
              bookDetected = true;
            }
          }
        } catch (error) {
          console.error('COCO-SSD detection error:', error);
        }
      }
      // Deduplicate persons
      const deduplicatedPersons = [];
      personBoxes.sort((a, b) => b.confidence - a.confidence);
      const isSamePerson = (box1, box2) => {
        const x1Start = box1[0], x1End = box1[0] + box1[2];
        const x2Start = box2[0], x2End = box2[0] + box2[2];
        const y1Start = box1[1], y1End = box1[1] + box1[3];
        const y2Start = box2[1], y2End = box2[1] + box2[3];
        const xOverlapStart = Math.max(x1Start, x2Start);
        const xOverlapEnd = Math.min(x1End, x2End);
        const xOverlap = Math.max(0, xOverlapEnd - xOverlapStart);
        const minWidth = Math.min(box1[2], box2[2]);
        const xOverlapRatio = minWidth > 0 ? xOverlap / minWidth : 0;
        const center1X = box1[0] + box1[2] / 2;
        const center1Y = box1[1] + box1[3] / 2;
        const center2X = box2[0] + box2[2] / 2;
        const center2Y = box2[1] + box2[3] / 2;
        const maxWidth = Math.max(box1[2], box2[2]);
        const maxHeight = Math.max(box1[3], box2[3]);
        const centerDistX = Math.abs(center1X - center2X);
        const centerDistY = Math.abs(center1Y - center2Y);
        const iou = calculateIoU(box1, box2);
        if (iou > 0.10) return true;
        if (xOverlapRatio > 0.50) return true;
        if (centerDistX < maxWidth * 0.60 && centerDistY < maxHeight * 0.60) return true;
        const center1InBox2 = center1X >= x2Start && center1X <= x2End && center1Y >= y2Start && center1Y <= y2End;
        const center2InBox1 = center2X >= x1Start && center2X <= x1End && center2Y >= y1Start && center2Y <= y1End;
        if (center1InBox2 || center2InBox1) return true;
        return false;
      };
      for (const person of personBoxes) {
        let isDuplicate = false;
        for (const existing of deduplicatedPersons) {
          if (isSamePerson(person.bbox, existing.bbox)) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          deduplicatedPersons.push({ ...person });
        }
      }
      const personCount = deduplicatedPersons.length;
      lastFaceDetectionRef.current = { faces: personCount, timestamp: Date.now() };
      // No face/person detected
      if (personCount === 0) {
        noFaceCountRef.current++;
        if (noFaceCountRef.current >= 3) {
          const now = Date.now();
          if (now - lastNoFaceAlertRef.current > ALERT_COOLDOWN) {
            lastNoFaceAlertRef.current = now;
            toast.error("⚠️ Face not visible! Look at the camera.", { autoClose: 4000 });
            recordViolation("no_face_detected", "Face not visible in camera");
            captureAndSendScreenshot('no_face', 'No person visible in camera');
          }
          noFaceCountRef.current = 0;
        }
      } else {
        noFaceCountRef.current = 0;
      }
      // Multiple persons detected
      if (personCount >= 2) {
        multiplePeopleCountRef.current++;
        if (multiplePeopleCountRef.current >= 2) {
          const now = Date.now();
          if (now - lastMultipleFaceAlertRef.current > ALERT_COOLDOWN) {
            lastMultipleFaceAlertRef.current = now;
            toast.error(`👥 ${personCount} PEOPLE DETECTED! Only one person allowed.`, { autoClose: 5000, position: "top-center" });
            recordViolation("multiple_faces", `${personCount} people detected - only one person allowed`);
            captureAndSendScreenshot('multiple_faces', `${personCount} people detected`);
          }
          multiplePeopleCountRef.current = 0;
        }
      } else {
        multiplePeopleCountRef.current = 0;
      }
      // Phone detected - immediate alert without consecutive requirement
      if (phoneDetected) {
        const now = Date.now();
        // Only check cooldown to prevent spam, no consecutive detection needed
        if (now - lastPhoneAlertRef.current > ALERT_COOLDOWN) {
          lastPhoneAlertRef.current = now;
          console.log("📱 PHONE DETECTED! Showing alert and recording violation...");
          toast.error("📱 PHONE DETECTED! Mobile devices not allowed.", { autoClose: 5000, position: "top-center" });
          recordViolation("phone_detected", "Phone or mobile device detected in camera");
          captureAndSendScreenshot('phone_detected', 'Phone/mobile device detected');
        } else {
          console.log("📱 Phone detected but cooldown active, skipping alert...");
        }
      }
      
      // Book detected - immediate alert without consecutive requirement
      if (bookDetected) {
        const now = Date.now();
        // Only check cooldown to prevent spam, no consecutive detection needed
        if (now - lastBookAlertRef.current > ALERT_COOLDOWN) {
          lastBookAlertRef.current = now;
          toast.error("📚 BOOK/MATERIALS DETECTED! Study materials not allowed.", { autoClose: 5000, position: "top-center" });
          recordViolation("book_detected", "Book or reading material detected in camera");
          captureAndSendScreenshot('book_detected', 'Book or reading material detected');
        }
      }
    }, 1000);
  };

  // YOLO Backend Detection - More accurate than browser-based detection
  // Detects: phones, books, looking away, multiple faces, no face
  const startYOLOBackendDetection = () => {
    console.log("🎯 Starting YOLO backend detection... (every 1500ms for better phone/face detection)");
    
    yoloDetectionRef.current = setInterval(async () => {
      const attempt = currentAttemptRef.current || currentAttempt;
      if (!videoRef.current || !isExamActiveRef.current || !attempt?._id) return;
      if (yoloAnalysisInProgress.current) {
        console.log("⏭️ Skipping YOLO analysis - previous call still in progress");
        return;
      }

      try {
        yoloAnalysisInProgress.current = true;

        // Capture frame from video
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;

        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          yoloAnalysisInProgress.current = false;
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        const frameData = canvas.toDataURL('image/jpeg', 0.8);

        // Send to YOLO backend
        const response = await axios.post(
          `${serverUrl}/api/proctoring/analyze-frame`,
          {
            attemptId: attempt._id,
            examId: exam._id,
            image: frameData,
          },
          {
            withCredentials: true,
            timeout: 15000,
          }
        );

        // Process violations from YOLO backend
        if (response.data.violations && response.data.violations.length > 0) {
          const violations = response.data.violations;
          const now = Date.now();

          violations.forEach((violation) => {
            const violationType = violation.type;
            const description = violation.description;
            const confidence = Math.round((violation.confidence || 0) * 100);

            // Map YOLO violation types to descriptive messages
            const violationMessages = {
              phone_detected: `📱 PHONE DETECTED! (${confidence}% confidence)`,
              book_detected: `📚 BOOK/MATERIALS DETECTED! (${confidence}% confidence)`,
              looking_away: `👀 NOT LOOKING AT SCREEN! (${confidence}% confidence)`,
              multiple_faces: `👥 MULTIPLE PEOPLE DETECTED! (${confidence}% confidence)`,
              no_face: `😐 FACE NOT VISIBLE! (${confidence}% confidence)`,
              materials_detected: `📦 STUDY MATERIALS DETECTED! (${confidence}% confidence)`,
              laptop_detected: `💻 EXTRA LAPTOP DETECTED! (${confidence}% confidence)`,
              external_keyboard_detected: `⌨️ EXTERNAL KEYBOARD DETECTED! (${confidence}% confidence)`,
            };

            const message = violationMessages[violationType] || `⚠️ ${description}`;

            // Show toast alert AND call recordViolation for every violation (with cooldown per type)
            const lastAlertKey = `lastYolo_${violationType}`;
            if (!window[lastAlertKey] || now - window[lastAlertKey] > 5000) {
              toast.error(message, {
                position: "top-center",
                autoClose: 4000,
                toastId: violationType, // Prevent duplicate toasts
              });
              // CRITICAL: Call recordViolation to increment counter for EVERY alert shown
              recordViolation(violationType, description);
              window[lastAlertKey] = now;
            }
          });

          // Update risk score display and violation count from backend
          // IMPORTANT: Only update if backend count is HIGHER to avoid race conditions
          // (browser detection increments locally, backend processes async)
          if (response.data.attempt) {
            const backendViolationCount = response.data.attempt.totalViolations;
            const currentLocalCount = violationCountRef.current;
            
            // Only update if backend has processed more violations than we know about locally
            if (backendViolationCount > currentLocalCount) {
              console.log(`🔄 Syncing violation count: local=${currentLocalCount} -> backend=${backendViolationCount}`);
              setLocalViolationCount(backendViolationCount);
              violationCountRef.current = backendViolationCount;
            }
            
            // Always update Redux store with latest risk score
            dispatch(updateRiskScore(response.data.attempt.riskScore));
          }

          // Check for auto-submit
          if (response.data.autoSubmitted) {
            performAutoSubmit("Maximum violations reached via AI detection");
          }
        }

      } catch (error) {
        if (error.response?.data?.error === "YOLO_SERVICE_DOWN") {
          console.warn("⚠️ YOLO service unavailable - using browser detection only");
        } else if (!error.message?.includes("timeout")) {
          console.error("YOLO backend error:", error);
        }
      } finally {
        yoloAnalysisInProgress.current = false;
      }
    }, 1500); // Reduced from 3000ms to 1500ms for faster phone/face detection
  };

  // Detect dark rectangular regions (phone screens) - CONSERVATIVE detection
  // Only triggers when there's a very clear phone-shaped dark rectangle
  const detectDarkRectangle = (imageData, width, height) => {
    const data = imageData.data;
    
    // Use grid-based detection to find phone-shaped dark rectangles
    // A phone appears as a tight cluster of very dark cells with specific aspect ratio
    const gridSize = 12; // 12x12 grid
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);
    
    let darkCells = [];
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let veryDarkPixels = 0;
        let totalPixels = 0;
        
        const startX = gx * cellWidth;
        const startY = gy * cellHeight;
        
        for (let y = startY; y < startY + cellHeight; y += 4) {
          for (let x = startX; x < startX + cellWidth; x += 4) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Very dark pixel (phone screen is usually very dark or black)
            const brightness = (r + g + b) / 3;
            if (brightness < 30) { // Very strict: only very dark pixels
              veryDarkPixels++;
            }
            totalPixels++;
          }
        }
        
        const darkRatio = veryDarkPixels / totalPixels;
        // Cell must be 70% very dark to count (was 80%)
        if (darkRatio > 0.7) {
          darkCells.push({ x: gx, y: gy, ratio: darkRatio });
        }
      }
    }
    
    // Need at least 3 adjacent dark cells to be a phone
    // Check for phone-shaped cluster (vertical or horizontal rectangle)
    if (darkCells.length >= 2 && darkCells.length <= 14) { // More sensitive: 2+ cells, up to 14
      // Check for vertically adjacent cells (phone held vertically)
      for (let i = 0; i < darkCells.length; i++) {
        let verticalCount = 1;
        let horizontalCount = 1;
        
        for (let j = 0; j < darkCells.length; j++) {
          if (i === j) continue;
          
          const dx = Math.abs(darkCells[i].x - darkCells[j].x);
          const dy = Math.abs(darkCells[i].y - darkCells[j].y);
          
          // Vertical alignment (phone shape)
          if (dx === 0 && dy <= 2) verticalCount++;
          // Horizontal alignment
          if (dy === 0 && dx <= 2) horizontalCount++;
        }
        
        // Phone detected if 3+ cells vertically or horizontally aligned
        if (verticalCount >= 3 || horizontalCount >= 3) {
          console.log(`📱 Phone-shaped dark cluster detected: ${darkCells.length} cells, ${verticalCount} vertical, ${horizontalCount} horizontal`);
          return true;
        }
      }
    }
    
    return false;
  };

  // Detect phone-like dark regions at frame EDGES (partial phone entering frame)
  const detectEdgePhone = (imageData, width, height) => {
    const data = imageData.data;
    const edgeWidth = Math.floor(width * 0.12); // 12% of frame width
    const edgeHeight = Math.floor(height * 0.12); // 12% of frame height
    const minPhoneLength = Math.floor(height * 0.15); // Phone needs to be at least 15% of frame height
    
    // Helper function to check if a strip is very dark (phone-like)
    const checkDarkStrip = (startX, startY, stripWidth, stripHeight) => {
      let veryDarkPixels = 0;
      let totalPixels = 0;
      
      for (let y = startY; y < startY + stripHeight && y < height; y += 3) {
        for (let x = startX; x < startX + stripWidth && x < width; x += 3) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          
          if (brightness < 35) veryDarkPixels++;
          totalPixels++;
        }
      }
      
      return totalPixels > 0 ? veryDarkPixels / totalPixels : 0;
    };
    
    // Check LEFT edge for vertical phone strip
    for (let y = 0; y < height - minPhoneLength; y += 20) {
      const darkRatio = checkDarkStrip(0, y, edgeWidth, minPhoneLength);
      if (darkRatio > 0.7) {
        console.log(`📱 Partial phone at LEFT edge (y=${y}): ${(darkRatio*100).toFixed(0)}% dark`);
        return true;
      }
    }
    
    // Check RIGHT edge for vertical phone strip
    for (let y = 0; y < height - minPhoneLength; y += 20) {
      const darkRatio = checkDarkStrip(width - edgeWidth, y, edgeWidth, minPhoneLength);
      if (darkRatio > 0.7) {
        console.log(`📱 Partial phone at RIGHT edge (y=${y}): ${(darkRatio*100).toFixed(0)}% dark`);
        return true;
      }
    }
    
    // Check TOP edge for horizontal phone strip
    const minPhoneWidth = Math.floor(width * 0.15);
    for (let x = 0; x < width - minPhoneWidth; x += 20) {
      const darkRatio = checkDarkStrip(x, 0, minPhoneWidth, edgeHeight);
      if (darkRatio > 0.7) {
        console.log(`📱 Partial phone at TOP edge (x=${x}): ${(darkRatio*100).toFixed(0)}% dark`);
        return true;
      }
    }
    
    // Check BOTTOM edge for horizontal phone strip
    for (let x = 0; x < width - minPhoneWidth; x += 20) {
      const darkRatio = checkDarkStrip(x, height - edgeHeight, minPhoneWidth, edgeHeight);
      if (darkRatio > 0.7) {
        console.log(`📱 Partial phone at BOTTOM edge (x=${x}): ${(darkRatio*100).toFixed(0)}% dark`);
        return true;
      }
    }
    
    return false;
  };

  // Fallback face detection using skin color analysis
  const detectFacesFallback = (imageData, width, height) => {
    const data = imageData.data;
    let skinPixelCount = 0;
    const totalSamples = Math.floor((width * height) / 16); // Sample every 4th pixel in each dimension
    let sampledPixels = 0;
    
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Simple skin color detection
        if (r > 80 && g > 30 && b > 15 && r > g && r > b && (r - Math.min(g, b)) > 10) {
          skinPixelCount++;
        }
        sampledPixels++;
      }
    }
    
    const skinRatio = skinPixelCount / sampledPixels;
    // If significant skin tone detected, assume 1 person
    return skinRatio > 0.1 ? 1 : 0;
  };

  const stopProctoring = () => {
    if (proctoringRef.current) {
      clearInterval(proctoringRef.current);
    }
    if (faceDetectionRef.current) {
      clearInterval(faceDetectionRef.current);
    }
    if (yoloDetectionRef.current) {
      clearInterval(yoloDetectionRef.current);
    }
    if (audioCheckIntervalRef.current) {
      clearInterval(audioCheckIntervalRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
    }
    
    // Stop all tracks from videoRef
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped track: ${track.kind}`);
      });
      videoRef.current.srcObject = null;
    }
    
    // Also stop all tracks from mediaStreamRef to ensure camera/mic are fully released
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🛑 Stopped media track: ${track.kind}`);
      });
      mediaStreamRef.current = null;
    }
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    console.log('✅ Proctoring stopped - All camera/mic access terminated');
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(console.error);
  };

  const recordViolation = async (type, description) => {
    const maxViolations = exam?.proctoring?.maxViolations || 5;
    console.log(`🔍 recordViolation called: type=${type}, violationCountRef=${violationCountRef.current}, showAutoSubmitCountdown=${showAutoSubmitCountdown}`);
    
    // Skip if no attempt yet - use ref to avoid async state issues
    const attempt = currentAttemptRef.current || currentAttempt;
    if (!attempt?._id) {
      console.error("❌ Cannot record violation - no active attempt", { 
        type, 
        description, 
        currentAttemptRef: currentAttemptRef.current, 
        currentAttempt 
      });
      return;
    }

    console.log(`✅ Attempt ID found: ${attempt._id}`);

    // If already at or above max violations, do not process further
    if (violationCountRef.current >= maxViolations || showAutoSubmitCountdown) {
      console.log(`⏹️ Early return: violationCountRef=${violationCountRef.current}, maxViolations=${maxViolations}, showAutoSubmitCountdown=${showAutoSubmitCountdown}`);
      if (!showAutoSubmitCountdown && exam?.proctoring?.autoSubmitOnViolation) {
        triggerAutoSubmitCountdown(`Maximum violations reached (${maxViolations}/${maxViolations})`);
      }
      return;
    }


    // Increment local violation counter and update UI immediately
    console.log(`📈 BEFORE INCREMENT: violationCountRef.current = ${violationCountRef.current}`);
    violationCountRef.current++;
    console.log(`📈 AFTER INCREMENT: violationCountRef.current = ${violationCountRef.current}`);
    const currentViolationCount = violationCountRef.current;
    setLocalViolationCount(currentViolationCount);
    console.log(`📈 setLocalViolationCount called with: ${currentViolationCount}`);
    dispatch(addViolation({ type, description, timestamp: new Date().toISOString() }));
    
    console.log(`⚠️ VIOLATION RECORDED: ${type} | Count: ${currentViolationCount}/${maxViolations}`);

      // If we've hit max violations, trigger the 3-second countdown overlay
      if (exam?.proctoring?.autoSubmitOnViolation && currentViolationCount >= maxViolations) {
        try {
          await axios.post(
            `${serverUrl}/api/proctoring/event`,
            { attemptId: currentAttempt._id, eventType: type, description },
            { withCredentials: true }
          );
          dispatch(addViolation({ type, description, timestamp: new Date().toISOString() }));
        } catch (e) {}
        triggerAutoSubmitCountdown(`Maximum violations reached (${maxViolations}/${maxViolations})`);
        return;
      }

      // Show alert to user with count (only if not auto-submitting)
      toast.warning(`⚠️ Violation ${currentViolationCount}/${maxViolations}: ${description}`, {
        position: "top-center",
        autoClose: 3000,
      });

      try {
        const res = await axios.post(
          `${serverUrl}/api/proctoring/event`,
          {
            attemptId: attempt._id,
            eventType: type,
            description,
          },
          { withCredentials: true }
        );
        dispatch(updateRiskScore(res.data.riskScore));
        if (socketRef.current) {
          socketRef.current.emit("proctoring-violation", {
            attemptId: attempt._id,
            examId: exam._id,
            violation: { type, description },
            riskScore: res.data.riskScore,
          });
        }
        console.log('✅ Violation sent to backend successfully');
        if (res.data.autoSubmitted) {
          performAutoSubmit("Maximum violations exceeded");
          return;
        }
      } catch (error) {
        console.error('❌ Failed to send violation to backend:', error);
      }
  };

  // Audio detection to catch background voices/sounds
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioViolationRef = useRef(0);
  const audioCheckIntervalRef = useRef(null);
  const lastAudioAlertRef = useRef(0);
  const lastVoiceAlertRef = useRef(0);
  const voicePatternHistoryRef = useRef([]);

  const startAudioDetection = (stream) => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // IMPORTANT: Resume audio context (browsers suspend it by default)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('🎤 Audio context resumed successfully');
        });
      }
      console.log('🎤 Audio context state:', audioContextRef.current.state);
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Setup analyser with higher resolution for voice detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; // Higher resolution for better frequency analysis
      analyserRef.current.smoothingTimeConstant = 0.3; // More responsive
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const timeDomainData = new Uint8Array(bufferLength);
      
      // Audio detection thresholds
      const VOICE_THRESHOLD = 8;
      const LOUD_THRESHOLD = 30;
      const MULTIPLE_VOICE_THRESHOLD = 20; // For detecting multiple voices
      
      console.log("🎤 Enhanced audio detection started with voice analysis");
      
      let logCounter = 0;
      let voiceActivityCount = 0;
      
      // Check audio every 50ms for faster response
      audioCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isExamActiveRef.current) return;
        
        // Get frequency data
        analyserRef.current.getByteFrequencyData(dataArray);
        analyserRef.current.getByteTimeDomainData(timeDomainData);
        
        const sampleRate = audioContextRef.current.sampleRate;
        const binSize = sampleRate / analyserRef.current.fftSize;
        
        // Voice frequency ranges (in Hz)
        // Fundamental: 85-255 Hz (male), 165-255 Hz (female), 250-400 Hz (child)
        // First formant: 300-1000 Hz
        // Second formant: 850-2500 Hz
        // Third formant: 2000-3500 Hz
        
        // Calculate bins for voice ranges
        const fundamentalLowBin = Math.floor(80 / binSize);
        const fundamentalHighBin = Math.floor(400 / binSize);
        const formant1LowBin = Math.floor(300 / binSize);
        const formant1HighBin = Math.floor(1000 / binSize);
        const formant2LowBin = Math.floor(850 / binSize);
        const formant2HighBin = Math.floor(2500 / binSize);
        
        // Calculate energy in each voice range
        let fundamentalEnergy = 0;
        let formant1Energy = 0;
        let formant2Energy = 0;
        let totalEnergy = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          totalEnergy += dataArray[i];
          if (i >= fundamentalLowBin && i <= fundamentalHighBin) {
            fundamentalEnergy += dataArray[i];
          }
          if (i >= formant1LowBin && i <= formant1HighBin) {
            formant1Energy += dataArray[i];
          }
          if (i >= formant2LowBin && i <= formant2HighBin) {
            formant2Energy += dataArray[i];
          }
        }
        
        const avgFundamental = fundamentalEnergy / (fundamentalHighBin - fundamentalLowBin);
        const avgFormant1 = formant1Energy / (formant1HighBin - formant1LowBin);
        const avgFormant2 = formant2Energy / (formant2HighBin - formant2LowBin);
        const avgTotal = totalEnergy / bufferLength;
        
        // Calculate peak amplitude
        let maxAmplitude = 0;
        for (let i = 0; i < bufferLength; i++) {
          const amplitude = Math.abs(timeDomainData[i] - 128);
          if (amplitude > maxAmplitude) maxAmplitude = amplitude;
        }
        
        // Update audio level for visualization (normalized 0-100)
        const normalizedLevel = Math.min(100, (maxAmplitude / 128) * 100);
        setAudioLevel(normalizedLevel);
        
        // Detect voice-like patterns (speech has energy in multiple formant ranges)
        const isVoicePattern = avgFundamental > 5 && avgFormant1 > 5 && avgFormant2 > 3;
        
        // Detect multiple voices by looking at:
        // 1. Broad energy distribution (multiple people = more chaotic spectrum)
        // 2. High energy across multiple frequency bands simultaneously
        // 3. Sudden changes in spectral pattern
        
        // Calculate spectral spread (indicates multiple sound sources)
        let spectralVariance = 0;
        for (let i = 0; i < bufferLength; i++) {
          spectralVariance += Math.pow(dataArray[i] - avgTotal, 2);
        }
        spectralVariance = Math.sqrt(spectralVariance / bufferLength);
        
        // Store voice pattern for analysis
        voicePatternHistoryRef.current.push({
          fundamental: avgFundamental,
          formant1: avgFormant1,
          formant2: avgFormant2,
          variance: spectralVariance,
          amplitude: maxAmplitude,
          timestamp: Date.now()
        });
        
        // Keep only last 2 seconds of history (40 samples at 50ms)
        if (voicePatternHistoryRef.current.length > 40) {
          voicePatternHistoryRef.current.shift();
        }
        
        // Analyze pattern history for multiple voices
        let multipleVoicesDetected = false;
        if (voicePatternHistoryRef.current.length >= 10) {
          // Check for overlapping speech patterns
          const recentPatterns = voicePatternHistoryRef.current.slice(-10);
          let voiceFrameCount = 0;
          let highVarianceCount = 0;
          
          for (const pattern of recentPatterns) {
            if (pattern.fundamental > 5 && pattern.formant1 > 5) {
              voiceFrameCount++;
            }
            if (pattern.variance > 15) {
              highVarianceCount++;
            }
          }
          
          // Multiple voices indicator: sustained high variance with voice patterns
          if (voiceFrameCount >= 6 && highVarianceCount >= 4 && avgTotal > MULTIPLE_VOICE_THRESHOLD) {
            multipleVoicesDetected = true;
          }
        }
        
        // Log every 0.5 seconds (10 samples at 50ms)
        logCounter++;
        if (logCounter >= 10) {
          const ctxState = audioContextRef.current?.state || 'unknown';
          console.log(`🔊 Audio [${ctxState}]: Peak=${maxAmplitude}, F0=${avgFundamental.toFixed(1)}, F1=${avgFormant1.toFixed(1)}, Voice=${isVoicePattern}, Total=${avgTotal.toFixed(1)}`);
          logCounter = 0;
        }
        
        // Detect any audio activity - lower thresholds for sensitivity
        const isAudioDetected = isVoicePattern || avgTotal > VOICE_THRESHOLD || maxAmplitude > 15;
        const isLoudAudio = avgTotal > LOUD_THRESHOLD || maxAmplitude > 50;
        
        if (isAudioDetected) {
          voiceActivityCount++;
          audioViolationRef.current++;
          
          if (audioViolationRef.current === 1) {
            console.log(`⚠️ Voice/audio detected! Pattern: ${isVoicePattern}, Amplitude: ${maxAmplitude}`);
          }
        } else {
          voiceActivityCount = Math.max(0, voiceActivityCount - 1);
          audioViolationRef.current = Math.max(0, audioViolationRef.current - 2);
        }
        
        // Alert for multiple voices detected (immediate with cooldown)
        if (multipleVoicesDetected) {
          const now = Date.now();
          if (now - lastVoiceAlertRef.current > ALERT_COOLDOWN) {
            console.log(`🚨🗣️ MULTIPLE VOICES DETECTED!`);
            lastVoiceAlertRef.current = now;
            recordViolation("multiple_voices", "Multiple voices detected - possible conversation");
            captureAndSendScreenshot("multiple_voices", "Multiple voices detected in audio");
            voicePatternHistoryRef.current = []; // Reset history after alert
          }
        }
        
        // Alert for sustained voice/audio (~1 second = 20 frames) with cooldown
        if (audioViolationRef.current >= 20) {
          const now = Date.now();
          if (now - lastAudioAlertRef.current > ALERT_COOLDOWN) {
            const severity = isLoudAudio ? "loud talking/audio" : "voice/speaking detected";
            console.log(`🚨 Audio violation: ${severity}`);
            lastAudioAlertRef.current = now;
            recordViolation("audio_detected", `${severity}`);
            captureAndSendScreenshot("audio_detected", severity);
          }
          audioViolationRef.current = 0;
        }
      }, 50); // Check every 50ms for responsive detection
      
    } catch (error) {
      console.error("Audio detection setup failed:", error);
      toast.warning("Audio detection failed to initialize");
    }
  };

  const handleAnswerChange = async (questionId, answer, optionIndex = null) => {
    dispatch(setAnswer({ questionId, answer }));

    // Save answer to server
    try {
      // For MCQ, send selectedOption as index
      // For text answers, send textAnswer
      const payload = {
        questionId,
      };
      
      if (optionIndex !== null) {
        payload.selectedOption = optionIndex;
      } else {
        payload.textAnswer = answer;
      }
      
      await axios.post(
        `${serverUrl}/api/exam/attempt/${currentAttempt._id}/answer`,
        payload,
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Failed to save answer:", error);
    }
  };

  const toggleFlag = (index) => {
    setFlaggedQuestions((prev) => {
      const newFlags = new Set(prev);
      if (newFlags.has(index)) {
        newFlags.delete(index);
      } else {
        newFlags.add(index);
      }
      return newFlags;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Calculate time spent (total duration - remaining time) in seconds
      const totalDurationSeconds = exam.duration * 60;
      const calculatedTimeSpent = totalDurationSeconds - timeLeft;
      
      const res = await axios.post(
        `${serverUrl}/api/exam/attempt/${currentAttempt._id}/submit`,
        { timeSpent: calculatedTimeSpent },
        { withCredentials: true }
      );

      dispatch(setExamActive(false));
      stopProctoring();

      // Emit submission event
      if (socketRef.current) {
        socketRef.current.emit("exam-submitted", {
          attemptId: currentAttempt._id,
          examId: exam._id,
        });
      }

      toast.success("Exam submitted successfully!");
      navigate(`/examresult/${currentAttempt._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit exam");
      setSubmitting(false);
    }
  };

  // Trigger the auto-submit countdown (shows 3 second warning)
  const triggerAutoSubmitCountdown = (reason) => {
    if (showAutoSubmitCountdown) return; // Already showing
    setAutoSubmitReason(reason);
    setAutoSubmitCountdown(3);
    setShowAutoSubmitCountdown(true);
    toast.error(`⚠️ ${reason} - Exam will be submitted in 3 seconds!`, {
      position: "top-center",
      autoClose: 3000,
    });
  };

  // Perform the actual auto-submit after countdown
  const performAutoSubmit = async (reason) => {
    dispatch(setExamActive(false));
    stopProctoring();

    // Calculate time spent
    const totalDurationSeconds = exam.duration * 60;
    const calculatedTimeSpent = totalDurationSeconds - timeLeft;

    try {
      await axios.post(
        `${serverUrl}/api/exam/attempt/${currentAttempt._id}/submit`,
        { autoSubmit: true, autoSubmitReason: reason, timeSpent: calculatedTimeSpent },
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Auto-submit failed:", error);
    }

    // Redirect to student exams page
    navigate('/studentexams');
  };

  const handleAutoSubmit = async (reason) => {
    toast.warning(`Exam auto-submitted: ${reason}`);
    dispatch(setExamActive(false));
    stopProctoring();

    // Calculate time spent
    const totalDurationSeconds = exam.duration * 60;
    const calculatedTimeSpent = totalDurationSeconds - timeLeft;

    try {
      await axios.post(
        `${serverUrl}/api/exam/attempt/${currentAttempt._id}/submit`,
        { autoSubmit: true, autoSubmitReason: reason, timeSpent: calculatedTimeSpent },
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Auto-submit failed:", error);
    }

    navigate(`/examresult/${currentAttempt._id}`);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions.length > 0 ? questions[currentQuestionIndex] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaTriangleExclamation className="text-5xl text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Questions Available</h2>
          <p className="text-gray-600 mb-4">This exam has no questions yet. Please contact your instructor.</p>
          <button
            onClick={() => navigate("/studentexams")}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }


  // Show red overlay with countdown if auto-submit is in progress or max violations reached
  if (showAutoSubmitCountdown || (exam?.proctoring?.autoSubmitOnViolation && localViolationCount >= (exam?.proctoring?.maxViolations || 5))) {
    // If not already auto-submitting, trigger it immediately
    if (!showAutoSubmitCountdown) {
      triggerAutoSubmitCountdown(`Maximum violations reached (${localViolationCount}/${exam?.proctoring?.maxViolations || 5})`);
    }
    return (
      <div className="fixed inset-0 bg-red-900 bg-opacity-95 z-50 flex flex-col items-center justify-center">
        <div className="text-center">
          <FaTriangleExclamation className="text-6xl text-white mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-4">Exam Auto-Submitting</h2>
          <p className="text-white text-lg mb-6">You have reached the maximum number of violations.<br />Your exam will be submitted in <span className="font-bold text-2xl">{autoSubmitCountdown}</span> second{autoSubmitCountdown !== 1 ? 's' : ''}.</p>
          <div className="w-full flex justify-center">
            <div className="bg-white text-red-900 px-8 py-4 rounded-lg font-bold text-xl animate-pulse">
              Submitting in {autoSubmitCountdown}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{position:'relative', userSelect:'none', WebkitUserSelect:'none', msUserSelect:'none', MozUserSelect:'none', KhtmlUserSelect:'none', OUserSelect:'none'}}>
      {/* Overlay canvas for detection bounding boxes */}
      <canvas ref={overlayCanvasRef} style={{position:'absolute', left:0, top:0, zIndex:20, pointerEvents:'none', width:'100%', height:'100%'}} />
      {/* Fullscreen enforcement overlay */}
      {isExamActive && exam?.proctoring?.fullscreenRequired && !isFullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center cursor-pointer"
          onClick={() => {
            requestFullscreen();
            toast.dismiss();
          }}
        >
          <div className="text-center text-white">
            <div className="text-6xl mb-6">⛶</div>
            <h2 className="text-2xl font-bold mb-4">Fullscreen Required</h2>
            <p className="text-gray-300 mb-6 max-w-md">
              This exam must be taken in fullscreen mode. Click anywhere to enter fullscreen and continue.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                requestFullscreen();
                toast.dismiss();
              }}
              className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Enter Fullscreen
            </button>
            <p className="text-gray-400 text-sm mt-4">
              ⚠️ Exiting fullscreen during the exam will be recorded as a violation
            </p>
          </div>
        </div>
      )}

      {/* Auto-submit countdown overlay */}
      {showAutoSubmitCountdown && (
        <div className="fixed inset-0 bg-red-900 bg-opacity-95 z-[60] flex flex-col items-center justify-center">
          <div className="text-center text-white">
            <div className="text-9xl font-bold mb-4 animate-pulse">
              {autoSubmitCountdown}
            </div>
            <FaTriangleExclamation className="text-6xl text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">⚠️ Maximum Violations Reached</h2>
            <p className="text-xl text-red-200 mb-2">{autoSubmitReason}</p>
            <p className="text-lg text-gray-300">
              Your exam will be automatically submitted in {autoSubmitCountdown === 1 ? '1 second' : `${autoSubmitCountdown} seconds`}...
            </p>
            <div className="mt-8 p-4 bg-red-800 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-red-200">
                You have exceeded the maximum number of allowed violations. 
                Your exam will be submitted and you will be redirected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-gray-800">{exam?.title}</h1>
            <p className="text-sm text-gray-500">{exam?.course?.title}</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Proctoring status */}
            {exam?.proctoring?.enabled && (
              <div className="flex items-center gap-3">
                {/* Camera status */}
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      proctoringStatus.webcamActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-xs text-gray-500">CAM</span>
                </div>
                
                {/* Microphone status */}
                {exam?.proctoring?.audioDetection && (
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        proctoringStatus.micActive ? "bg-green-500 animate-pulse" : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-xs text-gray-500">MIC</span>
                  </div>
                )}
                
                <span className="text-sm text-gray-600">
                  {modelLoading ? "Loading AI..." : proctoringStatus.webcamActive ? "Proctoring Active" : "Camera Off"}
                </span>
                {modelLoaded && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">AI ON</span>
                )}
                {proctoringStatus.micActive && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">🎤 LISTENING</span>
                )}
                {/* Violation counter - always show when auto-submit is enabled */}
                {exam?.proctoring?.autoSubmitOnViolation && (
                  <span className={`text-sm font-semibold flex items-center gap-1 px-2 py-1 rounded ${
                    localViolationCount >= (exam.proctoring.maxViolations - 2) 
                      ? 'bg-red-100 text-red-600' 
                      : localViolationCount > 0 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    <FaTriangleExclamation /> {Math.min(localViolationCount, exam.proctoring.maxViolations)} / {exam.proctoring.maxViolations}
                    {/* Debug count removed for production */}
                  </span>
                )}
                {/* Show warnings count even if auto-submit not enabled */}
                {!exam?.proctoring?.autoSubmitOnViolation && localViolationCount > 0 && (
                  <span className="text-sm text-orange-600 flex items-center gap-1">
                    <FaTriangleExclamation /> {localViolationCount} warnings
                  </span>
                )}
              </div>
            )}

            {/* Timer */}
            <div
              className={`px-4 py-2 rounded-lg font-mono text-lg font-bold flex items-center gap-2 ${
                timeLeft < 300 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-800"
              }`}
            >
              <FaClock />
              {formatTime(timeLeft)}
            </div>

            {/* Submit button */}
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Question Navigation Sidebar */}
        <aside className="w-64 bg-white shadow-sm p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-3">Questions</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, index) => (
              <button
                key={q._id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium text-sm relative ${
                  currentQuestionIndex === index
                    ? "bg-black text-white"
                    : answers[q._id]
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {index + 1}
                {flaggedQuestions.has(index) && (
                  <FaFlag className="absolute -top-1 -right-1 text-orange-500 text-xs" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Answered ({Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>Not Answered ({questions.length - Object.keys(answers).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <FaFlag className="text-orange-500" />
              <span>Flagged ({flaggedQuestions.size})</span>
            </div>
          </div>

          {/* Proctoring camera preview */}
          {exam?.proctoring?.enabled && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Camera Preview</h4>
              <video
                ref={(el) => {
                  videoRef.current = el;
                  // Immediately attach stream when video element mounts
                  if (el && mediaStreamRef.current && !el.srcObject) {
                    el.srcObject = mediaStreamRef.current;
                    el.play().catch(console.error);
                  }
                }}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg bg-black aspect-video"
                style={{ minHeight: '120px' }}
              />
              
              {/* Microphone level indicator */}
              {exam?.proctoring?.audioDetection && proctoringStatus.micActive && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${audioLevel > 10 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      Microphone
                    </span>
                    <span>{audioLevel > 10 ? 'Active' : 'Quiet'}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-100 ${
                        audioLevel > 50 ? 'bg-red-500' : 
                        audioLevel > 25 ? 'bg-yellow-500' : 
                        audioLevel > 10 ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.max(2, audioLevel)}%` }}
                    ></div>
                  </div>
                  {audioLevel > 50 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Audio detected! Keep quiet during exam.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 p-8">
          {currentQuestion && (
            <div className="max-w-3xl mx-auto">
              {/* Question header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{currentQuestion.marks} marks</span>
                  <button
                    onClick={() => toggleFlag(currentQuestionIndex)}
                    className={`flex items-center gap-1 text-sm ${
                      flaggedQuestions.has(currentQuestionIndex)
                        ? "text-orange-600"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <FaFlag />
                    {flaggedQuestions.has(currentQuestionIndex) ? "Flagged" : "Flag"}
                  </button>
                </div>
              </div>

              {/* Question text */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <p className="text-lg text-gray-800 leading-relaxed">{currentQuestion.questionText}</p>
              </div>

              {/* Answer options */}
              <div className="space-y-3">
                {currentQuestion.questionType === "mcq" && (
                  <>
                    {currentQuestion.options?.map((option, index) => {
                      const optionText = typeof option === 'object' && option !== null ? option.optionText : option;
                      return (
                        <label
                          key={option._id || index}
                          className={`block bg-white rounded-xl p-4 cursor-pointer border-2 transition ${
                            answers[currentQuestion._id] === optionText
                              ? "border-black bg-gray-50"
                              : "border-transparent hover:border-gray-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion._id}`}
                            value={optionText}
                            checked={answers[currentQuestion._id] === optionText}
                            onChange={() => handleAnswerChange(currentQuestion._id, optionText, index)}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                answers[currentQuestion._id] === optionText
                                  ? "border-black bg-black"
                                  : "border-gray-300"
                              }`}
                            >
                              {answers[currentQuestion._id] === optionText && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </span>
                            <span className="text-gray-700">{optionText}</span>
                          </div>
                        </label>
                      );
                    })}
                  </>
                )}

                {currentQuestion.questionType === "true_false" && (
                  <>
                    {["True", "False"].map((option, index) => (
                      <label
                        key={option}
                        className={`block bg-white rounded-xl p-4 cursor-pointer border-2 transition ${
                          answers[currentQuestion._id] === option
                            ? "border-black bg-gray-50"
                            : "border-transparent hover:border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion._id}`}
                          value={option}
                          checked={answers[currentQuestion._id] === option}
                          onChange={() => handleAnswerChange(currentQuestion._id, option, index)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              answers[currentQuestion._id] === option
                                ? "border-black bg-black"
                                : "border-gray-300"
                            }`}
                          >
                            {answers[currentQuestion._id] === option && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </span>
                          <span className="text-gray-700">{option}</span>
                        </div>
                      </label>
                    ))}
                  </>
                )}

                {currentQuestion.questionType === "descriptive" && (
                  <textarea
                    value={answers[currentQuestion._id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={8}
                    className="w-full bg-white rounded-xl p-4 border-2 border-gray-200 focus:border-black outline-none resize-none"
                  />
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200"
                >
                  <FaChevronLeft /> Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-black text-white hover:bg-gray-800"
                >
                  Next <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Submit Exam?</h3>
            <p className="text-gray-600 mb-4">
              You have answered {Object.keys(answers).length} out of {questions.length} questions.
            </p>
            {questions.length - Object.keys(answers).length > 0 && (
              <p className="text-orange-600 text-sm mb-4">
                <FaTriangleExclamation className="inline mr-1" />
                {questions.length - Object.keys(answers).length} questions are unanswered.
              </p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Continue Exam
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TakeExam;
