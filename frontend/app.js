// POAP DApp Application Logic
class POAPApp {
    constructor() {
        this.config = {
            aptosNodeUrl: "https://fullnode.devnet.aptoslabs.com",
            moduleAddress: "d97248e5d29be6dd506d19a9ba6d40d7317c183de20aac4facbb025be0a5dfe6",
            moduleName: "risein_poap"
        };
        
        this.state = {
            isConnected: false,
            walletAddress: null,
            events: [],
            userBadges: [],
            currentFilter: 'all',
            theme: localStorage.getItem('poap-theme') || 'light'
        };
        
        this.init();
    }

    async init() {
        this.initializeTheme();
        this.setupEventListeners();
        this.loadSampleData();
        this.updateWalletUI();
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
        }
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }

        // Wallet connection
        const connectWallet = document.getElementById('connect-wallet');
        if (connectWallet) {
            connectWallet.addEventListener('click', (e) => {
                e.preventDefault();
                this.connectWallet();
            });
        }

        // Create event modal
        const createEventBtn = document.getElementById('create-event-btn');
        if (createEventBtn) {
            createEventBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCreateEventModal();
            });
        }

        // Modal close events
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeCreateEventModal();
            });
        }

        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeCreateEventModal();
            });
        }

        const cancelCreate = document.getElementById('cancel-create');
        if (cancelCreate) {
            cancelCreate.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeCreateEventModal();
            });
        }

        // Create event form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createEvent();
            });
        }

        // Refresh data
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshData();
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setFilter(e.target.dataset.filter);
            });
        });
    }

    toggleTheme() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('poap-theme', this.state.theme);
        document.documentElement.setAttribute('data-theme', this.state.theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
        }
        
        this.showToast(`Switched to ${this.state.theme} mode`, 'success');
    }

    async connectWallet() {
        try {
            this.showLoading(true);
            
            // Simulate wallet connection delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Generate a mock wallet address
            const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
            
            this.state.isConnected = true;
            this.state.walletAddress = mockAddress;
            this.updateWalletUI();
            await this.loadUserData();
            this.showToast('Wallet connected successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showToast('Failed to connect wallet', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updateWalletUI() {
        const connectBtn = document.getElementById('connect-wallet');
        const createEventBtn = document.getElementById('create-event-btn');
        
        if (this.state.isConnected && this.state.walletAddress) {
            connectBtn.textContent = `${this.state.walletAddress.slice(0, 6)}...${this.state.walletAddress.slice(-4)}`;
            createEventBtn.disabled = false;
            createEventBtn.classList.remove('btn--disabled');
        } else {
            connectBtn.textContent = 'Connect Wallet';
            createEventBtn.disabled = true;
            createEventBtn.classList.add('btn--disabled');
        }
    }

    loadSampleData() {
        const now = Math.floor(Date.now() / 1000);
        
        // Load sample events with realistic timestamps
        this.state.events = [
            {
                id: 0,
                name: "RiseIn Web3 Developer Meetup #1",
                description: "Join us for an exciting Web3 developer meetup featuring blockchain development, DeFi protocols, and NFT creation workshops.",
                location: "RiseIn Community Hub, Bangalore",
                start_time: now - 3600, // Started 1 hour ago
                end_time: now + 3600, // Ends in 1 hour (ACTIVE)
                max_attendees: 100,
                current_attendees: 25,
                is_active: true
            },
            {
                id: 1,
                name: "DeFi Workshop Series",
                description: "Learn about decentralized finance protocols and how to build on them.",
                location: "Online Event",
                start_time: now + 86400, // Tomorrow
                end_time: now + 90000, // Tomorrow + 1 hour (UPCOMING)
                max_attendees: 50,
                current_attendees: 12,
                is_active: false
            },
            {
                id: 2,
                name: "NFT Marketplace Demo",
                description: "Demonstration of building an NFT marketplace from scratch.",
                location: "RiseIn Community Hub, Mumbai",
                start_time: now - 172800, // 2 days ago
                end_time: now - 169200, // 2 days ago + 1 hour (PAST)
                max_attendees: 75,
                current_attendees: 45,
                is_active: false
            }
        ];

        this.updateStats();
        this.renderEvents();
        this.renderBadges();
    }

    async loadUserData() {
        if (!this.state.isConnected) return;

        try {
            // Initialize empty badges for new connection
            this.state.userBadges = [];
            this.updateStats();
            this.renderBadges();
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateStats() {
        const totalEvents = this.state.events.length;
        const myBadges = this.state.userBadges.length;
        const activeEvents = this.state.events.filter(event => this.isEventActive(event)).length;

        document.getElementById('total-events').textContent = totalEvents;
        document.getElementById('my-badges').textContent = myBadges;
        document.getElementById('active-events').textContent = activeEvents;
    }

    isEventActive(event) {
        const now = Math.floor(Date.now() / 1000);
        return now >= event.start_time && now <= event.end_time;
    }

    isEventUpcoming(event) {
        const now = Math.floor(Date.now() / 1000);
        return now < event.start_time;
    }

    getEventStatus(event) {
        if (this.isEventActive(event)) return 'active';
        if (this.isEventUpcoming(event)) return 'upcoming';
        return 'past';
    }

    setFilter(filter) {
        this.state.currentFilter = filter;
        
        // Update filter button styles
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeFilterBtn = document.querySelector(`[data-filter="${filter}"]`);
        if (activeFilterBtn) {
            activeFilterBtn.classList.add('active');
        }
        
        this.renderEvents();
    }

    filterEvents() {
        if (this.state.currentFilter === 'all') {
            return this.state.events;
        }
        
        return this.state.events.filter(event => {
            const status = this.getEventStatus(event);
            return status === this.state.currentFilter;
        });
    }

    renderEvents() {
        const eventsGrid = document.getElementById('events-grid');
        if (!eventsGrid) return;
        
        const filteredEvents = this.filterEvents();
        
        if (filteredEvents.length === 0) {
            eventsGrid.innerHTML = '<div class="empty-state"><p>No events found</p></div>';
            return;
        }

        eventsGrid.innerHTML = filteredEvents.map(event => this.createEventCard(event)).join('');
    }

    createEventCard(event) {
        const status = this.getEventStatus(event);
        const startDate = new Date(event.start_time * 1000);
        
        const canClaim = this.state.isConnected && status === 'active' && 
                        !this.state.userBadges.some(badge => badge.event_id === event.id);
        
        const hasClaimed = this.state.userBadges.some(badge => badge.event_id === event.id);

        return `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-title">${event.name}</div>
                    <div class="event-status status-${status}">${status}</div>
                </div>
                <div class="event-description">${event.description}</div>
                <div class="event-details">
                    <div class="event-detail">
                        📅 ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div class="event-detail">
                        📍 ${event.location}
                    </div>
                    <div class="event-detail">
                        👥 ${event.current_attendees}/${event.max_attendees} attendees
                    </div>
                </div>
                <div class="event-actions">
                    ${canClaim ? 
                        `<button class="btn btn--primary" onclick="app.claimBadge(${event.id})">Claim Badge</button>` :
                        hasClaimed ?
                        `<button class="btn btn--outline" disabled>Badge Claimed ✓</button>` :
                        !this.state.isConnected ?
                        `<button class="btn btn--outline" disabled>Connect Wallet</button>` :
                        `<button class="btn btn--outline" disabled>Not Available</button>`
                    }
                </div>
            </div>
        `;
    }

    renderBadges() {
        const badgesGrid = document.getElementById('badges-grid');
        if (!badgesGrid) return;
        
        if (!this.state.isConnected) {
            badgesGrid.innerHTML = '<div class="empty-state"><p>Connect wallet to view your badges</p></div>';
            return;
        }

        if (this.state.userBadges.length === 0) {
            badgesGrid.innerHTML = '<div class="empty-state"><p>No badges collected yet. Claim badges from active events!</p></div>';
            return;
        }

        badgesGrid.innerHTML = this.state.userBadges.map(badge => this.createBadgeCard(badge)).join('');
    }

    createBadgeCard(badge) {
        const mintedDate = new Date(badge.minted_at * 1000);
        
        return `
            <div class="badge-card">
                <div class="badge-icon">🏆</div>
                <div class="badge-name">${badge.event_name}</div>
                <div class="badge-date">Collected: ${mintedDate.toLocaleDateString()}</div>
                <div class="badge-number">Badge #${badge.badge_number}</div>
            </div>
        `;
    }

    async claimBadge(eventId) {
        if (!this.state.isConnected) {
            this.showToast('Please connect your wallet first', 'error');
            return;
        }

        const event = this.state.events.find(e => e.id === eventId);
        if (!event) {
            this.showToast('Event not found', 'error');
            return;
        }

        if (!this.isEventActive(event)) {
            this.showToast('Event is not currently active', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Simulate blockchain transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Add badge to user's collection
            const newBadge = {
                event_id: eventId,
                event_name: event.name,
                badge_number: this.state.userBadges.length + 1,
                minted_at: Math.floor(Date.now() / 1000),
                attendee: this.state.walletAddress
            };
            
            this.state.userBadges.push(newBadge);
            
            // Update attendee count
            event.current_attendees++;
            
            this.updateStats();
            this.renderEvents();
            this.renderBadges();
            
            this.showToast('Badge claimed successfully! 🎉', 'success');
        } catch (error) {
            console.error('Failed to claim badge:', error);
            this.showToast('Failed to claim badge', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    openCreateEventModal() {
        const modal = document.getElementById('create-event-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeCreateEventModal() {
        const modal = document.getElementById('create-event-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        const form = document.getElementById('create-event-form');
        if (form) {
            form.reset();
        }
    }

    async createEvent() {
        if (!this.state.isConnected) {
            this.showToast('Please connect your wallet first', 'error');
            return;
        }

        const eventData = {
            name: document.getElementById('event-name').value,
            description: document.getElementById('event-description').value,
            location: document.getElementById('event-location').value,
            start_time: Math.floor(new Date(document.getElementById('start-time').value).getTime() / 1000),
            end_time: Math.floor(new Date(document.getElementById('end-time').value).getTime() / 1000),
            max_attendees: parseInt(document.getElementById('max-attendees').value)
        };

        // Validate form
        if (eventData.start_time >= eventData.end_time) {
            this.showToast('End time must be after start time', 'error');
            return;
        }

        if (eventData.start_time <= Math.floor(Date.now() / 1000)) {
            this.showToast('Start time must be in the future', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            // Simulate blockchain transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Add new event
            const newEvent = {
                id: this.state.events.length,
                ...eventData,
                current_attendees: 0,
                is_active: false
            };
            
            this.state.events.push(newEvent);
            
            this.updateStats();
            this.renderEvents();
            this.closeCreateEventModal();
            
            this.showToast('Event created successfully! 🎉', 'success');
        } catch (error) {
            console.error('Failed to create event:', error);
            this.showToast('Failed to create event', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshData() {
        try {
            this.showLoading(true);
            
            // Simulate data refresh
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await this.loadUserData();
            this.updateStats();
            this.renderEvents();
            this.renderBadges();
            
            this.showToast('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showToast('Failed to refresh data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('hidden');
            } else {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new POAPApp();
});

// Make claimBadge globally accessible for onclick handlers
window.claimBadge = (eventId) => {
    if (window.app) {
        window.app.claimBadge(eventId);
    }
};