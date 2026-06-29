import mongoose from "mongoose";

const examAttemptSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["started", "in_progress", "submitted", "auto_submitted", "cancelled", "under_review"],
      default: "started",
    },
    // Student answers
    answers: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedOption: {
          type: Number, // Index of selected option for MCQ
        },
        textAnswer: {
          type: String, // For descriptive questions
        },
        isCorrect: {
          type: Boolean,
        },
        marksObtained: {
          type: Number,
          default: 0,
        },
        aiScore: {
          type: Number, // AI-generated score for descriptive answers
        },
        instructorScore: {
          type: Number, // Manual score by instructor
        },
        feedback: {
          type: String, // Instructor feedback
        },
        answeredAt: {
          type: Date,
        },
      },
    ],
    // Score summary
    totalMarksObtained: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    // Proctoring data
    proctoringEnabled: {
      type: Boolean,
      default: true,
    },
    violations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProctoringEvent",
      },
    ],
    totalViolations: {
      type: Number,
      default: 0,
    },
    riskScore: {
      type: Number, // 0-100, calculated from violations
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    // Time tracking
    timeSpent: {
      type: Number, // in seconds
      default: 0,
    },
    // Auto-submit reason
    autoSubmitReason: {
      type: String,
    },
    // IP and browser info
    ipAddress: {
      type: String,
    },
    browserInfo: {
      type: String,
    },
    // Review status for descriptive answers
    requiresManualReview: {
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
  },
  { timestamps: true }
);

// Ensure unique attempt per student per exam (allowing multiple attempts can be configured)
examAttemptSchema.index({ exam: 1, student: 1 });
examAttemptSchema.index({ student: 1, status: 1 });
examAttemptSchema.index({ exam: 1, status: 1 });

// Method to calculate score
examAttemptSchema.methods.calculateScore = function () {
  let totalMarks = 0;
  this.answers.forEach((answer) => {
    totalMarks += answer.marksObtained || 0;
  });
  this.totalMarksObtained = totalMarks;
  return totalMarks;
};

// Method to calculate risk score
examAttemptSchema.methods.calculateRiskScore = function () {
  const weights = {
    no_face: 15,
    multiple_faces: 20,
    phone_detected: 25,
    looking_away: 5,
    suspicious_audio: 10,
    tab_switch: 8,
    screen_change: 12,
  };

  let totalRisk = 0;
  // This will be populated from violations
  // For now, using violation count * average weight
  totalRisk = Math.min(100, this.totalViolations * 10);
  
  this.riskScore = totalRisk;
  
  if (totalRisk <= 20) this.riskLevel = "low";
  else if (totalRisk <= 50) this.riskLevel = "medium";
  else if (totalRisk <= 75) this.riskLevel = "high";
  else this.riskLevel = "critical";

  return totalRisk;
};

const ExamAttempt = mongoose.model("ExamAttempt", examAttemptSchema);
export default ExamAttempt;
