import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Course from "../models/courseModel.js";
import Progress from "../models/progressModel.js";
import InterviewSession from "../models/interviewSessionModel.js";
import Certificate from "../models/certificateModel.js";
import User from "../models/userModel.js";
import PDFDocument from "pdfkit";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to analyze course difficulty based on lecture titles
const analyzeDifficulty = (lectures, courseLevel) => {
    // If course already has a level, use it
    if (courseLevel) return courseLevel;

    const lectureTitles = lectures.map(l => l.lectureTitle?.toLowerCase() || "").join(" ");
    
    const beginnerKeywords = ["basics", "introduction", "intro", "getting started", "fundamentals", "beginner", "first", "overview"];
    const advancedKeywords = ["system design", "optimization", "advanced", "architecture", "scaling", "performance", "deep dive", "master", "expert"];
    const intermediateKeywords = ["implementation", "project", "building", "concepts", "patterns", "practices"];

    let beginnerScore = beginnerKeywords.filter(k => lectureTitles.includes(k)).length;
    let advancedScore = advancedKeywords.filter(k => lectureTitles.includes(k)).length;
    let intermediateScore = intermediateKeywords.filter(k => lectureTitles.includes(k)).length;

    if (advancedScore > beginnerScore && advancedScore > intermediateScore) return "Advanced";
    if (beginnerScore > intermediateScore) return "Beginner";
    return "Intermediate";
};

// Helper function to generate certificate PDF
const generateCertificatePDF = (user, certificate) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        // Certificate styling
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Background color
        doc.rect(0, 0, pageWidth, pageHeight).fill('#F5F3FF');

        // Header border
        doc.lineWidth(3).strokeColor('#1E3A5F');
        doc.rect(40, 40, pageWidth - 80, pageHeight - 80).stroke();

        // Inner border
        doc.lineWidth(1).strokeColor('#D4AF37');
        doc.rect(50, 50, pageWidth - 100, pageHeight - 100).stroke();

        // Add logo at top right
        try {
            const logoPath = path.join(__dirname, '../../frontend/public/logo.jpg');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, pageWidth - 150, 60, { width: 100, height: 60 });
            }
        } catch (e) {
            console.log("Logo not found, continuing without it");
        }

        // Certificate title
        doc.fontSize(48).fillColor('#1E3A5F').font('Helvetica-BoldOblique');
        doc.text('CERTIFICATE', pageWidth / 2 - 180, 80, { width: 360, align: 'center' });

        // Subtitle - FIXED ALIGNMENT
        doc.fontSize(20).fillColor('#6B7280').font('Helvetica');
        doc.text('OF COMPLETION', pageWidth / 2 - 150, 155, { width: 300, align: 'center' });

        // Body
        doc.fontSize(14).fillColor('#4B5563');
        doc.text('This is to certify that:', pageWidth / 2 - 100, 210, { width: 200, align: 'center' });

        // Student name
        doc.fontSize(42).fillColor('#1E3A5F').font('Helvetica-BoldOblique');
        doc.text(user.name, 150, 250, { width: pageWidth - 300, align: 'center' });

        // Course completion text
        doc.fontSize(14).fillColor('#4B5563').font('Helvetica');
        doc.text('For successfully completing the AI Certification Interview for', 150, 310, { width: pageWidth - 300, align: 'center' });

        // Course name
        doc.fontSize(18).fillColor('#1E3A5F').font('Helvetica-Bold');
        doc.text(`Course: ${certificate.courseName}`, 150, 340, { width: pageWidth - 300, align: 'center' });

        // Date and Certificate ID
        const completionDate = new Date(certificate.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.fontSize(12).fillColor('#4B5563').font('Helvetica');
        doc.text(`Completed Date: ${completionDate}`, 150, 380, { width: pageWidth - 300, align: 'center' });
        doc.text(`Certificate ID: ${certificate.certificateId}`, 150, 400, { width: pageWidth - 300, align: 'center' });
        doc.text(`Interview Score: ${certificate.interviewScore.toFixed(0)}%`, 150, 420, { width: pageWidth - 300, align: 'center' });

        // Footer
        const footerY = pageHeight - 120;

        doc.fontSize(10).fillColor('#6B7280');
        doc.text(certificate.verificationCode, 120, footerY);
        doc.fontSize(8);
        doc.text('SERIAL NO.', 120, footerY + 15);
        doc.text(certificate.serialNumber, 120, footerY + 27);

        doc.fontSize(10).fillColor('#B8860B').font('Helvetica-Bold');
        doc.text('CERTIFIED BY', pageWidth / 2 - 40, footerY);
        doc.text('VIRTUAL COURSES', pageWidth / 2 - 50, footerY + 15);
        doc.text('AUTHENTIC', pageWidth / 2 - 35, footerY + 30);

        doc.fontSize(16).fillColor('#1E3A5F').font('Helvetica-BoldOblique');
        doc.text('Virtual Courses', pageWidth - 200, footerY);
        doc.fontSize(10).fillColor('#6B7280').font('Helvetica');
        doc.text('Course Mentor', pageWidth - 180, footerY + 20);

        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
};

