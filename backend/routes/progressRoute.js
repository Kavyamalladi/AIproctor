import express from "express";
import { updateProgress, getLectureProgress, getCourseProgress, updateQuizScore } from "../controllers/progressController.js";
import isAuth from "../middlewares/isAuth.js";

const progressRouter = express.Router();

progressRouter.post("/update", isAuth, updateProgress);
progressRouter.get("/lecture/:lectureId", isAuth, getLectureProgress);
progressRouter.get("/course/:courseId", isAuth, getCourseProgress);
progressRouter.post("/quiz-score", isAuth, updateQuizScore);

export default progressRouter;
