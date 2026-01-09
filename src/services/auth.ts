/**
 * Authentication API Service
 * Handles all communication with the backend auth endpoints
 */

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD 
    ? 'https://rubics-cube-three.vercel.app/api' 
    : 'http://localhost:5000/api'
);

// Token storage keys
const TOKEN_KEY = 'rubik_auth_token';
const USER_KEY = 'rubik_user';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  lastLogin?: string;
  solveCount?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
  errors?: Array<{ msg: string; param: string }>;
}

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set auth token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Get stored user
 */
export function getStoredUser(): User | null {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

/**
 * Set stored user
 */
export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Merge existing headers
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('⚠️ Cannot connect to server. Please ensure the backend server is running on port 5000.');
    }
    throw error;
  }
}

/**
 * Sign up a new user
 */
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  
  if (response.success && response.data) {
    setToken(response.data.token);
    setStoredUser(response.data.user);
  }
  
  return response;
}

/**
 * Login user
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  if (response.success && response.data) {
    setToken(response.data.token);
    setStoredUser(response.data.user);
  }
  
  return response;
}

/**
 * Logout user
 */
export function logout(): void {
  removeToken();
}

/**
 * Verify token and get current user
 */
export async function verifyToken(): Promise<User | null> {
  const token = getToken();
  
  if (!token) {
    return null;
  }
  
  try {
    const response = await apiRequest<{ success: boolean; data: { user: User } }>(
      '/auth/me'
    );
    
    if (response.success && response.data) {
      setStoredUser(response.data.user);
      return response.data.user;
    }
    
    return null;
  } catch (error) {
    // Token is invalid, remove it
    removeToken();
    return null;
  }
}

/**
 * Record a solve attempt
 */
export async function recordSolve(): Promise<{ solveCount: number } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: { solveCount: number };
    }>('/auth/solve', {
      method: 'POST',
    });
    
    if (response.success && response.data) {
      // Update stored user's solve count
      const user = getStoredUser();
      if (user) {
        user.solveCount = response.data.solveCount;
        setStoredUser(user);
      }
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to record solve:', error);
    return null;
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ connected: boolean; mongodb: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return {
      connected: true,
      mongodb: data.mongodb === 'connected',
      message: data.mongodb === 'connected' ? 'Connected' : '⚠️ MongoDB not connected (auth features limited)'
    };
  } catch (error) {
    return {
      connected: false,
      mongodb: false,
      message: '❌ Backend server is not running. Start it with: cd server && node server.js'
    };
  }
}

// =====================
// Solve History API
// =====================

export interface SolveRecord {
  _id: string;
  moveCount: number;
  solveTime: number | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  formattedSolveTime?: string;
}

export interface SolveStats {
  totalSolves: number;
  totalMoves: number;
  avgMoves: number;
  minMoves: number;
  maxMoves: number;
  avgSolveTime: number;
  fastestSolve: number;
  recentActivity: Array<{
    _id: string;
    count: number;
    avgMoves: number;
  }>;
}

// Use a generic object type for cube state to avoid type conflicts
// with the main CubeState type that uses nullable colors
export interface CubeStateForApi {
  U: (string | null)[];
  D: (string | null)[];
  F: (string | null)[];
  B: (string | null)[];
  L: (string | null)[];
  R: (string | null)[];
}

export interface Move {
  notation: string;
  face: string;
  direction: string;
  description?: string;
}

/**
 * Save a solve to history
 */
export async function saveSolve(data: {
  initialCubeState: CubeStateForApi;
  solution: Move[];
  moveCount: number;
  solveTime?: number;
  completed?: boolean;
}): Promise<{ id: string } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: { id: string };
    }>('/solves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to save solve:', error);
    return null;
  }
}

/**
 * Get solve history
 */
export async function getSolveHistory(page = 1, limit = 10): Promise<{
  solves: SolveRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
} | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: {
        solves: SolveRecord[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          hasMore: boolean;
        };
      };
    }>(`/solves?page=${page}&limit=${limit}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to get solve history:', error);
    return null;
  }
}

/**
 * Get user statistics
 */
export async function getSolveStats(): Promise<SolveStats | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: SolveStats;
    }>('/solves/stats');
    
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to get solve stats:', error);
    return null;
  }
}

/**
 * Get a specific solve by ID
 */
export async function getSolveById(id: string): Promise<SolveRecord & { initialCubeState: CubeStateForApi; solution: Move[] } | null> {
  try {
    const response = await apiRequest<{
      success: boolean;
      data: SolveRecord & { initialCubeState: CubeStateForApi; solution: Move[] };
    }>(`/solves/${id}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to get solve:', error);
    return null;
  }
}

/**
 * Mark a solve as completed
 */
export async function completeSolve(id: string, solveTime?: number): Promise<boolean> {
  try {
    const response = await apiRequest<{ success: boolean }>(`/solves/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ solveTime }),
    });
    
    return response.success;
  } catch (error) {
    console.error('Failed to complete solve:', error);
    return false;
  }
}

/**
 * Delete a solve from history
 */
export async function deleteSolve(id: string): Promise<boolean> {
  try {
    const response = await apiRequest<{ success: boolean }>(`/solves/${id}`, {
      method: 'DELETE',
    });
    
    return response.success;
  } catch (error) {
    console.error('Failed to delete solve:', error);
    return false;
  }
}
