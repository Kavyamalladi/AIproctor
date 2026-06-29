import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlayCircle, FaCheckCircle, FaComments, FaBook, FaQuestionCircle, FaFileDownload } from 'react-icons/fa';
import LectureAnnouncements from '../components/LectureAnnouncements';
import GetCertifiedSection from '../components/GetCertifiedSection';
import { FaArrowLeftLong } from "react-icons/fa6";
import { MdSend, MdReply } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import axios from 'axios';
import { serverUrl } from '../config/serverUrl';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';
import { setCourseData } from '../redux/courseSlice';

function ViewLecture() {
  const dispatch = useDispatch();
  const { courseId } = useParams();
  const { courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);
  const selectedCourse = courseData?.find((course) => course._id === courseId);
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [selectedLecture, setSelectedLecture] = useState(selectedCourse?.lectures?.[0] || null);
  const [activeTab, setActiveTab] = useState('comments');
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  
  // Summary state
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Progress state
  const [progress, setProgress] = useState({});
  const [lectureProgress, setLectureProgress] = useState({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedCount, setCompletedCount] = useState(0); // Track completed lectures for certification refresh
  
  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quiz, setQuiz] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const courseCreator = userData?._id === selectedCourse?.creator ? userData : null;

  // Fetch fresh course data on mount to get latest lecture info (including assignments)
  useEffect(() => {
    const fetchFreshCourseData = async () => {
      try {
        const result = await axios.get(serverUrl + "/api/course/getpublishedcourses", { withCredentials: true });
        dispatch(setCourseData(result.data));
      } catch (error) {
        console.error("Error refreshing course data:", error);
      }
    };
    fetchFreshCourseData();
  }, [courseId]);

  // Update selectedLecture when course data changes
  useEffect(() => {
    if (selectedCourse?.lectures?.length > 0 && !selectedLecture) {
      setSelectedLecture(selectedCourse.lectures[0]);
    } else if (selectedCourse?.lectures && selectedLecture) {
      // Update selectedLecture with fresh data
      const updatedLecture = selectedCourse.lectures.find(l => l._id === selectedLecture._id);
      if (updatedLecture && JSON.stringify(updatedLecture) !== JSON.stringify(selectedLecture)) {
        setSelectedLecture(updatedLecture);
      }
    }
  }, [selectedCourse?.lectures]);

  useEffect(() => {
    if (selectedLecture?._id) {
      fetchComments();
      fetchLectureProgress();
      setSummary('');
    }
  }, [selectedLecture?._id]);

  useEffect(() => {
    if (courseId) {
      fetchCourseProgress();
    }
  }, [courseId]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await axios.get(
        `${serverUrl}/api/comment/lecture/${selectedLecture._id}`,
        { withCredentials: true }
      );
      setComments(response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchLectureProgress = async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/api/progress/lecture/${selectedLecture._id}`,
        { withCredentials: true }
      );
      setLectureProgress(response.data);
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/api/progress/course/${courseId}`,
        { withCredentials: true }
      );
      const progressMap = {};
      response.data.forEach(p => {
        progressMap[p.lecture] = p;
      });
      setProgress(progressMap);
    } catch (error) {
      console.error("Error fetching course progress:", error);
    }
  };

  const fetchSummary = async () => {
    if (summary) return;
    setLoadingSummary(true);
    try {
      const response = await axios.post(
        `${serverUrl}/api/ai/summary`,
        {
          lectureTitle: selectedLecture.lectureTitle,
          courseTitle: selectedCourse?.title,
          category: selectedCourse?.category
        },
        { withCredentials: true }
      );
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const response = await axios.post(
        `${serverUrl}/api/comment/add`,
        { lectureId: selectedLecture._id, text: newComment },
        { withCredentials: true }
      );
      setComments([response.data, ...comments]);
      setNewComment('');
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      const response = await axios.post(
        `${serverUrl}/api/comment/reply`,
        { commentId, text: replyText },
        { withCredentials: true }
      );
      setComments(comments.map(c => c._id === commentId ? response.data : c));
      setReplyingTo(null);
      setReplyText('');
      toast.success("Reply added!");
    } catch (error) {
      toast.error("Failed to add reply");
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const watchedDuration = video.currentTime;
    const totalDuration = video.duration;

    if (totalDuration && !isNaN(totalDuration)) {
      updateVideoProgress(watchedDuration, totalDuration);
    }
  };

  const updateVideoProgress = async (watchedDuration, totalDuration) => {
    try {
      const response = await axios.post(
        `${serverUrl}/api/progress/update`,
        {
          lectureId: selectedLecture._id,
          courseId: courseId,
          watchedDuration,
          totalDuration
        },
        { withCredentials: true }
      );

      const wasCompleted = lectureProgress?.isCompleted;
      const nowCompleted = response.data.isCompleted;

      // Increment completed count to refresh certification section
      if (!wasCompleted && nowCompleted) {
        setCompletedCount(prev => prev + 1);
      }

      if (!wasCompleted && nowCompleted && !response.data.quizAttempted) {
        setShowCompletionModal(true);
      }

      setLectureProgress(response.data);
      setProgress(prev => ({ ...prev, [selectedLecture._id]: response.data }));
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleVideoEnded = () => {
    if (!lectureProgress?.quizAttempted) {
      setShowCompletionModal(true);
    }
  };

  const fetchQuiz = async () => {
    setLoadingQuiz(true);
    try {
      const response = await axios.post(
        `${serverUrl}/api/ai/quiz`,
        {
          lectureTitle: selectedLecture.lectureTitle,
          courseTitle: selectedCourse?.title,
          category: selectedCourse?.category
        },
        { withCredentials: true }
      );
      setQuiz(response.data.quiz);
      setShowQuiz(true);
      setShowCompletionModal(false);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setQuizSubmitted(false);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const submitQuiz = async () => {
    let score = 0;
    quiz.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    try {
      await axios.post(
        `${serverUrl}/api/progress/quiz-score`,
        { lectureId: selectedLecture._id, score },
        { withCredentials: true }
      );
      setLectureProgress(prev => ({ ...prev, quizScore: score, quizAttempted: true }));
    } catch (error) {
      console.error("Error saving quiz score:", error);
    }
  };

  const renderMarkdown = (text) => {
    return text
      .replace(/---/g, '') // Remove horizontal lines
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2 text-gray-800">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>')
      .replace(/^[\-\*] (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\| /g, '<br/>') // Convert pipe separators to line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Top Section - Video and Lectures */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Left - Video & Course Info */}
        <div className="w-full lg:w-2/3 bg-white rounded-2xl shadow-md p-4 md:p-6 border border-gray-200">
          <div className="mb-4">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-4 text-gray-800">
              <FaArrowLeftLong className='text-black w-5 h-5 cursor-pointer' onClick={() => navigate("/")}/>
              {selectedCourse?.title}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
              <span>Category: {selectedCourse?.category}</span>
              <span>Level: {selectedCourse?.level}</span>
            </div>
          </div>

          {/* Video Player */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-gray-300 relative">
            {selectedLecture?.videoUrl ? (
              <video
                ref={videoRef}
                src={selectedLecture.videoUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                Select a lecture to start watching
              </div>
            )}
            {lectureProgress?.isCompleted && (
              <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                <FaCheckCircle /> Completed
              </div>
            )}
          </div>

          {/* Selected Lecture Info */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-gray-800">{selectedLecture?.lectureTitle}</h2>
            <div className="flex items-center gap-2">
              {lectureProgress?.quizAttempted && (
                <>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    Quiz Score: {lectureProgress.quizScore}/5
                  </span>
                  <button
                    onClick={fetchQuiz}
                    disabled={loadingQuiz}
                    className="bg-black text-white px-3 py-1 rounded-full text-sm hover:bg-gray-800 flex items-center gap-1"
                  >
                    {loadingQuiz ? <ClipLoader size={14} color="white" /> : <><FaQuestionCircle /> Reattempt</>}
                  </button>
                </>
              )}
              {lectureProgress?.isCompleted && !lectureProgress?.quizAttempted && (
                <button
                  onClick={fetchQuiz}
                  disabled={loadingQuiz}
                  className="bg-green-600 text-white px-3 py-1 rounded-full text-sm hover:bg-green-700 flex items-center gap-1"
                >
                  {loadingQuiz ? <ClipLoader size={14} color="white" /> : <><FaQuestionCircle /> Take Quiz</>}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right - All Lectures & Announcements */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-md p-4 md:p-6 border border-gray-200 h-fit max-h-[900px] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-gray-800">All Lectures</h2>
          <div className="flex flex-col gap-3">
            {selectedCourse?.lectures?.length > 0 ? (
              selectedCourse.lectures.map((lecture, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedLecture(lecture)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition text-left ${
                    selectedLecture?._id === lecture._id
                      ? 'bg-gray-200 border-gray-500'
                      : 'hover:bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {progress[lecture._id]?.isCompleted ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaPlayCircle className="text-gray-400" />
                    )}
                    <h4 className="text-sm font-semibold text-gray-800">{lecture.lectureTitle}</h4>
                  </div>
                  {progress[lecture._id]?.quizAttempted && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                      {progress[lecture._id].quizScore}/5
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="text-gray-500">No lectures available.</p>
            )}
          </div>

          {/* Announcements Section */}
          <LectureAnnouncements courseId={courseId} />

          {/* Get Certified Section */}
          <GetCertifiedSection courseId={courseId} userId={userData?._id} refreshTrigger={completedCount} />

          {/* Instructor Section */}
          {courseCreator && (
            <div className="mt-6 rounded-xl border p-4 shadow-sm bg-gray-50">
              <div className="flex gap-3">
                <img
                  src={courseCreator.photoUrl || '/default-avatar.png'}
                  alt="Instructor"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-200"
                />
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-lg font-semibold text-gray-800">{courseCreator.name}</h3>
                  <p className="text-sm text-gray-600">{courseCreator.description || "Instructor"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section - Comments & Summary */}
      <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 border border-gray-200">
        {/* Tab Buttons */}
        <div className="flex gap-4 mb-6 border-b pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'comments' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaComments /> Doubts & Discussion
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'assignments' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaFileDownload /> Assignments
          </button>
          <button
            onClick={() => { setActiveTab('summary'); fetchSummary(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'summary' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FaBook /> AI Summary
          </button>
        </div>

        {/* Comments Section */}
        {activeTab === 'comments' && (
          <div>
            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <img
                src={userData?.photoUrl || '/default-avatar.png'}
                alt="You"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a doubt or share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  onClick={handleAddComment}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                >
                  <MdSend className="text-xl" />
                </button>
              </div>
            </div>

            {/* Comments List */}
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <ClipLoader size={30} />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment._id} className="border rounded-lg p-4 bg-gray-50">
                    {/* Comment */}
                    <div className="flex gap-3">
                      <img
                        src={comment.user?.photoUrl || '/default-avatar.png'}
                        alt={comment.user?.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{comment.user?.name}</span>
                          {comment.user?.role === 'educator' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Instructor</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1">{comment.text}</p>
                        <button
                          onClick={() => setExpandedCommentId(expandedCommentId === comment._id ? null : comment._id)}
                          className="text-sm text-blue-600 mt-2 flex items-center gap-1 hover:underline"
                        >
                          <MdReply />
                          {comment.replies?.length > 0 ? `${comment.replies.length} replies` : 'Reply'}
                          <span>{expandedCommentId === comment._id ? '▲' : '▼'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Replies and Reply Input */}
                    {expandedCommentId === comment._id && (
                      <div className="ml-12 mt-3">
                        {/* Reply Input */}
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment._id)}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                          <button
                            onClick={() => handleAddReply(comment._id)}
                            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                          >
                            <MdSend className="text-xl" />
                          </button>
                        </div>
                        {/* Replies List */}
                        {comment.replies?.length > 0 && (
                          <div className="space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex gap-3 items-start">
                                <img
                                  src={reply.user?.photoUrl || '/default-avatar.png'}
                                  alt={reply.user?.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-700 text-sm">{reply.user?.name}</span>
                                    <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-gray-600 text-sm mt-1">{reply.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No comments yet. Be the first to ask a doubt!</p>
            )}
          </div>
        )}

        {/* Assignments Section */}
        {activeTab === 'assignments' && (
          <div>
            {selectedLecture?.assignmentUrl ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <FaFileDownload className="text-green-600 text-2xl" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                      Assignment for this Lecture
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {selectedLecture.assignmentName || "Download the assignment file"}
                    </p>
                    <button
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
                      onClick={async () => {
                        try {
                          toast.info("Downloading assignment...");
                          
                          // Use server proxy which handles Cloudinary authentication
                          const response = await axios.get(
                            `${serverUrl}/api/course/downloadassignment/${selectedLecture._id}`,
                            { 
                              withCredentials: true,
                              responseType: 'blob'
                            }
                          );
                          
                          const blob = new Blob([response.data], { 
                            type: response.headers['content-type'] || 'application/octet-stream' 
                          });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = selectedLecture.assignmentName || 'assignment';
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                          toast.success("Assignment downloaded!");
                        } catch (error) {
                          console.error("Download error:", error);
                          let errorMessage = "Failed to download. Please ask instructor to re-upload the assignment.";
                          if (error.response?.data instanceof Blob) {
                            try {
                              const text = await error.response.data.text();
                              const json = JSON.parse(text);
                              errorMessage = json.message || errorMessage;
                            } catch (e) {}
                          } else if (error.response?.data?.message) {
                            errorMessage = error.response.data.message;
                          }
                          toast.error(errorMessage);
                        }
                      }}
                    >
                      <FaFileDownload /> Download Assignment
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-gray-500">
                    💡 Complete this assignment to practice what you learned in this lecture.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaFileDownload className="text-gray-400 text-2xl" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Assignment Available</h3>
                <p className="text-gray-500 text-sm">
                  The instructor hasn't added an assignment for this lecture yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Summary Section */}
        {activeTab === 'summary' && (
          <div>
            {loadingSummary ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipLoader size={40} />
                <p className="mt-4 text-gray-500">Generating AI summary...</p>
              </div>
            ) : summary ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }}
              />
            ) : (
              <p className="text-center text-gray-500 py-8">Click on "AI Summary" tab to generate summary for this lecture.</p>
            )}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-green-500 text-3xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Congratulations! 🎉</h2>
              <p className="text-gray-600 mb-6">
                You've completed "{selectedLecture?.lectureTitle}". Would you like to take a quick quiz to test your understanding?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Skip for now
                </button>
                <button
                  onClick={fetchQuiz}
                  disabled={loadingQuiz}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                >
                  {loadingQuiz ? <ClipLoader size={20} color="white" /> : <><FaQuestionCircle /> Take Quiz</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuiz && quiz.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                <FaQuestionCircle className="inline mr-2" />
                Quiz: {selectedLecture?.lectureTitle}
              </h2>
              <button
                onClick={() => setShowQuiz(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>

            {!quizSubmitted ? (
              <>
                {/* Progress */}
                <div className="flex gap-2 mb-6">
                  {quiz.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-full ${
                        idx === currentQuestion ? 'bg-black' : 
                        selectedAnswers[idx] !== undefined ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Question */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Question {currentQuestion + 1} of {quiz.length}</p>
                  <h3 className="text-lg font-semibold text-gray-800">{quiz[currentQuestion].question}</h3>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {quiz[currentQuestion].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(currentQuestion, idx)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedAnswers[currentQuestion] === idx
                          ? 'border-black bg-gray-100'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {currentQuestion < quiz.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(prev => prev + 1)}
                      className="px-4 py-2 bg-black text-white rounded-lg"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(selectedAnswers).length < quiz.length}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                    >
                      Submit Quiz
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Quiz Results */
              <div className="text-center">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  quizScore >= 3 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <span className="text-3xl font-bold">{quizScore}/5</span>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {quizScore >= 4 ? 'Excellent! 🎉' : quizScore >= 3 ? 'Good Job! 👍' : 'Keep Learning! 📚'}
                </h3>
                <p className="text-gray-600 mb-6">
                  You answered {quizScore} out of 5 questions correctly.
                </p>

                {/* Show correct answers */}
                <div className="text-left space-y-4 max-h-60 overflow-y-auto mb-6">
                  {quiz.map((q, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${
                      selectedAnswers[idx] === q.correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="font-medium text-sm">{idx + 1}. {q.question}</p>
                      <p className="text-sm mt-1">
                        Your answer: <span className={selectedAnswers[idx] === q.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                          {q.options[selectedAnswers[idx]]}
                        </span>
                      </p>
                      {selectedAnswers[idx] !== q.correctAnswer && (
                        <p className="text-sm text-green-600">Correct: {q.options[q.correctAnswer]}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowQuiz(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setCurrentQuestion(0);
                      setSelectedAnswers({});
                      setQuizSubmitted(false);
                      setQuizScore(0);
                    }}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                  >
                    <FaQuestionCircle /> Reattempt Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewLecture;

