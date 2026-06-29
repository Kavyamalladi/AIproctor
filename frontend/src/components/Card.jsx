import React, { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import socket from '../utils/socket';
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const CourseCard = ({ thumbnail, title, category, price, id, reviews }) => {
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user);
  
  // Check if user is enrolled in this course
  const isEnrolled = userData?.enrolledCourses?.some(course => String(course._id || course) === String(id));
  
  const [newAnnouncementCount, setNewAnnouncementCount] = useState(() => {
    const stored = localStorage.getItem(`announcementCount_${id}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  
  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) {
      return 0;
    }
    
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1); // rounded to 1 decimal
  };

  // Usage:
  const avgRating = calculateAverageRating(reviews);
  console.log("Average Rating:", avgRating);

  // Listen for announcements - ALWAYS attach for debugging
  useEffect(() => {
    console.log('[Card] Mounting listener for course:', id, 'IsEnrolled:', isEnrolled);

    const handleNewAnnouncement = (announcement) => {
      // Convert both IDs to strings for comparison (to handle ObjectId vs string)
      const announcementCourseId = String(announcement.course);
      const cardId = String(id);
      
      console.log('[Card] EVENT RECEIVED:', {
        announcementCourseId,
        cardId,
        match: announcementCourseId === cardId,
        courseTitle: announcement.title,
        isEnrolled
      });
      
      // Match announcement to this card's course
      if (announcementCourseId === cardId) {
        console.log('[Card] ✅ Course match! Updating badge');
        // WhatsApp-style: Always set to 1 if badge is 0, else increment
        setNewAnnouncementCount((prev) => {
          const updated = prev === 0 ? 1 : prev + 1;
          localStorage.setItem(`announcementCount_${id}`, updated);
          console.log('[Card] Badge count updated:', updated);
          return updated;
        });
      }
    };
    
    console.log('[Card] ✅ Socket listener attached for course:', id);
    socket.on('newAnnouncement', handleNewAnnouncement);
    
    return () => {
      console.log('[Card] ❌ Socket listener removed for course:', id);
      socket.off('newAnnouncement', handleNewAnnouncement);
    };
  }, [id]);

  // Sync state with localStorage if changed elsewhere
  useEffect(() => {
    const syncCount = () => {
      const stored = localStorage.getItem(`announcementCount_${id}`);
      if (stored && parseInt(stored, 10) !== newAnnouncementCount) {
        setNewAnnouncementCount(parseInt(stored, 10));
      }
    };
    window.addEventListener('storage', syncCount);
    return () => {
      window.removeEventListener('storage', syncCount);
    };
  }, [id, newAnnouncementCount]);

  const handleCardClick = () => {
    setNewAnnouncementCount(0);
    localStorage.setItem(`announcementCount_${id}`, 0);
    navigate(`/viewcourse/${id}`);
  };

  return (
    <div className="max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-300 relative" onClick={handleCardClick}>
      {/* Thumbnail */}
      <img
        src={thumbnail}
        alt={title}
        className="w-full h-48 object-cover"
      />
      {newAnnouncementCount > 0 && (
        <span className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow z-10 tracking-wide">NEW</span>
      )}
      {/* Content */}
      <div className="p-5 space-y-2">
        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

        {/* Category */}
        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-gray-700 capitalize">
            {category}
          </span>

        {/* Meta info */}
        <div className="flex justify-between text-sm text-gray-600 mt-3 px-[10px]">
          <span className="font-semibold text-gray-800">₹{price}</span>
           <span className="flex items-center gap-1 ">
            <FaStar className="text-yellow-500" /> {avgRating}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
