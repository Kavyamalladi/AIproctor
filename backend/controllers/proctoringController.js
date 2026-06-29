import ProctoringEvent from "../models/proctoringEventModel.js";
import ExamAttempt from "../models/examAttemptModel.js";
import Exam from "../models/examModel.js";
import uploadOnCloudinary, { uploadBase64ToCloudinary } from "../configs/cloudinary.js";
import axios from "axios";

// YOLO AI Service endpoint
const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || "http://localhost:5001";

// Analyze frame using YOLO AI service
export const analyzeFrameWithYOLO = async (req, res) => {
  try {
    const { attemptId, examId, image } = req.body;

    if (!attemptId || !image) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Verify attempt belongs to user
    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      // Send frame to YOLO service for analysis
      const yoloResponse = await axios.post(
        `${YOLO_SERVICE_URL}/analyze`,
        {
          image,
          attemptId,
          examId,
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      const analysis = yoloResponse.data;

      // Process violations detected by YOLO
      const processedViolations = [];

      if (analysis.violations && analysis.violations.length > 0) {
        for (const violation of analysis.violations) {
          // Upload screenshot to cloudinary
          const screenshotUrl = await uploadBase64ToCloudinary(image, `proctoring/${examId}`);

          const severity = ProctoringEvent.getSeverity(violation.type);
          const riskPoints = ProctoringEvent.getRiskPoints(violation.type);

          // Create proctoring event
          const event = await ProctoringEvent.create({
            examAttempt: attemptId,
            student: req.userId,
            exam: examId,
            eventType: violation.type,
            severity: violation.severity || severity,
            description: violation.description,
            confidence: violation.confidence,
            detectedObjects: violation.bbox
              ? [
                  {
                    label: violation.type,
                    confidence: violation.confidence,
                  },
                ]
              : [],
            screenshotUrl,
            occurredAt: new Date(),
          });

          // Update attempt
          attempt.violations.push(event._id);
          attempt.totalViolations += 1;

          // Update risk score
          const newRiskScore = Math.min(100, attempt.riskScore + riskPoints);
          attempt.riskScore = newRiskScore;

          if (newRiskScore <= 20) attempt.riskLevel = "low";
          else if (newRiskScore <= 50) attempt.riskLevel = "medium";
          else if (newRiskScore <= 75) attempt.riskLevel = "high";
          else attempt.riskLevel = "critical";

          processedViolations.push({
            _id: event._id,
            type: violation.type,
            severity: violation.severity,
            confidence: violation.confidence,
            description: violation.description,
          });
        }

        await attempt.save();
      }

      // Check auto-submit
      const shouldAutoSubmit =
        attempt.exam.proctoring?.autoSubmitOnViolation &&
        attempt.totalViolations >= (attempt.exam.proctoring?.maxViolations || 5);

      return res.status(200).json({
        message: "Frame analyzed",
        analysis: {
          timestamp: analysis.timestamp,
          status: analysis.status,
          detections: analysis.detections,
        },
        violations: processedViolations,
        attempt: {
          totalViolations: attempt.totalViolations,
          riskScore: attempt.riskScore,
          riskLevel: attempt.riskLevel,
        },
        autoSubmitted: shouldAutoSubmit,
      });
    } catch (yoloError) {
      console.error("YOLO service error:", yoloError.message);

      // If YOLO service is down, return graceful error
      if (yoloError.code === "ECONNREFUSED") {
        return res.status(503).json({
          message: "AI proctoring service is currently unavailable",
          error: "YOLO_SERVICE_DOWN",
        });
      }

      throw yoloError;
    }
  } catch (error) {
    console.error("Analyze frame error:", error);
    return res.status(500).json({ message: `Failed to analyze frame: ${error.message}` });
  }
};

// Save proctoring screenshot (legacy - kept for backward compatibility)
export const saveProctoringScreenshot = async (req, res) => {
  try {
    const { attemptId, examId, violationType, description, screenshot, timestamp } = req.body;

    if (!attemptId || !screenshot) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Verify attempt belongs to user
    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Upload screenshot to cloudinary
    const screenshotUrl = await uploadBase64ToCloudinary(screenshot, `proctoring/${examId}`);
    
    if (!screenshotUrl) {
      console.error("Failed to upload screenshot to cloudinary");
      return res.status(500).json({ message: "Failed to upload screenshot" });
    }

    // Map violation type to event type
    const eventTypeMap = {
      'no_face': 'no_face',
      'multiple_faces': 'multiple_faces',
      'phone_detected': 'phone_detected',
      'audio_detected': 'suspicious_audio',
      'multiple_voices': 'suspicious_audio',
      'tab_switch': 'tab_switch',
      'fullscreen_exit': 'fullscreen_exit',
    };

    const eventType = eventTypeMap[violationType] || 'other';
    const severity = ProctoringEvent.getSeverity(eventType);
    const riskPoints = ProctoringEvent.getRiskPoints(eventType);

    // Create proctoring event with screenshot
    const event = await ProctoringEvent.create({
      examAttempt: attemptId,
      student: req.userId,
      exam: examId,
      eventType,
      severity,
      description: description || `${violationType} detected`,
      screenshotUrl,
      occurredAt: timestamp ? new Date(timestamp) : new Date(),
    });

    // Update attempt
    attempt.violations.push(event._id);
    attempt.totalViolations += 1;
    
    // Update risk score
    const newRiskScore = Math.min(100, attempt.riskScore + riskPoints);
    attempt.riskScore = newRiskScore;

    if (newRiskScore <= 20) attempt.riskLevel = "low";
    else if (newRiskScore <= 50) attempt.riskLevel = "medium";
    else if (newRiskScore <= 75) attempt.riskLevel = "high";
    else attempt.riskLevel = "critical";

    await attempt.save();

    // Check auto-submit
    const shouldAutoSubmit =
      attempt.exam.proctoring?.autoSubmitOnViolation &&
      attempt.totalViolations >= (attempt.exam.proctoring?.maxViolations || 5);

    return res.status(201).json({
      message: "Screenshot saved",
      screenshotUrl,
      event: {
        _id: event._id,
        eventType: event.eventType,
        severity: event.severity,
      },
      attempt: {
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
      },
      autoSubmitted: shouldAutoSubmit,
    });
  } catch (error) {
    console.error("Save proctoring screenshot error:", error);
    return res.status(500).json({ message: `Failed to save screenshot: ${error.message}` });
  }
};

// Record a proctoring violation event
export const recordProctoringEvent = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const {
      eventType,
      description,
      confidence,
      detectedObjects,
      gazeData,
      currentQuestionId,
      duration,
    } = req.body;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status !== "in_progress" && attempt.status !== "started") {
      return res.status(400).json({ message: "Exam is no longer active" });
    }

    // Check if proctoring is enabled for this exam
    if (!attempt.proctoringEnabled) {
      return res.status(400).json({ message: "Proctoring is not enabled for this exam" });
    }

    // Get severity for event type
    const severity = ProctoringEvent.getSeverity(eventType);
    const riskPoints = ProctoringEvent.getRiskPoints(eventType);

    // Create proctoring event
    const event = await ProctoringEvent.create({
      examAttempt: attemptId,
      student: req.userId,
      exam: attempt.exam._id,
      eventType,
      severity,
      description: description || `${eventType.replace(/_/g, " ")} detected`,
      confidence,
      detectedObjects,
      gazeData,
      currentQuestion: currentQuestionId,
      duration,
      occurredAt: new Date(),
    });

    // Update attempt violation count
    attempt.violations.push(event._id);
    attempt.totalViolations += 1;

    // Handle specific event types
    if (eventType === "tab_switch") {
      attempt.tabSwitchCount += 1;
    }

    // Recalculate risk score
    const newRiskScore = Math.min(100, attempt.riskScore + riskPoints);
    attempt.riskScore = newRiskScore;

    if (newRiskScore <= 20) attempt.riskLevel = "low";
    else if (newRiskScore <= 50) attempt.riskLevel = "medium";
    else if (newRiskScore <= 75) attempt.riskLevel = "high";
    else attempt.riskLevel = "critical";

    await attempt.save();

    // Check if auto-submit should be triggered
    const shouldAutoSubmit =
      attempt.exam.proctoring.autoSubmitOnViolation &&
      attempt.totalViolations >= attempt.exam.proctoring.maxViolations;

    return res.status(201).json({
      message: "Proctoring event recorded",
      event: {
        _id: event._id,
        eventType: event.eventType,
        severity: event.severity,
      },
      attempt: {
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
      },
      shouldAutoSubmit,
      autoSubmitReason: shouldAutoSubmit ? "Maximum violations exceeded" : null,
    });
  } catch (error) {
    console.error("Record proctoring event error:", error);
    return res.status(500).json({ message: `Failed to record event: ${error.message}` });
  }
};