// Check if user has completed the course
export const checkCourseCompletion = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.userId;

        const course = await Course.findById(courseId).populate("lectures");
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if user is enrolled
        const isEnrolled = course.enrolledStudents.some(
            student => student.toString() === userId
        );
        if (!isEnrolled) {
            return res.status(403).json({ message: "You are not enrolled in this course" });
        }

        const totalLectures = course.lectures.length;
        if (totalLectures === 0) {
            return res.status(400).json({ message: "Course has no lectures" });
        }

        // Get completed lectures
        const completedProgress = await Progress.find({
            user: userId,
            course: courseId,
            isCompleted: true
        });

        const completedLectures = completedProgress.length;
        const completionPercentage = (completedLectures / totalLectures) * 100;
        const isCompleted = completionPercentage >= 90; // 90% completion required

        // Check if user already has a certificate
        const existingCertificate = await Certificate.findOne({
            user: userId,
            course: courseId
        });

        // Check if there's an ongoing or completed interview
        const existingSession = await InterviewSession.findOne({
            user: userId,
            course: courseId,
            status: { $in: ["in_progress", "completed"] }
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            isCompleted,
            completedLectures,
            totalLectures,
            completionPercentage,
            hasCertificate: !!existingCertificate,
            certificate: existingCertificate,
            hasInterviewSession: !!existingSession,
            interviewSession: existingSession,
            canTakeCertification: isCompleted && !existingCertificate
        });
    } catch (error) {
        console.error("Check Course Completion Error:", error);
        return res.status(500).json({ message: "Error checking course completion", error: error.message });
    }
};

