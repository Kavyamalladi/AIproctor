import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isApprovedEducator from "../middlewares/isApprovedEducator.js";
import {
  createAnnouncement,
  getCourseAnnouncements,
  editAnnouncement,
  deleteAnnouncement
} from "../controllers/announcementController.js";

const announcementRouter = express.Router();

// Teacher: create announcement
announcementRouter.post("/create", isAuth, isApprovedEducator, createAnnouncement);
// All: get announcements for a course
announcementRouter.get("/course/:courseId", isAuth, getCourseAnnouncements);
// Teacher: edit announcement
announcementRouter.put("/edit/:announcementId", isAuth, isApprovedEducator, editAnnouncement);
// Teacher: delete announcement
announcementRouter.delete("/delete/:announcementId", isAuth, isApprovedEducator, deleteAnnouncement);

export default announcementRouter;