// Upload proctoring screenshot
export const uploadProctoringScreenshot = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await ProctoringEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to cloudinary
    const screenshotUrl = await uploadOnCloudinary(req.file.path);
    event.screenshotUrl = screenshotUrl;
    await event.save();

    return res.status(200).json({
      message: "Screenshot uploaded",
      screenshotUrl,
    });
  } catch (error) {
    console.error("Upload screenshot error:", error);
    return res.status(500).json({ message: `Failed to upload screenshot: ${error.message}` });
  }
};

// Record tab switch event
export const recordTabSwitch = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status !== "in_progress" && attempt.status !== "started") {
      return res.status(400).json({ message: "Exam is no longer active" });
    }

    // Check if tab switch detection is enabled
    if (!attempt.exam.proctoring.enabled || !attempt.exam.proctoring.tabSwitchDetection) {
      return res.status(200).json({ message: "Tab switch detection is disabled" });
    }

    // Create tab switch event
    const event = await ProctoringEvent.create({
      examAttempt: attemptId,
      student: req.userId,
      exam: attempt.exam._id,
      eventType: "tab_switch",
      severity: "medium",
      description: "Tab switch detected",
      occurredAt: new Date(),
    });

    // Update attempt
    attempt.violations.push(event._id);
    attempt.totalViolations += 1;
    attempt.tabSwitchCount += 1;

    // Update risk score
    const riskPoints = ProctoringEvent.getRiskPoints("tab_switch");
    attempt.riskScore = Math.min(100, attempt.riskScore + riskPoints);

    if (attempt.riskScore <= 20) attempt.riskLevel = "low";
    else if (attempt.riskScore <= 50) attempt.riskLevel = "medium";
    else if (attempt.riskScore <= 75) attempt.riskLevel = "high";
    else attempt.riskLevel = "critical";

    await attempt.save();

    // Check auto-submit
    const shouldAutoSubmit =
      attempt.exam.proctoring.autoSubmitOnViolation &&
      attempt.totalViolations >= attempt.exam.proctoring.maxViolations;

    return res.status(200).json({
      message: "Tab switch recorded",
      tabSwitchCount: attempt.tabSwitchCount,
      totalViolations: attempt.totalViolations,
      riskScore: attempt.riskScore,
      shouldAutoSubmit,
    });
  } catch (error) {
    console.error("Record tab switch error:", error);
    return res.status(500).json({ message: `Failed to record tab switch: ${error.message}` });
  }
};