// Start certification interview
export const startCertificationInterview = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.userId;

        const course = await Course.findById(courseId).populate("lectures");
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Check if user is enrolled
        const isEnrolled = course.enrolledStudents.some(
            student => student.toString() === userId
        );
        if (!isEnrolled) {
            return res.status(403).json({ message: "You are not enrolled in this course" });
        }

        // Check if user already has a certificate for this course
        const existingCertificate = await Certificate.findOne({
            user: userId,
            course: courseId
        });
        if (existingCertificate) {
            return res.status(400).json({ message: "You already have a certificate for this course" });
        }

        // Check for progress/completion
        const totalLectures = course.lectures.length;
        const completedProgress = await Progress.find({
            user: userId,
            course: courseId,
            isCompleted: true
        });
        const completionPercentage = (completedProgress.length / totalLectures) * 100;
        
        if (completionPercentage < 90) {
            return res.status(400).json({ 
                message: "You need to complete at least 90% of the course to take the certification interview" 
            });
        }

        // Check for existing in-progress session
        let existingSession = await InterviewSession.findOne({
            user: userId,
            course: courseId,
            status: "in_progress"
        });

        if (existingSession) {
            return res.status(200).json({
                message: "Continuing existing session",
                session: existingSession
            });
        }

        // Analyze difficulty
        const difficulty = analyzeDifficulty(course.lectures, course.level);

        // Generate questions using Gemini AI
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const lectureTitles = course.lectures.map(l => l.lectureTitle).join(", ");
        const numQuestions = difficulty === "Beginner" ? 10 : difficulty === "Intermediate" ? 15 : 20;

        const prompt = `
You are an expert interviewer for an AI-based certification system. Generate ${numQuestions} interview questions for a student who has completed a course.

Course Information:
- Course Title: ${course.title}
- Course Description: ${course.description || "N/A"}
- Course Level: ${difficulty}
- Lecture Topics: ${lectureTitles}

Rules:
1. Generate exactly ${numQuestions} questions
2. Questions should test understanding of the course content
3. Mix of conceptual, practical, and application-based questions
4. Questions should match the ${difficulty} difficulty level
5. Include a model answer for each question

Return ONLY a valid JSON array with this structure:
[
    {
        "question": "Question text here?",
        "correctAnswer": "A comprehensive model answer explaining the concept correctly"
    }
]

IMPORTANT: Return ONLY the JSON array, no markdown, no code blocks, no additional text.
`;

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }],
        });

        let questionsText = aiResponse?.response?.text || aiResponse?.text || "[]";
        questionsText = questionsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let questions;
        try {
            questions = JSON.parse(questionsText);
        } catch (parseError) {
            console.error("Failed to parse questions:", parseError);
            return res.status(500).json({ message: "Failed to generate questions" });
        }

        // Create interview session
        const session = await InterviewSession.create({
            user: userId,
            course: courseId,
            questions: questions.map(q => ({
                question: q.question,
                correctAnswer: q.correctAnswer,
                answer: "",
                score: 0,
                feedback: ""
            })),
            totalQuestions: questions.length,
            courseDifficulty: difficulty,
            status: "in_progress"
        });

        return res.status(201).json({
            message: "Interview session started",
            session: {
                _id: session._id,
                totalQuestions: session.totalQuestions,
                currentQuestionIndex: session.currentQuestionIndex,
                courseDifficulty: session.courseDifficulty,
                currentQuestion: session.questions[0]?.question
            }
        });
    } catch (error) {
        console.error("Start Certification Interview Error:", error);
        return res.status(500).json({ message: "Error starting certification interview", error: error.message });
    }
};

// Get current question
export const getCurrentQuestion = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.userId;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: userId
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (session.status === "completed") {
            return res.status(400).json({ message: "Interview already completed" });
        }

        const currentIndex = session.currentQuestionIndex;
        const question = session.questions[currentIndex];

        return res.status(200).json({
            questionNumber: currentIndex + 1,
            totalQuestions: session.totalQuestions,
            question: question?.question,
            isLastQuestion: currentIndex === session.totalQuestions - 1
        });
    } catch (error) {
        console.error("Get Current Question Error:", error);
        return res.status(500).json({ message: "Error getting question", error: error.message });
    }
};

