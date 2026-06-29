import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Instructor data
  creatorExams: [],
  currentExam: null,
  examAnalytics: null,
  
  // Student data
  availableExams: [],
  examHistory: [],
  
  // Active exam attempt
  currentAttempt: null,
  examQuestions: [],
  answers: {},
  
  // Proctoring data
  proctoringStatus: null,
  violations: [],
  riskScore: 0,
  riskLevel: "low",
  
  // UI states
  isLoading: false,
  isExamActive: false,
  examStartTime: null,
  remainingTime: null,
};

const examSlice = createSlice({
  name: "exam",
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Instructor actions
    setCreatorExams: (state, action) => {
      state.creatorExams = action.payload;
    },
    addCreatorExam: (state, action) => {
      state.creatorExams.unshift(action.payload);
    },
    updateCreatorExam: (state, action) => {
      const index = state.creatorExams.findIndex(
        (exam) => exam._id === action.payload._id
      );
      if (index !== -1) {
        state.creatorExams[index] = action.payload;
      }
    },
    removeCreatorExam: (state, action) => {
      state.creatorExams = state.creatorExams.filter(
        (exam) => exam._id !== action.payload
      );
    },
    setCurrentExam: (state, action) => {
      state.currentExam = action.payload;
    },
    setExamAnalytics: (state, action) => {
      state.examAnalytics = action.payload;
    },

    // Student actions
    setAvailableExams: (state, action) => {
      state.availableExams = action.payload;
    },
    setExamHistory: (state, action) => {
      state.examHistory = action.payload;
    },

    // Active exam attempt
    startExamAttempt: (state, action) => {
      const { attempt, exam, isResume } = action.payload;
      state.currentAttempt = attempt;
      state.examQuestions = exam.questions;
      state.isExamActive = true;
      state.examStartTime = isResume ? attempt.startedAt : new Date().toISOString();
      
      // Initialize answers from saved state if resuming
      if (isResume && attempt.answers) {
        const answersMap = {};
        attempt.answers.forEach((ans) => {
          answersMap[ans.question] = {
            selectedOption: ans.selectedOption,
            textAnswer: ans.textAnswer,
          };
        });
        state.answers = answersMap;
      } else {
        state.answers = {};
      }

      // Initialize proctoring if enabled
      if (exam.proctoring?.enabled) {
        state.proctoringStatus = {
          enabled: true,
          settings: exam.proctoring,
        };
        state.violations = [];
        state.riskScore = attempt.riskScore || 0;
        state.riskLevel = attempt.riskLevel || "low";
      }
    },
    
    saveAnswer: (state, action) => {
      const { questionId, selectedOption, textAnswer } = action.payload;
      state.answers[questionId] = {
        selectedOption,
        textAnswer,
      };
    },

    // Simple setters for TakeExam component
    setCurrentAttempt: (state, action) => {
      state.currentAttempt = action.payload;
    },
    setAnswer: (state, action) => {
      const { questionId, answer } = action.payload;
      state.answers[questionId] = answer;
    },
    setExamActive: (state, action) => {
      state.isExamActive = action.payload;
    },
    updateRiskScore: (state, action) => {
      state.riskScore = action.payload;
      // Update risk level based on score
      if (action.payload <= 20) state.riskLevel = "low";
      else if (action.payload <= 50) state.riskLevel = "medium";
      else if (action.payload <= 75) state.riskLevel = "high";
      else state.riskLevel = "critical";
    },

    updateRemainingTime: (state, action) => {
      state.remainingTime = action.payload;
    },

    endExamAttempt: (state) => {
      state.currentAttempt = null;
      state.examQuestions = [];
      state.answers = {};
      state.isExamActive = false;
      state.examStartTime = null;
      state.remainingTime = null;
      state.proctoringStatus = null;
      state.violations = [];
      state.riskScore = 0;
      state.riskLevel = "low";
    },

    // Proctoring actions
    setProctoringStatus: (state, action) => {
      state.proctoringStatus = action.payload;
    },
    addViolation: (state, action) => {
      state.violations.push(action.payload);
    },
    // Clear all violations (for new attempt)
    clearViolations: (state) => {
      state.violations = [];
    },
    updateProctoringStats: (state, action) => {
      const { totalViolations, riskScore, riskLevel } = action.payload;
      state.riskScore = riskScore;
      state.riskLevel = riskLevel;
    },

    // Reset
    resetExamState: (state) => {
      return initialState;
    },
  },
});

export const {
  setLoading,
  setCreatorExams,
  addCreatorExam,
  updateCreatorExam,
  removeCreatorExam,
  setCurrentExam,
  setExamAnalytics,
  setAvailableExams,
  setExamHistory,
  startExamAttempt,
  saveAnswer,
  setCurrentAttempt,
  setAnswer,
  setExamActive,
  updateRiskScore,
  updateRemainingTime,
  endExamAttempt,
  setProctoringStatus,
  addViolation,
  clearViolations,
  updateProctoringStats,
  resetExamState,
} = examSlice.actions;

export default examSlice.reducer;
