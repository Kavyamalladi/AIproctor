import express from "express"
import isAuth from "../middlewares/isAuth.js"
import isApprovedEducator from "../middlewares/isApprovedEducator.js"
import { createCourse, createLecture, downloadAssignment, editCourse, editLecture, getCourseById, getCourseLecture, getCreatorById, getCreatorCourses, getPublishedCourses, removeCourse, removeLecture, getEnrolledStudentsWithProgress } from "../controllers/courseController.js"
import upload from "../middlewares/multer.js"

let courseRouter = express.Router()

// Teacher: Get enrolled students with progress for a course
courseRouter.get("/enrolled-students/:courseId", isAuth, isApprovedEducator, getEnrolledStudentsWithProgress);

courseRouter.post("/create",isAuth,isApprovedEducator,upload.single("thumbnail"),createCourse)
courseRouter.get("/getpublishedcourses",getPublishedCourses)
courseRouter.get("/getcreatorcourses",isAuth,getCreatorCourses)
courseRouter.post("/editcourse/:courseId",isAuth,isApprovedEducator,upload.single("thumbnail"),editCourse)
courseRouter.get("/getcourse/:courseId",isAuth,getCourseById)
courseRouter.delete("/removecourse/:courseId",isAuth,isApprovedEducator,removeCourse)
courseRouter.post("/createlecture/:courseId",isAuth,isApprovedEducator,createLecture)
courseRouter.get("/getcourselecture/:courseId",isAuth,getCourseLecture)
courseRouter.post("/editlecture/:lectureId",isAuth,isApprovedEducator,upload.fields([
  { name: 'videoUrl', maxCount: 1 },
  { name: 'assignment', maxCount: 1 }
]),editLecture)
courseRouter.delete("/removelecture/:lectureId",isAuth,isApprovedEducator,removeLecture)
courseRouter.get("/downloadassignment/:lectureId",isAuth,downloadAssignment)
courseRouter.post("/getcreator",isAuth,getCreatorById)

export default courseRouter