// API Base URL
const API_BASE = '/api';

// State
let authToken = null;
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initKeyboardShortcut();
});

// Keyboard shortcut (Ctrl+Alt+A)
function initKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.key === 'a') {
            e.preventDefault();
            if (!authToken) {
                document.getElementById('username').focus();
            }
        }
    });
}

// Check authentication
function checkAuth() {
    authToken = localStorage.getItem('authToken');

    if (authToken) {
        verifyToken();
    } else {
        showLogin();
    }
}

// Verify token
async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        showLogin();
    }
}

// Show login screen
function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';

    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.accessToken;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'grid';

    // Display user info
    document.getElementById('userInfo').textContent = `Logged in as: ${currentUser.username}`;

    // Initialize dashboard
    initNavigation();
    loadDashboardStats();
    loadRecentArticles();
    loadCategories();

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Initialize navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding section
            const sectionName = item.dataset.section;
            showSection(sectionName);
        });
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'articles': 'All Articles',
        'create-article': 'Create Article',
        'categories': 'Categories',
        'ticker': 'News Ticker',
        'users': 'Users',
        'settings': 'Settings',
        'navigation': 'Navigation Management',
        'ads': 'Ad Management'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Admin Panel';

    // Load section data
    switch (sectionName) {
        case 'articles':
            loadAllArticles();
            break;
        case 'create-article':
            initCreateArticleForm();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'ticker':
            loadTickerSettings();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'navigation':
            loadNavigation();
            break;
        case 'ads':
            loadAds();
            break;
    }
}

// Navigation Functions
async function loadNavigation() {
    try {
        const response = await fetch(`${API_BASE}/navigation/all`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await response.json();
        const list = document.getElementById('navigationList');

        list.innerHTML = data.items.map(item => `
            <div class="article-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${item.label}</strong> <small>(${item.url})</small><br>
                    <small>Order: ${item.display_order} | Enabled: ${item.is_enabled ? 'Yes' : 'No'}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="deleteNavItem(${item.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

function showAddNavForm() { document.getElementById('addNavForm').style.display = 'block'; }
function hideAddNavForm() { document.getElementById('addNavForm').style.display = 'none'; }

async function createNavItem() {
    const label = document.getElementById('nav_label').value;
    const url = document.getElementById('nav_url').value;
    const order = document.getElementById('nav_order').value;

    await fetch(`${API_BASE}/navigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ label, url, display_order: parseInt(order) })
    });
    hideAddNavForm();
    loadNavigation();
}

