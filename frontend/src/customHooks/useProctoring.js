import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { serverUrl } from "../config/serverUrl";

/**
 * YOLO-based AI Proctoring Hook
 * 
 * Features:
 * - Phone detection via YOLO
 * - Multiple faces detection
 * - Book/materials detection  
 * - Face not visible detection
 * - Gaze tracking (looking away)
 * - Tab switching detection
 * - Copy-paste detection
 * - Window focus loss
 * - Right-click detection
 * - Fullscreen exit detection
 */
export const useProctoring = (options) => {
  const {
    attemptId,
    examId,
    enabled = false,
    socket = null,
    onViolation = () => {},
    onRiskUpdate = () => {},
    onAutoSubmit = () => {},
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [violations, setViolations] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("low");
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [yoloConnected, setYoloConnected] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const analysisInProgress = useRef(false);

  // Initialize proctoring
  const initialize = useCallback(async () => {
    if (!enabled) return { success: false, error: "Proctoring not enabled" };

    try {
      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setWebcamActive(true);
      }

      setIsActive(true);
      startYOLODetection();
      setupBrowserMonitoring();

      return { success: true };
    } catch (error) {
      console.error("Proctoring initialization failed:", error);
      return { success: false, error: error.message };
    }
  }, [enabled, attemptId, examId]);

  // Stop proctoring
  const stop = useCallback(() => {
    setIsActive(false);

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    cleanupBrowserMonitoring();
    setWebcamActive(false);
  }, []);

  // Capture frame from video and convert to base64
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  // Send frame to YOLO service via backend
  const analyzeFrameWithYOLO = useCallback(async () => {
    if (analysisInProgress.current || !attemptId) return;

    try {
      analysisInProgress.current = true;

      const frameData = captureFrame();
      if (!frameData) return;

      const response = await axios.post(
        `${serverUrl}/api/proctoring/analyze-frame`,
        {
          attemptId,
          examId,
          image: frameData,
        },
        {
          withCredentials: true,
          timeout: 15000,
        }
      );

      setYoloConnected(true);

      if (response.data.violations && response.data.violations.length > 0) {
        const newViolations = response.data.violations;
        setViolations((prev) => [...prev, ...newViolations]);

        // Trigger callbacks
        newViolations.forEach((v) => onViolation(v));

        if (response.data.attempt) {
          setRiskScore(response.data.attempt.riskScore);
          setRiskLevel(response.data.attempt.riskLevel);
          onRiskUpdate(response.data.attempt);
        }

        if (response.data.autoSubmitted) {
          onAutoSubmit();
        }
      }

      setLastAnalysis(response.data.analysis);
    } catch (error) {
      if (error.response?.data?.error === "YOLO_SERVICE_DOWN") {
        setYoloConnected(false);
        console.warn("YOLO service is down - proctoring temporarily disabled");
      } else {
        console.error("Frame analysis error:", error);
      }
    } finally {
      analysisInProgress.current = false;
    }
  }, [attemptId, examId, captureFrame, onViolation, onRiskUpdate, onAutoSubmit]);

  // Start YOLO detection loop
  const startYOLODetection = useCallback(() => {
    // Analyze frame every 2 seconds (adjustable based on performance)
    detectionIntervalRef.current = setInterval(() => {
      analyzeFrameWithYOLO();
    }, 2000);
  }, [analyzeFrameWithYOLO]);

  // Record browser-based violation
  const recordBrowserViolation = useCallback(
    async (type, description) => {
      try {
        await axios.post(
          `${serverUrl}/api/proctoring/event/${attemptId}`,
          {
            eventType: type,
            description,
          },
          { withCredentials: true }
        );

        const violation = { type, description, timestamp: new Date() };
        setViolations((prev) => [...prev, violation]);
        onViolation(violation);
      } catch (error) {
        console.error("Failed to record violation:", error);
      }
    },
    [attemptId, onViolation]
  );

  // Setup browser activity monitoring
  const setupBrowserMonitoring = useCallback(() => {
    // Tab switch / Window blur detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordBrowserViolation("tab_switch", "Tab switched or window lost focus");
      }
    };

    const handleWindowBlur = () => {
      recordBrowserViolation("screen_change", "Window lost focus");
    };

    // Copy-paste detection
    const handleCopy = (e) => {
      recordBrowserViolation("copy_paste", "Copy operation detected");
    };

    const handlePaste = (e) => {
      e.preventDefault();
      recordBrowserViolation("copy_paste", "Paste operation detected");
    };

    // Right-click detection
    const handleContextMenu = (e) => {
      e.preventDefault();
      recordBrowserViolation("right_click", "Right-click detected");
    };

    // Keyboard shortcuts detection
    const handleKeyDown = (e) => {
      // Detect common cheating shortcuts
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "a", "f", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        recordBrowserViolation(
          "keyboard_shortcut",
          `Keyboard shortcut detected: ${e.key}`
        );
      }

      // Detect Alt+Tab
      if (e.altKey && e.key === "Tab") {
        e.preventDefault();
        recordBrowserViolation("tab_switch", "Alt+Tab detected");
      }
    };

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        recordBrowserViolation("fullscreen_exit", "Exited fullscreen mode");
      }
    };

    // Browser resize detection
    const handleResize = () => {
      recordBrowserViolation("browser_resize", "Browser window resized");
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleResize);

    // Store cleanup function
    window.__proctoringCleanup = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleResize);
    };

    // Request fullscreen
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen request failed:", error);
    }
  }, [recordBrowserViolation]);

  // Cleanup browser monitoring
  const cleanupBrowserMonitoring = useCallback(() => {
    if (window.__proctoringCleanup) {
      window.__proctoringCleanup();
      delete window.__proctoringCleanup;
    }

    // Exit fullscreen
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    } catch (error) {
      console.warn("Exit fullscreen failed:", error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    webcamActive,
    violations,
    riskScore,
    riskLevel,
    lastAnalysis,
    yoloConnected,
    videoRef,
    canvasRef,
    initialize,
    stop,
    captureFrame,
  };
};