// Record fullscreen exit event
export const recordFullscreenExit = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status !== "in_progress" && attempt.status !== "started") {
      return res.status(400).json({ message: "Exam is no longer active" });
    }

    if (!attempt.exam.proctoring.enabled || !attempt.exam.proctoring.screenMonitoring) {
      return res.status(200).json({ message: "Screen monitoring is disabled" });
    }

    const event = await ProctoringEvent.create({
      examAttempt: attemptId,
      student: req.userId,
      exam: attempt.exam._id,
      eventType: "fullscreen_exit",
      severity: "medium",
      description: "Exited fullscreen mode",
      occurredAt: new Date(),
    });

    attempt.violations.push(event._id);
    attempt.totalViolations += 1;

    const riskPoints = ProctoringEvent.getRiskPoints("fullscreen_exit");
    attempt.riskScore = Math.min(100, attempt.riskScore + riskPoints);

    if (attempt.riskScore <= 20) attempt.riskLevel = "low";
    else if (attempt.riskScore <= 50) attempt.riskLevel = "medium";
    else if (attempt.riskScore <= 75) attempt.riskLevel = "high";
    else attempt.riskLevel = "critical";

    await attempt.save();

    return res.status(200).json({
      message: "Fullscreen exit recorded",
      totalViolations: attempt.totalViolations,
      riskScore: attempt.riskScore,
    });
  } catch (error) {
    console.error("Record fullscreen exit error:", error);
    return res.status(500).json({ message: `Failed to record event: ${error.message}` });
  }
};

