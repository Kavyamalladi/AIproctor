import Exam from "../models/examModel.js";
import Question from "../models/questionModel.js";
import ExamAttempt from "../models/examAttemptModel.js";
import ProctoringEvent from "../models/proctoringEventModel.js";
import Course from "../models/courseModel.js";
import User from "../models/userModel.js";

// ==================== EXAM CRUD OPERATIONS ====================

// Create a new exam for a course
export const createExam = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      examType,
      duration,
      totalMarks,
      passingMarks,
      startTime,
      endTime,
      instructions,
      shuffleQuestions,
      showResultImmediately,
      showProctoringReport,
      allowReview,
      proctoring,
    } = req.body;

    // Verify course exists and user is the creator
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to create an exam for this course" });
    }

    const exam = await Exam.create({
      title,
      description,
      course: courseId,
      creator: req.userId,
      examType: examType || "mcq",
      duration: duration || 60,
      totalMarks: totalMarks || 100,
      passingMarks: passingMarks || 40,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      instructions,
      shuffleQuestions: shuffleQuestions || false,
      showResultImmediately: showResultImmediately !== false,
      showProctoringReport: showProctoringReport || false,
      allowReview: allowReview !== false,
      proctoring: proctoring || {
        enabled: true,
        faceDetection: true,
        multipleFaceDetection: true,
        phoneDetection: true,
        eyeTracking: true,
        audioDetection: true,
        tabSwitchDetection: true,
        screenMonitoring: true,
        autoSubmitOnViolation: false,
        maxViolations: 5,
      },
    });

    return res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    console.error("Create exam error:", error);
    return res.status(500).json({ message: `Failed to create exam: ${error.message}` });
  }
};

// Get all exams for a course (instructor view)
export const getExamsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const exams = await Exam.find({ course: courseId })
      .populate("questions")
      .populate({
        path: "attempts",
        populate: { path: "student", select: "name email photoUrl" },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json(exams);
  } catch (error) {
    console.error("Get exams error:", error);
    return res.status(500).json({ message: `Failed to get exams: ${error.message}` });
  }
};

// Get exam by ID
export const getExamById = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId)
      .populate("questions")
      .populate("course", "title creator enrolledStudents")
      .populate("creator", "name email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    return res.status(200).json(exam);
  } catch (error) {
    console.error("Get exam error:", error);
    return res.status(500).json({ message: `Failed to get exam: ${error.message}` });
  }
};

// Update exam
export const updateExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const updateData = { ...req.body };

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to update this exam" });
    }

    // Handle date fields - convert to Date or remove if empty
    if (updateData.startTime && updateData.startTime !== "") {
      updateData.startTime = new Date(updateData.startTime);
    } else if (updateData.startTime === "") {
      updateData.startTime = null;
    }
    
    if (updateData.endTime && updateData.endTime !== "") {
      updateData.endTime = new Date(updateData.endTime);
    } else if (updateData.endTime === "") {
      updateData.endTime = null;
    }

    const updatedExam = await Exam.findByIdAndUpdate(examId, updateData, { new: true })
      .populate("questions")
      .populate("course", "title");

    return res.status(200).json({
      message: "Exam updated successfully",
      exam: updatedExam,
    });
  } catch (error) {
    console.error("Update exam error:", error);
    return res.status(500).json({ message: `Failed to update exam: ${error.message}` });
  }
};

// Delete exam
export const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to delete this exam" });
    }

    // Delete associated questions
    await Question.deleteMany({ exam: examId });

    // Delete associated attempts and proctoring events
    const attempts = await ExamAttempt.find({ exam: examId });
    for (const attempt of attempts) {
      await ProctoringEvent.deleteMany({ examAttempt: attempt._id });
    }
    await ExamAttempt.deleteMany({ exam: examId });

    await exam.deleteOne();

    return res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return res.status(500).json({ message: `Failed to delete exam: ${error.message}` });
  }
};

// Publish/Unpublish exam
export const toggleExamPublish = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to modify this exam" });
    }

    // Check if exam has questions before publishing
    if (!exam.isPublished && exam.questions.length === 0) {
      return res.status(400).json({ message: "Cannot publish exam without questions" });
    }

    exam.isPublished = !exam.isPublished;
    exam.isActive = exam.isPublished;
    await exam.save();

    return res.status(200).json({
      message: exam.isPublished ? "Exam published successfully" : "Exam unpublished successfully",
      exam,
    });
  } catch (error) {
    console.error("Toggle publish error:", error);
    return res.status(500).json({ message: `Failed to toggle publish: ${error.message}` });
  }
};

