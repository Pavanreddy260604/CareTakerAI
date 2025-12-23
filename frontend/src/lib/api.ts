// API Configuration - Uses env var for production, defaults to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
        return data;
    },

    logout() {
        removeToken();
    },

    // Health Check-in
    async checkIn(health: {
        water: 'LOW' | 'OK';
        food: 'LOW' | 'OK';
        sleep: 'LOW' | 'OK';
        exercise: 'PENDING' | 'DONE';
        mentalLoad: 'LOW' | 'OK' | 'HIGH';
    }) {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/check-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify({
                health,
                appOpened: true,
                continuity: { streak: 1 },
                recoveryRequired: false,
            }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Check-in failed');
        return data;
    },

    // Get User Stats (day count, streak, etc)
    async getUserStats() {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/user/stats`, {
            method: 'GET',
            headers: {
                'Authorization': token,
            },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get stats');
        return data as {
            name: string;
            email: string;
            registrationDate: string;
            dayCount: number;
            streak: number;
            todayCheckedIn: boolean;
            latestLog?: any;
            totalCheckIns: number;
            metrics?: any;
        };
    },

    // Get Health History
    async getHealthHistory(limit = 7) {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/health/history?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': token,
            },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get history');
        return data;
    },

    // Update Settings
    async updateSettings(mode: 'CARETAKER' | 'OBSERVER') {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/user/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify({ mode }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update settings');
        return data;
    },

    // Engagement: Focus Card, Pattern Alerts, Recovery Score
    async getEngagement() {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/engagement`, {
            headers: { 'Authorization': token },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get engagement');
        return data as {
            focus: { title: string; reason: string; action: string; priority: string };
            patterns: Array<{ type: string; day?: string; days?: number; frequency?: number }>;
            recoveryScore: { score: number; trend: string; message: string };
            historyLength: number;
        };
    },

    // Weekly Reflection
    async submitReflection(reflection: { wentWell?: string; drained?: string; experiment?: string }) {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/reflection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
            },
            body: JSON.stringify(reflection),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit reflection');
        return data;
    },

    // Analytics: Trends, Weekly Summary
    async getAnalytics() {
        const token = getToken();
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`${API_BASE_URL}/analytics`, {
            headers: { 'Authorization': token },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get analytics');
        return data as {
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
        };
    },
};
