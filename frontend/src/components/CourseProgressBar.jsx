import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { serverUrl } from '../config/serverUrl';

const CourseProgressBar = ({ courseId }) => {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      try {
        // Fetch progress records for this user and course
        const progressRes = await axios.get(`${serverUrl}/api/progress/course/${courseId}`, { withCredentials: true });
        const progressLectures = progressRes.data || [];
        const completed = progressLectures.filter(l => l.isCompleted).length;

        // Fetch course to get total lectures
        const courseRes = await axios.get(`${serverUrl}/api/course/getcourse/${courseId}`, { withCredentials: true });
        const totalLectures = courseRes.data?.lectures?.length || 0;

        const percent = totalLectures > 0 ? Math.round((completed / totalLectures) * 100) : 0;
        setProgress(percent);
      } catch (err) {
        setProgress(0);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchProgress();
  }, [courseId]);

  if (loading) return <div className="w-full h-4 bg-gray-200 rounded-full mt-2" />;

  return (
    <div className="w-full mt-2">
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-green-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <span className="text-xs ml-2">{progress}% completed</span>
    </div>
  );
};

export default CourseProgressBar;
