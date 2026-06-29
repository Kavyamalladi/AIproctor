import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["mcq", "descriptive", "true_false"],
      required: true,
      default: "mcq",
    },
    // For MCQ questions
    options: [
      {
        optionText: {
          type: String,
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // For descriptive questions
    expectedAnswer: {
      type: String,
    },
    // AI keywords for descriptive answer evaluation
    aiKeywords: [
      {
        type: String,
      },
    ],
    marks: {
      type: Number,
      required: true,
      default: 1,
    },
    negativeMarks: {
      type: Number,
      default: 0,
    },
    explanation: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
    // For image-based questions
    imageUrl: {
      type: String,
    },
    // Difficulty level
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
questionSchema.index({ exam: 1, order: 1 });

const Question = mongoose.model("Question", questionSchema);
export default Question;
