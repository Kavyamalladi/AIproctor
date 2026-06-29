import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
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
    lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
        required: true
    },
    watchedDuration: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
    },
    quizScore: {
        type: Number,
        default: null
    },
    quizAttempted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index to ensure one progress record per user-lecture combination
progressSchema.index({ user: 1, lecture: 1 }, { unique: true });

const Progress = mongoose.model("Progress", progressSchema);

export default Progress;
