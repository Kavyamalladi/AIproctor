import User from "../models/userModel.js";

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: `Admin auth error: ${error}` });
  }
};

export default isAdmin;
