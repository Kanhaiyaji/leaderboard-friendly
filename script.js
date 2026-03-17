// Backend API configuration
console.log('🚀 Script loaded! Starting initialization...');
const API_BASE_URL = window.location.origin; // Use same origin (backend server)
console.log('API Base URL:', API_BASE_URL);

// Storage keys
const STORAGE_KEY = 'github_leaderboard_users';
const LEADERBOARD_CACHE_KEY = 'github_leaderboard_cache';
const CACHE_EXPIRY_KEY = 'github_leaderboard_cache_time';

// Emoji medals for top 3
const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
};

let githubUsers = [];
let leaderboardData = [];
let refreshInterval = null;
let apiErrorCount = 0;

// Initialize app
function init() {
    console.log('✅ init() called');
    loadUsersFromStorage();
    renderTrackedUsers();
    
    // Load cached data first so user sees something while API loads
    const cachedData = loadCachedLeaderboardData();
    if (cachedData && cachedData.length > 0) {
        leaderboardData = cachedData;
        loadLeaderboard();
        updateLastRefreshTime();
    }
    
    showLoader();
    fetchGitHubData();
    setupEventListeners();
    console.log('✅ Event listeners setup complete');
    
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
            githubUsers = [];
            saveUsersToStorage();
        }
    } else {
        githubUsers = [];  // Start with empty - user adds dynamically
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

// Save leaderboard to cache
function cacheLeaderboardData() {
    if (leaderboardData.length > 0) {
        localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(leaderboardData));
        localStorage.setItem(CACHE_EXPIRY_KEY, Date.now().toString());
    }
}

// Load cached leaderboard
function loadCachedLeaderboardData() {
    try {
        const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.error('Error loading cache:', e);
    }
    return null;
}

// Get cache age in minutes
function getCacheAgeMinutes() {
    const cacheTime = localStorage.getItem(CACHE_EXPIRY_KEY);
    if (!cacheTime) return null;
    const ageMs = Date.now() - parseInt(cacheTime);
    return Math.floor(ageMs / 60000);
}

// Setup Event Listeners
function setupEventListeners() {
    console.log('📢 setupEventListeners() called');
    const addBtn = document.getElementById('addUserBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const resetBtn = document.getElementById('resetUsersBtn');
    const input = document.getElementById('newUserInput');
    const toggleBulkBtn = document.getElementById('toggleBulkBtn');
    const bulkAddBtn = document.getElementById('bulkAddBtn');
    const closeBulkBtn = document.getElementById('closeBulkBtn');
    
    console.log('🔍 Elements found:', {
        addBtn: !!addBtn,
        refreshBtn: !!refreshBtn,
        resetBtn: !!resetBtn,
        input: !!input,
        toggleBulkBtn: !!toggleBulkBtn,
        bulkAddBtn: !!bulkAddBtn,
        closeBulkBtn: !!closeBulkBtn
    });
    
    if (addBtn) {
        console.log('✅ Adding click listener to addUserBtn');
        addBtn.addEventListener('click', handleAddUser);
    }
    if (refreshBtn) {
        console.log('✅ Adding click listener to refreshBtn');
        refreshBtn.addEventListener('click', () => {
            showLoader();
            fetchGitHubData();
        });
    }
    if (resetBtn) {
        console.log('✅ Adding click listener to resetBtn');
        resetBtn.addEventListener('click', resetAllUsers);
    }
    if (input) {
        console.log('✅ Adding keypress listener to input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUser();
            }
        });
    }
    
    // Bulk Add Event Listeners
    if (toggleBulkBtn) {
        console.log('✅ Adding click listener to toggleBulkBtn');
        toggleBulkBtn.addEventListener('click', toggleBulkAddSection);
    }
    if (bulkAddBtn) {
        console.log('✅ Adding click listener to bulkAddBtn');
        bulkAddBtn.addEventListener('click', handleBulkAddUsers);
    }
    if (closeBulkBtn) {
        console.log('✅ Adding click listener to closeBulkBtn');
        closeBulkBtn.addEventListener('click', closeBulkAddSection);
    }
}

// Handle Add User
function handleAddUser() {
    console.log('🔘 handleAddUser() clicked!');
    const input = document.getElementById('newUserInput');
    if (!input) {
        console.error('❌ Input not found');
        return;
    }
    
    const username = input.value.trim();
    console.log('📝 Username:', username);
    
    if (!username) {
        showNotification('Please enter a GitHub username', 'error');
        return;
    }
    
    if (githubUsers.includes(username)) {
        showNotification(`@${username} is already tracked`, 'warning');
        input.value = '';
        return;
    }
    
    if (githubUsers.length >= 10) {
        showNotification('Maximum 10 users allowed', 'error');
        return;
    }
    
    // Add user
    githubUsers.push(username);
    saveUsersToStorage();
    renderTrackedUsers();
    input.value = '';
    input.focus();
    
    // Show success and fetch
    showNotification(`✓ Added @${username}!`, 'success');
    showLoader();
    fetchGitHubData();
}

// Toggle Bulk Add Section
function toggleBulkAddSection() {
    const bulkSection = document.getElementById('bulkAddSection');
    const toggleBtn = document.getElementById('toggleBulkBtn');
    
    if (bulkSection.style.display === 'none' || bulkSection.style.display === '') {
        bulkSection.style.display = 'block';
        toggleBtn.textContent = '🔽 BULK';
        document.getElementById('bulkUserInput').focus();
    } else {
        bulkSection.style.display = 'none';
        toggleBtn.textContent = '📋 BULK';
    }
}