// ==================== QUESTION OPERATIONS ====================

// Add question to exam
export const addQuestion = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionText, questionType, options, expectedAnswer, aiKeywords, marks, negativeMarks, explanation, difficulty, imageUrl } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to add questions to this exam" });
    }

    // Get the next order number
    const lastQuestion = await Question.findOne({ exam: examId }).sort({ order: -1 });
    const order = lastQuestion ? lastQuestion.order + 1 : 1;

    const question = await Question.create({
      exam: examId,
      questionText,
      questionType: questionType || "mcq",
      options: options || [],
      expectedAnswer,
      aiKeywords: aiKeywords || [],
      marks: marks || 1,
      negativeMarks: negativeMarks || 0,
      explanation,
      difficulty: difficulty || "medium",
      imageUrl,
      order,
    });

    // Add question to exam
    exam.questions.push(question._id);
    await exam.save();

    return res.status(201).json({
      message: "Question added successfully",
      question,
    });
  } catch (error) {
    console.error("Add question error:", error);
    return res.status(500).json({ message: `Failed to add question: ${error.message}` });
  }
};

// Add multiple questions at once
export const addBulkQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Questions array is required" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to add questions to this exam" });
    }

    // Get the current max order
    const lastQuestion = await Question.findOne({ exam: examId }).sort({ order: -1 });
    let currentOrder = lastQuestion ? lastQuestion.order : 0;

    const createdQuestions = [];
    for (const q of questions) {
      currentOrder++;
      const question = await Question.create({
        exam: examId,
        questionText: q.questionText,
        questionType: q.questionType || "mcq",
        options: q.options || [],
        expectedAnswer: q.expectedAnswer,
        aiKeywords: q.aiKeywords || [],
        marks: q.marks || 1,
        negativeMarks: q.negativeMarks || 0,
        explanation: q.explanation,
        difficulty: q.difficulty || "medium",
        imageUrl: q.imageUrl,
        order: currentOrder,
      });
      createdQuestions.push(question);
      exam.questions.push(question._id);
    }

    await exam.save();

    return res.status(201).json({
      message: `${createdQuestions.length} questions added successfully`,
      questions: createdQuestions,
    });
  } catch (error) {
    console.error("Add bulk questions error:", error);
    return res.status(500).json({ message: `Failed to add questions: ${error.message}` });
  }
};

// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const updateData = req.body;

    const question = await Question.findById(questionId).populate("exam");
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to update this question" });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(questionId, updateData, { new: true });

    return res.status(200).json({
      message: "Question updated successfully",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Update question error:", error);
    return res.status(500).json({ message: `Failed to update question: ${error.message}` });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId).populate("exam");
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question.exam.creator.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to delete this question" });
    }

    // Remove from exam's questions array
    await Exam.findByIdAndUpdate(question.exam._id, {
      $pull: { questions: questionId },
    });

    await question.deleteOne();

    return res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Delete question error:", error);
    return res.status(500).json({ message: `Failed to delete question: ${error.message}` });
  }
};

// ==================== STUDENT EXAM OPERATIONS ====================

