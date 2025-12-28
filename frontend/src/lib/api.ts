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
    const token = localStorage.getItem('caretaker_token'); // Changed to use 'caretaker_token' for consistency with existing getToken/setToken

    // Set a reasonable timeout for requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    // Merge signals if one was provided in options
    const signal = options.signal || controller.signal;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
            removeToken(); // Use existing removeToken function
            sessionStorage.setItem('session_expired', 'true'); // Set session expired flag
            dispatchSessionExpired(); // Dispatch event
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
            throw new Error('Session expired');
        }

        if (!response.ok) {
            // Try to parse error message JSON
            let errorMsg = `API Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorData.message || errorMsg;
            } catch (e) {
                // Ignore JSON parse error if response body is empty/text
            }
            throw new Error(errorMsg);
        }

        // Return empty object for 204 No Content
        if (response.status === 204) return {};

        return response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection.');
        }

        console.error('Fetch error:', error);
        throw error;
    }
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



    // Feedback: Submit feedback on AI response
    async submitFeedback(data: {
        rating: 'helpful' | 'not_helpful';
        aiResponse?: {
            action?: string;
            explanation?: string;
            urgency?: string;
            confidence?: number;
            category?: string;
        };
        healthContext?: {
            water?: string;
            food?: string;
            sleep?: string;
            exercise?: string;
            mentalLoad?: string;
            capacity?: number;
        };
        comment?: string;
    }): Promise<{
        success: boolean;
        message: string;
        stats: {
            totalFeedback: number;
            helpfulCount: number;
            helpfulRate: number;
        };
    }> {
        return authFetch(`${API_BASE_URL}/feedback`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Feedback: Get feedback stats
    async getFeedbackStats(): Promise<{
        totalFeedback: number;
        helpfulCount: number;
        helpfulRate: number;
        byCategory: Record<string, { helpful: number; total: number; rate: number }>;
        recentFeedback: Array<{
            rating: string;
            category: string;
            action: string;
            createdAt: string;
        }>;
    }> {
        return authFetch(`${API_BASE_URL}/feedback/stats`, {});
    },

    // PHASE 3: Goals
    async getGoals(): Promise<{
        targetSleepHours: number;
        targetWaterLiters: number;
        targetExerciseDays: number;
        customGoals: Array<{
            name: string;
            target: number;
            current: number;
            unit: string;
        }>;
    }> {
        return authFetch(`${API_BASE_URL}/goals`, {});
    },

    async updateGoals(goals: {
        targetSleepHours?: number;
        targetWaterLiters?: number;
        targetExerciseDays?: number;
        customGoals?: Array<{ name: string; target: number; current: number; unit: string }>;
    }): Promise<{ success: boolean; goals: any }> {
        return authFetch(`${API_BASE_URL}/goals`, {
            method: 'PUT',
            body: JSON.stringify(goals),
        });
    },

    // PHASE 3: Baseline
    async getBaseline(): Promise<{
        hasBaseline: boolean;
        avgCapacity?: number;
        avgSleepQuality?: number;
        avgHydration?: number;
        avgExercise?: number;
        avgStress?: number;
        lowCapacityThreshold?: number;
        dataPoints?: number;
        lastCalculated?: string;
        message?: string;
    }> {
        return authFetch(`${API_BASE_URL}/baseline`, {});
    },

    async recalculateBaseline(): Promise<{ success: boolean; baseline?: any; message?: string }> {
        return authFetch(`${API_BASE_URL}/baseline/recalculate`, { method: 'POST' });
    },

    // PHASE 4: Insights
    async getWeeklySummary(): Promise<{
        hasEnoughData: boolean;
        message?: string;
        daysLogged?: number;
        period?: { start: string; end: string; daysLogged: number };
        overview?: {
            avgCapacity: number;
            sleepQualityRate: number;
            hydrationRate: number;
            exerciseRate: number;
            stressRate: number;
            totalCheckIns: number;
        };
        bestDay?: { date: string; dayName: string; capacity: number; reason: string };
        worstDay?: { date: string; dayName: string; capacity: number; reason: string };
        patterns?: Array<{
            type: string;
            category: string;
            message: string;
            icon: string;
            severity: string;
        }>;
        dayOfWeekAnalysis?: {
            insights: Array<{ type: string; message: string; suggestion: string }>;
            weakestDay: string;
            strongestDay: string;
        };
        correlations?: Array<{
            factor: string;
            impact: string;
            difference: number;
            message: string;
        }>;
        recommendations?: Array<{
            priority: string;
            category: string;
            action: string;
            reason: string;
        }>;
    }> {
        return authFetch(`${API_BASE_URL}/insights/weekly`, {});
    },

    async getMonthlyTrends(): Promise<{
        hasEnoughData: boolean;
        weeks?: Array<{ week: number; avgCapacity: number; daysLogged: number }>;
        trend?: 'improving' | 'stable' | 'declining';
        totalDays?: number;
        error?: string;
    }> {
        return authFetch(`${API_BASE_URL}/insights/monthly`, {});
    },

    // PHASE 5: Engagement
    async getSmartReminder(): Promise<{
        reminderType: 'none' | 'check_in' | 'missed' | 'evening' | 'morning' | 'recovery_check' | 'evening_update' | 'error';
        message: string;
        urgency: 'low' | 'medium' | 'high';
        suggestedTime?: string;
        checkedInToday: boolean;
        typicalCheckInHour: number;
        currentHour: number;
        streak: {
            current: number;
            longest: number;
            atRisk: boolean;
            daysLogged: number;
        };
    }> {
        return authFetch(`${API_BASE_URL}/reminder`, {});
    },

    async getAchievements(): Promise<{
        achievements: Array<{
            id: string;
            name: string;
            description: string;
            icon: string;
            earned: boolean;
        }>;
    }> {
        return authFetch(`${API_BASE_URL}/achievements`, {});
    },

    async getTimeContext(): Promise<{
        period: string;
        greeting: string;
        energyExpectation: string;
        suggestedFocus: string;
        isWeekend: boolean;
    }> {
        return authFetch(`${API_BASE_URL}/time-context`, {});
    },

    async getStreak(): Promise<{
        current: number;
        longest: number;
        atRisk: boolean;
        daysLogged: number;
    }> {
        return authFetch(`${API_BASE_URL}/streak`, {});
    },

    // Focus Timer
    async saveFocusSession(duration: number): Promise<{
        success: boolean;
        todayStats?: {
            sessions: number;
            totalMinutes: number;
        }
    }> {
        return authFetch(`${API_BASE_URL}/focus`, {
            method: 'POST',
            body: JSON.stringify({ duration }),
        });
    },

    async getFocusStats(): Promise<{
        totalSessions: number;
        totalMinutes: number;
    }> {
        return authFetch(`${API_BASE_URL}/focus/stats`, {});
    },
};
