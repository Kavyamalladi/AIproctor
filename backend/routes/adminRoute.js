import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  getAdminOverview,
  getCourseStudentsWithProgressByAdmin,
  getMyTeacherApplication,
  getTeacherApplications,
  getTeacherCoursesWithStudents,
  removeCourseByAdmin,
  removeStudentFromCourseByAdmin,
  removeUserByAdmin,
  reviewTeacherApplication,
  submitTeacherApplication,
} from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.post("/teacher-application", isAuth, submitTeacherApplication);
adminRouter.get("/teacher-application/me", isAuth, getMyTeacherApplication);

adminRouter.get("/teacher-applications", isAuth, isAdmin, getTeacherApplications);
adminRouter.patch("/teacher-applications/:teacherId/review", isAuth, isAdmin, reviewTeacherApplication);
adminRouter.get("/overview", isAuth, isAdmin, getAdminOverview);
adminRouter.get("/teacher/:teacherId/courses", isAuth, isAdmin, getTeacherCoursesWithStudents);
adminRouter.get("/courses/:courseId/students", isAuth, isAdmin, getCourseStudentsWithProgressByAdmin);
adminRouter.delete("/users/:userId", isAuth, isAdmin, removeUserByAdmin);
adminRouter.delete("/courses/:courseId", isAuth, isAdmin, removeCourseByAdmin);
adminRouter.delete("/courses/:courseId/students/:studentId", isAuth, isAdmin, removeStudentFromCourseByAdmin);

export default adminRouter;