// Get available exams for enrolled student
export const getStudentExams = async (req, res) => {
  try {
    const userId = req.userId;

    // Get courses where student is enrolled
    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrolledCourseIds = user.enrolledCourses.map((c) => c._id);

    // Get ALL published exams for enrolled courses (including expired and upcoming)
    const now = new Date();
    const exams = await Exam.find({
      course: { $in: enrolledCourseIds },
      isPublished: true,
      isActive: true,
    })
      .populate("course", "title thumbnail")
      .populate("creator", "name")
      .select("-questions") // Don't send questions yet
      .sort({ createdAt: -1 });

    // Get student's attempts for these exams
    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
      exam: { $in: examIds },
      student: userId,
    }).select("exam status totalMarksObtained percentage startedAt completedAt");

    // Map attempts to exams
    const examsWithAttempts = exams.map((exam) => {
      const examAttempts = attempts.filter((a) => a.exam.toString() === exam._id.toString());
      const completedAttempts = examAttempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
      const inProgressAttempt = examAttempts.find((a) => a.status === "in_progress" || a.status === "started");
      const lastAttempt = examAttempts.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt))[0];
      
      const maxAttempts = exam.maxAttempts || 1;
      // Count all attempts (completed + in_progress) for display
      const totalAttemptCount = completedAttempts.length + (inProgressAttempt ? 1 : 0);
      // Remaining attempts should also account for in_progress
      const remainingAttempts = maxAttempts - totalAttemptCount;
      
      // Check time constraints
      const isNotStartedYet = exam.startTime && new Date(exam.startTime) > now;
      const isExpired = exam.endTime && new Date(exam.endTime) < now;
      const isWithinTimeWindow = !isNotStartedYet && !isExpired;
      
      return {
        ...exam.toObject(),
        attempt: lastAttempt || null,
        hasAttempted: examAttempts.length > 0,
        attemptCount: totalAttemptCount,
        remainingAttempts: remainingAttempts,
        canAttempt: remainingAttempts > 0 && !inProgressAttempt && isWithinTimeWindow,
        canContinue: !!inProgressAttempt && isWithinTimeWindow,
        inProgressAttemptId: inProgressAttempt?._id || null,
        maxAttempts: maxAttempts,
        isExpired: isExpired,
        isNotStartedYet: isNotStartedYet,
        status: isNotStartedYet ? "upcoming" : isExpired ? "expired" : "active",
      };
    });

    return res.status(200).json(examsWithAttempts);
  } catch (error) {
    console.error("Get student exams error:", error);
    return res.status(500).json({ message: `Failed to get exams: ${error.message}` });
  }
};

// Get available exams for a specific course (student view)
export const getStudentExamsByCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    // Get user and verify enrollment in this course
    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isEnrolled = user.enrolledCourses.some(
      (c) => c._id.toString() === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    // Get published exams for this specific course
    const now = new Date();
    const exams = await Exam.find({
      course: courseId,
      isPublished: true,
      isActive: true,
    })
      .populate("course", "title thumbnail")
      .populate("creator", "name")
      .select("-questions")
      .sort({ createdAt: -1 });

    // Get student's attempts for these exams
    const examIds = exams.map((e) => e._id);
    const attempts = await ExamAttempt.find({
      exam: { $in: examIds },
      student: userId,
    }).select("exam status totalMarksObtained percentage startedAt completedAt");

    // Map attempts to exams with attempt info
    const examsWithAttempts = exams.map((exam) => {
      const examAttempts = attempts.filter((a) => a.exam.toString() === exam._id.toString());
      const completedAttempts = examAttempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
      const inProgressAttempt = examAttempts.find((a) => a.status === "in_progress" || a.status === "started");
      const lastAttempt = examAttempts.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt))[0];
      
      const maxAttempts = exam.maxAttempts || 1;
      const totalAttemptCount = completedAttempts.length + (inProgressAttempt ? 1 : 0);
      const remainingAttempts = maxAttempts - totalAttemptCount;
      
      const isNotStartedYet = exam.startTime && new Date(exam.startTime) > now;
      const isExpired = exam.endTime && new Date(exam.endTime) < now;
      const isWithinTimeWindow = !isNotStartedYet && !isExpired;
      
      return {
        ...exam.toObject(),
        attempt: lastAttempt || null,
        hasAttempted: examAttempts.length > 0,
        attemptCount: totalAttemptCount,
        remainingAttempts: remainingAttempts,
        canAttempt: remainingAttempts > 0 && !inProgressAttempt && isWithinTimeWindow,
        canContinue: !!inProgressAttempt && isWithinTimeWindow,
        inProgressAttemptId: inProgressAttempt?._id || null,
        maxAttempts: maxAttempts,
        isExpired: isExpired,
        isNotStartedYet: isNotStartedYet,
        status: isNotStartedYet ? "upcoming" : isExpired ? "expired" : "active",
      };
    });

    return res.status(200).json(examsWithAttempts);
  } catch (error) {
    console.error("Get student exams by course error:", error);
    return res.status(500).json({ message: `Failed to get exams: ${error.message}` });
  }
};

