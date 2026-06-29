import express from "express"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server } from "socket.io"
import { setupSocket } from "./socket.js"
import connectDb from "./configs/db.js"
import authRouter from "./routes/authRoute.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/userRoute.js"
import courseRouter from "./routes/courseRoute.js"
import paymentRouter from "./routes/paymentRoute.js"
import aiRouter from "./routes/aiRoute.js"
import reviewRouter from "./routes/reviewRoute.js"
import commentRouter from "./routes/commentRoute.js"
import progressRouter from "./routes/progressRoute.js"
import examRouter from "./routes/examRoute.js"
import proctoringRouter from "./routes/proctoringRoute.js"
import announcementRouter from "./routes/announcementRoute.js"
import adminRouter from "./routes/adminRoute.js"
import certificationRouter from "./routes/certificationRoute.js"

dotenv.config()

const port = process.env.PORT || 8000
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: [
        "https://new-ai-lms-frontend.onrender.com",
        "https://new-ai-lms.onrender.com",
        "http://localhost:5173",
        "http://localhost:8000"
    ],
    credentials: true
}))

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/course", courseRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/ai", aiRouter)
app.use("/api/review", reviewRouter)
app.use("/api/comment", commentRouter)
app.use("/api/progress", progressRouter)
app.use("/api/exam", examRouter)
app.use("/api/proctoring", proctoringRouter)
app.use("/api/announcement", announcementRouter)
app.use("/api/admin", adminRouter)
app.use("/api/certification", certificationRouter)

app.get("/", (req, res) => {
    res.send("Hello From Server")
})

// Create HTTP server and Socket.io for real-time proctoring
const httpServer = createServer(app)
setupSocket(httpServer)

httpServer.listen(port, () => {
    console.log("Server Started on port", port)
    connectDb()
})