// Close Bulk Add Section
function closeBulkAddSection() {
    const bulkSection = document.getElementById('bulkAddSection');
    const toggleBtn = document.getElementById('toggleBulkBtn');
    const textarea = document.getElementById('bulkUserInput');
    
    bulkSection.style.display = 'none';
    toggleBtn.textContent = '📋 BULK';
    textarea.value = '';
}

// Handle Bulk Add Users
function handleBulkAddUsers() {
    const textarea = document.getElementById('bulkUserInput');
    const input = textarea.value.trim();
    
    if (!input) {
        alert('Please enter at least one username');
        return;
    }
    
    // Parse usernames (support both comma-separated and newline-separated)
    let usernames = input
        .split(/[,\n]/)  // Split by comma or newline
        .map(u => u.trim())
        .filter(u => u.length > 0)
        .filter((u, idx, arr) => arr.indexOf(u) === idx); // Remove duplicates
    
    if (usernames.length === 0) {
        alert('No valid usernames found');
        return;
    }
    
    // Check if adding would exceed limit
    const availableSlots = 10 - githubUsers.length;
    if (usernames.length > availableSlots) {
        alert(`Can only add ${availableSlots} more users (max 10 total)`);
        usernames = usernames.slice(0, availableSlots);
    }
    
    // Filter out already tracked users
    const newUsers = usernames.filter(u => !githubUsers.includes(u));
    
    if (newUsers.length === 0) {
        alert('All these users are already tracked');
        return;
    }
    
    // Add all new users
    githubUsers.push(...newUsers);
    saveUsersToStorage();
    renderTrackedUsers();
    
    // Clear textarea and close section
    textarea.value = '';
    closeBulkAddSection();
    
    // Show success message
    alert(`✓ Added ${newUsers.length} user${newUsers.length > 1 ? 's' : ''}!\n\nLoading data...`);
    
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

// Fetch GitHub user data from backend API
async function fetchGitHubData() {
    if (githubUsers.length === 0) {
        hideLoader();
        return;
    }
    
    const userList = githubUsers.join(',');
    console.log('Fetching leaderboard data from backend for users:', userList);
    
    try {
        // Call our backend API (much simpler!)
        const response = await fetch(`${API_BASE_URL}/api/leaderboard?users=${encodeURIComponent(userList)}`);
        
        console.log(`Backend response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Leaderboard data received:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            // Use the data from backend
            leaderboardData = result.data;
            
            // Cache the data
            cacheLeaderboardData();
            apiErrorCount = 0;
            
            console.log(`✓ Loaded ${leaderboardData.length} users successfully`);
            showNotification(`✓ Leaderboard updated with ${leaderboardData.length} users!`, 'success');
        } else {
            // Try to use cached data
            console.log('No valid data from backend. Loading from cache...');
            const cachedData = loadCachedLeaderboardData();
            if (cachedData && cachedData.length > 0) {
                leaderboardData = cachedData;
                const cacheAge = getCacheAgeMinutes();
                showNotification(`⚠ Showing last saved data (${cacheAge} min old)`, 'warning');
            } else {
                leaderboardData = [];
                showNotification('❌ Unable to load data. Check usernames.', 'error');
            }
        }
        
        // Update UI
        loadLeaderboard();
        updateLastRefreshTime();
        hideLoader();
        
    } catch (error) {
        console.error('Error fetching from backend:', error.message);
        
        // Try cached data as fallback
        const cachedData = loadCachedLeaderboardData();
        if (cachedData && cachedData.length > 0) {
            leaderboardData = cachedData;
            loadLeaderboard();
            updateLastRefreshTime();
            const cacheAge = getCacheAgeMinutes();
            showNotification(`⚠ Backend error. Showing cached data (${cacheAge} min old).`, 'warning');
        } else {
            leaderboardData = [];
            showNotification(`❌ Error: ${error.message}`, 'error');
            loadLeaderboard();
        }
        
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
        const cacheAge = getCacheAgeMinutes();
        let errorMsg = 'Unable to load GitHub data';
        let helpMsg = 'Check usernames or click Refresh';
        
        if (cacheAge !== null) {
            errorMsg = '❌ API Error or Rate Limited';
            helpMsg = `No cached data. Try again in a few minutes.`;
        } else if (githubUsers.length === 0) {
            helpMsg = 'Add GitHub usernames to get started';
        } else {
            helpMsg = `Check username spelling or try Refresh`;
        }
        
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>${errorMsg}</p>
                <p style="font-size: 0.85rem; color: #aaa;">${helpMsg}</p>
                ${githubUsers.length > 0 ? `<p style="font-size: 0.8rem; margin-top: 8px; color: #999;">Tracked: ${githubUsers.map(u => '@' + u).join(', ')}</p>` : ''}
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
    console.log('🔄 Page loaded, initializing app');
    setTimeout(init, 500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Show notification toast
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotif = document.getElementById('notificationToast');
    if (existingNotif) existingNotif.remove();
    
    // Create notification element
    const notif = document.createElement('div');
    notif.id = 'notificationToast';
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? 'rgba(50, 200, 100, 0.9)' : type === 'error' ? 'rgba(255, 80, 80, 0.9)' : 'rgba(100, 150, 255, 0.9)'};
        color: #ffffff;
        border-radius: 8px;
        font-size: 0.9rem;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Add animation styles if not already present
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);
}
