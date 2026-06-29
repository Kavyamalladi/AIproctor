import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
    checkCourseCompletion,
    startCertificationInterview,
    getCurrentQuestion,
    submitAnswer,
    getInterviewResult,
    generateCertificate,
    getUserCertificates,
    downloadCertificate,
    viewCertificate,
    verifyCertificate,
    getCourseInfoForCertification
} from "../controllers/certificationController.js";

const certificationRouter = express.Router();

// Course completion check
certificationRouter.get("/completion/:courseId", isAuth, checkCourseCompletion);

// Course info for certification
certificationRouter.get("/course-info/:courseId", isAuth, getCourseInfoForCertification);

// Interview session management
certificationRouter.post("/start-interview", isAuth, startCertificationInterview);
certificationRouter.get("/question/:sessionId", isAuth, getCurrentQuestion);
certificationRouter.post("/submit-answer", isAuth, submitAnswer);
certificationRouter.get("/result/:sessionId", isAuth, getInterviewResult);

// Certificate management
certificationRouter.post("/generate-certificate", isAuth, generateCertificate);
certificationRouter.get("/my-certificates", isAuth, getUserCertificates);
certificationRouter.get("/view/:certificateId", isAuth, viewCertificate);
certificationRouter.get("/download/:certificateId", isAuth, downloadCertificate);
certificationRouter.post("/verify", verifyCertificate);

export default certificationRouter;
