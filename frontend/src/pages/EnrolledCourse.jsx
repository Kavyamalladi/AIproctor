import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeftLong, FaCertificate } from "react-icons/fa6";
import { ClipLoader } from 'react-spinners';
import socket from '../utils/socket';
import { toast } from 'react-toastify';
import CourseProgressBar from '../components/CourseProgressBar';

function EnrolledCourse() {
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user);
  const [newAnnouncementCounts, setNewAnnouncementCounts] = useState({});

  // Initialize announcement counts from localStorage
  useEffect(() => {
    if (userData?.enrolledCourses) {
      const counts = {};
      userData.enrolledCourses.forEach(course => {
        const stored = localStorage.getItem(`announcementCount_${course._id}`);
        counts[course._id] = stored ? parseInt(stored, 10) : 0;
      });
      setNewAnnouncementCounts(counts);
    }
  }, [userData?.enrolledCourses]);

  // Handle loading state
  if (!userData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <ClipLoader size={40} />
      </div>
    );
  }

  const enrolledCourses = userData.enrolledCourses || [];

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      // Listen for new announcements (rooms are joined globally via useSocketCourseJoin hook)
      const handleNewAnnouncement = (announcement) => {
        console.log('[EnrolledCourse] New announcement received:', announcement);
        toast.info(`New announcement for your course: ${announcement.title}`);
        
        // Update the announcement count
        setNewAnnouncementCounts((prev) => {
          const updated = { ...prev };
          const count = updated[announcement.course] || 0;
          updated[announcement.course] = count === 0 ? 1 : count + 1;
          localStorage.setItem(`announcementCount_${announcement.course}`, updated[announcement.course]);
          console.log('[EnrolledCourse] Updated count for course', announcement.course, ':', updated[announcement.course]);
          return updated;
        });
      };
      
      socket.on('newAnnouncement', handleNewAnnouncement);

      // Cleanup listener on unmount
      return () => {
        socket.off('newAnnouncement', handleNewAnnouncement);
      };
    }
  }, [enrolledCourses]);

  return (
    <div className="min-h-screen w-full px-4 py-9 bg-gray-50">

      <FaArrowLeftLong className='absolute top-[3%] md:top-[6%] left-[5%] w-[22px] h-[22px] cursor-pointer' onClick={() => navigate("/")}/>
      <h1 className="text-3xl text-center font-bold text-gray-800 mb-6">
        My Enrolled Courses
      </h1>

      {/* My Certificates Link */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => navigate("/my-certificates")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
        >
          <FaCertificate /> View My Certificates
        </button>
      </div>

      {enrolledCourses.length === 0 ? (
        <p className="text-gray-500 text-center w-full">You haven't enrolled in any course yet.</p>
      ) : (
        <div className="flex items-center justify-center flex-wrap gap-[30px]">
          {enrolledCourses.map((course) => (
            <div
              key={course._id}
              className="bg-white rounded-2xl shadow-md overflow-hidden border flex flex-col relative"
              style={{ width: "320px", minHeight: "420px" }}
              onClick={() => {
                setNewAnnouncementCounts((prev) => {
                  const updated = { ...prev };
                  updated[course._id] = 0;
                  localStorage.setItem(`announcementCount_${course._id}`, 0);
                  return updated;
                });
                navigate(`/viewlecture/${course._id}`);
              }}
            >
              <img 
                src={course.thumbnail}
                alt={course.title}
                className="w-full object-cover"
                style={{ height: "180px" }}
              />
              {newAnnouncementCounts[course._id] > 0 && (
                <span className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow z-10 tracking-wide">NEW</span>
              )}
              <div className="p-4 flex flex-col flex-1 justify-between">
                <h2 className="text-lg font-semibold text-gray-800">{course.title}</h2>
                <p className="text-sm text-gray-600 mb-2">{course.category}</p>
                <p className="text-sm text-gray-700">{course.level}</p>
                <h1 className='px-[10px] text-center py-[10px] border-2 bg-black border-black text-white rounded-[10px] text-[15px] 
                font-light flex items-center justify-center gap-2 cursor-pointer mt-[10px] hover:bg-gray-600'>Watch Now</h1>
                {/* Progress Bar */}
                <CourseProgressBar courseId={course._id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EnrolledCourse
