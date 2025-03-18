document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('detailModal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close-modal');
    
    // Close modal when clicking the X button
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        // Stop any playing videos when closing the modal
        const videoContainer = document.getElementById('trailerContainer');
        if (videoContainer) {
            videoContainer.innerHTML = '';
        }
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            // Stop any playing videos
            const videoContainer = document.getElementById('trailerContainer');
            if (videoContainer) {
                videoContainer.innerHTML = '';
            }
        }
    });
    
    // Close modal on escape key press
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
            // Stop any playing videos
            const videoContainer = document.getElementById('trailerContainer');
            if (videoContainer) {
                videoContainer.innerHTML = '';
            }
        }
    });
    
    // Expose the showDetail function globally
    window.showDetail = function(id, type = 'movie') {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        
        // Show loading state in modal
        modalContent.innerHTML = `
            <div class="modal-loading">
                <div class="loader"></div>
                <p>Loading details...</p>
            </div>
        `;
        
        // Fetch details from TMDb API
        fetch(`/api/detail?id=${id}&type=${type}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch details');
                }
                return response.json();
            })
            .then(data => {
                renderDetailView(data, type);
            })
            .catch(error => {
                console.error('Error fetching details:', error);
                modalContent.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load details. Please try again later.</p>
                    </div>
                `;
            });
    };
    
    function renderDetailView(data, type) {
        // Format release date or first air date
        let releaseDate = '';
        let releaseYear = '';
        if (type === 'movie' && data.release_date) {
            const date = new Date(data.release_date);
            releaseDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            releaseYear = date.getFullYear();
        } else if (type === 'tv' && data.first_air_date) {
            const date = new Date(data.first_air_date);
            releaseDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            releaseYear = date.getFullYear();
        }
        
        // Get backdrop and poster paths
        const backdropPath = data.backdrop_path 
            ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
            : '';
            
        const posterPath = data.poster_path
            ? `https://image.tmdb.org/t/p/w342${data.poster_path}`
            : 'https://via.placeholder.com/342x513?text=No+Poster';
            
        // Format runtime for movies
        let runtime = '';
        if (type === 'movie' && data.runtime) {
            const hours = Math.floor(data.runtime / 60);
            const minutes = data.runtime % 60;
            runtime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        
        // Format TV show details
        let tvDetails = '';
        if (type === 'tv') {
            tvDetails = `
                <div>
                    <strong>${data.number_of_seasons}</strong> 
                    Season${data.number_of_seasons !== 1 ? 's' : ''}
                </div>
                <div>
                    <strong>${data.number_of_episodes}</strong> 
                    Episode${data.number_of_episodes !== 1 ? 's' : ''}
                </div>
            `;
        }
        
        // Format genres
        const genres = data.genres.map(genre => 
            `<span class="detail-genre">${genre.name}</span>`
        ).join('');
        
        // Find trailer
        let trailerKey = null;
        if (data.videos && data.videos.results && data.videos.results.length > 0) {
            // First try to find official trailers
            const officialTrailer = data.videos.results.find(
                video => video.type === 'Trailer' && video.official && video.site === 'YouTube'
            );
            
            // If no official trailer, try any trailer
            const anyTrailer = data.videos.results.find(
                video => video.type === 'Trailer' && video.site === 'YouTube'
            );
            
            // If still nothing, try any video
            const anyVideo = data.videos.results.find(
                video => video.site === 'YouTube'
            );
            
            trailerKey = officialTrailer?.key || anyTrailer?.key || anyVideo?.key;
        }
        
        // Check if item is in watchlist
        const isInWatchlist = window.isInWatchlist ? window.isInWatchlist(data.id, type) : false;
        const watchlistBtnClass = isInWatchlist ? 'in-watchlist' : '';
        const watchlistBtnIcon = isInWatchlist ? 'fa-bookmark' : 'fa-bookmark';
        const watchlistBtnText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        
        // Create main content
        modalContent.innerHTML = `
            <div class="detail-header" style="background-image: url('${backdropPath}')"></div>
            <div class="detail-info">
                <img class="detail-poster" src="${posterPath}" alt="${data.title || data.name}">
                <div class="detail-text">
                    <h2 class="detail-title">${data.title || data.name}</h2>
                    <div class="detail-meta">
                        ${releaseDate ? `<div>${releaseDate}</div>` : ''}
                        ${runtime ? `<div>${runtime}</div>` : ''}
                        ${tvDetails}
                        <div>
                            <i class="fas fa-star" style="color: var(--rating-color)"></i>
                            <strong>${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</strong>/10
                        </div>
                    </div>
                    <div class="detail-genre-list">${genres}</div>
                    <p class="detail-overview">${data.overview || 'No overview available.'}</p>
                    <div class="detail-actions">
                        ${trailerKey ? 
                            `<button class="detail-btn watch-trailer" data-key="${trailerKey}">
                                <i class="fas fa-play"></i> Watch Trailer
                            </button>` : 
                            `<button class="detail-btn disabled" disabled>
                                <i class="fas fa-play"></i> No Trailer Available
                            </button>`
                        }
                        <button class="detail-btn add-to-watchlist ${watchlistBtnClass}" id="addToWatchlistBtn">
                            <i class="fas ${watchlistBtnIcon}"></i> ${watchlistBtnText}
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Trailer container -->
            <div class="trailer-container" id="trailerContainer"></div>
            
            <!-- Cast section -->
            <div class="detail-section">
                <h3>Cast</h3>
                <div class="cast-list" id="castList">
                    <div class="cast-loading"><div class="loader small"></div> Loading cast...</div>
                </div>
            </div>
        `;
        
        // Add trailer button functionality
        if (trailerKey) {
            const trailerBtn = modalContent.querySelector('.watch-trailer');
            trailerBtn.addEventListener('click', function() {
                const trailerContainer = document.getElementById('trailerContainer');
                
                // If trailer is already open, close it
                if (trailerContainer.innerHTML !== '') {
                    trailerContainer.innerHTML = '';
                    trailerBtn.innerHTML = '<i class="fas fa-play"></i> Watch Trailer';
                    return;
                }
                
                // Open trailer
                trailerContainer.innerHTML = `
                    <div class="trailer-wrapper">
                        <div class="trailer-close"><i class="fas fa-times"></i></div>
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src="https://www.youtube.com/embed/${trailerKey}?autoplay=1" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                `;
                
                trailerBtn.innerHTML = '<i class="fas fa-times"></i> Close Trailer';
                
                // Add close button functionality
                const closeBtn = trailerContainer.querySelector('.trailer-close');
                closeBtn.addEventListener('click', function() {
                    trailerContainer.innerHTML = '';
                    trailerBtn.innerHTML = '<i class="fas fa-play"></i> Watch Trailer';
                });
            });
        }
        
        // Add to watchlist button functionality
        const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
        if (addToWatchlistBtn && window.addToWatchlist) {
            addToWatchlistBtn.addEventListener('click', function() {
                const title = data.title || data.name;
                const added = window.addToWatchlist(
                    data.id, 
                    type, 
                    title, 
                    data.poster_path, 
                    data.vote_average ? data.vote_average.toFixed(1) : 'N/A', 
                    releaseYear
                );
                
                if (added) {
                    // Was added to watchlist
                    this.classList.add('in-watchlist');
                    this.innerHTML = '<i class="fas fa-bookmark"></i> Remove from Watchlist';
                    window.notyf.success(`Added "${title}" to your watchlist`);
                } else {
                    // Was removed from watchlist
                    this.classList.remove('in-watchlist');
                    this.innerHTML = '<i class="fas fa-bookmark"></i> Add to Watchlist';
                    window.notyf.success(`Removed "${title}" from your watchlist`);
                }
            });
        }
        
        // Load cast
        renderCast(data.credits);
    }
    
    function renderCast(credits) {
        if (!credits || !credits.cast || credits.cast.length === 0) {
            document.getElementById('castList').innerHTML = '<p class="no-cast">No cast information available.</p>';
            return;
        }
        
        const castList = document.getElementById('castList');
        castList.innerHTML = '';
        
        // Get top 10 cast members
        const topCast = credits.cast.slice(0, 10);
        
        // Create scrollable cast list
        const castGrid = document.createElement('div');
        castGrid.className = 'cast-grid';
        
        topCast.forEach(person => {
            const profilePath = person.profile_path 
                ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
                : 'https://via.placeholder.com/185x278?text=No+Image';
                
            const castCard = document.createElement('div');
            castCard.className = 'cast-card';
            castCard.innerHTML = `
                <div class="cast-image" style="background-image: url('${profilePath}')"></div>
                <div class="cast-info">
                    <div class="cast-name">${person.name}</div>
                    <div class="cast-character">${person.character || 'Unknown Role'}</div>
                </div>
            `;
            
            castGrid.appendChild(castCard);
        });
        
        castList.appendChild(castGrid);
    }
});