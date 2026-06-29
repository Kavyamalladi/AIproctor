import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String
    },
    description: {
      type: String
    },
    role: {
      type: String,
      enum: ["educator", "student", "admin"],
      required: true
    },
    teacherApplication: {
      qualification: {
        type: String,
        default: ""
      },
      interestsToTeach: {
        type: String,
        default: ""
      },
      whyTeach: {
        type: String,
        default: ""
      },
      personalDetails: {
        type: String,
        default: ""
      },
      status: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted"
      },
      submittedAt: {
        type: Date
      },
      reviewedAt: {
        type: Date
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      adminNote: {
        type: String,
        default: ""
      }
    },
    photoUrl: {
      type: String,
      default: ""
    },
    enrolledCourses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    resetOtp:{
      type:String
    },
    otpExpires:{
      type:Date
    },
    isOtpVerified:{
      type:Boolean,
      default:false
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