// Submit answer and get evaluation
export const submitAnswer = async (req, res) => {
    try {
        const { sessionId, answer } = req.body;
        const userId = req.userId;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: userId,
            status: "in_progress"
        });

        if (!session) {
            return res.status(404).json({ message: "Active session not found" });
        }

        const currentIndex = session.currentQuestionIndex;
        const currentQuestion = session.questions[currentIndex];

        // Pre-check: Detect low-effort or copied answers
        const normalizedAnswer = answer.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const normalizedQuestion = currentQuestion.question.toLowerCase().trim().replace(/[^\w\s]/g, '');
        
        // Calculate similarity between answer and question
        const answerWords = new Set(normalizedAnswer.split(/\s+/));
        const questionWords = new Set(normalizedQuestion.split(/\s+/));
        const intersection = [...answerWords].filter(word => questionWords.has(word) && word.length > 3);
        const similarity = intersection.length / Math.max(answerWords.size, 1);
        
        let evaluation;
        
        // If answer is essentially the question copied, give 0
        if (similarity > 0.7 || normalizedAnswer === normalizedQuestion) {
            evaluation = { 
                score: 0, 
                feedback: "Your answer appears to be a copy of the question. Please provide an actual answer explaining your understanding." 
            };
        }
        // If answer is too short (less than 15 words), penalize
        else if (normalizedAnswer.split(/\s+/).length < 15) {
            evaluation = { 
                score: 2, 
                feedback: "Your answer is too brief. Please provide a more detailed explanation to demonstrate your understanding." 
            };
        }
        // Otherwise, use AI evaluation
        else {
            // Evaluate answer using Gemini AI
            const ai = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
            });

            const prompt = `
You are a STRICT evaluator for an AI certification interview. Your job is to rigorously evaluate the student's answer.

Question: ${currentQuestion.question}

Model Answer (for reference): ${currentQuestion.correctAnswer}

Student's Answer: ${answer}

CRITICAL EVALUATION RULES:
1. If the student simply copied/pasted the question or gave a non-answer, score 0
2. If the answer doesn't actually answer the question, score 0-2
3. Vague or generic answers without specific technical details: score 2-4
4. Partially correct but missing key concepts: score 4-6
5. Correct with good explanation: score 7-8
6. Comprehensive, accurate, and well-explained: score 9-10

RED FLAGS (automatic low score):
- Answer is the same as or very similar to the question
- Answer says "I don't know" or equivalent
- Answer is unrelated to the topic
- Answer is just keywords without explanation
- Answer is too short (less than 20 words for technical questions)

Evaluate based on:
1. UNDERSTANDING: Does the answer show genuine understanding, not just parroting?
2. ACCURACY: Is the information technically correct?
3. RELEVANCE: Does it actually answer what was asked?
4. DEPTH: Is there sufficient detail and explanation?

Return ONLY a valid JSON object with this structure:
{
    "score": <number from 0 to 10>,
    "feedback": "Specific constructive feedback explaining why this score was given"
}

BE STRICT. Do not give high scores for low-effort answers.

IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks, no additional text.
`;

        const aiResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ text: prompt }],
        });

        let evaluationText = aiResponse?.response?.text || aiResponse?.text || "{}";
        evaluationText = evaluationText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
            evaluation = JSON.parse(evaluationText);
        } catch (parseError) {
            evaluation = { score: 5, feedback: "Could not evaluate properly. Score assigned based on submission." };
        }
        } // Close the else block for AI evaluation

        // Update session
        session.questions[currentIndex].answer = answer;
        session.questions[currentIndex].score = evaluation.score;
        session.questions[currentIndex].feedback = evaluation.feedback;

        // Move to next question or complete
        const isLastQuestion = currentIndex === session.totalQuestions - 1;
        
        if (!isLastQuestion) {
            session.currentQuestionIndex += 1;
            await session.save();

            return res.status(200).json({
                message: "Answer submitted",
                score: evaluation.score,
                feedback: evaluation.feedback,
                nextQuestion: session.questions[session.currentQuestionIndex]?.question,
                questionNumber: session.currentQuestionIndex + 1,
                totalQuestions: session.totalQuestions,
                isLastQuestion: session.currentQuestionIndex === session.totalQuestions - 1
            });
        } else {
            // Calculate final scores
            const totalScore = session.questions.reduce((sum, q) => sum + q.score, 0);
            const averageScore = totalScore / session.totalQuestions;
            const passStatus = averageScore >= 5; // 50% passing

            session.totalScore = totalScore;
            session.averageScore = averageScore;
            session.passStatus = passStatus;
            session.status = "completed";
            session.completedAt = new Date();

            // Generate overall feedback using AI
            const feedbackAI = new GoogleGenAI({
                apiKey: process.env.GEMINI_API_KEY,
            });
            
            const feedbackPrompt = `
You are an expert career counselor providing interview feedback. Based on the interview performance, provide constructive feedback.

Interview Summary:
- Total Questions: ${session.totalQuestions}
- Average Score: ${averageScore.toFixed(2)} out of 10
- Pass Status: ${passStatus ? "PASSED" : "FAILED"}

Question Scores:
${session.questions.map((q, i) => `Q${i + 1}: ${q.score}/10`).join(", ")}

Provide:
1. 3-5 specific strengths shown in the interview
2. 3-5 areas that need improvement
3. Overall feedback paragraph

Return ONLY a valid JSON object:
{
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "areasToImprove": ["area 1", "area 2", "area 3"],
    "overallFeedback": "A paragraph of overall feedback"
}

IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks, no additional text.
`;

            const feedbackResponse = await feedbackAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ text: feedbackPrompt }],
            });

            let feedbackText = feedbackResponse?.response?.text || feedbackResponse?.text || "{}";
            feedbackText = feedbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            try {
                const feedback = JSON.parse(feedbackText);
                session.aiStrengths = feedback.strengths || [];
                session.aiAreasToImprove = feedback.areasToImprove || [];
                session.overallFeedback = feedback.overallFeedback || "";
            } catch (e) {
                session.overallFeedback = "Interview completed. Review your answers for improvement areas.";
            }

            await session.save();

            return res.status(200).json({
                message: "Interview completed",
                score: evaluation.score,
                feedback: evaluation.feedback,
                isComplete: true,
                result: {
                    totalScore: session.totalScore,
                    averageScore: session.averageScore,
                    passStatus: session.passStatus,
                    strengths: session.aiStrengths,
                    areasToImprove: session.aiAreasToImprove,
                    overallFeedback: session.overallFeedback
                }
            });
        }
    } catch (error) {
        console.error("Submit Answer Error:", error);
        return res.status(500).json({ message: "Error submitting answer", error: error.message });
    }
};

