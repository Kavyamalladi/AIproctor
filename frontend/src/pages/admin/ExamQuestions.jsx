import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../config/serverUrl";
import { FaArrowLeftLong, FaPlus, FaTrash, FaPenToSquare, FaFloppyDisk, FaXmark, FaCheck } from "react-icons/fa6";

function ExamQuestions() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    questionType: "mcq",
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false },
    ],
    expectedAnswer: "",
    marks: 1,
    negativeMarks: 0,
    explanation: "",
    difficulty: "medium",
  });

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/exam/${examId}`, {
        withCredentials: true,
      });
      setExam(res.data);
      setQuestions(res.data.questions || []);
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast.error("Failed to load exam");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.questionText.trim()) {
      toast.error("Please enter question text");
      return;
    }

    if (newQuestion.questionType === "mcq") {
      const hasCorrect = newQuestion.options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        toast.error("Please mark at least one correct answer");
        return;
      }
      const hasEmptyOption = newQuestion.options.some((opt) => !opt.optionText.trim());
      if (hasEmptyOption) {
        toast.error("Please fill all options");
        return;
      }
    }

    try {
      const res = await axios.post(
        `${serverUrl}/api/exam/${examId}/questions`,
        newQuestion,
        { withCredentials: true }
      );
      toast.success("Question added successfully");
      setQuestions([...questions, res.data.question]);
      resetNewQuestion();
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error(error.response?.data?.message || "Failed to add question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion.questionText.trim()) {
      toast.error("Please enter question text");
      return;
    }

    try {
      const res = await axios.put(
        `${serverUrl}/api/exam/questions/${editingQuestion._id}`,
        editingQuestion,
        { withCredentials: true }
      );
      toast.success("Question updated successfully");
      setQuestions(questions.map((q) => (q._id === editingQuestion._id ? res.data.question : q)));
      setEditingQuestion(null);
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error(error.response?.data?.message || "Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;

    try {
      await axios.delete(`${serverUrl}/api/exam/questions/${questionId}`, {
        withCredentials: true,
      });
      toast.success("Question deleted");
      setQuestions(questions.filter((q) => q._id !== questionId));
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error(error.response?.data?.message || "Failed to delete question");
    }
  };

  const resetNewQuestion = () => {
    setNewQuestion({
      questionText: "",
      questionType: "mcq",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false },
      ],
      expectedAnswer: "",
      marks: 1,
      negativeMarks: 0,
      explanation: "",
      difficulty: "medium",
    });
  };

  const handleOptionChange = (index, field, value, isEditing = false) => {
    if (isEditing) {
      const updatedOptions = [...editingQuestion.options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      setEditingQuestion({ ...editingQuestion, options: updatedOptions });
    } else {
      const updatedOptions = [...newQuestion.options];
      updatedOptions[index] = { ...updatedOptions[index], [field]: value };
      setNewQuestion({ ...newQuestion, options: updatedOptions });
    }
  };

  const handleCorrectChange = (index, isEditing = false) => {
    if (isEditing) {
      const updatedOptions = editingQuestion.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setEditingQuestion({ ...editingQuestion, options: updatedOptions });
    } else {
      const updatedOptions = newQuestion.options.map((opt, i) => ({
        ...opt,
        isCorrect: i === index,
      }));
      setNewQuestion({ ...newQuestion, options: updatedOptions });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <FaArrowLeftLong
              className="w-6 h-6 cursor-pointer hover:text-gray-600"
              onClick={() => navigate(`/exammanagement/${exam?.course?._id || exam?.course}`)}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Manage Questions</h1>
              <p className="text-gray-600">{exam?.title}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Total Questions: {questions.length}</p>
            <p className="text-sm text-gray-500">
              Total Marks: {questions.reduce((sum, q) => sum + q.marks, 0)}
            </p>
          </div>
        </div>

        {/* Add Question Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition mb-6"
          >
            <FaPlus /> Add Question
          </button>
        )}

        {/* Add Question Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Add New Question</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text *
                </label>
                <textarea
                  value={newQuestion.questionText}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, questionText: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  rows="3"
                  placeholder="Enter your question"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Type
                  </label>
                  <select
                    value={newQuestion.questionType}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, questionType: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marks
                  </label>
                  <input
                    type="number"
                    value={newQuestion.marks}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={newQuestion.difficulty}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, difficulty: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* MCQ Options */}
              {(newQuestion.questionType === "mcq" || newQuestion.questionType === "true_false") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options (Click to mark as correct)
                  </label>
                  <div className="space-y-2">
                    {(newQuestion.questionType === "true_false"
                      ? [
                          { optionText: "True", isCorrect: false },
                          { optionText: "False", isCorrect: false },
                        ]
                      : newQuestion.options
                    ).map((opt, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleCorrectChange(index)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                            newQuestion.options[index]?.isCorrect
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {newQuestion.options[index]?.isCorrect ? <FaCheck /> : String.fromCharCode(65 + index)}
                        </button>
                        <input
                          type="text"
                          value={
                            newQuestion.questionType === "true_false"
                              ? opt.optionText
                              : newQuestion.options[index]?.optionText || ""
                          }
                          onChange={(e) => handleOptionChange(index, "optionText", e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          disabled={newQuestion.questionType === "true_false"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Descriptive Answer */}
              {newQuestion.questionType === "descriptive" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Answer (for AI evaluation)
                  </label>
                  <textarea
                    value={newQuestion.expectedAnswer}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, expectedAnswer: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    rows="3"
                    placeholder="Enter expected answer or key points"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation (shown after submission)
                </label>
                <textarea
                  value={newQuestion.explanation}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, explanation: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  rows="2"
                  placeholder="Explain the correct answer"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    resetNewQuestion();
                    setShowAddForm(false);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  <FaFloppyDisk /> Save Question
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500 text-lg">No questions yet</p>
              <p className="text-gray-400 mt-2">Add your first question to get started</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question._id} className="bg-white rounded-xl shadow-sm p-6">
                {editingQuestion?._id === question._id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <textarea
                      value={editingQuestion.questionText}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      rows="2"
                    />

                    {editingQuestion.questionType === "mcq" && (
                      <div className="space-y-2">
                        {editingQuestion.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleCorrectChange(optIndex, true)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                                opt.isCorrect
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {opt.isCorrect ? <FaCheck /> : String.fromCharCode(65 + optIndex)}
                            </button>
                            <input
                              type="text"
                              value={opt.optionText}
                              onChange={(e) =>
                                handleOptionChange(optIndex, "optionText", e.target.value, true)
                              }
                              className="flex-1 px-4 py-2 border rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setEditingQuestion(null)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        <FaXmark /> Cancel
                      </button>
                      <button
                        onClick={handleUpdateQuestion}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg"
                      >
                        <FaFloppyDisk /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                            Q{index + 1}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">
                            {question.questionType}
                          </span>
                          <span className="text-sm text-gray-500">
                            {question.marks} mark{question.marks > 1 ? "s" : ""}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              question.difficulty === "easy"
                                ? "bg-green-100 text-green-700"
                                : question.difficulty === "hard"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {question.difficulty}
                          </span>
                        </div>
                        <p className="text-gray-800 font-medium">{question.questionText}</p>

                        {question.questionType === "mcq" && (
                          <div className="mt-3 space-y-1">
                            {question.options.map((opt, optIndex) => (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 text-sm ${
                                  opt.isCorrect ? "text-green-600 font-medium" : "text-gray-600"
                                }`}
                              >
                                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                {opt.optionText}
                                {opt.isCorrect && <FaCheck className="text-green-500 ml-2" />}
                              </div>
                            ))}
                          </div>
                        )}

                        {question.explanation && (
                          <p className="mt-3 text-sm text-gray-500 italic">
                            Explanation: {question.explanation}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingQuestion(question)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <FaPenToSquare />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        {questions.length > 0 && (
          <div className="mt-8 flex justify-between items-center">
            <p className="text-gray-600">
              {questions.length} question{questions.length > 1 ? "s" : ""} •{" "}
              {questions.reduce((sum, q) => sum + q.marks, 0)} total marks
            </p>
            <button
              onClick={() => navigate(`/exammanagement/${exam?.course?._id || exam?.course}`)}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamQuestions;
