// Default GitHub Users
const DEFAULT_USERS = ['Kanhaiyaji', 'ius-sharma', 'stillaayush'];
const STORAGE_KEY = 'github_leaderboard_users';

// Emoji medals for top 3
const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
};

let githubUsers = [];
let leaderboardData = [];
let refreshInterval = null;

// Initialize app
function init() {
    loadUsersFromStorage();
    renderTrackedUsers();
    showLoader();
    fetchGitHubData();
    setupEventListeners();
    
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(fetchGitHubData, 30000);
    
    // Load users from URL parameters if provided
    loadUsersFromURL();
}

// Load users from localStorage
function loadUsersFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            githubUsers = JSON.parse(stored);
        } catch (e) {
            githubUsers = DEFAULT_USERS;
            saveUsersToStorage();
        }
    } else {
        githubUsers = DEFAULT_USERS;
        saveUsersToStorage();
    }
}

// Save users to localStorage
function saveUsersToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(githubUsers));
}

// Load users from URL parameters
function loadUsersFromURL() {
    const params = new URLSearchParams(window.location.search);
    const urlUsers = params.get('users');
    
    if (urlUsers) {
        const users = urlUsers.split(',').map(u => u.trim()).filter(u => u.length > 0);
        if (users.length > 0) {
            githubUsers = users;
            saveUsersToStorage();
            renderTrackedUsers();
            showLoader();
            fetchGitHubData();
        }
    }
}

// Show loader
function showLoader() {
    document.getElementById('loader').classList.add('active');
}

// Hide loader
function hideLoader() {
    document.getElementById('loader').classList.remove('active');
}

// Setup Event Listeners
function setupEventListeners() {
    const addBtn = document.getElementById('addUserBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const presetBtn = document.getElementById('presetBtn');
    const resetBtn = document.getElementById('resetUsersBtn');
    const input = document.getElementById('newUserInput');
    
    if (addBtn) addBtn.addEventListener('click', handleAddUser);
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        showLoader();
        fetchGitHubData();
    });
    if (presetBtn) presetBtn.addEventListener('click', loadPresetUsers);
    if (resetBtn) resetBtn.addEventListener('click', resetAllUsers);
    if (input) input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddUser();
        }
    });
}

// Handle Add User
function handleAddUser() {
    const input = document.getElementById('newUserInput');
    if (!input) return;
    
    const username = input.value.trim();
    
    if (!username) {
        alert('Please enter a GitHub username');
        return;
    }
    
    if (githubUsers.includes(username)) {
        alert('This user is already tracked');
        input.value = '';
        return;
    }
    
    if (githubUsers.length >= 10) {
        alert('Maximum 10 users allowed');
        return;
    }
    
    githubUsers.push(username);
    saveUsersToStorage();
    renderTrackedUsers();
    input.value = '';
    input.focus();
    
    showLoader();
    fetchGitHubData();
}

// Remove User
function removeUser(username) {
    githubUsers = githubUsers.filter(u => u !== username);
    saveUsersToStorage();
    renderTrackedUsers();
    
    if (githubUsers.length > 0) {
        showLoader();
        fetchGitHubData();
    } else {
        document.getElementById('leaderboardList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>No users tracked</p>
                <p style="font-size: 0.9rem;">Add GitHub usernames to get started</p>
            </div>
        `;
    }
}

// Render Tracked Users
function renderTrackedUsers() {
    const container = document.getElementById('trackedUsersContainer');
    container.innerHTML = '';
    
    if (githubUsers.length === 0) {
        container.innerHTML = '<div style="color: #888888; font-size: 0.9rem;">No users tracked yet</div>';
        return;
    }
    
    githubUsers.forEach(user => {
        const userTag = document.createElement('div');
        userTag.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 8px;
            font-size: 0.9rem;
            color: #ffd700;
        `;
        
        userTag.innerHTML = `
            <span>@${escapeHtml(user)}</span>
            <button style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-weight: bold; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;" 
                    data-username="${user}">×</button>
        `;
        
        userTag.querySelector('button').addEventListener('click', () => {
            removeUser(user);
        });
        
        container.appendChild(userTag);
    });
}