// Get interview result
export const getInterviewResult = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.userId;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: userId
        }).populate("course", "title description thumbnail");

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Check if user already has a certificate
        const existingCertificate = await Certificate.findOne({
            user: userId,
            course: session.course._id
        });

        return res.status(200).json({
            session: {
                _id: session._id,
                course: session.course,
                totalQuestions: session.totalQuestions,
                courseDifficulty: session.courseDifficulty,
                status: session.status,
                totalScore: session.totalScore,
                averageScore: session.averageScore,
                passStatus: session.passStatus,
                strengths: session.aiStrengths,
                areasToImprove: session.aiAreasToImprove,
                overallFeedback: session.overallFeedback,
                questions: session.questions.map(q => ({
                    question: q.question,
                    answer: q.answer,
                    correctAnswer: q.correctAnswer,
                    score: q.score,
                    feedback: q.feedback
                })),
                startedAt: session.startedAt,
                completedAt: session.completedAt
            },
            hasCertificate: !!existingCertificate,
            certificate: existingCertificate
        });
    } catch (error) {
        console.error("Get Interview Result Error:", error);
        return res.status(500).json({ message: "Error getting result", error: error.message });
    }
};

// Generate certificate
// Generate certificate
export const generateCertificate = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.userId;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: userId,
            status: "completed",
            passStatus: true
        }).populate("course", "title description");

        if (!session) {
            return res.status(404).json({ message: "Completed passing session not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check for existing certificate
        const existingCertificate = await Certificate.findOne({
            user: userId,
            course: session.course._id
        });

        if (existingCertificate) {
            return res.status(400).json({ 
                message: "Certificate already exists",
                certificate: existingCertificate
            });
        }

        // Generate certificate IDs
        const certificateId = Certificate.generateCertificateId(session.course.title, user.name);
        const serialNumber = Certificate.generateSerialNumber();
        const verificationCode = Certificate.generateVerificationCode();

        // Create PDF certificate
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));

        // Certificate styling
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        // Background
        doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
        
        // Left decorative stripe
        doc.save();
        doc.moveTo(0, 0);
        doc.lineTo(80, 0);
        doc.lineTo(120, pageHeight);
        doc.lineTo(0, pageHeight);
        doc.closePath();
        doc.fill('#3B5998');
        
        doc.moveTo(30, 0);
        doc.lineTo(50, 0);
        doc.lineTo(90, pageHeight);
        doc.lineTo(50, pageHeight);
        doc.closePath();
        doc.fill('#5B7BC0');
        doc.restore();

        // VC Logo
        doc.fontSize(40).fillColor('#6B7280').font('Helvetica-Bold');
        doc.text('VC', pageWidth / 2 - 30, 40, { width: 60, align: 'center' });

        // Header
        doc.fontSize(36).fillColor('#6B7280').font('Helvetica-Bold');
        doc.text('CERTIFICATE', pageWidth / 2 - 150, 100, { width: 300, align: 'center' });
        
        doc.fontSize(22).fillColor('#6B7280').font('Helvetica');
        doc.text('OF COMPLETION', pageWidth / 2 - 100, 145, { width: 200, align: 'center' });

        // Body
        doc.fontSize(14).fillColor('#4B5563');
        doc.text('This is to certify that:', pageWidth / 2 - 100, 190, { width: 200, align: 'center' });

        // Student name
        doc.fontSize(42).fillColor('#1E3A5F').font('Helvetica-BoldOblique');
        doc.text(user.name, 150, 220, { width: pageWidth - 300, align: 'center' });

        // Course completion text
        doc.fontSize(14).fillColor('#4B5563').font('Helvetica');
        doc.text('For successfully completing the AI Certification Interview for', 150, 280, { width: pageWidth - 300, align: 'center' });

        // Course name
        doc.fontSize(18).fillColor('#1E3A5F').font('Helvetica-Bold');
        doc.text(`Course: ${session.course.title}`, 150, 310, { width: pageWidth - 300, align: 'center' });

        // Date and Certificate ID
        const completionDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        doc.fontSize(12).fillColor('#4B5563').font('Helvetica');
        doc.text(`Completed Date: ${completionDate}`, 150, 350, { width: pageWidth - 300, align: 'center' });
        doc.text(`Certificate ID: ${certificateId}`, 150, 370, { width: pageWidth - 300, align: 'center' });
        doc.text(`Interview Score: ${(session.averageScore * 10).toFixed(0)}%`, 150, 390, { width: pageWidth - 300, align: 'center' });

        // Footer
        const footerY = pageHeight - 120;

        doc.fontSize(10).fillColor('#6B7280');
        doc.text(verificationCode, 120, footerY);
        doc.fontSize(8);
        doc.text('SERIAL NO.', 120, footerY + 15);
        doc.text(serialNumber, 120, footerY + 27);

        doc.fontSize(10).fillColor('#B8860B').font('Helvetica-Bold');
        doc.text('CERTIFIED BY', pageWidth / 2 - 40, footerY);
        doc.text('VIRTUAL COURSES', pageWidth / 2 - 50, footerY + 15);
        doc.text('AUTHENTIC', pageWidth / 2 - 35, footerY + 30);

        doc.fontSize(16).fillColor('#1E3A5F').font('Helvetica-BoldOblique');
        doc.text('Virtual Courses', pageWidth - 200, footerY);
        doc.fontSize(10).fillColor('#6B7280').font('Helvetica');
        doc.text('Course Mentor', pageWidth - 180, footerY + 20);

        // Wait for PDF to be generated (doc.end() inside promise to avoid race condition)
        const pdfBuffer = await new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            doc.end();
        });

        console.log("PDF generated, size:", pdfBuffer.length, "bytes");

        // Store certificate metadata - PDF will be generated on-demand during download
        // Using certificateId as reference instead of uploading to Cloudinary
        const pdfUrl = certificateId; // Simple reference - will regenerate on download

        // Create certificate record
        const baseUrl = pdfUrl;
        
        const certificate = await Certificate.create({
            user: userId,
            course: session.course._id,
            interviewSession: sessionId,
            certificateId,
            serialNumber,
            studentName: user.name,
            courseName: session.course.title,
            interviewScore: session.averageScore * 10,
            pdfUrl: baseUrl,
            verificationCode
        });

        return res.status(201).json({
            message: "Certificate generated successfully",
            certificate: {
                _id: certificate._id,
                certificateId: certificate.certificateId,
                serialNumber: certificate.serialNumber,
                pdfUrl: certificate.pdfUrl,
                courseName: certificate.courseName,
                studentName: certificate.studentName,
                completionDate: certificate.completionDate,
                interviewScore: certificate.interviewScore
            }
        });
    } catch (error) {
        console.error("Generate Certificate Error:", error);
        return res.status(500).json({ message: "Error generating certificate", error: error.message });
    }
};

