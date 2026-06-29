import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTestMail() {
  try {
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL}>`,
      to: process.env.EMAIL, // send to yourself
      subject: "Test Email from Node.js",
      text: "This is a test email sent from your Node.js backend using your current .env credentials.",
    });
    console.log("Email sent! Message ID:", info.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

sendTestMail();
