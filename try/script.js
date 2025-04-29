
const API_KEY = '9fe82ba1-83c9-4c2c-9d46-44dc547bc217';
const API_BASE_URL = 'https://api.cricapi.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    try {
        console.log(`Making API request to: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 

    
        const urlWithKey = `${url}${url.includes('?') ? '&' : '?'}apikey=${API_KEY}`;

        console.log('Full URL with API key:', urlWithKey);

        const response = await fetch(urlWithKey, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData,
                url: urlWithKey
            });

            const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;

            if (response.status === 401) {
                throw new Error('Invalid or expired API key. Please check your configuration.');
            } else if (response.status === 429) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else if (response.status === 404) {
                throw new Error('Requested resource not found.');
            } else if (response.status >= 500) {
                throw new Error('API server error. Please try again later.');
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (!data) {
            throw new Error('Invalid response format: no data received');
        }

    
        if (data.status !== "success") {
            const errorMsg = data.message || data.error || 'API request failed';
            console.error('API Error:', errorMsg);

            if (errorMsg.toLowerCase().includes('invalid api key')) {
                throw new Error('Invalid or expired API key. Please check your configuration.');
            } else if (errorMsg.toLowerCase().includes('rate limit')) {
                throw new Error('API rate limit exceeded. Please try again later.');
            } else if (errorMsg.toLowerCase().includes('subscription')) {
                throw new Error('API subscription issue. Please check your plan and limits.');
            }
            throw new Error(`API Error: ${errorMsg}`);
        }

        return { data: data.data, status: true };
    } catch (error) {
        console.error(`API Request Error (${retries} retries left):`, error);

        
        if (retries > 0 && (
            error.message.includes('rate limit') ||
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('server error')
        )) {
            const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1);
        }

        
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your internet connection.');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        }

        throw error;
    }
}


const matchesContainer = document.getElementById('matches-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const errorTextElement = document.getElementById('error-text');
const lastUpdatedElement = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-btn');
const seriesFilterElement = document.getElementById('series-filter');
const statusFilterElement = document.getElementById('status-filter');
const matchDetailsElement = document.getElementById('match-details');
const matchDetailsContentElement = document.getElementById('match-details-content');
const backButton = document.getElementById('back-btn');


let allMatches = [];
let seriesList = [];
let currentMatchId = null;
let currentStatusFilter = 'all';


const LIVE_REFRESH_INTERVAL = 30000; 
let autoRefreshInterval = null;


async function fetchCricketNews() {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/cricScore`);
        const newsItems = response.data.slice(0, 4); 

        newsContainer.innerHTML = newsItems.map(item => `
            <div class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition">
                <h3 class="text-lg font-semibold text-blue-300 mb-2">${item.title || 'Cricket Update'}</h3>
                <p class="text-gray-300">${item.description || item.score || 'No details available'}</p>
                <div class="text-sm text-gray-400 mt-2">${new Date(item.dateTimeGMT).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching cricket news:', error);
        newsContainer.innerHTML = '<div class="text-center text-gray-400">Unable to load news at this time.</div>';
    }
}


async function fetchAndDisplayMatches() {
    showLoading();
    hideError();

    try {
        
        if (!API_KEY || API_KEY.trim() === '') {
            throw new Error('API key is missing. Please check your configuration.');
        }

        
        const response = await fetchWithRetry(`${API_BASE_URL}/currentMatches`);
        const matches = response.data;

        if (!matches || matches.length === 0) {
            showError('No cricket matches found at the moment. Please try again later.');
            return;
        }

        
        allMatches = matches.filter(match => match && match.name);

        if (allMatches.length === 0) {
            showError('No valid cricket matches available.');
            return;
        }

    
        seriesList = [...new Set(allMatches.map(match => match.name.split(',')[0].trim()))];
        updateSeriesFilter();

        filterMatches();
        updateLastUpdated();

        
        clearAutoRefresh();
        if (allMatches.some(match => match.status?.toLowerCase() === 'live')) {
            autoRefreshInterval = setInterval(fetchAndDisplayMatches, LIVE_REFRESH_INTERVAL);
        }

    } catch (error) {
        console.error('Error fetching matches:', error);
        showError(error.message || 'Failed to load cricket matches. Please try again later.');
    } finally {
        hideLoading();
    }
}

function updateSeriesFilter() {
    if (!seriesFilterElement) return;
    
    seriesFilterElement.innerHTML = `
        <option value="all">All Series</option>
        ${seriesList.map(series => `<option value="${series}">${series}</option>`).join('')}
    `;
}


function filterMatches() {
    if (!matchesContainer) return;

    const selectedSeries = seriesFilterElement ? seriesFilterElement.value : 'all';
    const selectedStatus = statusFilterElement ? statusFilterElement.value : 'all';

    const filteredMatches = allMatches.filter(match => {
        const seriesMatch = selectedSeries === 'all' || match.name.includes(selectedSeries);
        const statusMatch = selectedStatus === 'all' || 
            (selectedStatus === 'live' && match.status?.toLowerCase().includes('live')) ||
            (selectedStatus === 'completed' && match.status?.toLowerCase().includes('complete')) ||
            (selectedStatus === 'upcoming' && !match.status?.toLowerCase().includes('live') && !match.status?.toLowerCase().includes('complete'));
        
        return seriesMatch && statusMatch;
    });

    displayMatches(filteredMatches);
}


function displayMatches(matches) {
    if (!matchesContainer) return;

    if (matches.length === 0) {
        matchesContainer.innerHTML = '<div class="text-center py-4 text-gray-500">No matches found for selected filters</div>';
        return;
    }

    matchesContainer.innerHTML = matches.map(match => `
        <div class="match-card bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow">
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-600">${match.name}</span>
                <span class="${getStatusClass(match.status)} px-2 py-1 rounded-full text-xs font-medium">
                    ${match.status || 'Status Unknown'}
                </span>
            </div>
            <div class="teams space-y-2">
                ${match.teams?.map(team => `
                    <div class="team-info flex justify-between items-center">
                        <span class="team-name text-gray-800 font-medium">${team}</span>
                        <span class="team-score text-gray-700">
                            ${getTeamScore(match.score, team)}
                        </span>
                    </div>
                `).join('') || 'Match details not available'}
            </div>
            <div class="mt-2 text-sm text-gray-500">${match.venue || 'Venue not specified'}</div>
        </div>
    `).join('');
}


function getStatusClass(status) {
    if (!status) return 'bg-gray-100 text-gray-800';
    status = status.toLowerCase();
    if (status.includes('live')) return 'bg-green-100 text-green-800';
    if (status.includes('complete')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
}


function getTeamScore(scores, teamName) {
    if (!scores || !Array.isArray(scores)) return 'No score';
    const teamScore = scores.find(score => score.inning?.includes(teamName));
    return teamScore ? teamScore.r + '/' + teamScore.w + ' (' + teamScore.o + ')' : 'Yet to bat';
}


function filterMatches() {
    let filteredMatches = [...allMatches];

    
    if (currentStatusFilter !== 'all') {
        filteredMatches = filteredMatches.filter(match => {
            const status = match.status?.toLowerCase() || '';
            return status.includes(currentStatusFilter);
        });
    }

    
    const selectedSeries = seriesFilterElement.value;
    if (selectedSeries && selectedSeries !== 'all') {
        filteredMatches = filteredMatches.filter(match =>
            match.series_id === selectedSeries
        );
    }

    displayMatches(filteredMatches);
}


function displayMatches(matches) {
    matchesContainer.innerHTML = '';

    if (matches.length === 0) {
        const noMatchesElement = document.createElement('div');
        noMatchesElement.className = 'col-span-full text-center py-10 text-gray-500';
        noMatchesElement.textContent = 'No matches found with the selected filters.';
        matchesContainer.appendChild(noMatchesElement);
    } else {
        matches.forEach(match => {
            const matchCard = createMatchCard(match);
            matchesContainer.appendChild(matchCard);
        });
    }

    matchesContainer.classList.remove('hidden');
}


function createMatchCard(match) {
    const matchCard = document.createElement('div');
    matchCard.className = 'bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-xl p-6 mb-6 hover:scale-105 transition-transform cursor-pointer';
    matchCard.addEventListener('click', () => showMatchDetails(match.id));

    const name = match.name || "Match";
    const status = match.status || "No status available";
    const venue = match.venue || "Unknown venue";
    const date = match.date || "Unknown date";


    let scoreboardHTML = '';
    if (match.score && match.score.length) {
        scoreboardHTML = match.score.map(s => `
            <div class="bg-gray-900/50 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-blue-400">${s.inning}</span>
                    <span class="text-yellow-400">${s.r}/${s.w}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="text-gray-400">Overs: <span class="text-white">${s.o}</span></div>
                    <div class="text-gray-400">Run Rate: <span class="text-white">${(s.r / s.o).toFixed(2)}</span></div>
                </div>
            </div>
        `).join('');
    } else {
        scoreboardHTML = '<div class="text-gray-400 text-center py-4">No score available</div>';
    }


    const statusClass = status.toLowerCase().includes('live') ? 'bg-red-500' :
        status.toLowerCase().includes('completed') ? 'bg-green-500' :
            'bg-blue-500';

    matchCard.innerHTML = `
        <div class="relative">
            <div class="absolute -top-3 right-0 ${statusClass} text-white px-3 py-1 rounded-full text-sm font-semibold">
                ${status}
            </div>
            <h2 class="text-xl font-bold mb-4 text-yellow-400">${name}</h2>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-gray-300">
                    <div class="flex items-center">
                        <i class="fas fa-calendar-alt mr-2 text-blue-400"></i>
                        <span><b>Date:</b> ${date}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt mr-2 text-blue-400"></i>
                        <span><b>Venue:</b> ${venue}</span>
                    </div>
                </div>
                <div class="mt-4">
                    <h3 class="text-lg font-semibold mb-3 text-blue-400">Scoreboard</h3>
                    ${scoreboardHTML}
                </div>
            </div>
        </div>
    `;

    return matchCard;
}


function clearAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

async function showMatchDetails(matchId) {
    showLoading();
    hideError();
    currentMatchId = matchId;
    clearAutoRefresh();

    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/match_info?apikey=${API_KEY}&id=${matchId}`);
        const match = response.data;
        displ

        if (match.status === 'live') {
            autoRefreshInterval = setInterval(async () => {
                try {
                    const refreshData = await fetchWithRetry(`${API_BASE_URL}/match_info?apikey=${API_KEY}&id=${matchId}`);
                    displayMatchDetails(refreshData.data);
                } catch (error) {
                    console.error('Error refreshing match details:', error);
                }
            }, LIVE_REFRESH_INTERVAL);
        }
    } catch (error) {
        console.error('Error fetching match details:', error);
        showError(error.message);
        showMatchesList();
    } finally {
        hideLoading();
    }
}

