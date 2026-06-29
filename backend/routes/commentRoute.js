import express from "express";
import { addComment, addReply, getLectureComments, deleteComment } from "../controllers/commentController.js";
import isAuth from "../middlewares/isAuth.js";

const commentRouter = express.Router();

commentRouter.post("/add", isAuth, addComment);
commentRouter.post("/reply", isAuth, addReply);
commentRouter.get("/lecture/:lectureId", isAuth, getLectureComments);
commentRouter.delete("/:commentId", isAuth, deleteComment);

export default commentRouter;
