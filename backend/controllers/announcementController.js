import Announcement from "../models/announcementModel.js";
import Course from "../models/courseModel.js";
import { emitAnnouncement } from "../socket.js";

// Create announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { courseId, title, content } = req.body;
    const userId = req.userId;
    // Only allow if user is course creator (teacher)
    const course = await Course.findById(courseId);
    if (!course || String(course.creator) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const announcement = await Announcement.create({
      course: courseId,
      title,
      content,
      createdBy: userId
    });
    // Convert to plain object for socket emission
    const announcementData = announcement.toObject();
    console.log('[Backend] 📢 New announcement created:', announcementData.title, 'for course:', courseId);
    // Emit real-time notification to enrolled students
    emitAnnouncement(courseId, announcementData);
    console.log('[Backend] ✅ Announcement emitted to course room');
    return res.status(201).json(announcement);
  } catch (error) {
    console.log('[Backend] ❌ Error creating announcement:', error.message);
    return res.status(500).json({ message: `Failed to create announcement: ${error}` });
  }
};

// Get all announcements for a course
export const getCourseAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.params;
    const announcements = await Announcement.find({ course: courseId })
      .sort({ createdAt: -1 });
    return res.status(200).json(announcements);
  } catch (error) {
    return res.status(500).json({ message: `Failed to get announcements: ${error}` });
  }
};

// Edit announcement
export const editAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { title, content } = req.body;
    const userId = req.userId;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    if (String(announcement.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    announcement.title = title;
    announcement.content = content;
    await announcement.save();
    return res.status(200).json(announcement);
  } catch (error) {
    return res.status(500).json({ message: `Failed to edit announcement: ${error}` });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.userId;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    if (String(announcement.createdBy) !== String(userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await announcement.deleteOne();
    return res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    return res.status(500).json({ message: `Failed to delete announcement: ${error}` });
  }
};
