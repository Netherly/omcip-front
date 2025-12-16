import { io, Socket } from 'socket.io-client';

let socket = null;
let userId = null;

/**
 * Initialize WebSocket connection
 */
export const initWebSocket = (userIdParam) => {
  if (socket?.connected) {
    return socket;
  }

  userId = userIdParam;
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const wsUrl = API_URL.replace('/api', ''); // Remove /api suffix

  socket = io(wsUrl, {
    auth: { token: localStorage.getItem('auth_token') }, // JWT auth
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    // Connected
  });

  socket.on('disconnect', (reason) => {
    // Disconnected
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error.message);
  });

  return socket;
};

/**
 * Subscribe to service purchased events
 */
export const onServicePurchased = (callback) => {
  if (!socket) {
    console.warn('[WebSocket] Not initialized. Call initWebSocket first.');
    return () => {};
  }

  socket.on('service:purchased', (data) => {
    callback(data);
  });

  // Return unsubscribe function
  return () => {
    socket.off('service:purchased');
  };
};

/**
 * Subscribe to admin events (for admin users)
 */
export const onAdminServicePurchased = (callback) => {
  if (!socket) {
    console.warn('[WebSocket] Not initialized');
    return () => {};
  }

  socket.on('admin:service:purchased', (data) => {
    callback(data);
  });

  return () => {
    socket.off('admin:service:purchased');
  };
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;