// Get exam history for a specific course (student view)
export const getStudentExamHistoryByCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId } = req.params;

    // Verify user is enrolled in this course
    const user = await User.findById(userId).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isEnrolled = user.enrolledCourses.some(
      (c) => c._id.toString() === courseId
    );

    if (!isEnrolled) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    // Get all exams for this course
    const courseExams = await Exam.find({ course: courseId });
    const courseExamIds = courseExams.map((e) => e._id);

    // Get attempts for these exams by the student
    const attempts = await ExamAttempt.find({
      exam: { $in: courseExamIds },
      student: userId,
    })
      .populate({
        path: "exam",
        select: "title totalMarks passingMarks course",
        populate: { path: "course", select: "title thumbnail" },
      })
      .sort({ createdAt: -1 });

    const history = attempts.map((attempt) => ({
      _id: attempt._id,
      exam: {
        _id: attempt.exam._id,
        title: attempt.exam.title,
        totalMarks: attempt.exam.totalMarks,
        passingMarks: attempt.exam.passingMarks,
      },
      course: attempt.exam.course,
      status: attempt.status,
      totalMarksObtained: attempt.totalMarksObtained,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      riskLevel: attempt.riskLevel,
    }));

    return res.status(200).json(history);
  } catch (error) {
    console.error("Get history by course error:", error);
    return res.status(500).json({ message: `Failed to get history: ${error.message}` });
  }
};

// Start exam attempt
export const startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.userId;
    const { ipAddress, browserInfo } = req.body;

    const exam = await Exam.findById(examId)
      .populate("questions")
      .populate("course", "enrolledStudents");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check if student is enrolled in the course
    const isEnrolled = exam.course.enrolledStudents.some(
      (studentId) => studentId.toString() === userId
    );

    if (!isEnrolled) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    // Check if exam is active and within time window
    const now = new Date();
    if (!exam.isPublished || !exam.isActive) {
      return res.status(400).json({ message: "Exam is not available" });
    }

    if (exam.startTime && now < exam.startTime) {
      return res.status(400).json({ message: "Exam has not started yet" });
    }

    if (exam.endTime && now > exam.endTime) {
      return res.status(400).json({ message: "Exam has ended" });
    }

    // Check if student already has an active attempt
    const existingAttempt = await ExamAttempt.findOne({
      exam: examId,
      student: userId,
      status: { $in: ["started", "in_progress"] },
    });

    if (existingAttempt) {
      // Return existing attempt
      const questions = exam.shuffleQuestions
        ? shuffleArray([...exam.questions])
        : exam.questions;

      // Remove correct answers from questions for student
      const sanitizedQuestions = questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options.map((opt) => ({
          optionText: opt.optionText,
          _id: opt._id,
        })),
        marks: q.marks,
        imageUrl: q.imageUrl,
        order: q.order,
      }));

      return res.status(200).json({
        message: "Resuming existing attempt",
        attempt: existingAttempt,
        exam: {
          ...exam.toObject(),
          questions: sanitizedQuestions,
        },
        isResume: true,
      });
    }

    // Check if student has reached max attempts
    const completedAttempts = await ExamAttempt.countDocuments({
      exam: examId,
      student: userId,
      status: { $in: ["submitted", "auto_submitted"] },
    });

    const maxAttempts = exam.maxAttempts || 1;
    if (completedAttempts >= maxAttempts) {
      return res.status(400).json({ message: `You have reached the maximum of ${maxAttempts} attempt(s) for this exam` });
    }

    // Create new attempt
    const attempt = await ExamAttempt.create({
      exam: examId,
      student: userId,
      course: exam.course._id,
      status: "in_progress",
      proctoringEnabled: exam.proctoring.enabled,
      ipAddress,
      browserInfo,
      requiresManualReview: exam.examType !== "mcq",
    });

    // Add attempt to exam
    exam.attempts.push(attempt._id);
    await exam.save();

    // Prepare questions for student
    const questions = exam.shuffleQuestions
      ? shuffleArray([...exam.questions])
      : exam.questions;

    // Remove correct answers from questions
    const sanitizedQuestions = questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options.map((opt) => ({
        optionText: opt.optionText,
        _id: opt._id,
      })),
      marks: q.marks,
      imageUrl: q.imageUrl,
      order: q.order,
    }));

    return res.status(201).json({
      message: "Exam started successfully",
      attempt,
      exam: {
        _id: exam._id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        instructions: exam.instructions,
        proctoring: exam.proctoring,
        questions: sanitizedQuestions,
      },
      isResume: false,
    });
  } catch (error) {
    console.error("Start exam error:", error);
    return res.status(500).json({ message: `Failed to start exam: ${error.message}` });
  }
};

