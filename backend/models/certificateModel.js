import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({
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
    interviewSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewSession",
        required: true
    },
    certificateId: {
        type: String,
        required: true,
        unique: true
    },
    serialNumber: {
        type: String,
        required: true,
        unique: true
    },
    studentName: {
        type: String,
        required: true
    },
    courseName: {
        type: String,
        required: true
    },
    completionDate: {
        type: Date,
        default: Date.now
    },
    interviewScore: {
        type: Number,
        required: true
    },
    pdfUrl: {
        type: String,
        default: ""
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    verificationCode: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Ensure one certificate per user per course
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

// Helper method to generate certificate ID
certificateSchema.statics.generateCertificateId = function(courseName, userName) {
    const courseCode = courseName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
    const userCode = userName.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `VC-${courseCode}-${userCode}-${random}`;
};

// Helper method to generate serial number
certificateSchema.statics.generateSerialNumber = function() {
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `VC-${random}`;
};

// Helper method to generate verification code
certificateSchema.statics.generateVerificationCode = function() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const Certificate = mongoose.model("Certificate", certificateSchema);

export default Certificate;
