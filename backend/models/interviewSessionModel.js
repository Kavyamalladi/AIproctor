import mongoose from "mongoose";

const questionAnswerSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        default: ""
    },
    score: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    feedback: {
        type: String,
        default: ""
    },
    correctAnswer: {
        type: String,
        default: ""
    }
});

const interviewSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    questions: [questionAnswerSchema],
    currentQuestionIndex: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        default: 10
    },
    courseDifficulty: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        default: "Intermediate"
    },
    status: {
        type: String,
        enum: ["in_progress", "completed", "abandoned"],
        default: "in_progress"
    },
    totalScore: {
        type: Number,
        default: 0
    },
    averageScore: {
        type: Number,
        default: 0
    },
    passStatus: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    aiStrengths: {
        type: [String],
        default: []
    },
    aiAreasToImprove: {
        type: [String],
        default: []
    },
    overallFeedback: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// Index for faster queries
interviewSessionSchema.index({ user: 1, course: 1 });
interviewSessionSchema.index({ user: 1, status: 1 });

const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);

export default InterviewSession;