// Submit answer for a question
export const submitAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOption, textAnswer } = req.body;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status !== "in_progress" && attempt.status !== "started") {
      return res.status(400).json({ message: "Exam is no longer active" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Find or create answer entry
    const existingAnswerIndex = attempt.answers.findIndex(
      (a) => a.question.toString() === questionId
    );

    const answerData = {
      question: questionId,
      selectedOption: selectedOption !== undefined ? selectedOption : null,
      textAnswer: textAnswer || null,
      answeredAt: new Date(),
    };

    // Auto-evaluate MCQ answers
    if (question.questionType === "mcq" && selectedOption !== undefined) {
      const isCorrect = question.options[selectedOption]?.isCorrect || false;
      answerData.isCorrect = isCorrect;
      answerData.marksObtained = isCorrect ? question.marks : -(question.negativeMarks || 0);
    }

    // Auto-evaluate True/False answers
    if (question.questionType === "true_false" && selectedOption !== undefined) {
      // For true_false, options are typically [{optionText: "True", isCorrect: true/false}, {optionText: "False", isCorrect: true/false}]
      const isCorrect = question.options[selectedOption]?.isCorrect || false;
      answerData.isCorrect = isCorrect;
      answerData.marksObtained = isCorrect ? question.marks : 0;
    }

    if (existingAnswerIndex >= 0) {
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      attempt.answers.push(answerData);
    }

    await attempt.save();

    return res.status(200).json({
      message: "Answer saved",
      answer: answerData,
    });
  } catch (error) {
    console.error("Submit answer error:", error);
    return res.status(500).json({ message: `Failed to submit answer: ${error.message}` });
  }
};

// Submit entire exam
export const submitExam = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers, timeSpent, autoSubmit, autoSubmitReason } = req.body;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate({
        path: "exam",
        populate: { path: "questions" },
      });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (attempt.status === "submitted" || attempt.status === "auto_submitted") {
      return res.status(400).json({ message: "Exam already submitted" });
    }

    // Process all answers if provided
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        const question = attempt.exam.questions.find(
          (q) => q._id.toString() === ans.questionId
        );

        if (question) {
          const existingAnswerIndex = attempt.answers.findIndex(
            (a) => a.question.toString() === ans.questionId
          );

          const answerData = {
            question: ans.questionId,
            selectedOption: ans.selectedOption !== undefined ? ans.selectedOption : null,
            textAnswer: ans.textAnswer || null,
            answeredAt: new Date(),
          };

          // Auto-evaluate MCQ
          if (question.questionType === "mcq" && ans.selectedOption !== undefined) {
            const isCorrect = question.options[ans.selectedOption]?.isCorrect || false;
            answerData.isCorrect = isCorrect;
            answerData.marksObtained = isCorrect ? question.marks : -question.negativeMarks;
          } else if (question.questionType === "true_false" && ans.selectedOption !== undefined) {
            const isCorrect = question.options[ans.selectedOption]?.isCorrect || false;
            answerData.isCorrect = isCorrect;
            answerData.marksObtained = isCorrect ? question.marks : 0;
          }

          if (existingAnswerIndex >= 0) {
            attempt.answers[existingAnswerIndex] = answerData;
          } else {
            attempt.answers.push(answerData);
          }
        }
      }
    }

    // Calculate total score
    let totalMarksObtained = 0;
    attempt.answers.forEach((ans) => {
      totalMarksObtained += ans.marksObtained || 0;
    });

    attempt.totalMarksObtained = Math.max(0, totalMarksObtained);
    attempt.percentage = (attempt.totalMarksObtained / attempt.exam.totalMarks) * 100;
    attempt.isPassed = attempt.totalMarksObtained >= attempt.exam.passingMarks;
    attempt.status = autoSubmit ? "auto_submitted" : "submitted";
    attempt.submittedAt = new Date();
    attempt.completedAt = new Date();
    attempt.timeSpent = timeSpent || 0;

    if (autoSubmitReason) {
      attempt.autoSubmitReason = autoSubmitReason;
    }

    // Calculate risk score
    attempt.calculateRiskScore();

    // Check if manual review is needed
    attempt.requiresManualReview = attempt.exam.examType !== "mcq" || 
      attempt.answers.some((a) => a.textAnswer);

    await attempt.save();

    return res.status(200).json({
      message: autoSubmit ? "Exam auto-submitted" : "Exam submitted successfully",
      result: {
        totalMarksObtained: attempt.totalMarksObtained,
        totalMarks: attempt.exam.totalMarks,
        percentage: attempt.percentage.toFixed(2),
        isPassed: attempt.isPassed,
        status: attempt.status,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
      },
    });
  } catch (error) {
    console.error("Submit exam error:", error);
    return res.status(500).json({ message: `Failed to submit exam: ${error.message}` });
  }
};

