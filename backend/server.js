const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

// Headers for GitHub API
const getGitHubHeaders = () => ({
  'Accept': 'application/vnd.github.v3+json',
  ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
});

// Helper function to calculate contributions score
function calculateContributions(userData, repos) {
  const repoScore = (userData.public_repos || 0) * 10;
  const followerScore = (userData.followers || 0) * 5;
  const gistScore = (userData.public_gists || 0) * 3;
  const baseScore = 50;
  return baseScore + repoScore + followerScore + gistScore;
}

// Main leaderboard API endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { users } = req.query;

    if (!users) {
      return res.status(400).json({
        error: 'Missing users parameter',
        message: 'Provide users as comma-separated list: ?users=user1,user2',
      });
    }

    // Parse users
    const usernames = users
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (usernames.length === 0) {
      return res.status(400).json({ error: 'No valid usernames provided' });
    }

    const leaderboardData = [];
    const headers = getGitHubHeaders();

    // Fetch data for each user in parallel
    const promises = usernames.map(async (username) => {
      try {
        console.log(`Fetching data for ${username}...`);

        // Fetch user data
        const userResponse = await axios.get(`${GITHUB_API_BASE}/users/${username}`, { headers });

        if (!userResponse.data) {
          console.warn(`No data for user ${username}`);
          return null;
        }

        const userData = userResponse.data;

        // Fetch repos
        let repos = [];
        try {
          const reposResponse = await axios.get(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100`, { headers });
          repos = reposResponse.data || [];
        } catch (repoError) {
          console.warn(`Could not fetch repos for ${username}:`, repoError.message);
        }

        return {
          id: username,
          name: userData.name || username,
          username: username,
          score: calculateContributions(userData, repos),
          avatar: userData.avatar_url,
          repos: userData.public_repos || 0,
          followers: userData.followers || 0,
          profile: userData.html_url,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error(`Error fetching ${username}:`, error.message);
        
        // Check for rate limit
        if (error.response?.status === 403) {
          console.error('GitHub API rate limit exceeded');
        }
        
        return null;
      }
    });

    const results = await Promise.all(promises);

    // Filter out null results and sort by score
    const validData = results
      .filter((data) => data !== null)
      .sort((a, b) => b.score - a.score);

    if (validData.length === 0) {
      return res.status(404).json({
        error: 'Could not fetch data for any users',
        message: 'Check usernames or try again later',
        requested: usernames,
      });
    }

    // Return leaderboard
    res.json({
      success: true,
      count: validData.length,
      total_requested: usernames.length,
      data: validData,
      fetched_at: new Date().toISOString(),
      rateLimit: {
        limit: GITHUB_TOKEN ? 5000 : 60,
        authenticated: !!GITHUB_TOKEN,
      },
    });

  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({
      error: 'Server error',
      message: error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: !!GITHUB_TOKEN,
    rateLimit: GITHUB_TOKEN ? '5000/hour' : '60/hour',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Use /api/leaderboard?users=user1,user2',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`GitHub Token: ${GITHUB_TOKEN ? '✅ Configured' : '❌ Not configured (rate limit: 60/hour)'}`);
  console.log(`API: http://localhost:${PORT}/api/leaderboard?users=user1,user2`);
});
