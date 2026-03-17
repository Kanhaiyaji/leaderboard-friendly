# Leaderboard Backend API

Simple Node.js backend for fetching GitHub user data with authentication support.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create `.env` File
```bash
cp .env.example .env
```

### 3. Add GitHub Token (Optional but Recommended)

**To get a GitHub Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select `public_repo` scope
4. Copy the token
5. Paste it in `.env` as `GITHUB_TOKEN=your_token_here`

**Why?** Without token: 60 requests/hour | With token: 5000 requests/hour ✅

### 4. Start Server
```bash
npm start
```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Get Leaderboard
```
GET /api/leaderboard?users=user1,user2,user3
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "username": "user1",
      "name": "User Name",
      "score": 1250,
      "repos": 45,
      "followers": 320,
      "avatar": "https://...",
      "profile": "https://github.com/user1"
    }
  ],
  "rateLimit": {
    "limit": 5000,
    "authenticated": true
  }
}
```

### Health Check
```
GET /api/health
```

## 🔐 Environment Variables

- `GITHUB_TOKEN` - GitHub Personal Access Token (optional)
- `PORT` - Server port (default: 5000)

## 📝 Notes

- Requests are done in parallel for speed
- Error handling includes rate limit detection
- Works locally and on production servers (Vercel, Railway, Heroku, etc.)

## 🚀 Deployment

### Vercel (Recommended)
1. Build folder structure:
   ```
   backend/
   public/
   vercel.json
   ```

2. Create `vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "backend/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/backend/server.js"
       }
     ]
   }
   ```

3. Push to GitHub and connect to Vercel
4. Add `GITHUB_TOKEN` in Vercel environment variables

### Railway / Heroku
1. Push this repo to GitHub
2. Connect to Railway/Heroku
3. Set root directory to `backend/`
4. Add environment variables

## 🛠️ Development

Use nodemon for auto-reload:
```bash
npm run dev
```