// Batch record multiple proctoring events
export const recordBatchEvents = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: "Events array is required" });
    }

    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!attempt.proctoringEnabled) {
      return res.status(400).json({ message: "Proctoring is not enabled" });
    }

    const createdEvents = [];
    let totalRiskAdded = 0;
    let tabSwitchAdded = 0;

    for (const e of events) {
      const severity = ProctoringEvent.getSeverity(e.eventType);
      const riskPoints = ProctoringEvent.getRiskPoints(e.eventType);

      const event = await ProctoringEvent.create({
        examAttempt: attemptId,
        student: req.userId,
        exam: attempt.exam._id,
        eventType: e.eventType,
        severity,
        description: e.description || `${e.eventType.replace(/_/g, " ")} detected`,
        confidence: e.confidence,
        detectedObjects: e.detectedObjects,
        gazeData: e.gazeData,
        occurredAt: e.occurredAt || new Date(),
        duration: e.duration,
      });

      createdEvents.push(event);
      attempt.violations.push(event._id);
      totalRiskAdded += riskPoints;

      if (e.eventType === "tab_switch") {
        tabSwitchAdded += 1;
      }
    }

    attempt.totalViolations += events.length;
    attempt.tabSwitchCount += tabSwitchAdded;
    attempt.riskScore = Math.min(100, attempt.riskScore + totalRiskAdded);

    if (attempt.riskScore <= 20) attempt.riskLevel = "low";
    else if (attempt.riskScore <= 50) attempt.riskLevel = "medium";
    else if (attempt.riskScore <= 75) attempt.riskLevel = "high";
    else attempt.riskLevel = "critical";

    await attempt.save();

    const shouldAutoSubmit =
      attempt.exam.proctoring.autoSubmitOnViolation &&
      attempt.totalViolations >= attempt.exam.proctoring.maxViolations;

    return res.status(201).json({
      message: `${createdEvents.length} events recorded`,
      totalViolations: attempt.totalViolations,
      riskScore: attempt.riskScore,
      riskLevel: attempt.riskLevel,
      shouldAutoSubmit,
    });
  } catch (error) {
    console.error("Record batch events error:", error);
    return res.status(500).json({ message: `Failed to record events: ${error.message}` });
  }
};

// Get proctoring status for an attempt
export const getProctoringStatus = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("exam", "proctoring")
      .select("totalViolations riskScore riskLevel tabSwitchCount proctoringEnabled status");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Allow both student and instructor to check status
    return res.status(200).json({
      proctoringEnabled: attempt.proctoringEnabled,
      settings: attempt.exam.proctoring,
      stats: {
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
        tabSwitchCount: attempt.tabSwitchCount,
      },
      status: attempt.status,
    });
  } catch (error) {
    console.error("Get proctoring status error:", error);
    return res.status(500).json({ message: `Failed to get status: ${error.message}` });
  }
};

// Get all proctoring events for an attempt (instructor only)
export const getAttemptEvents = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam", "creator");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Verify instructor
    if (attempt.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const events = await ProctoringEvent.find({ examAttempt: attemptId })
      .sort({ occurredAt: 1 });

    return res.status(200).json(events);
  } catch (error) {
    console.error("Get attempt events error:", error);
    return res.status(500).json({ message: `Failed to get events: ${error.message}` });
  }
};

// Get proctoring summary for instructor dashboard
export const getProctoringDashboard = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all exams created by this instructor
    const exams = await Exam.find({ creator: userId }).select("_id title");
    const examIds = exams.map((e) => e._id);

    // Get all attempts for these exams
    const attempts = await ExamAttempt.find({ exam: { $in: examIds } })
      .populate("student", "name email")
      .populate("exam", "title");

    // Calculate statistics
    const totalAttempts = attempts.length;
    const suspiciousCases = attempts.filter(
      (a) => a.riskLevel === "high" || a.riskLevel === "critical"
    );
    const autoSubmitted = attempts.filter((a) => a.status === "auto_submitted");

    // Get recent violations
    const recentViolations = await ProctoringEvent.find({
      exam: { $in: examIds },
    })
      .populate("student", "name")
      .populate("exam", "title")
      .sort({ createdAt: -1 })
      .limit(20);

    // Risk distribution
    const riskDistribution = {
      low: attempts.filter((a) => a.riskLevel === "low").length,
      medium: attempts.filter((a) => a.riskLevel === "medium").length,
      high: attempts.filter((a) => a.riskLevel === "high").length,
      critical: attempts.filter((a) => a.riskLevel === "critical").length,
    };

    // Violation types distribution
    const violationTypes = await ProctoringEvent.aggregate([
      { $match: { exam: { $in: examIds } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      summary: {
        totalAttempts,
        suspiciousCasesCount: suspiciousCases.length,
        autoSubmittedCount: autoSubmitted.length,
      },
      riskDistribution,
      violationTypes,
      suspiciousCases: suspiciousCases.map((a) => ({
        _id: a._id,
        student: a.student,
        exam: a.exam,
        riskScore: a.riskScore,
        riskLevel: a.riskLevel,
        totalViolations: a.totalViolations,
        status: a.status,
      })),
      recentViolations: recentViolations.map((v) => ({
        _id: v._id,
        eventType: v.eventType,
        severity: v.severity,
        student: v.student,
        exam: v.exam,
        occurredAt: v.occurredAt,
        isReviewed: v.isReviewed,
      })),
    });
  } catch (error) {
    console.error("Get proctoring dashboard error:", error);
    return res.status(500).json({ message: `Failed to get dashboard: ${error.message}` });
  }
};
