import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const socket = io(API_URL, {
  withCredentials: true,
});

// Add connection logging
socket.on('connect', () => {
  console.log('[Socket] ✅ Connected to server with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] ❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.log('[Socket] ⚠️ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.log('[Socket] ⚠️ Socket error:', error);
});

export default socket;
