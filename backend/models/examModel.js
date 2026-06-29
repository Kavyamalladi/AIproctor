import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examType: {
      type: String,
      enum: ["mcq", "descriptive", "mixed"],
      default: "mcq",
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      default: 60,
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    passingMarks: {
      type: Number,
      required: true,
      default: 40,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    // Proctoring settings
    proctoring: {
      enabled: {
        type: Boolean,
        default: true,
      },
      faceDetection: {
        type: Boolean,
        default: true,
      },
      multipleFaceDetection: {
        type: Boolean,
        default: true,
      },
      phoneDetection: {
        type: Boolean,
        default: true,
      },
      eyeTracking: {
        type: Boolean,
        default: true,
      },
      audioDetection: {
        type: Boolean,
        default: true,
      },
      tabSwitchDetection: {
        type: Boolean,
        default: true,
      },
      screenMonitoring: {
        type: Boolean,
        default: true,
      },
      fullscreenRequired: {
        type: Boolean,
        default: false,
      },
      autoSubmitOnViolation: {
        type: Boolean,
        default: false,
      },
      maxViolations: {
        type: Number,
        default: 5, // Maximum violations before auto-submit
      },
    },
    instructions: {
      type: String,
      default: "Please read all questions carefully before answering.",
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    showResultImmediately: {
      type: Boolean,
      default: true,
    },
    showProctoringReport: {
      type: Boolean,
      default: false, // Whether to show proctoring report to students
    },
    allowReview: {
      type: Boolean,
      default: true,
    },
    maxAttempts: {
      type: Number,
      default: 1,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    attempts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamAttempt",
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient queries
examSchema.index({ course: 1, isPublished: 1 });
examSchema.index({ creator: 1 });
examSchema.index({ startTime: 1, endTime: 1 });

const Exam = mongoose.model("Exam", examSchema);
export default Exam;
