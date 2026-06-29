import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { serverUrl } from '../config/serverUrl';
import { FaArrowLeftLong, FaClipboardList } from "react-icons/fa6";
import img from "../assets/empty.jpg"
import Card from "../components/Card.jsx"
import { setSelectedCourseData } from '../redux/courseSlice';
import { FaLock, FaPlayCircle } from "react-icons/fa";
import { toast } from 'react-toastify';
import { FaStar } from "react-icons/fa6";
import { setUserData } from '../redux/userSlice';
import CourseAnnouncements from '../components/CourseAnnouncements';

function ViewCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate()
  const {courseData} = useSelector(state=>state.course)
  const {userData} = useSelector(state=>state.user)
  const [creatorData , setCreatorData] = useState(null)
  const dispatch = useDispatch()
  const [selectedLecture, setSelectedLecture] = useState(null);
  const {lectureData} = useSelector(state=>state.lecture)
  const {selectedCourseData} = useSelector(state=>state.course)
  const [selectedCreatorCourse,setSelectedCreatorCourse] = useState([])
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  // Helper to check if current user is the course creator (teacher)
  const isTeacher = userData?._id && selectedCourseData?.creator && (userData._id === selectedCourseData.creator);

  const handleReview = async () => {
    // Prevent duplicate review submission
    const alreadyReviewed = selectedCourseData?.reviews?.some(
      (r) => r.user && (r.user._id === userData._id || r.user === userData._id)
    );
    if (alreadyReviewed) return;
    setIsSubmittingReview(true);
    try {
      const result = await axios.post(serverUrl + "/api/review/givereview", {rating , comment , courseId} , {withCredentials:true})
      toast.success("Review Added")
      setRating(0)
      setComment("")
      // Fetch updated course data to show new review
      const updatedCourse = await axios.get(serverUrl + `/api/course/getcourse/${courseId}`, {withCredentials:true});
      dispatch(setSelectedCourseData(updatedCourse.data));
      // Fetch all published courses and update Redux so AllCourses page updates instantly
      const allCourses = await axios.get(serverUrl + "/api/course/getpublishedcourses", {withCredentials:true});
      dispatch(setCourseData(allCourses.data));
      // Update educator's other courses with latest data
      if (creatorData?._id) {
        const updatedCreatorCourses = allCourses.data.filter(
          (course) => course.creator === creatorData._id && course._id !== courseId
        );
        setSelectedCreatorCourse(updatedCreatorCourses);
      }
    } catch (error) {
      // Only log error, do not show error toast for duplicate review
      console.log(error)
    } finally {
      setIsSubmittingReview(false);
    }
  }
  

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1); // rounded to 1 decimal
  };

  // Usage:
  const avgRating = calculateAverageRating(selectedCourseData?.reviews);
  console.log("Average Rating:", avgRating);

  

  const fetchCourseData = async () => {
    courseData.map((item) => {
      if (item._id === courseId) {
        dispatch(setSelectedCourseData(item))
        console.log(selectedCourseData)
        return null;
      }
    })
  }

  // Check if user is already enrolled in a specific course
  const checkEnrollment = () => {
    const verify = userData?.enrolledCourses?.some(c => {
      const enrolledId = typeof c === 'string' ? c : c._id;
      return enrolledId?.toString() === courseId?.toString();
    });

    console.log("Enrollment verified:", verify);
    if (verify) {
      setIsEnrolled(true);
    }
  };


  useEffect(() => {
    // Always fetch latest published courses when opening a course
    const fetchAllCourses = async () => {
      try {
        const allCourses = await axios.get(serverUrl + "/api/course/getpublishedcourses", {withCredentials:true});
        dispatch(setCourseData(allCourses.data));
      } catch (err) {
        console.log("Error fetching all courses", err);
      }
    };
    fetchAllCourses();
    fetchCourseData();
    checkEnrollment();
  }, [courseId, lectureData]);


  // Fetch creator info once course data is available
  useEffect(() => {
    const getCreator = async () => {
      if (selectedCourseData?.creator) {
        try {
          const result = await axios.post(
            `${serverUrl}/api/course/getcreator`,
            { userId: selectedCourseData.creator },
            { withCredentials: true }
          );
          setCreatorData(result.data);
          console.log(result.data)
        } catch (error) {
          console.error("Error fetching creator:", error);
        }
      }
    };
    getCreator();
  }, [selectedCourseData]);


  // Fetch other courses by the same creator
  useEffect(() => {
    if (creatorData?._id && courseData.length > 0) {
      const creatorCourses = courseData.filter( (course) =>
        course.creator === creatorData._id && course._id !== courseId // Exclude current course
      );
      setSelectedCreatorCourse(creatorCourses);
    }
  }, [creatorData, courseData]);

 
  const handleEnroll = async (courseId, userId) => {
    try {
      // 1. Create Order
      const orderData = await axios.post(serverUrl + "/api/payment/create-order", {
        courseId,
        userId
      } , {withCredentials:true});
      console.log(orderData)

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // from .env
        amount: orderData.data.amount,
        currency: "INR",
        name: "Virtual Courses",
        description: "Course Enrollment Payment",
        order_id: orderData.data.id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(serverUrl + "/api/payment/verify-payment",{
              ...response,       
              courseId,
              userId
            }, { withCredentials: true });
            // Success: update Redux and navigate
            if (verifyRes.status === 200 && verifyRes.data.message?.toLowerCase().includes("success")) {
              toast.success(verifyRes.data.message);
              // Fetch latest user data (with enrolled courses)
              const userRes = await axios.get(serverUrl + "/api/user/currentuser", { withCredentials: true });
              dispatch(setUserData(userRes.data));
              setIsEnrolled(true);
              navigate("/enrolledcourses");
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (verifyError) {
            toast.error("Payment verification failed.");
            console.error("Verification Error:", verifyError);
          }
        },
      };
    
      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err) {
      toast.error("Something went wrong while enrolling.");
      console.error("Enroll Error:", err);
    }
  };

  return (
     <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-md rounded-xl p-6 space-y-6 relative">

        {/* Top Section */}
        <div className="flex flex-col md:flex-row gap-6">
             
          {/* Thumbnail */}
          <div className="w-full md:w-1/2">
            <FaArrowLeftLong className='text-[black] w-[22px] h-[22px] cursor-pointer' onClick={() => navigate("/")}/>
            {selectedCourseData?.thumbnail ? <img
              src={selectedCourseData?.thumbnail}
              alt="Course Thumbnail"
              className="rounded-xl w-full object-cover"
            /> :  <img
              src={img}
              alt="Course Thumbnail"
              className="rounded-xl w-full object-cover"
            /> }
          </div>

          {/* Course Info */}
          <div className="flex-1 space-y-2 mt-[20px]">
            <h1 className="text-2xl font-bold">{selectedCourseData?.title}</h1>
            <p className="text-gray-600">{selectedCourseData?.subTitle}</p>

            {/* Rating & Price */}
            <div className="flex items-start flex-col justify-between">
              <div className="text-yellow-500 font-medium">
                ⭐ {avgRating} <span className="text-gray-500">({selectedCourseData?.reviews?.length || 0} reviews)</span>
              </div>
              <div>
                <span className="text-lg font-semibold text-black">{selectedCourseData?.price}</span>{" "}
                <span className="line-through text-sm text-gray-400">₹1599</span>
              </div>
            </div>

            {/* Highlights */}
            <ul className="text-sm text-gray-700 space-y-1 pt-2">
              <li>✅ 10+ hours of video content</li>
              <li>✅ Lifetime access to course materials</li>
            </ul>

            {/* Enroll Button - Hidden for admins */}
            {userData?.role !== 'admin' && (
              isTeacher ? (
                <div className="flex gap-3 flex-wrap mt-3">
                  <button className="bg-green-200 text-green-600 px-6 py-2 rounded hover:bg-gray-100 hover:border" onClick={() => navigate(`/viewlecture/${courseId}`)}>
                    Watch Now
                  </button>
                </div>
              ) : (
                !isEnrolled ? <button className="bg-[black] text-white px-6 py-2 rounded hover:bg-gray-700 mt-3" onClick={() => handleEnroll(courseId, userData._id)}>
                  Enroll Now
                </button> :
                <div className="flex gap-3 flex-wrap mt-3">
                  <button className="bg-green-200 text-green-600 px-6 py-2 rounded hover:bg-gray-100 hover:border" onClick={() => navigate(`/viewlecture/${courseId}`)}>
                    Watch Now
                  </button>
                  {/* Only students see View Exams button */}
                  {!isTeacher && (
                    <button className="bg-blue-100 text-blue-600 px-6 py-2 rounded hover:bg-blue-200 flex items-center gap-2" onClick={() => navigate(`/studentexams/${courseId}`)}>
                      <FaClipboardList /> View Exams
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* What You'll Learn */}
        <div>
          <h2 className="text-xl font-semibold mb-2">What You’ll Learn</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Learn {selectedCourseData?.category} from Beginning</li>
          </ul>
        </div>

        {/* Requirements */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Requirements</h2>
          <p className="text-gray-700">Basic programming knowledge is helpful but not required.</p>
        </div>

        {/* Who This Course Is For */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Who This Course is For</h2>
          <p className="text-gray-700">
            Beginners, aspiring developers, and professionals looking to upgrade skills.
          </p>
        </div>

        {/* Course lecture   */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Side - Curriculum */}
          <div className="bg-white w-full md:w-2/5 p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-1 text-gray-800">Course Curriculum</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedCourseData?.lectures?.length} {selectedCourseData?.lectures?.length === 1 ? "Lecture" : "Lectures"}</p>

            <div className="flex flex-col gap-3">
              {selectedCourseData?.lectures?.map((lecture, index) => (
                <button key={index} disabled={!lecture.isPreviewFree} onClick={() => {
                    if (lecture.isPreviewFree) {
                      setSelectedLecture(lecture);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left ${
                    lecture.isPreviewFree
                      ? "hover:bg-gray-100 cursor-pointer border-gray-300"
                      : "cursor-not-allowed opacity-60 border-gray-200"
                  } ${
                    selectedLecture?.lectureTitle === lecture.lectureTitle
                      ? "bg-gray-100 border-gray-400"
                      : ""
                  }`}
                >
                  <span className="text-lg text-gray-700">
                    {lecture.isPreviewFree ? <FaPlayCircle/> : <FaLock/>}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {lecture.lectureTitle}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side - Video + Info */}
          <div className="bg-white w-full md:w-3/5 p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="aspect-video w-full rounded-lg overflow-hidden mb-4 bg-black flex items-center justify-center">
              {selectedLecture?.videoUrl ? (
                <video
                  src={selectedLecture.videoUrl}
                  controls
                  // controlsList="nodownload"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm">Select a preview lecture to watch</span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {selectedLecture?.lectureTitle || "Lecture Title"}
            </h3>
            <p className="text-gray-600 text-sm">
              {selectedCourseData?.title}
            </p>
          </div>
        </div>

        {/* Reviews Section */}
        {!isTeacher && (
          <div className="mt-8 border-t pt-6">
            {/* Only show review form if user is enrolled and has not already reviewed */}
            {isEnrolled && (() => {
              const alreadyReviewed = selectedCourseData?.reviews?.some(
                (r) => r.user && (r.user._id === userData._id || r.user === userData._id)
              );
              if (alreadyReviewed) {
                return (
                  <div className="mb-4 text-green-600 font-semibold">You have already reviewed this course.</div>
                );
              }
              return (
                <>
                  <h2 className="text-xl font-semibold mb-2">Write a Review</h2>
                  <div className="mb-4">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar key={star}
                          onClick={() => setRating(star)}
                          className={star <= rating ? "fill-yellow-500" : "fill-gray-300"} />
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write your comment here..."
                      className="w-full border border-gray-300 rounded-lg p-2"
                      rows="3"
                    />
                    <button
                      className="bg-black text-white mt-3 px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
                      onClick={handleReview}
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>


        )}

        {/* Instructor Info */}
        <div className="mt-6 rounded-2xl border p-5 shadow-sm bg-white">
          <div className="flex items-center gap-5 pb-5 border-b">
            {/* Avatar With Fallback */}
            {creatorData?.photoUrl ? (
              <img
                src={creatorData?.photoUrl}
                alt="Instructor"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-200 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl border-2 bg-black border-white cursor-pointer shadow-sm">
                {creatorData?.name?.slice(0, 1)?.toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-wide text-gray-800">
                {creatorData?.name}
              </h3>

              <p className="text-sm text-gray-600 leading-snug max-w-md">
                {creatorData?.description}
              </p>

              <p className="text-sm font-medium text-blue-600">
                {creatorData?.email}
              </p>
            </div>
          </div>

          {/* Other Courses */}
          <div className="mt-6">
            <p className="text-xl font-semibold mb-4 text-gray-800">
              Other Published Courses by the Educator
            </p>
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 py-6 place-items-center">
              {selectedCreatorCourse?.map((item, index) => {
                console.log(`Course: ${item.title}, Reviews:`, item.reviews);
                return (
                  <Card
                    key={index}
                    thumbnail={item.thumbnail}
                    title={item.title}
                    id={item._id}
                    price={item.price}
                    category={item.category}
                    reviews={item.reviews}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Announcements Section: Only show for teachers, not for students */}
        {isTeacher && <CourseAnnouncements courseId={courseId} isTeacher={isTeacher} />}
      </div>
    </div>
  );
}

export default ViewCourse;
