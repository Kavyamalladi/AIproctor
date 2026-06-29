import mongoose from "mongoose";

const proctoringEventSchema = new mongoose.Schema(
  {
    examAttempt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "no_face",
        "multiple_faces",
        "phone_detected",
        "book_detected",
        "looking_away",
        "suspicious_audio",
        "tab_switch",
        "screen_change",
        "copy_paste",
        "right_click",
        "keyboard_shortcut",
        "browser_resize",
        "fullscreen_exit",
        "connection_lost",
        "laptop_detected",
        "external_keyboard_detected",
        "external_mouse_detected",
        "materials_detected",
        "screen_detected",
        "drink_detected",
        "remote_detected",
        "other",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    description: {
      type: String,
    },
    // Detection confidence (0-1)
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    // Detected objects in frame
    detectedObjects: [
      {
        label: String,
        confidence: Number,
      },
    ],
    // Screenshot/image of the violation
    screenshotUrl: {
      type: String,
    },
    // Audio recording URL
    audioUrl: {
      type: String,
    },
    // Timestamp when violation occurred
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    // Duration of violation (e.g., how long face was missing)
    duration: {
      type: Number, // in seconds
    },
    // Gaze tracking data
    gazeData: {
      direction: {
        type: String,
        enum: ["left", "right", "up", "down", "center"],
      },
      deviation: Number, // How far from center
    },
    // Question being answered when violation occurred
    currentQuestion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
    // Was this reviewed by instructor
    isReviewed: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
    },
    // Was this a false positive
    isFalsePositive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
proctoringEventSchema.index({ examAttempt: 1, occurredAt: 1 });
proctoringEventSchema.index({ student: 1, exam: 1 });
proctoringEventSchema.index({ eventType: 1 });
proctoringEventSchema.index({ severity: 1 });

// Static method to get severity for event type
proctoringEventSchema.statics.getSeverity = function (eventType) {
  const severityMap = {
    no_face: "high",
    multiple_faces: "critical",
    phone_detected: "critical",
    book_detected: "critical",
    looking_away: "medium",
    suspicious_audio: "medium",
    tab_switch: "high",
    screen_change: "high",
    copy_paste: "critical",
    right_click: "low",
    keyboard_shortcut: "medium",
    browser_resize: "medium",
    fullscreen_exit: "high",
    connection_lost: "low",
    laptop_detected: "high",
    external_keyboard_detected: "medium",
    external_mouse_detected: "medium",
    materials_detected: "critical",
    screen_detected: "high",
    drink_detected: "low",
    remote_detected: "medium",
    other: "low",
  };
  return severityMap[eventType] || "medium";
};

// Static method to get risk points for event type
// Updated: ALL violations now have significant risk points
proctoringEventSchema.statics.getRiskPoints = function (eventType) {
  const riskPoints = {
    no_face: 18,              // Increased: Face not visible is critical
    multiple_faces: 30,       // Increased: Multiple people is critical
    phone_detected: 30,       // Increased: Phone is critical violation
    book_detected: 25,        // Increased: Books/materials are critical
    looking_away: 15,         // Increased: Not looking at screen is serious
    suspicious_audio: 15,     // Increased: Background audio is serious
    tab_switch: 20,           // Increased: Tab switching is very serious
    screen_change: 20,        // Increased: Window focus loss is serious
    copy_paste: 25,           // Increased: Copy-paste is critical
    right_click: 10,          // Increased: Right-click attempts are suspicious
    keyboard_shortcut: 15,    // Increased: Keyboard shortcuts are suspicious
    browser_resize: 12,       // Increased: Browser resize is suspicious
    fullscreen_exit: 20,      // Increased: Exiting fullscreen is serious
    connection_lost: 10,      // Connection issues
    other: 10,                // Generic violations
    laptop_detected: 20,      // Extra device detected
    external_keyboard_detected: 15,  // External peripherals
    external_mouse_detected: 12,     // External peripherals
    materials_detected: 22,   // Study materials
    screen_detected: 18,      // Extra screen
    drink_detected: 8,        // Minor violation
    remote_detected: 15,      // Suspicious item
  };
  return riskPoints[eventType] || 10; // Default 10 points for unknown violations
};

const ProctoringEvent = mongoose.model("ProctoringEvent", proctoringEventSchema);
export default ProctoringEvent;