async function deleteNavItem(id) {
    if (!confirm('Delete this item?')) return;
    await fetch(`${API_BASE}/navigation/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
    loadNavigation();
}

// Ads Functions
async function loadAds() {
    try {
        const response = await fetch(`${API_BASE}/ads/all`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await response.json();
        const list = document.getElementById('adsList');

        list.innerHTML = data.ads.map(ad => `
            <div class="article-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${ad.image_url}" style="height:50px; border-radius:4px;">
                    <div>
                        <strong>${ad.title}</strong> <small>(${ad.placement})</small><br>
                        <small>Active: ${ad.is_active} | Clicks: ${ad.click_count} | Impressions: ${ad.impression_count}</small>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="deleteAd(${ad.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

function showAddAdForm() { document.getElementById('addAdForm').style.display = 'block'; }
function hideAddAdForm() { document.getElementById('addAdForm').style.display = 'none'; }

async function createAd() {
    const title = document.getElementById('ad_title').value;
    const image_url = document.getElementById('ad_image').value;
    const link_url = document.getElementById('ad_link').value;
    const placement = document.getElementById('ad_placement').value;
    const start_date = document.getElementById('ad_start').value;
    const end_date = document.getElementById('ad_end').value;

    if (!title || !image_url || !link_url) {
        alert('Title, Image URL, and Link URL are required');
        return;
    }

    // Map ad sizes to dimensions
    const adSizes = {
        'leaderboard': { width: 728, height: 90 },
        'large_rectangle': { width: 336, height: 280 },
        'medium_rectangle': { width: 300, height: 250 },
        'wide_skyscraper': { width: 160, height: 600 },
        'skyscraper': { width: 120, height: 600 },
        'button1': { width: 120, height: 90 },
        'button2': { width: 120, height: 60 },
        'microbar': { width: 88, height: 31 }
    };

    const size = adSizes[placement] || { width: 300, height: 250 };

    try {
        const response = await fetch(`${API_BASE}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({
                title,
                image_url,
                link_url,
                placement,
                width: size.width,
                height: size.height,
                start_date: start_date || null,
                end_date: end_date || null
            })
        });

        if (response.ok) {
            alert('Ad created successfully!');
            hideAddAdForm();
            loadAds();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function deleteAd(id) {
    if (!confirm('Delete this ad?')) return;
    await fetch(`${API_BASE}/ads/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
    loadAds();
}

// Rich Text Editor Functions
function formatText(command) {
    const textarea = document.getElementById('body');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (!selectedText) {
        alert('Please select text first');
        return;
    }

    let formattedText = '';

    switch (command) {
        case 'bold':
            formattedText = `<strong>${selectedText}</strong>`;
            break;
        case 'italic':
            formattedText = `<em>${selectedText}</em>`;
            break;
        case 'underline':
            formattedText = `<u>${selectedText}</u>`;
            break;
        case 'h2':
            formattedText = `<h2>${selectedText}</h2>`;
            break;
        case 'h3':
            formattedText = `<h3>${selectedText}</h3>`;
            break;
        case 'ul':
            const ulItems = selectedText.split('\n').filter(line => line.trim());
            formattedText = '<ul>\n' + ulItems.map(item => `  <li>${item}</li>`).join('\n') + '\n</ul>';
            break;
        case 'ol':
            const olItems = selectedText.split('\n').filter(line => line.trim());
            formattedText = '<ol>\n' + olItems.map(item => `  <li>${item}</li>`).join('\n') + '\n</ol>';
            break;
    }

    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
}

function insertLink() {
    const textarea = document.getElementById('body');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const url = prompt('Enter URL:', 'https://');
    if (!url) return;

    const linkText = selectedText || prompt('Enter link text:', 'Click here');
    const formattedText = `<a href="${url}">${linkText}</a>`;

    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
}

// Category Management Functions
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
}

function hideAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('cat_name').value = '';
    document.getElementById('cat_slug').value = '';
    document.getElementById('cat_description').value = '';
}

async function createCategory() {
    const name = document.getElementById('cat_name').value;
    let slug = document.getElementById('cat_slug').value;
    const description = document.getElementById('cat_description').value;

    if (!name) {
        alert('Category name is required');
        return;
    }

    if (!slug) {
        slug = generateSlug(name);
    }

    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, slug, description })
        });

        if (response.ok) {
            alert('Category created successfully!');
            hideAddCategoryForm();
            loadCategories();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            alert('Category deleted successfully');
            loadCategories();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error deleting category');
    }
}

// News Ticker Management
async function loadTickerSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.settings) {
            const tickerEnabled = data.settings.find(s => s.key === 'ticker_enabled');
            const tickerText = data.settings.find(s => s.key === 'ticker_text');

            document.getElementById('ticker_enabled').checked = tickerEnabled?.value === 'true';
            document.getElementById('ticker_text').value = tickerText?.value || '';
        }
    } catch (error) {
        console.error('Error loading ticker settings:', error);
    }
}

