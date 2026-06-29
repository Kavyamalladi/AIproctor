import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/userModel.js";

dotenv.config();

const makeAdmin = async () => {
  const email = process.argv[2]?.trim()?.toLowerCase();

  if (!email) {
    console.error("Usage: npm run make-admin -- user@example.com");
    process.exit(1);
  }

  if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is not set in environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL);

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exitCode = 1;
      return;
    }

    if (user.role === "admin") {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    user.role = "admin";
    await user.save();

    console.log(`User ${email} promoted to admin successfully.`);
  } catch (error) {
    console.error("Failed to promote user to admin:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

makeAdmin();
