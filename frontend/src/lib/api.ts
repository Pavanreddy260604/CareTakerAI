// API Configuration - Uses env var for production, defaults to localhost for dev
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    // If running on a network IP (mobile testing), use that IP instead of localhost
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    return `http://${hostname}:3000/api`;
};

const API_BASE_URL = getBaseUrl();

// Session expired event - custom event for handling token expiration
const SESSION_EXPIRED_EVENT = 'session-expired';

export const dispatchSessionExpired = () => {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};

export const onSessionExpired = (callback: () => void) => {
    window.addEventListener(SESSION_EXPIRED_EVENT, callback);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, callback);
};

// Token management
export const getToken = (): string | null => {
    return localStorage.getItem('caretaker_token');
};

export const setToken = (token: string): void => {
    localStorage.setItem('caretaker_token', token);
};

export const removeToken = (): void => {
    localStorage.removeItem('caretaker_token');
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// Handle API response - checks for 401 and handles token expiration
const handleResponse = async (res: Response) => {
    if (res.status === 401) {
        // Token expired or invalid
        removeToken();
        // Set session expired flag in sessionStorage
        sessionStorage.setItem('session_expired', 'true');
        // Dispatch session expired event
        dispatchSessionExpired();
        // Redirect to login
        window.location.href = '/login';
        throw new Error('Session expired');
    }

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || data.msg || 'Request failed');
    }
    return data;
};

// Authenticated fetch wrapper
const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    if (!token) {
        sessionStorage.setItem('session_expired', 'true');
        window.location.href = '/login';
        throw new Error('Not authenticated');
    }

    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': token,
        },
    });

    return handleResponse(res);
};

// API calls
export const api = {
    // Auth
    async register(name: string, email: string, password: string) {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Registration failed');
        setToken(data.token);
        return data;
    },

    async login(email: string, password: string) {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Login failed');
        setToken(data.token);
        // Clear session expired flag on successful login
        sessionStorage.removeItem('session_expired');
        return data;
    },

    async googleLogin(token: string) {
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Google Login failed');
        setToken(data.token);
        // Clear session expired flag on successful login
        sessionStorage.removeItem('session_expired');
        return data;
    },

    logout() {
        removeToken();
        sessionStorage.removeItem('session_expired');
    },

    // Health Check-in
    async checkIn(health: {
        water: 'LOW' | 'OK';
        food: 'LOW' | 'OK';
        sleep: 'LOW' | 'OK';
        exercise: 'PENDING' | 'DONE';
        mentalLoad: 'LOW' | 'OK' | 'HIGH';
    }) {
        return authFetch(`${API_BASE_URL}/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                health,
                appOpened: true,
                continuity: { streak: 1 },
                recoveryRequired: false,
            }),
        });
    },

    // Get User Stats (day count, streak, etc)
    async getUserStats() {
        return authFetch(`${API_BASE_URL}/user/stats`, {
            method: 'GET',
        }) as Promise<{
            name: string;
            email: string;
            registrationDate: string;
            dayCount: number;
            streak: number;
            todayCheckedIn: boolean;
            latestLog?: any;
            totalCheckIns: number;
            metrics?: any;
        }>;
    },

    // Get Health History
    async getHealthHistory(limit = 7) {
        return authFetch(`${API_BASE_URL}/health/history?limit=${limit}`, {
            method: 'GET',
        });
    },

    // Update Settings
    async updateSettings(mode: 'CARETAKER' | 'OBSERVER') {
        return authFetch(`${API_BASE_URL}/user/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode }),
        });
    },

    // Engagement: Focus Card, Pattern Alerts, Recovery Score
    async getEngagement() {
        return authFetch(`${API_BASE_URL}/engagement`, {}) as Promise<{
            focus: { title: string; reason: string; action: string; priority: string };
            patterns: Array<{ type: string; day?: string; days?: number; frequency?: number }>;
            recoveryScore: { score: number; trend: string; message: string };
            historyLength: number;
        }>;
    },

    // Weekly Reflection
    async submitReflection(reflection: { wentWell?: string; drained?: string; experiment?: string }) {
        return authFetch(`${API_BASE_URL}/reflection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reflection),
        });
    },

    // Analytics: Trends, Weekly Summary
    async getAnalytics() {
        return authFetch(`${API_BASE_URL}/analytics`, {}) as Promise<{
            trends: Array<{
                date: string;
                day: string;
                sleep: number;
                water: number;
                stress: number;
                exercise: number;
                capacity: number;
            }>;
            summary: {
                totalDays: number;
                avgCapacity: number;
                lowSleepDays: number;
                highStressDays: number;
                exerciseDays: number;
            };
            weekly: {
                stats?: {
                    daysLogged: number;
                    avgCapacity: number;
                    lowSleepDays: number;
                    highStressDays: number;
                    exerciseDays: number;
                    hydrationIssues: number;
                };
                insights?: Array<{ type: string; text: string }>;
            };
        }>;
    },

    // Voice: Parse natural language text to health data using AI
    async parseVoiceText(text: string): Promise<{
        success: boolean;
        health: {
            water?: 'LOW' | 'OK';
            food?: 'LOW' | 'OK';
            sleep?: 'LOW' | 'OK';
            exercise?: 'PENDING' | 'DONE';
            mentalLoad?: 'LOW' | 'OK' | 'HIGH';
        };
        parsed: boolean;
    }> {
        return authFetch(`${API_BASE_URL}/parse-voice`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    },

    // Focus: Save a focus session to database
    async saveFocusSession(duration: number): Promise<{
        success: boolean;
        message: string;
        todayStats: {
            sessions: number;
            totalMinutes: number;
        };
    }> {
        return authFetch(`${API_BASE_URL}/focus-session`, {
            method: 'POST',
            body: JSON.stringify({ duration }),
        });
    },

    // Focus: Get weekly focus stats
    async getFocusStats(): Promise<{
        totalSessions: number;
        totalMinutes: number;
        dailyBreakdown: Array<{
            date: string;
            sessions: number;
            minutes: number;
        }>;
    }> {
        return authFetch(`${API_BASE_URL}/focus-stats`, {});
    },
};
