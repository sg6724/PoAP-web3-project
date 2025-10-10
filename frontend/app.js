// POAP DApp Logic
class POAPApp {
    constructor() {
        this.config = {
            aptosNodeUrl: "https://fullnode.devnet.aptoslabs.com",
            moduleAddress: "0x7348d11ab96e46f77338898a34b2da2fe64dea21dffb3b4060c9bcb5ac2e6c09",
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
        await this.loadBlockchainData();
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
      const themeToggle = document.getElementById("theme-toggle");
      if (themeToggle) {
        themeToggle.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggleTheme();
        });
      }

      // Wallet connection
      const connectWallet = document.getElementById("connect-wallet");
      if (connectWallet) {
        connectWallet.addEventListener("click", (e) => {
          e.preventDefault();
          this.connectWallet();
        });
      }

      // Initialize POAP button
      const initializeBtn = document.getElementById("initialize-poap-btn");
      if (initializeBtn) {
        initializeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.initializePOAP();
        });
      }

      // Create event modal
      const createEventBtn = document.getElementById("create-event-btn");
      if (createEventBtn) {
        createEventBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.openCreateEventModal();
        });
      }

      // Modal close events
      const modalClose = document.querySelector(".close-modal");
      if (modalClose) {
        modalClose.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeCreateEventModal();
        });
      }

      const modal = document.getElementById("create-event-modal");
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            this.closeCreateEventModal();
          }
        });
      }

      const cancelCreate = document.getElementById("cancel-create");
      if (cancelCreate) {
        cancelCreate.addEventListener("click", (e) => {
          e.preventDefault();
          this.closeCreateEventModal();
        });
      }

      // Create event form
      const createEventForm = document.getElementById("create-event-form");
      if (createEventForm) {
        createEventForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.createEvent();
        });
      }

      // Refresh data
      const refreshBtn = document.getElementById("refresh-btn");
      const refreshEvents = document.getElementById("refresh-events");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.refreshData();
        });
      }
      if (refreshEvents) {
        refreshEvents.addEventListener("click", (e) => {
          e.preventDefault();
          this.refreshData();
        });
      }

      // Filter buttons
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
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

          // Check if Petra wallet is available
          if (window.aptos) {
            try {
              // Connect to Petra wallet
              const response = await window.aptos.connect();
              this.state.walletAddress = response.address;
              this.state.isConnected = true;

              this.updateWalletUI();
              await this.loadUserData();
              this.showToast("Petra Wallet connected successfully!", "success");
            } catch (walletError) {
              if (
                walletError.message &&
                walletError.message.includes("User rejected")
              ) {
                this.showToast("Connection rejected by user", "error");
              } else {
                throw walletError;
              }
            }
          } else {
            // Fallback: Mock wallet connection for testing without Petra
            this.showToast(
              "Petra Wallet not detected. Using demo mode...",
              "info"
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
            this.state.isConnected = true;
            this.state.walletAddress = mockAddress;

            this.updateWalletUI();
            await this.loadUserData();
            this.showToast("Demo wallet connected!", "success");
          }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showToast(
              error.message || "Failed to connect wallet",
              "error"
            );
        } finally {
            this.showLoading(false);
        }
    }

    updateWalletUI() {
      const connectBtn = document.getElementById("connect-wallet");
      const createEventBtn = document.getElementById("create-event-btn");
      const initializeBtn = document.getElementById("initialize-poap-btn");

      if (connectBtn) {
        if (this.state.isConnected && this.state.walletAddress) {
          connectBtn.textContent = `${this.state.walletAddress.slice(
            0,
            6
          )}...${this.state.walletAddress.slice(-4)}`;
          connectBtn.classList.add("connected");
        } else {
          connectBtn.textContent = "Connect Wallet";
          connectBtn.classList.remove("connected");
        }
      }

      if (createEventBtn) {
        if (this.state.isConnected) {
          createEventBtn.disabled = false;
          createEventBtn.classList.remove("btn--disabled");
        } else {
          createEventBtn.disabled = true;
          createEventBtn.classList.add("btn--disabled");
        }
      }

      if (initializeBtn) {
        if (this.state.isConnected) {
          initializeBtn.style.display = "inline-block";
        } else {
          initializeBtn.style.display = "none";
        }
      }
    }

    async loadBlockchainData() {
        try {
          this.showLoading(true);

          // Fetch events from blockchain
          const response = await fetch(`${this.config.aptosNodeUrl}/v1/view`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              function: `${this.config.moduleAddress}::${this.config.moduleName}::get_all_events`,
              type_arguments: [],
              arguments: [this.config.moduleAddress],
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result && result[0]) {
              this.state.events = result[0].map((event) => ({
                id: parseInt(event.id),
                name: event.name,
                description: event.description,
                location: event.location,
                start_time: parseInt(event.start_time),
                end_time: parseInt(event.end_time),
                max_attendees: parseInt(event.max_attendees),
                current_attendees: parseInt(event.current_attendees),
                organizer: event.organizer,
                created_at: parseInt(event.created_at),
              }));
              console.log(
                "✅ Loaded events from blockchain:",
                this.state.events
              );
            }
          } else {
            console.error("Failed to fetch events from blockchain");
            this.state.events = [];
          }

          this.updateStats();
          this.renderEvents();
          this.renderBadges();
        } catch (error) {
          console.error("Error loading blockchain data:", error);
          this.state.events = [];
          this.updateStats();
          this.renderEvents();
          this.renderBadges();
        } finally {
          this.showLoading(false);
        }
    }

    async loadUserData() {
        if (!this.state.isConnected || !this.state.walletAddress) return;

        try {
          // Fetch user badges from blockchain
          const response = await fetch(`${this.config.aptosNodeUrl}/v1/view`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              function: `${this.config.moduleAddress}::${this.config.moduleName}::get_user_badges`,
              type_arguments: [],
              arguments: [this.state.walletAddress, this.config.moduleAddress],
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result && result[0]) {
              this.state.userBadges = result[0].map((badge) => ({
                event_id: parseInt(badge.event_id),
                event_name: badge.event_name,
                badge_number: parseInt(badge.badge_number),
                minted_at: parseInt(badge.minted_at),
                attendee: badge.attendee,
                token_id: badge.token_id,
              }));
              console.log(
                "✅ Loaded user badges from blockchain:",
                this.state.userBadges
              );
            }
          }

          this.updateStats();
          this.renderBadges();
        } catch (error) {
          console.error("Failed to load user data:", error);
          this.state.userBadges = [];
        }
    }

    updateStats() {
        const totalEvents = this.state.events.length;
        const myBadges = this.state.userBadges.length;
        const activeEvents = this.state.events.filter(event => this.isEventActive(event)).length;

        const totalEventsEl = document.getElementById("total-events");
        const myBadgesEl = document.getElementById("my-badges");
        const activeEventsEl = document.getElementById("active-events");

        if (totalEventsEl) totalEventsEl.textContent = totalEvents;
        if (myBadgesEl) myBadgesEl.textContent = myBadges;
        if (activeEventsEl) activeEventsEl.textContent = activeEvents;
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
        const eventsGrid = document.getElementById('events-grid') || document.getElementById('events-container');
        if (!eventsGrid) {
            console.error('Events container not found!');
            return;
        }
        
        console.log(
          "Rendering events. Total events:",
          this.state.events.length
        );
        const filteredEvents = this.filterEvents();
        console.log("Filtered events:", filteredEvents.length);

        if (filteredEvents.length === 0) {
          eventsGrid.innerHTML =
            '<div class="empty-state"><div class="empty-icon">📅</div><h3>No events found</h3><p>Events will appear here once loaded from blockchain</p></div>';
          return;
        }

        eventsGrid.innerHTML = filteredEvents
          .map((event) => this.createEventCard(event))
          .join("");
        console.log("Events rendered successfully");
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
        const badgesGrid =
          document.getElementById("badges-grid") ||
          document.getElementById("badges-container");
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
        this.showToast("Please connect your wallet first", "error");
        return;
      }

      const event = this.state.events.find((e) => e.id === eventId);
      if (!event) {
        this.showToast("Event not found", "error");
        return;
      }

      // Check event status with detailed messages
      const now = Math.floor(Date.now() / 1000);
      if (now < event.start_time) {
        const startDate = new Date(event.start_time * 1000);
        this.showToast(
          `Event hasn't started yet. Starts at ${startDate.toLocaleString()}`,
          "error"
        );
        return;
      }
      if (now > event.end_time) {
        const endDate = new Date(event.end_time * 1000);
        this.showToast(
          `Event has ended. It ended at ${endDate.toLocaleString()}`,
          "error"
        );
        return;
      }

      // Check if already claimed
      if (this.state.userBadges.some((badge) => badge.event_id === eventId)) {
        this.showToast("You have already claimed this badge", "info");
        return;
      }

      try {
        this.showLoading(true);
        this.showToast("Submitting transaction to blockchain...", "info");

        // Check if Petra wallet is available
        if (!window.aptos) {
          throw new Error(
            "Petra Wallet is not installed. Please install Petra Wallet extension."
          );
        }

        // Get the event organizer address
        const organizerAddress = event.organizer || this.config.moduleAddress;

        console.log("Claiming badge for:", {
          eventId,
          organizerAddress,
          eventName: event.name,
          eventStatus: {
            now,
            start: event.start_time,
            end: event.end_time,
            isActive: now >= event.start_time && now <= event.end_time,
          },
        });

        // Build transaction payload
        const payload = {
          type: "entry_function_payload",
          function: `${this.config.moduleAddress}::${this.config.moduleName}::claim_badge`,
          type_arguments: [],
          arguments: [
            organizerAddress, // organizer address
            eventId.toString(), // event ID as string
          ],
        };

        // Submit transaction via Petra wallet
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          payload
        );
        console.log("Transaction submitted:", pendingTransaction);

        // Wait for transaction confirmation
        this.showToast("Waiting for transaction confirmation...", "info");
        const txResult = await this.waitForTransaction(pendingTransaction.hash);

        if (!txResult.success) {
          throw new Error("Transaction failed on blockchain");
        }

        // Reload data from blockchain
        await this.loadBlockchainData();
        await this.loadUserData();

        this.showToast("Badge claimed successfully! 🎉", "success");
      } catch (error) {
        console.error("Failed to claim badge:", error);

        // Parse error message for better user feedback
        let errorMessage = "Failed to claim badge";
        if (error.message) {
          if (error.message.includes("EEVENT_NOT_ACTIVE")) {
            errorMessage = "Event is not currently active";
          } else if (error.message.includes("EEVENT_ENDED")) {
            errorMessage = "Event has already ended";
          } else if (error.message.includes("EBADGE_ALREADY_CLAIMED")) {
            errorMessage = "You have already claimed this badge";
          } else if (error.message.includes("EMAX_ATTENDEES_REACHED")) {
            errorMessage = "Maximum attendees limit reached";
          } else if (error.message.includes("simulation")) {
            errorMessage =
              "Transaction simulation failed. The event may have ended or you may need to initialize your wallet first (click 🔧 Init button)";
          } else {
            errorMessage = error.message;
          }
        }

        this.showToast(errorMessage, "error");
      } finally {
        this.showLoading(false);
      }
    }

    async waitForTransaction(txHash) {
        const maxAttempts = 20;
        const delayMs = 1000;
        
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${this.config.aptosNodeUrl}/v1/transactions/by_hash/${txHash}`);
                if (response.ok) {
                    const tx = await response.json();
                    if (tx.success) {
                        return tx;
                    } else {
                        throw new Error('Transaction failed');
                    }
                }
            } catch (e) {
                // Continue waiting
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        throw new Error("Transaction confirmation timeout");
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

    async initializePOAP() {
        if (!this.state.isConnected) {
            this.showToast('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.showLoading(true);
            this.showToast('Initializing POAP system...', 'info');
            
            if (!window.aptos) {
                throw new Error('Petra Wallet is not installed');
            }
            
            const payload = {
                type: "entry_function_payload",
                function: `${this.config.moduleAddress}::${this.config.moduleName}::initialize`,
                type_arguments: [],
                arguments: []
            };
            
            const pendingTransaction = await window.aptos.signAndSubmitTransaction(payload);
            console.log('Initialize transaction submitted:', pendingTransaction);
            
            this.showToast('Waiting for confirmation...', 'info');
            await this.waitForTransaction(pendingTransaction.hash);
            
            this.showToast('POAP system initialized! You can now create events! 🎉', 'success');
        } catch (error) {
            console.error('Failed to initialize:', error);
            if (error.message && error.message.includes('RESOURCE_ALREADY_EXISTS')) {
                this.showToast('Already initialized! You can create events now.', 'info');
            } else {
                this.showToast(error.message || 'Failed to initialize', 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    async createEvent() {
      if (!this.state.isConnected) {
        this.showToast("Please connect your wallet first", "error");
        return;
      }

      // Get form elements with null checks
      const nameEl = document.getElementById("event-name");
      const descEl = document.getElementById("event-description");
      const locationEl = document.getElementById("event-location");
      const startTimeEl = document.getElementById("event-start-time");
      const endTimeEl = document.getElementById("event-end-time");
      const maxAttendeesEl = document.getElementById("event-max-attendees");

      if (
        !nameEl ||
        !descEl ||
        !locationEl ||
        !startTimeEl ||
        !endTimeEl ||
        !maxAttendeesEl
      ) {
        this.showToast("Form fields not found", "error");
        return;
      }

      const eventData = {
        name: nameEl.value.trim(),
        description: descEl.value.trim(),
        location: locationEl.value.trim(),
        start_time: Math.floor(new Date(startTimeEl.value).getTime() / 1000),
        end_time: Math.floor(new Date(endTimeEl.value).getTime() / 1000),
        max_attendees: parseInt(maxAttendeesEl.value),
      };

      // Validate form
      if (!eventData.name || !eventData.description || !eventData.location) {
        this.showToast("Please fill in all required fields", "error");
        return;
      }

      if (isNaN(eventData.start_time) || isNaN(eventData.end_time)) {
        this.showToast("Please enter valid dates", "error");
        return;
      }

      if (eventData.start_time >= eventData.end_time) {
        this.showToast("End time must be after start time", "error");
        return;
      }

      if (eventData.start_time <= Math.floor(Date.now() / 1000)) {
        this.showToast("Start time must be in the future", "error");
        return;
      }

      if (eventData.max_attendees < 1) {
        this.showToast("Max attendees must be at least 1", "error");
        return;
      }

      try {
        this.showLoading(true);
        this.showToast("Creating event on blockchain...", "info");

        // Check if Petra wallet is available
        if (!window.aptos) {
          throw new Error("Petra Wallet is not installed");
        }

        // Build transaction payload
        const payload = {
          type: "entry_function_payload",
          function: `${this.config.moduleAddress}::${this.config.moduleName}::create_event`,
          type_arguments: [],
          arguments: [
            eventData.name,
            eventData.description,
            eventData.location,
            eventData.start_time.toString(),
            eventData.end_time.toString(),
            eventData.max_attendees.toString(),
          ],
        };

        // Submit transaction via Petra wallet
        const pendingTransaction = await window.aptos.signAndSubmitTransaction(
          payload
        );
        console.log(
          "Event creation transaction submitted:",
          pendingTransaction
        );

        // Wait for transaction confirmation
        this.showToast("Waiting for transaction confirmation...", "info");
        await this.waitForTransaction(pendingTransaction.hash);

        // Reload blockchain data
        await this.loadBlockchainData();

        this.closeCreateEventModal();
        this.showToast(
          "Event created successfully on blockchain! 🎉",
          "success"
        );
      } catch (error) {
        console.error("Failed to create event:", error);
        this.showToast(error.message || "Failed to create event", "error");
      } finally {
        this.showLoading(false);
      }
    }

    async refreshData() {
        try {
          this.showLoading(true);
          this.showToast("Refreshing data from blockchain...", "info");

          // Reload all blockchain data
          await this.loadBlockchainData();
          await this.loadUserData();

          this.showToast("Data refreshed successfully", "success");
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