// Get exam result for student
export const getExamResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate({
        path: "exam",
        populate: { path: "questions" },
      })
      .populate("violations");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Allow student to see their own result or instructor to see any result
    const exam = await Exam.findById(attempt.exam._id);
    const isInstructor = exam.creator.toString() === userId;
    const isStudent = attempt.student.toString() === userId;

    if (!isInstructor && !isStudent) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Calculate correct answers count
    const correctAnswersCount = attempt.answers.filter(ans => ans.isCorrect === true).length;
    
    // Calculate time spent in seconds
    let actualTimeSpent = attempt.timeSpent;
    if (!actualTimeSpent && attempt.startedAt && attempt.completedAt) {
      // Calculate from timestamps if not saved
      actualTimeSpent = Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 1000);
    }

    // Prepare result data
    const result = {
      _id: attempt._id,
      exam: {
        _id: attempt.exam._id,
        title: attempt.exam.title,
        totalMarks: attempt.exam.totalMarks,
        passingMarks: attempt.exam.passingMarks,
        duration: attempt.exam.duration,
        totalQuestions: attempt.exam.questions?.length || 0,
        showResultImmediately: attempt.exam.showResultImmediately,
        showProctoringReport: attempt.exam.showProctoringReport,
        allowReview: attempt.exam.allowReview,
      },
      status: attempt.status,
      totalMarksObtained: attempt.totalMarksObtained,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      correctAnswers: correctAnswersCount,
      totalQuestions: attempt.exam.questions?.length || 0,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      submittedAt: attempt.completedAt,
      timeSpent: actualTimeSpent,
    };

    // Include detailed answers if review is allowed or it's instructor
    if (attempt.exam.allowReview || isInstructor) {
      result.answers = attempt.answers.map((ans) => {
        const question = attempt.exam.questions.find(
          (q) => q._id.toString() === ans.question.toString()
        );
        return {
          question: {
            _id: question?._id,
            questionText: question?.questionText,
            questionType: question?.questionType,
            options: question?.options,
            explanation: question?.explanation,
            marks: question?.marks,
          },
          selectedOption: ans.selectedOption,
          textAnswer: ans.textAnswer,
          isCorrect: ans.isCorrect,
          marksObtained: ans.marksObtained,
          feedback: ans.feedback,
        };
      });
    }

    // Include proctoring data for instructor or if student is allowed to see
    if (isInstructor || attempt.exam.showProctoringReport) {
      result.proctoring = {
        enabled: attempt.proctoringEnabled,
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
        tabSwitchCount: attempt.tabSwitchCount,
        violations: isInstructor ? attempt.violations : attempt.violations.length,
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get result error:", error);
    return res.status(500).json({ message: `Failed to get result: ${error.message}` });
  }
};

// Get student exam history
export const getStudentExamHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const attempts = await ExamAttempt.find({ student: userId })
      .populate({
        path: "exam",
        select: "title totalMarks passingMarks course",
        populate: { path: "course", select: "title thumbnail" },
      })
      .sort({ createdAt: -1 });

    const history = attempts.map((attempt) => ({
      _id: attempt._id,
      exam: {
        _id: attempt.exam._id,
        title: attempt.exam.title,
        totalMarks: attempt.exam.totalMarks,
        passingMarks: attempt.exam.passingMarks,
      },
      course: attempt.exam.course,
      status: attempt.status,
      totalMarksObtained: attempt.totalMarksObtained,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      riskLevel: attempt.riskLevel,
    }));

    return res.status(200).json(history);
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(500).json({ message: `Failed to get history: ${error.message}` });
  }
};

// ==================== INSTRUCTOR DASHBOARD ====================

