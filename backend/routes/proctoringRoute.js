import express from "express";
import isAuth from "../middlewares/isAuth.js";
import upload from "../middlewares/multer.js";
import {
  recordProctoringEvent,
  uploadProctoringScreenshot,
  saveProctoringScreenshot,
  analyzeFrameWithYOLO,
  recordTabSwitch,
  recordFullscreenExit,
  recordBatchEvents,
  getProctoringStatus,
  getAttemptEvents,
  getProctoringDashboard,
} from "../controllers/proctoringController.js";

const proctoringRouter = express.Router();

// ==================== YOLO AI PROCTORING ====================

// Analyze frame using YOLO AI service (primary endpoint)
proctoringRouter.post("/analyze-frame", isAuth, analyzeFrameWithYOLO);

// ==================== PROCTORING EVENT RECORDING ====================

// Record a proctoring violation event
proctoringRouter.post("/event/:attemptId", isAuth, recordProctoringEvent);

// Save screenshot with base64 data and create violation event (legacy)
proctoringRouter.post("/screenshot", isAuth, saveProctoringScreenshot);

// Upload screenshot for an event
proctoringRouter.post(
  "/event/:eventId/screenshot",
  isAuth,
  upload.single("screenshot"),
  uploadProctoringScreenshot
);

// Record tab switch
proctoringRouter.post("/tab-switch/:attemptId", isAuth, recordTabSwitch);

// Record fullscreen exit
proctoringRouter.post("/fullscreen-exit/:attemptId", isAuth, recordFullscreenExit);

// Record batch events
proctoringRouter.post("/batch/:attemptId", isAuth, recordBatchEvents);

// ==================== PROCTORING STATUS ====================

// Get proctoring status for an attempt
proctoringRouter.get("/status/:attemptId", isAuth, getProctoringStatus);

// Get all events for an attempt (instructor only)
proctoringRouter.get("/events/:attemptId", isAuth, getAttemptEvents);

// ==================== INSTRUCTOR DASHBOARD ====================

// Get proctoring dashboard summary
proctoringRouter.get("/dashboard", isAuth, getProctoringDashboard);

export default proctoringRouter;
