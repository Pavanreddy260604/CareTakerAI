# CareTakerAI 🧠💚

A proactive health and wellness companion that monitors your biological state and provides personalized AI-powered recommendations to optimize your cognitive capacity and prevent burnout.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.0-purple)

## 🌟 Features

### Core Functionality
- **Daily Health Check-ins** - Track sleep, hydration, food, exercise, and mental load
- **AI-Powered Recommendations** - Personalized advice from Google Gemini based on your patterns
- **Capacity Score** - Real-time cognitive capacity percentage (0-100%) using biological debt tracking
- **Recovery Mode** - Automatic detection when you need rest, with enforced recovery protocols

### Smart Analytics
- **Weekly Insights** - Pattern detection, correlation analysis, and trend visualization
- **Personal Baseline** - Learns what's "normal" for YOU over 30 days
- **Day-of-Week Patterns** - Identifies recurring issues (e.g., "Mondays are tough")
- **Recovery Score** - Measures how quickly you bounce back from low states

### Engagement Features
- **Hydration Tracker** - Log water intake with daily reset and reminders
- **Focus Timer** - Pomodoro-style sessions with progress tracking
- **Achievements** - Gamified badges for consistency (streaks, milestones)
- **Smart Reminders** - Context-aware notifications based on your patterns

### Two Modes
| Mode | Description |
|------|-------------|
| **Caretaker** | Full AI guidance with actionable recommendations |
| **Observer** | Data tracking only, minimal intervention |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: MongoDB (Mongoose ODM)
- **AI**: Google Gemini 2.5 Flash
- **Memory**: Supermemory for long-term pattern recall
- **Auth**: JWT + Google OAuth 2.0
- **Security**: Helmet, rate limiting, CORS

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **UI**: Tailwind CSS + Radix UI
- **Charts**: Recharts
- **State**: TanStack Query
- **Mobile**: Capacitor (iOS/Android)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key
- (Optional) Supermemory API key

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Configure `.env`:
```env
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
SUPERMEMORY_API_KEY=your_supermemory_key  # Optional
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

Start the server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000" > .env
```

Start the development server:
```bash
npm run dev
```

---

## 📁 Project Structure

```
├── backend/
│   ├── index.js              # Main server entry point
│   └── src/
│       ├── config/           # Database config
│       ├── middleware/       # Auth middleware
│       ├── models/           # Mongoose schemas
│       │   ├── User.js
│       │   ├── HealthLog.js
│       │   ├── Feedback.js
│       │   └── FocusSession.js
│       ├── routes/           # API routes
│       └── services/         # Business logic
│           ├── aiService.js       # Gemini AI integration
│           ├── analyticsService.js
│           ├── baselineService.js
│           ├── engagementService.js
│           ├── insightsService.js
│           ├── memoryService.js   # Supermemory integration
│           ├── patternService.js
│           ├── reminderService.js
│           └── rulesService.js    # Capacity calculation
│
└── frontend/
    └── src/
        ├── components/       # React components
        ├── pages/            # Page components
        ├── lib/              # Utilities & API client
        └── hooks/            # Custom React hooks
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/user/stats` | Get user stats & hydration |
| `POST` | `/api/check-in` | Submit daily health check-in |
| `POST` | `/api/user/water` | Log water intake |
| `GET` | `/api/analytics` | Get trends & insights |
| `GET` | `/api/engagement` | Get focus card & patterns |
| `GET` | `/api/insights/weekly` | Get weekly summary |

---

## 🧮 How Capacity Works

CareTakerAI uses a **biological debt model** inspired by Liebig's Law of the Minimum:

1. **Debt Accumulation**: Poor sleep adds +20 sleep debt, low water adds +15 hydration debt, high stress adds +15 mental debt
2. **Recovery**: Good states reduce debt (sleep OK = -10, water OK = -15)
3. **Capacity Formula**: `Capacity = 100 - max(sleepDebt, hydrationDebt, mentalDebt)`
4. **Modes**: 
   - `NORMAL`: Capacity > 45%
   - `LOCKED_RECOVERY`: Capacity 20-45%
   - `SURVIVAL`: Capacity < 20%

---

## 📱 Mobile Support

The frontend is built with Capacitor for native mobile deployment:

```bash
cd frontend
npx cap add android  # or ios
npx cap sync
npx cap open android
```

---

## 🔒 Security Features

- JWT authentication with 8-hour expiry
- Rate limiting (100 req/15min general, 10 req/15min auth)
- Helmet.js security headers
- CORS whitelisting
- Password hashing with bcrypt (salt rounds: 10)
- Google OAuth account takeover prevention

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with 💚 for better human performance**