// Get user's certificates
export const getUserCertificates = async (req, res) => {
    try {
        const userId = req.userId;

        const certificates = await Certificate.find({ user: userId })
            .populate("course", "title thumbnail")
            .sort({ createdAt: -1 });

        return res.status(200).json(certificates);
    } catch (error) {
        console.error("Get User Certificates Error:", error);
        return res.status(500).json({ message: "Error fetching certificates", error: error.message });
    }
};

// Download certificate PDF with backend authentication
export const downloadCertificate = async (req, res) => {
    try {
        const userId = req.userId;
        const { certificateId } = req.params;

        // Verify user owns this certificate
        const certificate = await Certificate.findOne({
            _id: certificateId,
            user: userId
        }).populate("course");

        if (!certificate) {
            return res.status(404).json({ message: "Certificate not found" });
        }

        // Get the user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate PDF using helper function
        const pdfBuffer = await generateCertificatePDF(user, certificate);
        console.log("PDF regenerated for download, size:", pdfBuffer.length, "bytes");

        // Set proper headers for PDF download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${certificate.certificateId}.pdf"`,
            'Content-Length': pdfBuffer.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        // Send the PDF buffer
        return res.send(pdfBuffer);

    } catch (error) {
        console.error("Download Certificate Error:", error);
        return res.status(500).json({ message: "Error downloading certificate", error: error.message });
    }
};

