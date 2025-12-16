// API Configuration
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// In-memory token storage to ensure availability
let currentToken = null;

// Helper function to get stored token
export const getToken = () => {
  // First check in-memory token
  if (currentToken) {
    return currentToken;
  }
  
  // Fall back to localStorage
  const stored = localStorage.getItem('token') || localStorage.getItem('auth_token');
  if (stored) {
    currentToken = stored;
    return stored;
  }
  
  return null;
};

// Helper function to set token
export const setToken = (token) => {
  currentToken = token;
  localStorage.setItem('token', token);
};

// Helper function to clear token
export const clearToken = () => {
  currentToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('auth_token');
};

// Helper to make API requests with token
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  const data = await response.json();

  if (!response.ok) {
    console.error(`[API] Request failed with status ${response.status}`, data);
    throw new Error(data.message || `API Error: ${response.statusText}`);
  }

  return data;
};

// ========== AUTHENTICATION ==========

/**
 * Check auth service health
 */
export const checkAuthHealth = async () => {
  try {
    const response = await apiRequest('/auth/health', {
      method: 'GET',
    });
    return response;
  } catch (error) {
    console.error('[API] Auth health check failed:', error);
    throw error;
  }
};

/**
 * Authenticate user via Telegram
 */
export const authenticateTelegram = async (initData) => {
  try {
    const payload = { initData };
    
    const response = await apiRequest('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Server returns 'token' not 'access_token'
    if (response.token) {
      setToken(response.token);
    } else if (response.access_token) {
      setToken(response.access_token);
    } else {
      console.warn('[API] No token found in response!');
    }

    return response;
  } catch (error) {
    console.error('[API] Authentication failed:', error);
    throw error;
  }
};

// ========== USER ==========

/**
 * Get user profile
 */
export const getUserProfile = async () => {
  try {
    return await apiRequest('/user/profile', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
};

// ========== GAME ==========

/**
 * Get game state (coins, energy, boosts, upgrades, etc.)
 */
export const getGameState = async () => {
  try {
    return await apiRequest('/game/state', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get game state:', error);
    throw error;
  }
};

/**
 * Handle click (via WebSocket if available, REST fallback)
 */
export const sendClick = async (clickData = {}) => {
  try {
    // Пытаемся отправить через WebSocket
    if (socketInstance && socketInstance.connected) {
      return new Promise((resolve, reject) => {
        socketInstance.emit('game:click', clickData || {}, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } else {
      // Fallback на REST если WebSocket недоступен
      return await apiRequest('/game/click', {
        method: 'POST',
        body: JSON.stringify(clickData || {}),
      });
    }
  } catch (error) {
    console.error('Failed to send click:', error);
    throw error;
  }
};

/**
 * Activate boost
 */
export const activateBoost = async (boostData) => {
  try {
    return await apiRequest('/game/boost/activate', {
      method: 'POST',
      body: JSON.stringify(boostData),
    });
  } catch (error) {
    console.error('Failed to activate boost:', error);
    throw error;
  }
};

// ========== UPGRADES ==========

/**
 * Get all available upgrades
 */
export const getUpgrades = async () => {
  try {
    return await apiRequest('/upgrades', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get upgrades:', error);
    throw error;
  }
};

/**
 * Get user's purchased upgrades
 */
export const getUserUpgrades = async () => {
  try {
    return await apiRequest('/upgrades/user/my-upgrades', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get user upgrades:', error);
    throw error;
  }
};

/**
 * Purchase an upgrade
 */
export const purchaseUpgrade = async (upgradeId) => {
  try {
    return await apiRequest(`/upgrades/${upgradeId}/purchase`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to purchase upgrade ${upgradeId}:`, error);
    throw error;
  }
};

/**
 * Get next recommended upgrade
 */
export const getNextUpgradeRecommendation = async () => {
  try {
    return await apiRequest('/upgrades/user/next-recommendation', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get next upgrade recommendation:', error);
    throw error;
  }
};

/**
 * Get all upgrades with unlock conditions
 */
export const getUpgradesWithConditions = async () => {
  try {
    return await apiRequest('/upgrades/with-conditions', {
      method: 'GET',
    });
  } catch (error) {
    console.error('[API] Failed to fetch upgrades with conditions:', error);
    throw error;
  }
};

// ========== SERVICES ==========

/**
 * Get all available services
 */
export const getServices = async () => {
  try {
    return await apiRequest('/services', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get services:', error);
    throw error;
  }
};

/**
 * Get service by ID
 */
export const getServiceById = async (serviceId) => {
  try {
    return await apiRequest(`/services/${serviceId}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error(`Failed to get service ${serviceId}:`, error);
    throw error;
  }
};

/**
 * Check service cooldown status
 */
export const checkServiceCooldown = async (serviceId) => {
  try {
    return await apiRequest(`/services/${serviceId}/check-cooldown`, {
      method: 'GET',
    });
  } catch (error) {
    console.error(`Failed to check service cooldown ${serviceId}:`, error);
    throw error;
  }
};

/**
 * Use (activate) a service
 */
export const useService = async (serviceId) => {
  try {
    return await apiRequest(`/services/${serviceId}/use`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to use service ${serviceId}:`, error);
    throw error;
  }
};

/**
 * Get service usage history
 */
export const getServiceUsage = async (serviceId) => {
  try {
    return await apiRequest(`/services/${serviceId}/usage`, {
      method: 'GET',
    });
  } catch (error) {
    console.error(`Failed to get service usage ${serviceId}:`, error);
    throw error;
  }
};

/**
 * Purchase a service
 */
export const purchaseService = async (serviceId) => {
  try {
    return await apiRequest(`/services/${serviceId}/purchase`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to purchase service ${serviceId}:`, error);
    throw error;
  }
};

// ========== TASKS ==========

/**
 * Get all daily tasks
 */
export const getDailyTasks = async () => {
  try {
    return await apiRequest('/tasks/daily', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get daily tasks:', error);
    throw error;
  }
};

/**
 * Get all weekly tasks
 */
export const getWeeklyTasks = async () => {
  try {
    return await apiRequest('/tasks/weekly', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get weekly tasks:', error);
    throw error;
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (taskId) => {
  try {
    return await apiRequest(`/tasks/${taskId}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error(`Failed to get task ${taskId}:`, error);
    throw error;
  }
};

/**
 * Claim task reward
 */
export const claimTaskReward = async (taskId) => {
  try {
    return await apiRequest(`/tasks/${taskId}/claim`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to claim task reward ${taskId}:`, error);
    throw error;
  }
};

// ========== REFERRAL SYSTEM ==========

/**
 * Get referral link for user
 */
export const getReferralLink = async (userId) => {
  try {
    return await apiRequest(`/referral/link/${userId}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get referral link:', error);
    throw error;
  }
};

/**
 * Get task-specific referral counts
 */
export const getTaskReferralCounts = async (userId) => {
  try {
    return await apiRequest(`/referral/task-counts/${userId}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get task referral counts:', error);
    throw error;
  }
};

// ========== LOGIN REWARDS ==========

/**
 * Get all login rewards for 7 days + current streak
 */
export const getLoginRewards = async () => {
  try {
    return await apiRequest('/login-rewards', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get login rewards:', error);
    throw error;
  }
};

/**
 * Complete daily login claim task (user collected daily reward)
 */
export const claimDailyReward = async () => {
  try {
    return await apiRequest('/tasks/daily-claim/complete', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Failed to claim daily reward:', error);
    throw error;
  }
};

/**
 * Get current login streak
 */
export const getLoginStreak = async () => {
  try {
    return await apiRequest('/login-rewards/streak', {
      method: 'GET',
    });
  } catch (error) {
    console.error('Failed to get login streak:', error);
    throw error;
  }
};

/**
 * Claim login reward for a specific day
 */
export const claimLoginReward = async (day) => {
  try {
    return await apiRequest(`/login-rewards/${day}/claim`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to claim login reward for day ${day}:`, error);
    throw error;
  }
};

/**
 * Skip (auto-complete) a daily task using TASK_SKIP reward
 */
export const skipDailyTask = async (taskId) => {
  try {
    return await apiRequest(`/login-rewards/skip/${taskId}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error(`Failed to skip daily task ${taskId}:`, error);
    throw error;
  }
};

// ========== WEBSOCKET (Socket.io) ==========

let socketInstance = null;

/**
 * Initialize Socket.io connection
 */
export const initializeWebSocket = (onMessage, onError) => {
  const token = getToken();
  if (!token) {
    console.warn('No token available for WebSocket connection');
    return null;
  }

  // Определяем правильный URL для WebSocket
  let WS_URL = import.meta.env.VITE_WS_URL;
  
  if (!WS_URL) {
    // Для разработки всегда используем localhost
    // Это упрощает тестирование с ngrok
    WS_URL = 'http://localhost:3000';
  }

  try {
    const socket = io(WS_URL, {
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      socketInstance = socket;
    });

    // Слушаем начальное состояние игры
    socket.on('game:state', (message) => {
      if (onMessage) {
        onMessage({ type: 'game:state', data: message });
      }
    });

    // Слушаем обновления энергии
    socket.on('game:energy:update', (message) => {
      if (onMessage) {
        onMessage({ type: 'energy:update', data: message });
      }
    });

    // Слушаем заработки от автокликера
    socket.on('game:autoclicker:earnings', (message) => {
      if (onMessage) {
        onMessage({ type: 'autoclicker:earnings', data: message });
      }
    });

    // Слушаем результаты кликов
    socket.on('game:click:result', (message) => {
      if (onMessage) {
        onMessage({ type: 'game:click:result', data: message });
      }
    });

    // Слушаем завершение задач
    socket.on('task:completed', (message) => {
      if (onMessage) {
        onMessage({ type: 'task:completed', data: message });
      }
    });

    // Слушаем событие при получении награды за задачу
    socket.on('task:claimed', (message) => {
      if (onMessage) {
        onMessage({ type: 'task:claimed', data: message });
      }
    });

    // Слушаем ошибки от сервера
    socket.on('game:error', (message) => {
      console.error('[API] Received game:error:', message);
      if (onError) {
        onError(message);
      }
    });

    socket.on('disconnect', () => {
      socketInstance = null;
    });

    socket.on('error', (error) => {
      console.error('[API] WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[API] WebSocket connection error:', error);
      if (onError) {
        onError(error);
      }
    });

    return socket;
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    if (onError) {
      onError(error);
    }
    return null;
  }
};

/**
 * Send message via Socket.io
 */
export const sendWebSocketMessage = (event, data) => {
  if (!socketInstance) {
    return false;
  }
  
  if (!socketInstance.connected) {
    return false;
  }

  try {
    socketInstance.emit(event, data);
    return true;
  } catch (error) {
    console.error(`[API] Failed to emit ${event}:`, error);
    return false;
  }
};

/**
 * Close Socket.io connection
 */
export const closeWebSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// ========== AUTO-CLICKER ENDPOINTS ==========

/**
 * Get auto-clicker status for current user
 */
export const getAutoClickerStatus = async () => {
  try {
    const data = await apiRequest('/services/auto-clicker/status');
    return data;
  } catch (error) {
    console.error('[API] Failed to fetch auto-clicker status:', error);
    throw error;
  }
};

/**
 * Purchase next auto-clicker level
 */
export const purchaseAutoClickerLevel = async () => {
  try {
    const data = await apiRequest('/services/auto-clicker/purchase', {
      method: 'POST',
    });
    return data;
  } catch (error) {
    console.error('[API] Failed to purchase auto-clicker level:', error);
    throw error;
  }
};

// ========== CHARACTER ENDPOINTS ==========

/**
 * Purchase character 3
 */
export const purchaseCharacter3 = async (cost) => {
  try {
    const data = await apiRequest('/characters/3/purchase', {
      method: 'POST',
      body: JSON.stringify({ cost }),
    });
    return data;
  } catch (error) {
    console.error('[API] Failed to purchase character 3:', error);
    throw error;
  }
};

export default {
  // Auth
  authenticateTelegram,
  getToken,
  setToken,
  clearToken,

  // User
  getUserProfile,

  // Game
  getGameState,
  sendClick,
  activateBoost,

  // Upgrades
  getUpgrades,
  getUserUpgrades,
  purchaseUpgrade,
  getNextUpgradeRecommendation,
  getUpgradesWithConditions,

  // Services
  getServices,
  getServiceById,
  checkServiceCooldown,
  useService,
  getServiceUsage,
  purchaseService,

  // Tasks
  getDailyTasks,
  getWeeklyTasks,
  getTaskById,
  claimTaskReward,

  // Auto-clicker
  getAutoClickerStatus,
  purchaseAutoClickerLevel,

  // Characters
  purchaseCharacter3,

  // WebSocket
  initializeWebSocket,
  sendWebSocketMessage,
  closeWebSocket,
};