async function updateTickerSettings() {
    const enabled = document.getElementById('ticker_enabled').checked;
    const text = document.getElementById('ticker_text').value;

    try {
        // Update ticker_enabled setting
        await fetch(`${API_BASE}/settings/ticker_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: enabled.toString() })
        });

        // Update ticker_text setting
        await fetch(`${API_BASE}/settings/ticker_text`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value: text })
        });

        alert('Ticker settings updated successfully!');
    } catch (error) {
        alert('Error updating ticker settings');
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        // Update stats
        let totalArticles = 0;
        let publishedArticles = 0;
        let pendingArticles = 0;

        if (data.articles) {
            data.articles.forEach(stat => {
                totalArticles += stat.count;
                if (stat.status === 'published') publishedArticles = stat.count;
                if (stat.status === 'pending') pendingArticles = stat.count;
            });
        }

        document.getElementById('totalArticles').textContent = totalArticles;
        document.getElementById('publishedArticles').textContent = publishedArticles;
        document.getElementById('pendingArticles').textContent = pendingArticles;
        document.getElementById('totalViews').textContent = data.totalViews || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent articles
async function loadRecentArticles() {
    try {
        const response = await fetch(`${API_BASE}/articles?limit=5`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('recentArticles');

        if (data.articles && data.articles.length > 0) {
            container.innerHTML = data.articles.map(article => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${article.headline}</h3>
                        <div class="article-meta">
                            <span class="status-badge status-${article.status}">${article.status}</span>
                            <span>By ${article.author_name || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editArticle(${article.id})">Edit</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No articles yet</p>';
        }
    } catch (error) {
        console.error('Error loading recent articles:', error);
    }
}

// Load all articles
async function loadAllArticles() {
    try {
        const statusFilter = document.getElementById('statusFilter').value;
        let url = `${API_BASE}/articles?limit=50`;
        if (statusFilter) url += `&status=${statusFilter}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('articlesList');

        if (data.articles && data.articles.length > 0) {
            container.innerHTML = data.articles.map(article => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${article.headline}</h3>
                        <div class="article-meta">
                            <span class="status-badge status-${article.status}">${article.status}</span>
                            <span>${article.category_name || 'Uncategorized'}</span>
                            <span>${new Date(article.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-secondary" onclick="editArticle(${article.id})">Edit</button>
                        ${article.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="approveArticle(${article.id})">Approve</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="deleteArticle(${article.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No articles found</p>';
        }
    } catch (error) {
        console.error('Error loading articles:', error);
    }
}

// Initialize create article form
function initCreateArticleForm() {
    const form = document.getElementById('createArticleForm');

    // Load categories for dropdown
    loadCategoriesForForm();

    // Ensure button text is reset when form is shown
    document.querySelector('#createArticleForm button[type="submit"]').textContent = editingArticleId ? 'Update Article' : 'Create Article';

    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const articleData = {
            headline: formData.get('headline'),
            sub_headline: formData.get('sub_headline'),
            summary: formData.get('summary'),
            body: document.getElementById('body').innerHTML, // Read from contenteditable
            category_id: formData.get('category_id') || null,
            status: formData.get('status'),
            featured_image_url: formData.get('featured_image_url'),
            scheduled_publish_at: formData.get('scheduled_publish_at') || null,
            is_breaking: document.getElementById('is_breaking').checked ? 1 : 0,
            is_featured: document.getElementById('is_featured').checked ? 1 : 0,
        };

        if (!articleData.slug && !editingArticleId) {
            articleData.slug = generateSlug(articleData.headline);
        }

        try {
            const url = editingArticleId ? `${API_BASE}/articles/${editingArticleId}` : `${API_BASE}/articles`;
            const method = editingArticleId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(articleData)
            });

            if (response.ok) {
                alert(editingArticleId ? 'Article updated successfully!' : 'Article created successfully!');
                resetForm();
                loadDashboardStats();
                showSection('articles');
                loadAllArticles();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    };
}

// Load categories for form
async function loadCategoriesForForm() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();

        const select = document.getElementById('category_id');
        if (data.categories) {
            data.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const data = await response.json();

        const container = document.getElementById('categoriesList');
        if (data.categories && data.categories.length > 0) {
            container.innerHTML = data.categories.map(cat => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${cat.name}</h3>
                        <div class="article-meta">
                            <span>${cat.description || 'No description'}</span>
                            <span>Slug: ${cat.slug}</span>
                        </div>
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id}, '${cat.name}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('usersList');

        if (data.users && data.users.length > 0) {
            container.innerHTML = data.users.map(user => `
                <div class="article-item">
                    <div class="article-info">
                        <h3>${user.full_name || user.username}</h3>
                        <div class="article-meta">
                            <span>${user.email}</span>
                            <span>${user.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        const container = document.getElementById('settingsList');

        if (data.settings && data.settings.length > 0) {
            container.innerHTML = `
                <div class="settings-grid">
                    ${data.settings.map(setting => `
                        <div class="setting-item">
                            <label for="setting_${setting.key}">${formatSettingKey(setting.key)}</label>
                            <div class="setting-input-group">
                                <input type="text" id="setting_${setting.key}" value="${setting.value || ''}" 
                                       ${setting.key === 'ticker_items' ? 'placeholder="Item 1 | Item 2"' : ''}>
                                <button class="btn btn-sm btn-primary" onclick="updateSetting('${setting.key}')">Save</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function formatSettingKey(key) {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Update Setting
window.updateSetting = async function (key) {
    const input = document.getElementById(`setting_${key}`);
    const value = input.value;

    try {
        const response = await fetch(`${API_BASE}/settings/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ value })
        });

        if (response.ok) {
            alert(`${formatSettingKey(key)} updated successfully`);
        } else {
            alert('Failed to update setting');
        }
    } catch (error) {
        alert('Error updating setting');
    }
};

// Rich Text Editor Functions - Exposed to Window
let editingArticleId = null;

// Rich Text Editor Functions
window.formatText = function (command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('body').focus();
};

window.insertLink = function () {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
        document.execCommand('createLink', false, url);
    }
};

window.insertImage = function () {
    const url = prompt('Enter Image URL:', 'https://');
    if (url) {
        document.execCommand('insertImage', false, url);
    }
};

// Edit Article
window.editArticle = async function (id) {
    try {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        if (response.ok) {
            const article = data.article;
            editingArticleId = article.id;

            // Switch to form
            showSection('create-article');
            document.querySelector('#section-create-article h2').textContent = 'Edit Article';

            // Populate form
            document.getElementById('headline').value = article.headline;
            document.getElementById('sub_headline').value = article.sub_headline || '';
            document.getElementById('summary').value = article.summary || '';
            document.getElementById('category_id').value = article.category_id || '';
            document.getElementById('status').value = article.status;
            document.getElementById('featured_image_url').value = article.featured_image_url || '';
            document.getElementById('is_breaking').checked = article.is_breaking;
            document.getElementById('is_featured').checked = article.is_featured;
            document.getElementById('scheduled_publish_at').value = article.scheduled_publish_at ? new Date(article.scheduled_publish_at).toISOString().slice(0, 16) : '';

            // Populate Editor
            document.getElementById('body').innerHTML = article.body;

            // Change submit button text
            const btn = document.querySelector('#createArticleForm button[type="submit"]');
            btn.textContent = 'Update Article';
            btn.onclick = (e) => {
                // Ensure the form submit handler uses this context or logic
                // Actually initCreateArticleForm handles onsubmit. We need to handle the state there.
            };
        }
    } catch (e) {
        console.error(e);
        alert('Error loading article');
    }
};

function resetForm() {
    document.getElementById('createArticleForm').reset();
    document.getElementById('body').innerHTML = '';
    editingArticleId = null;
    document.querySelector('#section-create-article h2').textContent = 'Create New Article';
    document.querySelector('#createArticleForm button[type="submit"]').textContent = 'Create Article';
}

// Delete Article
async function deleteArticle(id) {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
        const response = await fetch(`${API_BASE}/articles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            alert('Article deleted successfully');
            loadAllArticles();
            loadRecentArticles();
            loadDashboardStats();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error deleting article');
    }
}

// Approve Article
async function approveArticle(id) {
    if (!confirm('Approve this article for publication?')) return;

    try {
        const response = await fetch(`${API_BASE}/articles/${id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'published' })
        });

        if (response.ok) {
            alert('Article approved and published!');
            loadAllArticles();
            loadRecentArticles();
            loadDashboardStats();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error approving article');
    }
}

// Generate Slug
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Preview Article
function previewArticle() {
    const headline = document.getElementById('headline').value;
    const body = document.getElementById('body').innerHTML;
    const summary = document.getElementById('summary').value;

    if (!headline || !body) {
        alert('Please add a headline and body content before previewing');
        return;
    }

    try {
        const previewWindow = window.open('', 'ArticlePreview', 'width=800,height=600,scrollbars=yes');

        if (!previewWindow) {
            alert('Preview blocked by popup blocker. Please allow popups for this site and try again.');
            return;
        }

        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview: ${headline.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
                <style>
                    body { 
                        font-family: 'Mukta', Arial, sans-serif; 
                        max-width: 800px; 
                        margin: 20px auto; 
                        padding: 20px; 
                        background: #f5f5f5;
                    }
                    .preview-container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 { 
                        color: #D32F2F; 
                        margin-top: 0;
                        line-height: 1.3;
                    }
                    .summary { 
                        font-style: italic; 
                        color: #666; 
                        margin: 20px 0; 
                        padding: 15px;
                        background: #f9f9f9;
                        border-left: 4px solid #D32F2F;
                    }
                    .body { 
                        line-height: 1.8; 
                        color: #333;
                    }
                    .body img {
                        max-width: 100%;
                        height: auto;
                        margin: 20px 0;
                    }
                    .preview-badge {
                        background: #ff9800;
                        color: white;
                        padding: 5px 10px;
                        border-radius: 4px;
                        font-size: 12px;
                        display: inline-block;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="preview-container">
                    <div class="preview-badge">PREVIEW MODE</div>
                    <h1>${headline}</h1>
                    ${summary ? `<div class="summary">${summary}</div>` : ''}
                    <div class="body">${body}</div>
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    } catch (error) {
        console.error('Preview error:', error);
        alert('Error opening preview. Please check your browser settings.');
    }
}


