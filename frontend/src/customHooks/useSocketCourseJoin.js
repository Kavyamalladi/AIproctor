import { useEffect } from 'react';
import socket from '../utils/socket';
import { useSelector } from 'react-redux';

// Hook to join only enrolled course rooms - ensures badge only shows for enrolled courses
export const useSocketCourseJoin = () => {
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    console.log('[useSocketCourseJoin] UserData enrolled courses:', userData?.enrolledCourses?.map(c => c._id || c));
    
    if (!socket) {
      console.log('[useSocketCourseJoin] Socket not available yet');
      return;
    }

    const joinCourseRooms = () => {
      // Only collect ENROLLED courses
      const courseIds = [];

      if (userData?.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
        userData.enrolledCourses.forEach(course => {
          const courseId = course._id || course;
          if (courseId && !courseIds.includes(String(courseId))) {
            courseIds.push(String(courseId));
          }
        });
      }

      console.log('[useSocketCourseJoin] Collected courseIds:', courseIds);
      console.log('[useSocketCourseJoin] Socket connected?', socket.connected);
      console.log('[useSocketCourseJoin] Socket ID:', socket.id);

      // Join ONLY enrolled course rooms
      if (courseIds.length > 0) {
        console.log('[useSocketCourseJoin] 📤 Emitting joinCourses with:', courseIds);
        
        if (socket.connected) {
          socket.emit('joinCourses', courseIds);
          console.log('[useSocketCourseJoin] ✅ Successfully emitted joinCourses');
        } else {
          console.log('[useSocketCourseJoin] ⏳ Socket not connected, scheduling retry');
          const onConnect = () => {
            console.log('[useSocketCourseJoin] Socket now connected, emitting joinCourses');
            socket.emit('joinCourses', courseIds);
            socket.off('connect', onConnect);
          };
          socket.once('connect', onConnect);
        }
      } else {
        console.log('[useSocketCourseJoin] ⚠️ No enrolled courses to join');
      }
    };

    joinCourseRooms();

  }, [userData?.enrolledCourses?.length]);
};

export default useSocketCourseJoin;
