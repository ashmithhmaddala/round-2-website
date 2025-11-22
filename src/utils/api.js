
// API Base URL - uses environment variable for flexibility
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==================== AUTH ====================

export const signup = async (username, email, password) => {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const login = async (username, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getUser = async (username) => {
  const response = await fetch(`${API_URL}/auth/user/${username}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== TEAMS ====================

export const createTeam = async (teamName, username) => {
  const response = await fetch(`${API_URL}/teams/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, username })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const joinTeam = async (teamCode, username) => {
  const response = await fetch(`${API_URL}/teams/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamCode, username })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getTeam = async (code) => {
  const response = await fetch(`${API_URL}/teams/${code}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const leaveTeam = async (username, teamCode) => {
  const response = await fetch(`${API_URL}/teams/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, teamCode })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getAllTeams = async () => {
  const response = await fetch(`${API_URL}/teams`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const deleteTeam = async (code) => {
  const response = await fetch(`${API_URL}/teams/${code}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== CHALLENGES ====================

export const getChallenges = async () => {
  const response = await fetch(`${API_URL}/challenges`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const submitFlag = async (challengeId, flag, username, teamCode) => {
  const response = await fetch(`${API_URL}/challenges/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, flag, username, teamCode })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const createChallenge = async (challenge) => {
  const response = await fetch(`${API_URL}/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(challenge)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const updateChallenge = async (id, challenge) => {
  const response = await fetch(`${API_URL}/challenges/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(challenge)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const deleteChallenge = async (id) => {
  const response = await fetch(`${API_URL}/challenges/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== ADMIN ====================

export const adminLogin = async (username, password) => {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getAnalytics = async () => {
  const response = await fetch(`${API_URL}/admin/analytics`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getAllAdmins = async () => {
  const response = await fetch(`${API_URL}/admin/admins`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const createAdmin = async (username, email, password, createdBy) => {
  const response = await fetch(`${API_URL}/admin/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, createdBy })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const deleteAdmin = async (username) => {
  const response = await fetch(`${API_URL}/admin/admins/${username}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const changePassword = async (username, currentPassword, newPassword) => {
  const response = await fetch(`${API_URL}/admin/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, currentPassword, newPassword })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const resetPassword = async (targetUsername, newPassword, requestingUsername) => {
  const response = await fetch(`${API_URL}/admin/reset-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUsername, newPassword, requestingUsername })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== ANALYTICS ====================

export const getRealtimeAnalytics = async () => {
  const response = await fetch(`${API_URL}/admin/analytics/realtime`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getChallengeStatistics = async () => {
  const response = await fetch(`${API_URL}/admin/analytics/challenges`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getSolveTimeline = async () => {
  const response = await fetch(`${API_URL}/admin/analytics/timeline`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const toggleChallengeVisibility = async (challengeId) => {
  const response = await fetch(`${API_URL}/admin/challenges/${challengeId}/toggle-visibility`, {
    method: 'PATCH'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const toggleChallengeDisabled = async (challengeId) => {
  const response = await fetch(`${API_URL}/admin/challenges/${challengeId}/toggle-disabled`, {
    method: 'PATCH'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== ANNOUNCEMENTS ====================

export const getAnnouncements = async () => {
  const response = await fetch(`${API_URL}/announcements`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const getAllAnnouncements = async () => {
  const response = await fetch(`${API_URL}/admin/announcements`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const createAnnouncement = async (announcement) => {
  const response = await fetch(`${API_URL}/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(announcement)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const updateAnnouncement = async (id, announcement) => {
  const response = await fetch(`${API_URL}/admin/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(announcement)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const deleteAnnouncement = async (id) => {
  const response = await fetch(`${API_URL}/admin/announcements/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const toggleAnnouncementStatus = async (id) => {
  const response = await fetch(`${API_URL}/admin/announcements/${id}/toggle`, {
    method: 'PATCH'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

export const toggleAnnouncementPin = async (id) => {
  const response = await fetch(`${API_URL}/admin/announcements/${id}/pin`, {
    method: 'PATCH'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};

// ==================== LOCAL STORAGE (for current user session) ====================

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export const setCurrentUser = (username) => {
  const sessionData = {
    username,
    lastActivity: Date.now()
  };
  localStorage.setItem('currentUser', JSON.stringify(sessionData));
  updateLastActivity(); // Set up activity tracking
};

export const getCurrentUser = () => {
  const sessionData = localStorage.getItem('currentUser');
  if (!sessionData) return null;
  
  try {
    const { username, lastActivity } = JSON.parse(sessionData);
    const now = Date.now();
    
    // Check if session has expired (30 minutes of inactivity)
    if (now - lastActivity > INACTIVITY_TIMEOUT) {
      logout();
      return null;
    }
    
    // Update last activity time
    updateLastActivity();
    return username;
  } catch (error) {
    // Handle legacy format (plain string) or corrupted data
    localStorage.removeItem('currentUser');
    return null;
  }
};

export const updateLastActivity = () => {
  const sessionData = localStorage.getItem('currentUser');
  if (!sessionData) return;
  
  try {
    const data = JSON.parse(sessionData);
    data.lastActivity = Date.now();
    localStorage.setItem('currentUser', JSON.stringify(data));
  } catch (error) {
    // Ignore errors
  }
};

export const logout = () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('adminAuth');
  localStorage.removeItem('adminAuthTime');
  window.location.href = '/';
};

export const setAdminAuth = (isAuthenticated) => {
  const authData = {
    authenticated: isAuthenticated,
    lastActivity: Date.now()
  };
  localStorage.setItem('adminAuth', JSON.stringify(authData));
};

export const getAdminAuth = () => {
  const authData = localStorage.getItem('adminAuth');
  if (!authData) return false;
  
  try {
    const { authenticated, lastActivity } = JSON.parse(authData);
    const now = Date.now();
    
    // Check if admin session has expired (30 minutes of inactivity)
    if (now - lastActivity > INACTIVITY_TIMEOUT) {
      localStorage.removeItem('adminAuth');
      return false;
    }
    
    // Update last activity time
    if (authenticated) {
      setAdminAuth(true);
    }
    
    return authenticated === true;
  } catch (error) {
    // Handle legacy format or corrupted data
    localStorage.removeItem('adminAuth');
    return false;
  }
};

// Set up activity listeners to track user activity
if (typeof window !== 'undefined') {
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  activityEvents.forEach(event => {
    window.addEventListener(event, () => {
      updateLastActivity();
    }, { passive: true });
  });
}