// Load Preset Users
function loadPresetUsers() {
    githubUsers = [...DEFAULT_USERS];
    saveUsersToStorage();
    renderTrackedUsers();
    
    showLoader();
    fetchGitHubData();
}

// Reset All Users
function resetAllUsers() {
    if (confirm('Remove all tracked users?')) {
        githubUsers = [];
        saveUsersToStorage();
        renderTrackedUsers();
        
        document.getElementById('leaderboardList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>No users tracked</p>
                <p style="font-size: 0.9rem;">Add GitHub usernames to get started</p>
            </div>
        `;
    }
}

// Fetch GitHub user data
async function fetchGitHubData() {
    if (githubUsers.length === 0) {
        hideLoader();
        return;
    }
    
    try {
        leaderboardData = [];
        
        for (const username of githubUsers) {
            try {
                // Fetch user data
                const userResponse = await fetch(`https://api.github.com/users/${username}`);
                
                if (!userResponse.ok) {
                    console.error(`User ${username} not found`);
                    continue;
                }
                
                const userData = await userResponse.json();
                
                // Get public repos to count commits
                const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
                const repos = await reposResponse.json();
                
                // Calculate contributions from public activity
                const contributions = {
                    public_repos: userData.public_repos || 0,
                    public_gists: userData.public_gists || 0,
                    followers: userData.followers || 0,
                    profile_link: userData.html_url,
                    avatar: userData.avatar_url,
                    contributions: calculateContributions(userData, repos)
                };
                
                leaderboardData.push({
                    id: username,
                    name: userData.name || username,
                    username: username,
                    score: contributions.contributions,
                    avatar: userData.avatar_url,
                    repos: userData.public_repos,
                    followers: userData.followers,
                    profile: userData.html_url,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`Error fetching data for ${username}:`, error);
            }
        }
        
        // Sort by score
        leaderboardData.sort((a, b) => b.score - a.score);
        
        // Update UI
        loadLeaderboard();
        updateLastRefreshTime();
        hideLoader();
        
    } catch (error) {
        console.error('Error fetching GitHub data:', error);
        hideLoader();
    }
}

// Calculate contributions score
function calculateContributions(userData, repos) {
    // Weight: repos (10) + followers (5) + public gists (3) + base score (50)
    const repoScore = (userData.public_repos || 0) * 10;
    const followerScore = (userData.followers || 0) * 5;
    const gistScore = (userData.public_gists || 0) * 3;
    const baseScore = 50;
    
    // For more accurate commit count, we could sum repos but this is simpler
    // Alternative: Use GitHub GraphQL API for exact commit counts (requires authentication)
    return baseScore + repoScore + followerScore + gistScore;
}

// Load Leaderboard
function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';

    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Unable to load GitHub data</p>
                <p style="font-size: 0.9rem;">Check usernames or click Refresh</p>
            </div>
        `;
        return;
    }

    leaderboardData.forEach((user, index) => {
        const rank = index + 1;
        const medal = medals[rank] || `#${rank}`;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';

        const card = document.createElement('div');
        card.className = `leaderboard-card ${rankClass}`;
        card.style.cursor = 'pointer';
        
        card.innerHTML = `
            <div class="rank-badge">${medal}</div>
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <img src="${user.avatar}" alt="${user.username}" 
                     style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid rgba(255, 215, 0, 0.3);">
                <div class="rank-info">
                    <div class="rank-details">
                        <div class="rank-name">${escapeHtml(user.name)}</div>
                        <div class="rank-position" style="font-size: 0.8rem;">@${escapeHtml(user.username)} • ${user.repos} repos • ${user.followers} followers</div>
                    </div>
                </div>
            </div>
            <div class="rank-score">${user.score}</div>
        `;
        
        card.addEventListener('click', () => {
            window.open(user.profile, '_blank');
        });
        
        leaderboardList.appendChild(card);
    });
}

// Update last refresh time
function updateLastRefreshTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        lastUpdate.textContent = timeString;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
window.addEventListener('load', () => {
    setTimeout(init, 500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
