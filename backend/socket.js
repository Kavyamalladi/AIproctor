import { Server } from 'socket.io';

export let io = null;

export function setupSocket(server) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8000',
    'https://new-ai-lms-frontend.onrender.com',
    'https://new-ai-lms.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean); // Remove undefined values

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('[Socket.io] 🔌 New user connected:', socket.id);
    
    // Join room for each course the user is enrolled in
    socket.on('joinCourses', (courseIds) => {
      if (Array.isArray(courseIds)) {
        console.log(`[Socket.io] User ${socket.id} requesting to join courses:`, courseIds);
        
        courseIds.forEach(courseId => {
          const roomName = `course_${courseId}`;
          socket.join(roomName);
          console.log(`[Socket.io] ✅ User ${socket.id} joined room ${roomName}`);
        });
        
        console.log(`[Socket.io] User ${socket.id} successfully joined ${courseIds.length} course rooms`);
      } else {
        console.log(`[Socket.io] ⚠️ courseIds is not an array:`, courseIds);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[Socket.io] 🔌 User disconnected:', socket.id);
    });
  });
}

export function emitAnnouncement(courseId, announcement) {
  if (io) {
    const roomName = `course_${courseId}`;
    const announcementToSend = {
      _id: announcement._id,
      course: String(courseId), // Ensure course is a string
      title: announcement.title,
      content: announcement.content,
      createdBy: announcement.createdBy,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt
    };
    
    // Get room info for debugging
    const room = io.sockets.adapter.rooms.get(roomName);
    const roomSize = room ? room.size : 0;
    
    console.log(`[Socket.io] 📢 Emitting announcement ${announcementToSend.title}`);
    console.log(`[Socket.io] Room: ${roomName}, Connected users in room: ${roomSize}`);
    console.log(`[Socket.io] Data:`, announcementToSend);
    
    io.to(roomName).emit('newAnnouncement', announcementToSend);
    
    console.log(`[Socket.io] ✅ Announcement sent to ${roomSize} clients in room ${roomName}`);
  } else {
    console.log('[Socket.io] ❌ Socket.io not initialized');
  }
}