function displayMatchDetails(match) {
    matchesContainer.parentElement.classList.add('hidden');
    matchDetailsElement.classList.remove('hidden');
    matchDetailsElement.classList.add('fade-in');

    const name = match.name || "Match";
    const status = match.status || "No status available";
    const venue = match.venue || "Unknown venue";
    const date = match.date

    let scoreboardHTML = '';
    if (match.score && match.score.length) {
        scoreboardHTML = match.score.map(s => `
            <div class="bg-gray-900/50 rounded-lg p-6 mb-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-blue-400">${s.inning}</h3>
                    <div class="text-2xl font-bold text-yellow-400">${s.r}/${s.w}</div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="text-gray-400">Overs</div>
                        <div class="text-2xl font-bold text-white">${s.o}</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="text-gray-400">Run Rate</div>
                        <div class="text-2xl font-bold text-white">${(s.r / s.o).toFixed(2)}</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="text-gray-400">Runs</div>
                        <div class="text-2xl font-bold text-white">${s.r}</div>
                    </div>
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="text-gray-400">Wickets</div>
                        <div class="text-2xl font-bold text-white">${s.w}</div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        scoreboardHTML = '<div class="text-gray-400 text-center py-8">No score available</div>';
    }

    matchDetailsContentElement.innerHTML = `
        <div class="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl shadow-xl p-6">
            <h2 class="text-2xl font-bold mb-6 text-yellow-400">${name}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div class="flex items-center">
                        <i class="fas fa-calendar-alt mr-2 text-blue-400"></i>
                        <span class="text-gray-300"><b>Date:</b> ${date}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-map-marker-alt mr-2 text-blue-400"></i>
                        <span class="text-gray-300"><b>Venue:</b> ${venue}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-info-circle mr-2 text-blue-400"></i>
                        <span class="text-gray-300"><b>Status:</b> ${status}</span>
                    </div>
                </div>
                <div class="bg-gray-900/50 rounded-lg p-6">
                    <h3 class="text-xl font-semibold mb-4 text-blue-400">Live Scoreboard</h3>
                    ${scoreboardHTML}
                </div>
            </div>
        </div>
    `;
}


function showMatchesList() {
    matchDetailsElement.classList.add('hidden');
    matchesContainer.parentElement.classList.remove('hidden');
    currentMatchId = null;
}

function updateLastUpdated() {
    const now = new Date();
    lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

function showLoading() {
    loadingElement.classList.remove('hidden');
}

function hideLoading() {
    loadingElement.classList.add('hidden');
}

function showError(message) {
    errorTextElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function hideError() {
    errorElement.classList.add('hidden');
}

async function checkAuthStatus() {
    try {
        const formData = new FormData();
        formData.append('action', 'check_auth');

        const response = await fetch('backend/auth.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status && data.authenticated) {
            
            updateUIForLoggedInUser(data.user);
        }
    } catch (error) {
        console.error('Error checking authentication:', error);
    }
}


function updateUIForLoggedInUser(user) {


    const navLinks = document.querySelectorAll('header nav a');



    navLinks.forEach(link => {
        if (link.getAttribute('href') === 'login.html' || link.getAttribute('href') === 'signup.html') {
            link.style.display = 'none';
        }
    });

    const nav = document.querySelector('header nav');
    if (nav) {
        const userProfileLink = document.createElement('a');
        userProfileLink.href = '#';
        userProfileLink.className = 'hover:text-blue-200 transition';
        userProfileLink.innerHTML = `<i class="fas fa-user mr-1"></i> ${user.name}`;
        nav.appendChild(userProfileLink);

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'hover:text-blue-200 transition';
        logoutLink.innerHTML = '<i class="fas fa-sign-out-alt mr-1"></i> Logout';
        logoutLink.addEventListener('click', handleLogout);
        nav.appendChild(logoutLink);
    }

    
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        const loginLink = mobileMenu.querySelector('a[href="login.html"]');
        const signupLink = mobileMenu.querySelector('a[href="signup.html"]');

        if (loginLink) loginLink.style.display = 'none';
        if (signupLink) signupLink.style.display = 'none';

        const userProfileMobileLink = document.createElement('a');
        userProfileMobileLink.href = '#';
        userProfileMobileLink.className = 'block py-2 hover:text-blue-200 transition';
        userProfileMobileLink.innerHTML = `<i class="fas fa-user mr-1"></i> ${user.name}`;
        mobileMenu.appendChild(userProfileMobileLink);

        const logoutMobileLink = document.createElement('a');
        logoutMobileLink.href = '#';
        logoutMobileLink.className = 'block py-2 hover:text-blue-200 transition';
        logoutMobileLink.innerHTML = '<i class="fas fa-sign-out-alt mr-1"></i> Logout';
        logoutMobileLink.addEventListener('click', handleLogout);
        mobileMenu.appendChild(logoutMobileLink);
    }
}

async function handleLogout(e) {
    e.preventDefault();

    try {
        const formData = new FormData();
        formData.append('action', 'logout');

        const response = await fetch('backend/auth.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status) {
            
            window.location.reload();
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
}


document.addEventListener('DOMContentLoaded', initDashboard);


async function initDashboard() {
    refreshButton.addEventListener('click', fetchAndDisplayMatches);
    statusFilterElement.addEventListener('change', (e) => {
        currentStatusFilter = e.target.value;
        filterMatches();
    });
    seriesFilterElement.addEventListener('change', filterMatches);
    backButton.addEventListener('click', () => {
        clearAutoRefresh();
        showMatchesList();
    });

    
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function () {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });
    }

    
    checkAuthStatus();

    
    await Promise.all([
        fetchAndDisplayMatches(),
        fetchCricketNews()
    ]);


    setInterval(fetchCricketNews, 300000); 
}