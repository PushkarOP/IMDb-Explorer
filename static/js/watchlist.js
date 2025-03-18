document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const watchlistBtn = document.getElementById('watchlistBtn');
    const watchlistModal = document.getElementById('watchlistModal');
    const watchlistContent = document.getElementById('watchlistContent');
    const watchlistCount = document.getElementById('watchlistCount');
    const closeWatchlistModal = watchlistModal.querySelector('.close-modal');
    
    // Initialize Notyf if not already initialized
    const notyf = window.notyf || new Notyf({
        duration: 3000,
        position: { x: 'right', y: 'top' },
        types: [
            {
                type: 'success',
                background: '#4BB543',
                icon: { className: 'fas fa-check-circle', tagName: 'i' }
            },
            {
                type: 'error',
                background: '#ff4b4b',
                icon: { className: 'fas fa-times-circle', tagName: 'i' }
            }
        ]
    });
    
    // Expose notyf globally if not already
    window.notyf = notyf;
    
    // Watchlist Event Listeners
    watchlistBtn.addEventListener('click', function() {
        showWatchlistModal();
    });
    
    closeWatchlistModal.addEventListener('click', function() {
        watchlistModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    });
    
    // Close watchlist modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === watchlistModal) {
            watchlistModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
        }
    });
    
    // Close watchlist modal on escape key press
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && watchlistModal.style.display === 'block') {
            watchlistModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
        }
    });
    
    // Watchlist Functions
    
    // Add item to watchlist
    window.addToWatchlist = function(id, type, title, posterPath, rating, year) {
        const watchlist = getWatchlist();
        const itemKey = `${type}-${id}`;
        
        // Check if already in watchlist
        if (watchlist[itemKey]) {
            removeFromWatchlist(id, type);
            return false; // Removed from watchlist
        }
        
        // Add to watchlist
        watchlist[itemKey] = {
            id: id,
            type: type,
            title: title,
            posterPath: posterPath,
            rating: rating,
            year: year,
            addedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('imdbExplorerWatchlist', JSON.stringify(watchlist));
        
        // Update count
        updateWatchlistCount();
        
        return true; // Added to watchlist
    };
    
    // Remove item from watchlist
    window.removeFromWatchlist = function(id, type) {
        const watchlist = getWatchlist();
        const itemKey = `${type}-${id}`;
        
        if (watchlist[itemKey]) {
            delete watchlist[itemKey];
            localStorage.setItem('imdbExplorerWatchlist', JSON.stringify(watchlist));
            updateWatchlistCount();
            return true; // Successfully removed
        }
        
        return false; // Item not in watchlist
    };
    
    // Check if item is in watchlist
    window.isInWatchlist = function(id, type) {
        const watchlist = getWatchlist();
        return Boolean(watchlist[`${type}-${id}`]);
    };
    
    // Get watchlist from localStorage
    function getWatchlist() {
        const watchlistData = localStorage.getItem('imdbExplorerWatchlist');
        return watchlistData ? JSON.parse(watchlistData) : {};
    }
    
    // Update watchlist count badge
    function updateWatchlistCount() {
        const watchlist = getWatchlist();
        const count = Object.keys(watchlist).length;
        watchlistCount.textContent = count;
        
        if (count > 0) {
            watchlistCount.style.display = 'inline-block';
        } else {
            watchlistCount.style.display = 'none';
        }
    }
    
    // Show watchlist modal with items
    function showWatchlistModal() {
        const watchlist = getWatchlist();
        const items = Object.values(watchlist);
        
        watchlistModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        if (items.length === 0) {
            watchlistContent.innerHTML = `
                <div class="empty-watchlist">
                    <i class="fas fa-bookmark"></i>
                    <p>Your watchlist is empty.</p>
                    <p>Add movies or TV shows to keep track of what you want to watch.</p>
                </div>
            `;
            return;
        }
        
        // Sort by most recently added
        items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        
        watchlistContent.innerHTML = `
            <div class="watchlist-controls">
                <div class="watchlist-count-info">${items.length} item${items.length !== 1 ? 's' : ''} in your watchlist</div>
                <button class="clear-watchlist" id="clearWatchlist">
                    <i class="fas fa-trash"></i> Clear All
                </button>
            </div>
            <div class="watchlist-grid" id="watchlistGrid"></div>
        `;
        
        const watchlistGrid = document.getElementById('watchlistGrid');
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'watchlist-item';
            card.dataset.id = item.id;
            card.dataset.type = item.type;
            
            // Default poster if not available
            const posterUrl = item.posterPath 
                ? `https://image.tmdb.org/t/p/w342${item.posterPath}` 
                : 'https://via.placeholder.com/342x513?text=No+Poster';
                
            card.innerHTML = `
                <div class="watchlist-poster" style="background-image: url('${posterUrl}')">
                    <div class="watchlist-item-actions">
                        <button class="view-details-btn" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="remove-watchlist-btn" title="Remove from Watchlist">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="watchlist-item-info">
                    <h3 class="watchlist-item-title">${item.title}</h3>
                    <div class="watchlist-item-meta">
                        <span class="watchlist-item-year">${item.year || 'N/A'}</span>
                        <span class="watchlist-item-rating">
                            <i class="fas fa-star"></i> ${item.rating || 'N/A'}
                        </span>
                        <span class="watchlist-item-type">
                            <i class="fas fa-${item.type === 'movie' ? 'film' : 'tv'}"></i>
                            ${item.type === 'movie' ? 'Movie' : 'TV Show'}
                        </span>
                    </div>
                </div>
            `;
            
            // Add event listeners
            card.querySelector('.view-details-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                watchlistModal.style.display = 'none';
                showDetail(item.id, item.type);
            });
            
            card.querySelector('.remove-watchlist-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (removeFromWatchlist(item.id, item.type)) {
                    notyf.success(`Removed "${item.title}" from your watchlist`);
                    card.classList.add('removing');
                    setTimeout(() => {
                        card.remove();
                        
                        // Check if watchlist is now empty
                        if (Object.keys(getWatchlist()).length === 0) {
                            showWatchlistModal(); // Refresh to show empty state
                        } else {
                            // Update count display in the modal
                            const countInfo = document.querySelector('.watchlist-count-info');
                            const currentCount = Object.keys(getWatchlist()).length;
                            if (countInfo) {
                                countInfo.textContent = `${currentCount} item${currentCount !== 1 ? 's' : ''} in your watchlist`;
                            }
                        }
                    }, 300);
                }
            });
            
            // Make entire card clickable to view details
            card.addEventListener('click', function() {
                watchlistModal.style.display = 'none';
                showDetail(item.id, item.type);
            });
            
            watchlistGrid.appendChild(card);
        });
        
        // Clear watchlist button functionality
        document.getElementById('clearWatchlist').addEventListener('click', function() {
            if (confirm('Are you sure you want to clear your entire watchlist?')) {
                localStorage.removeItem('imdbExplorerWatchlist');
                updateWatchlistCount();
                notyf.success('Your watchlist has been cleared');
                showWatchlistModal(); // Refresh the modal
            }
        });
    }
    
    // Initialize watchlist count on page load
    updateWatchlistCount();
});