document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentPage = 1;
    let totalPages = 0;
    let selectedGenres = [];
    let selectedRating = 0;
    let selectedYear = 0;  // Default to 0 (All years)
    let selectedVoteCount = 0; // Default to 0 (No minimum vote count)
    let sortMethod = 'popularity.desc'; // Default sort method (Popular)
    let mediaType = 'movie'; // Default media type
    let searchQuery = '';   // For search functionality

    // Elements
    const moviesToggle = document.getElementById('moviesToggle');
    const tvToggle = document.getElementById('tvToggle');
    const genreBtn = document.getElementById('genreBtn');
    const genreDropdown = document.getElementById('genreDropdown');
    const ratingBtn = document.getElementById('ratingBtn');
    const ratingSlider = document.getElementById('ratingSlider');
    const ratingRange = document.getElementById('ratingRange');
    const ratingValue = document.getElementById('ratingValue');
    const yearBtn = document.getElementById('yearBtn');
    const yearSlider = document.getElementById('yearSlider');
    const yearRange = document.getElementById('yearRange');
    const yearValue = document.getElementById('yearValue');
    const voteCountBtn = document.getElementById('voteCountBtn');  // Vote count button
    const voteCountSlider = document.getElementById('voteCountSlider');  // Vote count slider container
    const voteCountRange = document.getElementById('voteCountRange');  // Vote count range input
    const voteCountValue = document.getElementById('voteCountValue');  // Vote count value display
    const popularBtn = document.getElementById('popularBtn');
    const topRatedBtn = document.getElementById('topRatedBtn');
    const activeFilters = document.getElementById('activeFilters');
    const loadingContainer = document.getElementById('loadingContainer');
    const resultsContainer = document.getElementById('results');
    const pagination = document.getElementById('pagination');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // Initialize Notyf (for notifications)
    const notyf = new Notyf({
        duration: 3000,
        position: {
            x: 'right',
            y: 'top'
        },
        types: [
            {
                type: 'success',
                background: '#4BB543',
                icon: {
                    className: 'fas fa-check-circle',
                    tagName: 'i'
                }
            },
            {
                type: 'error',
                background: '#ff4b4b',
                icon: {
                    className: 'fas fa-times-circle',
                    tagName: 'i'
                }
            }
        ]
    });

    // Event Listeners
    moviesToggle.addEventListener('click', () => switchMediaType('movie'));
    tvToggle.addEventListener('click', () => switchMediaType('tv'));
    
    genreBtn.addEventListener('click', () => {
        genreDropdown.classList.toggle('show');
        ratingSlider.classList.remove('show');
        yearSlider.classList.remove('show');
        voteCountSlider.classList.remove('show');  // Hide vote count slider
    });

    ratingBtn.addEventListener('click', () => {
        ratingSlider.classList.toggle('show');
        genreDropdown.classList.remove('show');
        yearSlider.classList.remove('show');
        voteCountSlider.classList.remove('show');  // Hide vote count slider
    });

    // Year filter event listeners
    yearBtn.addEventListener('click', () => {
        yearSlider.classList.toggle('show');
        genreDropdown.classList.remove('show');
        ratingSlider.classList.remove('show');
        voteCountSlider.classList.remove('show');  // Hide vote count slider
    });

    // Vote count filter event listeners
    voteCountBtn.addEventListener('click', () => {
        voteCountSlider.classList.toggle('show');
        genreDropdown.classList.remove('show');
        ratingSlider.classList.remove('show');
        yearSlider.classList.remove('show');
    });

    yearRange.addEventListener('input', () => {
        selectedYear = parseInt(yearRange.value);
        yearValue.textContent = selectedYear === 1900 ? 'All' : selectedYear;
        updateActiveFilters();
        fetchResults();
    });

    ratingRange.addEventListener('input', () => {
        selectedRating = parseFloat(ratingRange.value);
        ratingValue.textContent = selectedRating;
        updateActiveFilters();
        fetchResults();
    });

    voteCountRange.addEventListener('input', () => {
        selectedVoteCount = parseInt(voteCountRange.value);
        voteCountValue.textContent = selectedVoteCount === 1000 ? '1000+' : selectedVoteCount;
        updateActiveFilters();
        fetchResults();
    });

    popularBtn.addEventListener('click', () => {
        sortMethod = 'popularity.desc';
        popularBtn.classList.add('active');
        topRatedBtn.classList.remove('active');
        updateActiveFilters();
        fetchResults();
    });

    topRatedBtn.addEventListener('click', () => {
        sortMethod = 'vote_average.desc';
        topRatedBtn.classList.add('active');
        popularBtn.classList.remove('active');
        updateActiveFilters();
        fetchResults();
    });

    // Search functionality
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            searchQuery = query;
            // Reset page to 1 when performing a new search
            currentPage = 1;
            fetchSearchResults();
        } else {
            searchQuery = '';
            fetchResults();
        }
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!genreBtn.contains(e.target) && !genreDropdown.contains(e.target)) {
            genreDropdown.classList.remove('show');
        }
        if (!ratingBtn.contains(e.target) && !ratingSlider.contains(e.target)) {
            ratingSlider.classList.remove('show');
        }
        if (!yearBtn.contains(e.target) && !yearSlider.contains(e.target)) {
            yearSlider.classList.remove('show');
        }
        if (!voteCountBtn.contains(e.target) && !voteCountSlider.contains(e.target)) {
            voteCountSlider.classList.remove('show');
        }
    });

    // Initialize the application
    fetchGenres();
    fetchResults();

    // Functions
    function resetFilters() {
        // Reset all filters to default values
        selectedGenres = [];
        selectedRating = 0;
        selectedYear = 0;
        selectedVoteCount = 0;  // Reset vote count
        sortMethod = 'popularity.desc';
        searchQuery = '';
        searchInput.value = '';
        
        // Reset UI elements
        ratingRange.value = 0;
        ratingValue.textContent = '0';
        yearRange.value = 1900;
        yearValue.textContent = 'All';
        voteCountRange.value = 0;  // Reset vote count range
        voteCountValue.textContent = '0';  // Reset vote count display
        popularBtn.classList.add('active');
        topRatedBtn.classList.remove('active');
        
        // Reset page
        currentPage = 1;
    }

    function switchMediaType(type) {
        if (mediaType !== type) {
            mediaType = type;
            
            // Reset all filters when switching media types
            resetFilters();
            
            // Update UI for media type toggle
            if (type === 'movie') {
                moviesToggle.classList.add('active');
                tvToggle.classList.remove('active');
            } else {
                tvToggle.classList.add('active');
                moviesToggle.classList.remove('active');
            }
            
            // Refresh content based on new media type
            fetchGenres();
            fetchResults();
            updateActiveFilters();
        }
    }

    function fetchGenres() {
        // Clear existing genres
        genreDropdown.innerHTML = '<div class="loading">Loading genres...</div>';
        
        // Fetch genres for the current media type
        fetch(`/api/genres?type=${mediaType}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                genreDropdown.innerHTML = '';
                
                data.genres.forEach(genre => {
                    const isSelected = selectedGenres.includes(genre.id);
                    
                    const genreItem = document.createElement('div');
                    genreItem.className = `genre-item ${isSelected ? 'selected' : ''}`;
                    genreItem.dataset.id = genre.id;
                    
                    genreItem.innerHTML = `
                        <input type="checkbox" id="genre-${genre.id}" ${isSelected ? 'checked' : ''}>
                        <label for="genre-${genre.id}">${genre.name}</label>
                    `;
                    
                    genreItem.addEventListener('click', function(e) {
                        const checkbox = this.querySelector('input[type="checkbox"]');
                        const genreId = parseInt(this.dataset.id);
                        
                        checkbox.checked = !checkbox.checked; // Toggle checkbox state
                        
                        if (checkbox.checked) {
                            if (!selectedGenres.includes(genreId)) {
                                selectedGenres.push(genreId);
                            }
                            this.classList.add('selected');
                        } else {
                            selectedGenres = selectedGenres.filter(id => id !== genreId);
                            this.classList.remove('selected');
                        }
                        
                        updateActiveFilters();
                        fetchResults();
                    });
                    
                    genreDropdown.appendChild(genreItem);
                });
            })
            .catch(error => {
                console.error('Error fetching genres:', error);
                notyf.error('Failed to load genres');
                genreDropdown.innerHTML = '<div class="error">Failed to load genres</div>';
            });
    }

    function fetchSearchResults() {
        showLoading(true);
        
        let params = new URLSearchParams({
            type: mediaType,
            page: currentPage,
            query: searchQuery
        });
        
        fetch(`/api/search?${params}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                totalPages = data.total_pages > 100 ? 100 : data.total_pages;
                displayResults(data.results);
                updatePagination();
                updateActiveFilters();
                showLoading(false);
            })
            .catch(error => {
                console.error('Error searching:', error);
                notyf.error('Search failed');
                showLoading(false);
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to search. Please try again later.</p>
                    </div>
                `;
            });
    }

    function fetchResults() {
        // If there's a search query, use search endpoint instead
        if (searchQuery) {
            fetchSearchResults();
            return;
        }
        
        showLoading(true);
        currentPage = 1;
        
        let endpoint = '/api/discover';
        let params = new URLSearchParams({
            type: mediaType,
            page: currentPage,
            rating: selectedRating,
            vote_count: selectedVoteCount,  // Add vote count parameter
            sort_by: sortMethod
        });
        
        // Add year filter if set
        if (selectedYear > 1900) {
            const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
            params.append(yearParam, selectedYear);
        }
        
        if (selectedGenres.length > 0) {
            params.append('genre', selectedGenres.join(','));
        }
        
        fetch(`${endpoint}?${params}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                totalPages = data.total_pages > 100 ? 100 : data.total_pages; // API usually limits to 500 pages
                displayResults(data.results);
                updatePagination();
                showLoading(false);
            })
            .catch(error => {
                console.error('Error fetching results:', error);
                notyf.error('Failed to load content');
                showLoading(false);
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load content. Please try again later.</p>
                    </div>
                `;
            });
    }

    function loadPage(page) {
        showLoading(true);
        currentPage = page;
        
        // If there's a search query, use search endpoint
        if (searchQuery) {
            let params = new URLSearchParams({
                type: mediaType,
                page: currentPage,
                query: searchQuery
            });
            
            fetch(`/api/search?${params}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    displayResults(data.results);
                    updatePagination();
                    showLoading(false);
                    // Scroll to top
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                })
                .catch(error => {
                    console.error('Error fetching search results:', error);
                    notyf.error('Failed to load content');
                    showLoading(false);
                });
            return;
        }
        
        let endpoint = '/api/discover';
        let params = new URLSearchParams({
            type: mediaType,
            page: currentPage,
            rating: selectedRating,
            vote_count: selectedVoteCount,  // Add vote count parameter
            sort_by: sortMethod
        });
        
        // Add year filter if set
        if (selectedYear > 1900) {
            const yearParam = mediaType === 'movie' ? 'primary_release_year' : 'first_air_date_year';
            params.append(yearParam, selectedYear);
        }
        
        if (selectedGenres.length > 0) {
            params.append('genre', selectedGenres.join(','));
        }
        
        fetch(`${endpoint}?${params}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                displayResults(data.results);
                updatePagination();
                showLoading(false);
                // Scroll to top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            })
            .catch(error => {
                console.error('Error fetching page results:', error);
                notyf.error('Failed to load content');
                showLoading(false);
            });
    }

    function displayResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found matching your criteria.</p>
                    <p>Try adjusting your filters.</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = '';
        
        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            
            // Set data attributes for the card
            card.dataset.id = item.id;
            card.dataset.type = mediaType;
            
            // Make card clickable
            card.addEventListener('click', function() {
                showDetail(this.dataset.id, this.dataset.type);
            });
            
            // Check if poster path exists
            let posterPath = item.poster_path 
                ? `https://image.tmdb.org/t/p/w342${item.poster_path}` 
                : 'https://via.placeholder.com/342x513?text=No+Poster';
            
            // Format release date or first air date
            let releaseDate = '';
            if (mediaType === 'movie' && item.release_date) {
                releaseDate = new Date(item.release_date).getFullYear();
            } else if (mediaType === 'tv' && item.first_air_date) {
                releaseDate = new Date(item.first_air_date).getFullYear();
            } else {
                releaseDate = 'Unknown';
            }
            
            // Get title based on media type
            let title = mediaType === 'movie' ? item.title : item.name;
            
            card.innerHTML = `
                <img src="${posterPath}" alt="${title}" loading="lazy">
                <div class="movie-info">
                    <h3 class="movie-title">${title}</h3>
                    <div class="movie-year">${releaseDate}</div>
                    <div class="movie-rating">
                        <i class="fas fa-star"></i>
                        <span>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
                        <span class="vote-count">(${item.vote_count || 0})</span>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(card);
        });
    }

    function updatePagination() {
        pagination.innerHTML = '';
        
        if (totalPages <= 1) {
            return;
        }
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => loadPage(currentPage - 1));
        pagination.appendChild(prevBtn);
        
        // First page
        if (currentPage > 3) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-btn';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => loadPage(1));
            pagination.appendChild(firstPageBtn);
            
            if (currentPage > 4) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'ellipsis';
                ellipsis.textContent = '...';
                pagination.appendChild(ellipsis);
            }
        }
        
        // Page range
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        // Adjust to show 5 pages when possible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(5, totalPages);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, totalPages - 4);
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => loadPage(i));
            pagination.appendChild(pageBtn);
        }
        
        // Last page
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'ellipsis';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
        
        if (endPage < totalPages) {
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-btn';
            lastPageBtn.textContent = totalPages;
            lastPageBtn.addEventListener('click', () => loadPage(totalPages));
            pagination.appendChild(lastPageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => loadPage(currentPage + 1));
        pagination.appendChild(nextBtn);
    }

    function updateActiveFilters() {
        // Get all genre names for display
        const selectedGenreNames = [];
        document.querySelectorAll('.genre-item.selected').forEach(item => {
            const label = item.querySelector('label');
            if (label) {
                selectedGenreNames.push(label.textContent);
            }
        });
        
        let filtersHTML = '';
        
        // Add search filter if present
        if (searchQuery) {
            filtersHTML += `
                <div class="active-filter search" data-type="search">
                    <i class="fas fa-search"></i>
                    <span>Search: "${searchQuery}"</span>
                    <i class="fas fa-times remove"></i>
                </div>
            `;
        }
        
        // Add genre filters
        if (selectedGenreNames.length > 0) {
            selectedGenreNames.forEach(genreName => {
                filtersHTML += `
                    <div class="active-filter genre" data-type="genre" data-name="${genreName}">
                        <i class="fas fa-theater-masks"></i>
                        <span>${genreName}</span>
                        <i class="fas fa-times remove"></i>
                    </div>
                `;
            });
        }
        
        // Add year filter
        if (selectedYear > 1900) {
            filtersHTML += `
                <div class="active-filter year" data-type="year">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Year: ${selectedYear}</span>
                    <i class="fas fa-times remove"></i>
                </div>
            `;
        }
        
        // Add rating filter
        if (selectedRating > 0) {
            filtersHTML += `
                <div class="active-filter rating" data-type="rating">
                    <i class="fas fa-star"></i>
                    <span>${selectedRating}+ Rating</span>
                    <i class="fas fa-times remove"></i>
                </div>
            `;
        }
        
        // Add vote count filter
        if (selectedVoteCount > 0) {
            filtersHTML += `
                <div class="active-filter vote-count" data-type="vote-count">
                    <i class="fas fa-users"></i>
                    <span>${selectedVoteCount}+ Votes</span>
                    <i class="fas fa-times remove"></i>
                </div>
            `;
        }
        
        // Add sort filter
        if (sortMethod === 'popularity.desc') {
            filtersHTML += `
                <div class="active-filter sort" data-type="sort" data-method="popularity.desc">
                    <i class="fas fa-fire"></i>
                    <span>Popular</span>
                </div>
            `;
        } else if (sortMethod === 'vote_average.desc') {
            filtersHTML += `
                <div class="active-filter sort" data-type="sort" data-method="vote_average.desc">
                    <i class="fas fa-award"></i>
                    <span>Top Rated</span>
                </div>
            `;
        }
        
        // Add media type filter
        filtersHTML += `
            <div class="active-filter media-type" data-type="media-type">
                <i class="fas fa-${mediaType === 'movie' ? 'film' : 'tv'}"></i>
                <span>${mediaType === 'movie' ? 'Movies' : 'TV Shows'}</span>
            </div>
        `;
        
        if (filtersHTML === '') {
            activeFilters.innerHTML = '<div class="no-filters">No active filters</div>';
        } else {
            activeFilters.innerHTML = filtersHTML;
            
            // Add event listeners for removing filters
            document.querySelectorAll('.active-filter .remove').forEach(btn => {
                btn.addEventListener('click', function() {
                    const filter = this.parentElement;
                    const filterType = filter.dataset.type;
                    
                    if (filterType === 'genre') {
                        const genreName = filter.dataset.name;
                        document.querySelectorAll('.genre-item').forEach(item => {
                            const label = item.querySelector('label');
                            if (label && label.textContent === genreName) {
                                const checkbox = item.querySelector('input[type="checkbox"]');
                                checkbox.checked = false;
                                item.classList.remove('selected');
                                
                                const genreId = parseInt(item.dataset.id);
                                selectedGenres = selectedGenres.filter(id => id !== genreId);
                            }
                        });
                    } else if (filterType === 'rating') {
                        selectedRating = 0;
                        ratingRange.value = 0;
                        ratingValue.textContent = '0';
                    } else if (filterType === 'year') {
                        selectedYear = 0;
                        yearRange.value = 1900;
                        yearValue.textContent = 'All';
                    } else if (filterType === 'vote-count') {
                        selectedVoteCount = 0;
                        voteCountRange.value = 0;
                        voteCountValue.textContent = '0';
                    } else if (filterType === 'search') {
                        searchQuery = '';
                        searchInput.value = '';
                    }
                    
                    updateActiveFilters();
                    fetchResults();
                });
            });
        }
    }

    function showLoading(show) {
        if (show) {
            loadingContainer.style.display = 'flex';
            resultsContainer.style.display = 'none';
        } else {
            loadingContainer.style.display = 'none';
            resultsContainer.style.display = 'grid';
        }
    }
});