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
                
                // If movie belongs to a collection, fetch collection details
                if (type === 'movie' && data.belongs_to_collection) {
                    fetchCollectionDetails(data.belongs_to_collection.id);
                }
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
    
    function fetchCollectionDetails(collectionId) {
        fetch(`/api/collection?id=${collectionId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch collection');
                }
                return response.json();
            })
            .then(collection => {
                renderCollectionSection(collection);
            })
            .catch(error => {
                console.error('Error fetching collection:', error);
            });
    }
    
    function renderCollectionSection(collection) {
        const collectionSection = document.createElement('div');
        collectionSection.className = 'detail-section collection-section';
        
        // Sort collection parts by release date
        const sortedParts = collection.parts.sort((a, b) => {
            const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
            const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
            return dateA - dateB;
        });
        
        const collectionHTML = `
            <div class="collection-header">
                <h3>${collection.name}</h3>
                <div class="collection-overview">
                    ${collection.overview || 'A collection of related movies.'}
                </div>
            </div>
            <div class="collection-grid">
                ${sortedParts.map((movie, index) => {
                    const posterPath = movie.poster_path
                        ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                        : 'https://via.placeholder.com/200x300?text=No+Poster';
                    
                    const releaseDate = movie.release_date
                        ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric' })
                        : 'TBA';
                    
                    const isReleased = movie.release_date && new Date(movie.release_date) <= new Date();
                    const releaseBadge = !isReleased ? 
                        '<span class="upcoming-badge">Upcoming</span>' : '';
                    
                    return `
                        <div class="collection-item" data-id="${movie.id}">
                            <div class="collection-poster-container">
                                <img src="${posterPath}" alt="${movie.title}" class="collection-poster">
                                <div class="collection-item-number">${index + 1}</div>
                                ${releaseBadge}
                            </div>
                            <div class="collection-item-info">
                                <div class="collection-item-title">${movie.title}</div>
                                <div class="collection-item-year">${releaseDate}</div>
                                ${movie.vote_average ? 
                                    `<div class="collection-item-rating">
                                        <i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}
                                    </div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        collectionSection.innerHTML = collectionHTML;
        modalContent.appendChild(collectionSection);
        
        // Add click events to collection items
        document.querySelectorAll('.collection-item').forEach(item => {
            item.addEventListener('click', function() {
                const movieId = this.getAttribute('data-id');
                window.showDetail(movieId, 'movie');
            });
        });
    }
    
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
        
        // Format production companies
        const productionCompanies = data.production_companies && data.production_companies.length > 0 
            ? data.production_companies.map(company => {
                const logo = company.logo_path 
                    ? `<img src="https://image.tmdb.org/t/p/w92${company.logo_path}" alt="${company.name}" class="company-logo">`
                    : `<span class="company-name-no-logo">${company.name}</span>`;
                return `
                    <div class="production-company">
                        ${logo}
                    </div>`;
              }).join('')
            : '<p>Information not available</p>';
            
        // Check if item is in watchlist
        const isInWatchlist = window.isInWatchlist ? window.isInWatchlist(data.id, type) : false;
        const watchlistBtnClass = isInWatchlist ? 'in-watchlist' : '';
        const watchlistBtnIcon = isInWatchlist ? 'fa-bookmark' : 'fa-bookmark';
        const watchlistBtnText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        
        // Format additional info
        const statusInfo = data.status ? `<div class="detail-info-item"><span>Status:</span> ${data.status}</div>` : '';
        const budgetInfo = type === 'movie' && data.budget ? 
            `<div class="detail-info-item"><span>Budget:</span> $${(data.budget / 1000000).toFixed(1)} million</div>` : '';
        const revenueInfo = type === 'movie' && data.revenue ? 
            `<div class="detail-info-item"><span>Revenue:</span> $${(data.revenue / 1000000).toFixed(1)} million</div>` : '';
        const languageInfo = data.original_language ? 
            `<div class="detail-info-item"><span>Language:</span> ${new Intl.DisplayNames(['en'], {type: 'language'}).of(data.original_language)}</div>` : '';
        
        // Create collection badge if movie belongs to a collection
        const collectionBadge = type === 'movie' && data.belongs_to_collection ? 
            `<div class="collection-badge">
                <i class="fas fa-film"></i> Part of: ${data.belongs_to_collection.name}
            </div>` : '';
            
        // Create main content
        modalContent.innerHTML = `
            <div class="detail-header" style="background-image: url('${backdropPath}')">
                ${collectionBadge}
            </div>
            <div class="detail-info">
                <div class="detail-poster-container">
                    <img class="detail-poster" src="${posterPath}" alt="${data.title || data.name}">
                    <div class="detail-rating-badge">
                        <i class="fas fa-star"></i>
                        <span>${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</span>
                    </div>
                </div>
                <div class="detail-text">
                    <h2 class="detail-title">${data.title || data.name}</h2>
                    <div class="detail-meta">
                        ${releaseDate ? `<div>${releaseDate}</div>` : ''}
                        ${runtime ? `<div><i class="fas fa-clock"></i> ${runtime}</div>` : ''}
                        ${tvDetails}
                        <div>
                            <i class="fas fa-user"></i> ${data.vote_count} votes
                        </div>
                    </div>
                    <div class="detail-tagline">${data.tagline || ''}</div>
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
                        <div class="watch-dropdown">
                            <button class="detail-btn watch-now" id="watchNowBtn">
                                <i class="fas fa-tv"></i> Watch
                            </button>
                            <div class="watch-options" id="watchOptions">
                                <div class="watch-options-header">Watch on:</div>
                                <div class="watch-options-list">
                                    <a href="${type === 'movie' ? 
                                        `https://www.cineby.app/movie/${data.id}` : 
                                        `https://www.cineby.app/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/cineby.png" alt="Cineby">
                                        <span>Cineby</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://rivestream.org/detail?type=movie&id=${data.id}` : 
                                        `https://rivestream.org/detail?type=tv&id=${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/rive.png" alt="Rive">
                                        <span>Rive</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://watch.autoembed.cc/movie/${data.id}` : 
                                        `https://watch.autoembed.cc/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/autoembed.png" alt="Autoembed">
                                        <span>Autoembed</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://broflix.ci/movie/${data.id}` : 
                                        `https://broflix.ci/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/broflix.png" alt="Broflix">
                                        <span>Broflix</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://freeky.to/watch/movie/${data.id}` : 
                                        `https://freeky.to/watch/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/freek.png" alt="Freek">
                                        <span>Freek</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://nunflix.org/movie/${data.id}` : 
                                        `https://nunflix.org/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/nunflix.png" alt="Nunflix">
                                        <span>Nunflix</span>
                                    </a>
                                    <a href="${type === 'movie' ? 
                                        `https://alienflix.net/movie/${data.id}` : 
                                        `https://alienflix.net/tv/${data.id}`}" 
                                       target="_blank" class="watch-option">
                                        <img src="/static/img/alienflix.png" alt="Alienflix">
                                        <span>Alienflix</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <button class="detail-btn add-to-watchlist ${watchlistBtnClass}" id="addToWatchlistBtn">
                            <i class="fas ${watchlistBtnIcon}"></i> ${watchlistBtnText}
                        </button>
                    </div>
                    
                    <!-- Additional information -->
                    <div class="detail-additional-info">
                        ${statusInfo}
                        ${budgetInfo}
                        ${revenueInfo}
                        ${languageInfo}
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
            
            <!-- Production companies section -->
            <div class="detail-section production-section">
                <h3>Production</h3>
                <div class="production-companies">
                    ${productionCompanies}
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
        
        // Add Watch Now dropdown functionality
        const watchBtn = document.getElementById('watchNowBtn');
        const watchOptions = document.getElementById('watchOptions');
        
        if (watchBtn) {
            watchBtn.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent bubbling to document click handler
                watchOptions.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(event) {
                if (!event.target.closest('.watch-dropdown')) {
                    watchOptions.classList.remove('active');
                }
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