// Get exam analytics for instructor
export const getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;
    const userId = req.userId;

    const exam = await Exam.findById(examId)
      .populate("course", "enrolledStudents");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get all attempts for this exam
    const attempts = await ExamAttempt.find({ exam: examId })
      .populate("student", "name email photoUrl")
      .populate("violations");

    // Calculate analytics
    const totalEnrolled = exam.course.enrolledStudents.length;
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted");
    const passedStudents = completedAttempts.filter((a) => a.isPassed);
    const avgScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, a) => sum + a.percentage, 0) / completedAttempts.length
      : 0;

    // Students who haven't attempted
    const attemptedStudentIds = attempts.map((a) => a.student._id.toString());
    const notAttemptedCount = exam.course.enrolledStudents.filter(
      (s) => !attemptedStudentIds.includes(s.toString())
    ).length;

    // Proctoring statistics
    const suspiciousCases = attempts.filter((a) => a.riskLevel === "high" || a.riskLevel === "critical");
    const totalViolations = attempts.reduce((sum, a) => sum + a.totalViolations, 0);

    // Detailed student list
    const studentData = attempts.map((attempt) => ({
      _id: attempt._id,
      student: attempt.student,
      status: attempt.status,
      score: attempt.totalMarksObtained,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      timeSpent: attempt.timeSpent,
      riskScore: attempt.riskScore,
      riskLevel: attempt.riskLevel,
      totalViolations: attempt.totalViolations,
      tabSwitchCount: attempt.tabSwitchCount,
      requiresReview: attempt.requiresManualReview,
    }));

    return res.status(200).json({
      exam: {
        _id: exam._id,
        title: exam.title,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
      },
      analytics: {
        totalEnrolled,
        totalAttempts,
        completedCount: completedAttempts.length,
        notAttemptedCount,
        passedCount: passedStudents.length,
        failedCount: completedAttempts.length - passedStudents.length,
        passRate: completedAttempts.length > 0
          ? ((passedStudents.length / completedAttempts.length) * 100).toFixed(2)
          : 0,
        averageScore: avgScore.toFixed(2),
        suspiciousCasesCount: suspiciousCases.length,
        totalViolations,
      },
      students: studentData,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({ message: `Failed to get analytics: ${error.message}` });
  }
};

// Get detailed proctoring report for an attempt
export const getProctoringReport = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("student", "name email photoUrl")
      .populate("exam", "title creator proctoring")
      .populate("violations");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Verify instructor
    if (attempt.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Group violations by type
    const violationsByType = {};
    attempt.violations.forEach((v) => {
      if (!violationsByType[v.eventType]) {
        violationsByType[v.eventType] = [];
      }
      violationsByType[v.eventType].push({
        _id: v._id,
        severity: v.severity,
        description: v.description,
        confidence: v.confidence,
        screenshotUrl: v.screenshotUrl,
        audioUrl: v.audioUrl,
        occurredAt: v.occurredAt,
        duration: v.duration,
        isReviewed: v.isReviewed,
        isFalsePositive: v.isFalsePositive,
      });
    });

    return res.status(200).json({
      attempt: {
        _id: attempt._id,
        student: attempt.student,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        timeSpent: attempt.timeSpent,
      },
      exam: attempt.exam,
      proctoring: {
        enabled: attempt.proctoringEnabled,
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
        tabSwitchCount: attempt.tabSwitchCount,
        autoSubmitReason: attempt.autoSubmitReason,
      },
      violationsByType,
      violations: attempt.violations,
    });
  } catch (error) {
    console.error("Get proctoring report error:", error);
    return res.status(500).json({ message: `Failed to get report: ${error.message}` });
  }
};

