import User from "../models/userModel.js";

const isApprovedEducator = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role teacherApplication");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "educator") {
      return res.status(403).json({ message: "Only educators can perform this action" });
    }

    if (user.teacherApplication?.status !== "approved") {
      return res.status(403).json({
        message: "Your educator application is not approved yet. Please submit your application and wait for admin approval."
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: `Educator approval check error: ${error}` });
  }
};

export default isApprovedEducator;
