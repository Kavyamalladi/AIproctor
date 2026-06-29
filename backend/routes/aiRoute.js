import express from "express"
import { searchWithAi, generateLectureSummary, generateQuiz } from "../controllers/aiController.js"
import isAuth from "../middlewares/isAuth.js"

let aiRouter = express.Router()

aiRouter.post("/search", searchWithAi)
aiRouter.post("/summary", isAuth, generateLectureSummary)
aiRouter.post("/quiz", isAuth, generateQuiz)

export default aiRouter