import { genToken } from "../configs/token.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import sendMail from "../configs/Mail.js";

/* ===================== SIGN UP ===================== */
export const signUp = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const allowedSignupRoles = ["student", "educator"];

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!allowedSignupRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email!" });
    }

    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must contain at least one uppercase letter" });
    }
    if (!/[0-9]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must contain at least one number" });
    }
    if (!/[@$!%*?&]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one special character",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
    };

    if (role === "educator") {
      userData.teacherApplication = {
        status: "not_submitted",
      };
    }

    const user = await User.create(userData);

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json(user);
  } catch (error) {
    console.log("SignUp Error:", error);
    return res.status(500).json({ message: "SignUp Error", error });
  }
};

/* ===================== LOGIN ===================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect Password" });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(user);
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({ message: "Login Error", error });
  }
};

/* ===================== LOGOUT ===================== */
export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    return res.status(200).json({ message: "Logged Out Successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Logout Error", error });
  }
};

/* ===================== GOOGLE SIGNUP ===================== */
export const googleSignup = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    let user = await User.findOne({ email });

    // If user already exists, just log them in
    if (user) {
      const token = await genToken(user._id);

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json(user);
    }

    // Only validate role for new users
    const allowedSignupRoles = ["student", "educator"];
    if (!role || !allowedSignupRoles.includes(role)) {
      return res.status(400).json({ message: "Please select a valid role (student or educator)" });
    }

    // Create new user
    const userData = {
      name,
      email,
      role,
    };

    if (role === "educator") {
      userData.teacherApplication = {
        status: "not_submitted",
      };
    }

    user = await User.create(userData);

    const token = await genToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(user);
  } catch (error) {
    console.log("Google Signup Error:", error);
    return res.status(500).json({ message: "Google Signup Error", error });
  }
};

/* ===================== SEND OTP ===================== */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("[sendOtp] Received request for email:", email);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("[sendOtp] User not found for email:", email);
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("[sendOtp] Generated OTP:", otp);

    user.resetOtp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    user.isOtpVerified = false;

    try {
      await user.save();
      console.log("[sendOtp] User updated with OTP.");
    } catch (saveErr) {
      console.error("[sendOtp] Error saving user:", saveErr);
      return res.status(500).json({ message: "Error saving user", error: saveErr });
    }

    try {
      await sendMail(email, otp);
      console.log("[sendOtp] OTP email sent.");
    } catch (mailErr) {
      console.error("[sendOtp] Error sending email:", mailErr);
      return res.status(500).json({ message: "Error sending email", error: mailErr });
    }

    return res.status(200).json({ message: "Email Sent Successfully!" });
  } catch (error) {
    console.error("[sendOtp] Unexpected error:", error);
    return res.status(500).json({ message: "Send OTP Error", error });
  }
};

/* ===================== VERIFY OTP ===================== */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.resetOtp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid OTP!" });
    }

    user.isOtpVerified = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;

    await user.save();

    return res.status(200).json({ message: "OTP verified!" });
  } catch (error) {
    return res.status(500).json({ message: "Verify OTP Error", error });
  }
};

/* ===================== RESET PASSWORD ===================== */
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isOtpVerified) {
      return res.status(404).json({ message: "OTP verification required" });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({ message: "New password cannot be same as old password" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isOtpVerified = false;

    await user.save();

    return res.status(200).json({ message: "Password Reset Successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Reset Password Error", error });
  }
};