// Review and grade descriptive answer
export const gradeAnswer = async (req, res) => {
  try {
    const { attemptId, questionId } = req.params;
    const { score, feedback } = req.body;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam");
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Find and update the answer
    const answerIndex = attempt.answers.findIndex(
      (a) => a.question.toString() === questionId
    );

    if (answerIndex === -1) {
      return res.status(404).json({ message: "Answer not found" });
    }

    attempt.answers[answerIndex].instructorScore = score;
    attempt.answers[answerIndex].marksObtained = score;
    attempt.answers[answerIndex].feedback = feedback;

    // Recalculate total
    let totalMarks = 0;
    attempt.answers.forEach((ans) => {
      totalMarks += ans.marksObtained || 0;
    });

    attempt.totalMarksObtained = Math.max(0, totalMarks);
    attempt.percentage = (attempt.totalMarksObtained / attempt.exam.totalMarks) * 100;
    attempt.isPassed = attempt.totalMarksObtained >= attempt.exam.passingMarks;

    // Check if all answers are graded
    const hasUngraded = attempt.answers.some(
      (a) => a.textAnswer && a.instructorScore === undefined
    );
    attempt.requiresManualReview = hasUngraded;

    if (!hasUngraded) {
      attempt.reviewedBy = userId;
      attempt.reviewedAt = new Date();
    }

    await attempt.save();

    return res.status(200).json({
      message: "Answer graded successfully",
      totalMarksObtained: attempt.totalMarksObtained,
      percentage: attempt.percentage,
      isPassed: attempt.isPassed,
    });
  } catch (error) {
    console.error("Grade answer error:", error);
    return res.status(500).json({ message: `Failed to grade answer: ${error.message}` });
  }
};

// Mark proctoring event as reviewed
export const reviewProctoringEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { isFalsePositive, notes } = req.body;
    const userId = req.userId;

    const event = await ProctoringEvent.findById(eventId).populate({
      path: "exam",
      select: "creator",
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    event.isReviewed = true;
    event.reviewedBy = userId;
    event.reviewedAt = new Date();
    event.reviewNotes = notes;
    event.isFalsePositive = isFalsePositive || false;

    await event.save();

    // If marked as false positive, update attempt's risk score
    if (isFalsePositive) {
      const attempt = await ExamAttempt.findById(event.examAttempt);
      if (attempt) {
        attempt.totalViolations = Math.max(0, attempt.totalViolations - 1);
        attempt.calculateRiskScore();
        await attempt.save();
      }
    }

    return res.status(200).json({ message: "Event reviewed successfully" });
  } catch (error) {
    console.error("Review event error:", error);
    return res.status(500).json({ message: `Failed to review event: ${error.message}` });
  }
};

// Get exam attempt details for instructor
export const getExamAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("student", "name email photoUrl")
      .populate("exam", "title creator totalMarks passingMarks duration proctoring")
      .populate("course", "title")
      .populate({
        path: "violations",
        options: { sort: { occurredAt: -1 } }
      })
      .populate({
        path: "answers.question",
        select: "questionText questionType options correctOption marks"
      });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Verify instructor
    if (attempt.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Filter critical violations (those with high/critical severity)
    const criticalViolations = attempt.violations.filter(
      (v) => v.severity === "high" || v.severity === "critical"
    );

    return res.status(200).json({
      attempt: {
        _id: attempt._id,
        student: attempt.student,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        submittedAt: attempt.submittedAt,
        totalMarksObtained: attempt.totalMarksObtained,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        timeSpent: attempt.timeSpent,
        autoSubmitReason: attempt.autoSubmitReason,
      },
      exam: attempt.exam,
      course: attempt.course,
      proctoring: {
        enabled: attempt.proctoringEnabled,
        totalViolations: attempt.totalViolations,
        riskScore: attempt.riskScore,
        riskLevel: attempt.riskLevel,
        tabSwitchCount: attempt.tabSwitchCount,
      },
      answers: attempt.answers,
      allViolations: attempt.violations,
      criticalViolations,
    });
  } catch (error) {
    console.error("Get exam attempt details error:", error);
    return res.status(500).json({ message: `Failed to get attempt details: ${error.message}` });
  }
};

// Delete exam attempt (instructor only)
export const deleteExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.userId;

    const attempt = await ExamAttempt.findById(attemptId).populate("exam", "creator");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Verify instructor
    if (attempt.exam.creator.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized - Only the course instructor can delete this record" });
    }

    const examId = attempt.exam._id;

    // Delete all proctoring events associated with this attempt
    await ProctoringEvent.deleteMany({ examAttempt: attemptId });

    // Remove the attempt reference from the Exam model's attempts array
    await Exam.findByIdAndUpdate(examId, {
      $pull: { attempts: attemptId }
    });

    // Delete the attempt itself
    await ExamAttempt.findByIdAndDelete(attemptId);

    return res.status(200).json({ 
      message: "Exam attempt record deleted successfully",
      deletedAttemptId: attemptId 
    });
  } catch (error) {
    console.error("Delete exam attempt error:", error);
    return res.status(500).json({ message: `Failed to delete attempt: ${error.message}` });
  }
};

// Helper function to shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