// View certificate PDF inline in browser
export const viewCertificate = async (req, res) => {
    try {
        const userId = req.userId;
        const { certificateId } = req.params;

        // Verify user owns this certificate
        const certificate = await Certificate.findOne({
            _id: certificateId,
            user: userId
        }).populate("course");

        if (!certificate) {
            return res.status(404).json({ message: "Certificate not found" });
        }

        // Get the user data
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate PDF using helper function
        const pdfBuffer = await generateCertificatePDF(user, certificate);
        console.log("PDF regenerated for viewing, size:", pdfBuffer.length, "bytes");

        // Set proper headers for inline PDF viewing (not download)
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        // Send the PDF buffer
        return res.send(pdfBuffer);

    } catch (error) {
        console.error("View Certificate Error:", error);
        return res.status(500).json({ message: "Error viewing certificate", error: error.message });
    }
};

// Verify certificate
export const verifyCertificate = async (req, res) => {
    try {
        const { certificateId, verificationCode } = req.body;

        const certificate = await Certificate.findOne({
            $or: [
                { certificateId },
                { verificationCode }
            ]
        }).populate("user", "name").populate("course", "title");

        if (!certificate) {
            return res.status(404).json({ 
                valid: false,
                message: "Certificate not found" 
            });
        }

        return res.status(200).json({
            valid: true,
            certificate: {
                studentName: certificate.studentName,
                courseName: certificate.courseName,
                completionDate: certificate.completionDate,
                certificateId: certificate.certificateId,
                interviewScore: certificate.interviewScore
            }
        });
    } catch (error) {
        console.error("Verify Certificate Error:", error);
        return res.status(500).json({ message: "Error verifying certificate", error: error.message });
    }
};

// Temporary cleanup - delete old certificate so user can regenerate
export const deleteCertificate = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.userId;

        const certificate = await Certificate.findOne({ user: userId, course: courseId });
        if (!certificate) {
            return res.status(404).json({ message: "Certificate not found" });
        }

        const publicId = `certificates/${certificate.certificateId}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });

        await Certificate.deleteOne({ _id: certificate._id });

        return res.status(200).json({ message: "Certificate deleted, you can now regenerate" });
    } catch (error) {
        return res.status(500).json({ message: "Error deleting certificate", error: error.message });
    }
};

// Get course info for certification
export const getCourseInfoForCertification = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.userId;

        const course = await Course.findById(courseId).populate("lectures", "lectureTitle");
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const difficulty = analyzeDifficulty(course.lectures, course.level);
        const totalLectures = course.lectures.length;
        const estimatedTime = difficulty === "Beginner" ? 15 : difficulty === "Intermediate" ? 25 : 35;

        return res.status(200).json({
            courseName: course.title,
            courseDescription: course.description,
            difficulty,
            totalLectures,
            estimatedInterviewTime: `${estimatedTime} minutes`,
            lectureTitles: course.lectures.map(l => l.lectureTitle)
        });
    } catch (error) {
        console.error("Get Course Info Error:", error);
        return res.status(500).json({ message: "Error fetching course info", error: error.message });
    }
};
