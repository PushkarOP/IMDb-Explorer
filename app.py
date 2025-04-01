from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv
import random
import re
import concurrent.futures
from functools import lru_cache
from flask_caching import Cache
import time

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configure cache
cache_config = {
    "DEBUG": True,
    "CACHE_TYPE": "SimpleCache",  # Flask-Caching related configs
    "CACHE_DEFAULT_TIMEOUT": 300  # 5 minutes default cache timeout
}
app.config.from_mapping(cache_config)
cache = Cache(app)

# Get API key from environment variables
TMBD_KEYS = ["afdedf165ae83c0b4bab280a28d5902c"]
OMDB_KEYS = ['7387edbe', '56d8d546', 'd0684c', '29199954', 'cd09be8d', '6467174b', '11d1896f', '36763c3a', '82451ec8', 'e0306b57', 'f16bccca', '9efa53d6', '14429c12', 'ee3cbb66', '3abdcc1f', '7aca1a0d', '26f31c8c', '89b2cea8', 'a6f49519', '76ddcefd', '9d8f82a6', '2d50267c', '679e943e', '2fcdb13e', '8cdef216', 'dd32760', '40f1931f', 'a4d6a29', 'a173d2da', '18843ae0', '2cc17e42', 'aca9b1fb', 'c4227184', 'e6641f64', '50824d23', '2be61ad8', 'e3d82a44', '476c7787', '8616032a', 'b651f78', 'e5184838', '8bf5cb67', 'd1a799c0', '7bb6afe9', 'd77553ef', '669b2628']
TMDB_BASE_URL = "https://api.themoviedb.org/3"
OMDB_BASE_URL = "http://www.omdbapi.com/"

# Create a thread pool for parallel requests
executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)

@app.route('/')
def index():
    return render_template('index.html')

# Cache the genres response for 1 day (86400 seconds)
@app.route('/api/genres', methods=['GET'])
@cache.cached(timeout=86400, query_string=True)
def get_genres():
    # OMDB doesn't have a genres endpoint, so using TMDB
    API_KEY = random.choice(TMBD_KEYS)
    media_type = request.args.get('type', 'movie')  # Default to movie
    url = f"{TMDB_BASE_URL}/genre/{media_type}/list"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US'
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch genres"}), 500

@app.route('/api/discover', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache for 5 minutes
def discover():
    # OMDB doesn't have a discover endpoint, so using TMDB
    API_KEY = random.choice(TMBD_KEYS)
    media_type = request.args.get('type', 'movie')  # Default to movie
    genre = request.args.get('genre', '')
    rating = request.args.get('rating', '0')
    vote_count = request.args.get('vote_count', '0')
    sort_by = request.args.get('sort_by', 'popularity.desc')
    page = request.args.get('page', '1')
    
    # Handle "New" sort option based on media type
    if sort_by == 'release_date.desc':
        if media_type == 'movie':
            sort_by = 'primary_release_date.desc'
        else:  # TV shows
            sort_by = 'first_air_date.desc'
    
    params = {
        'api_key': API_KEY,
        'language': 'en-US',
        'sort_by': sort_by,
        'page': page,
        'vote_average.gte': float(rating),
        'include_adult': 'false'
    }
    
    # Add vote count parameter if specified
    if vote_count and int(vote_count) > 0:
        params['vote_count.gte'] = int(vote_count)
    
    # Handle year filter - different param names for movies vs TV shows
    year = request.args.get('primary_release_year' if media_type == 'movie' else 'first_air_date_year', '')
    if year and year != '1900':
        if media_type == 'movie':
            params['primary_release_date.gte'] = f"{year}-01-01"
        else:
            params['first_air_date.gte'] = f"{year}-01-01"
    
    if genre:
        params['with_genres'] = genre
    
    url = f"{TMDB_BASE_URL}/discover/{media_type}"
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if float(rating) > 0:
            data['results'] = [item for item in data['results'] if item.get('vote_average', 0) >= float(rating)]
        
        # Use parallel processing to enrich results with OMDB data
        enriched_results = parallel_enrich_results(data['results'], media_type)
        data['results'] = enriched_results
        
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch data"}), 500

@app.route('/api/search', methods=['GET'])
@cache.cached(timeout=300, query_string=True)  # Cache for 5 minutes
def search():
    API_KEY = random.choice(TMBD_KEYS)
    query = request.args.get('query', '')
    media_type = request.args.get('type', 'movie')  # Default to movie
    page = request.args.get('page', '1')
    
    if not query:
        return jsonify({"error": "No search query provided"}), 400
    
    url = f"{TMDB_BASE_URL}/search/{media_type}"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'query': query,
        'page': page,
        'include_adult': 'false'
    })
    
    if response.status_code == 200:
        data = response.json()
        
        # Use parallel processing to enrich results with OMDB data
        enriched_results = parallel_enrich_results(data['results'], media_type)
        data['results'] = enriched_results
        
        return jsonify(data)
    else:
        # If TMDB search fails, try direct OMDB search
        try:
            omdb_results = search_omdb(query, media_type, page)
            return jsonify(omdb_results)
        except Exception as e:
            return jsonify({"error": f"Failed to search. Status: {response.status_code}. OMDB fallback failed: {str(e)}"}), 500

def search_omdb(query, media_type, page):
    # OMDB doesn't support pagination, so we'll simulate it
    API_KEY = random.choice(OMDB_KEYS)
    
    # Determine type parameter for OMDB
    omdb_type = 'movie' if media_type == 'movie' else 'series'
    
    url = OMDB_BASE_URL
    response = requests.get(url, params={
        'apikey': API_KEY,
        's': query,
        'type': omdb_type,
        'page': page
    })
    
    if response.status_code == 200 and response.json().get('Response') == 'True':
        omdb_data = response.json()
        
        # Format to match TMDB structure
        results = []
        search_items = omdb_data.get('Search', [])
        
        # Use parallel processing to get detailed info for each result
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            # Create a list of futures for parallel execution
            future_to_item = {
                executor.submit(get_omdb_detail_parallel, item): item 
                for item in search_items
            }
            
            # Process results as they complete
            for future in concurrent.futures.as_completed(future_to_item):
                item = future_to_item[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                except Exception as e:
                    print(f"Error processing OMDB item: {e}")
        
        return {
            'page': int(page),
            'results': results,
            'total_results': int(omdb_data.get('totalResults', 0)),
            'total_pages': (int(omdb_data.get('totalResults', 0)) + 9) // 10  # OMDB returns 10 results per page
        }
    else:
        # Return empty results structure if no results
        return {
            'page': int(page),
            'results': [],
            'total_results': 0,
            'total_pages': 0
        }

def get_omdb_detail_parallel(item):
    """Process an OMDB search result item with detailed information"""
    result = {
        'id': item.get('imdbID', ''),
        'title' if item.get('Type', '') == 'movie' else 'name': item.get('Title', ''),
        'poster_path': None,
        'backdrop_path': None,
        'vote_average': 0,
        'vote_count': 0,
        'overview': '',
        'release_date' if item.get('Type', '') == 'movie' else 'first_air_date': item.get('Year', ''),
        'imdb_id': item.get('imdbID', ''),
        'poster_url': item.get('Poster', 'N/A')
    }
    
    # Try to get more details including ratings
    detail = get_omdb_data_by_id(item.get('imdbID', ''))
    if detail and detail.get('Response') == 'True':
        result['imdb_rating'] = detail.get('imdbRating', 'N/A')
        result['imdb_votes'] = detail.get('imdbVotes', 'N/A')
        result['overview'] = detail.get('Plot', '')
        
        # Try to convert IMDb rating to numeric for consistency with TMDB
        try:
            if detail.get('imdbRating', 'N/A') != 'N/A':
                result['vote_average'] = float(detail.get('imdbRating', '0'))
        except:
            pass
        
        # Try to convert IMDb votes to numeric
        try:
            if detail.get('imdbVotes', 'N/A') != 'N/A':
                result['vote_count'] = int(detail.get('imdbVotes', '0').replace(',', ''))
        except:
            pass
    
    return result

@app.route('/api/top_rated', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)  # Cache for 1 hour
def top_rated():
    API_KEY = random.choice(TMBD_KEYS)
    media_type = request.args.get('type', 'movie')
    page = request.args.get('page', '1')
    
    url = f"{TMDB_BASE_URL}/{media_type}/top_rated"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        data = response.json()
        
        # Use parallel processing to enrich results with OMDB data
        enriched_results = parallel_enrich_results(data['results'], media_type)
        data['results'] = enriched_results
        
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch top rated"}), 500

@app.route('/api/detail', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)  # Cache for 1 hour
def get_detail():
    # Hybrid approach: Get detailed info from TMDB, then enhance with OMDB data
    API_KEY_TMDB = random.choice(TMBD_KEYS)
    media_id = request.args.get('id')
    media_type = request.args.get('type', 'movie')
    
    if not media_id:
        return jsonify({"error": "No ID provided"}), 400
    
    # Validate media type
    if media_type not in ['movie', 'tv']:
        media_type = 'movie'
    
    # First, get data from TMDB
    url = f"{TMDB_BASE_URL}/{media_type}/{media_id}"
    response = requests.get(url, params={
        'api_key': API_KEY_TMDB,
        'language': 'en-US',
        'append_to_response': 'videos,credits'  # This includes both videos and cast information
    })
    
    if response.status_code == 200:
        tmdb_data = response.json()
        
        # Execute TMDB and OMDB requests in parallel
        title = tmdb_data.get('title' if media_type == 'movie' else 'name', '')
        year = ''
        
        if media_type == 'movie' and tmdb_data.get('release_date'):
            year = tmdb_data['release_date'][:4]
        elif media_type == 'tv' and tmdb_data.get('first_air_date'):
            year = tmdb_data['first_air_date'][:4]
        
        imdb_id = tmdb_data.get('imdb_id', '')
        
        # Run OMDB lookup in parallel with the rest of the processing
        omdb_data = None
        if imdb_id:
            # Try by ID first
            omdb_future = executor.submit(get_omdb_data_by_id, imdb_id)
        else:
            # Try by title and year
            omdb_future = executor.submit(get_omdb_data_by_title_year, title, year)
        
        # While OMDB data is being fetched, continue processing TMDB data
        # Additional TMDB processing could go here
        
        # Get OMDB data result from the future
        try:
            omdb_data = omdb_future.result()
            if not omdb_data or omdb_data.get('Response') != 'True':
                # If first attempt failed and we tried by ID, try by title
                if imdb_id:
                    omdb_data = get_omdb_data_by_title_year(title, year)
        except Exception as e:
            print(f"Error fetching OMDB data: {e}")
            omdb_data = None
        
        # Enhance TMDB data with OMDB data
        if omdb_data and omdb_data.get('Response') == 'True':
            tmdb_data['imdb_rating'] = omdb_data.get('imdbRating', 'N/A')
            tmdb_data['imdb_votes'] = omdb_data.get('imdbVotes', 'N/A')
            tmdb_data['imdb_id'] = omdb_data.get('imdbID', tmdb_data.get('imdb_id', ''))
            tmdb_data['metascore'] = omdb_data.get('Metascore', 'N/A')
            tmdb_data['rated'] = omdb_data.get('Rated', 'N/A')
            tmdb_data['awards'] = omdb_data.get('Awards', 'N/A')
            tmdb_data['director'] = omdb_data.get('Director', 'N/A')
            tmdb_data['writer'] = omdb_data.get('Writer', 'N/A')
            tmdb_data['production'] = omdb_data.get('Production', 'N/A')
            tmdb_data['website'] = omdb_data.get('Website', 'N/A')
            
            # Use more detailed OMDB plot if available
            if 'Plot' in omdb_data and omdb_data['Plot'] and len(omdb_data['Plot']) > len(tmdb_data.get('overview', '')):
                tmdb_data['omdb_plot'] = omdb_data['Plot']
            
            # Add OMDB ratings (Rotten Tomatoes, etc.)
            if 'Ratings' in omdb_data:
                tmdb_data['omdb_ratings'] = omdb_data['Ratings']
        
        return jsonify(tmdb_data)
    else:
        # If TMDB fails, try direct OMDB (will only work for movies with IMDb IDs)
        try:
            if media_id.startswith('tt'):  # This is an IMDb ID
                omdb_data = get_omdb_data_by_id(media_id)
                if omdb_data and omdb_data.get('Response') == 'True':
                    # Format OMDB data to match expected structure
                    formatted_data = format_omdb_to_tmdb(omdb_data, media_type)
                    return jsonify(formatted_data)
            
            return jsonify({"error": f"Failed to fetch details. Status: {response.status_code}"}), 500
        except Exception as e:
            return jsonify({"error": f"Failed to fetch details. Status: {response.status_code}. OMDB fallback failed: {str(e)}"}), 500

def format_omdb_to_tmdb(omdb_data, media_type):
    """Convert OMDB data format to match TMDB format for consistency"""
    formatted = {
        'id': omdb_data.get('imdbID', ''),
        'imdb_id': omdb_data.get('imdbID', ''),
        'title' if media_type == 'movie' else 'name': omdb_data.get('Title', ''),
        'overview': omdb_data.get('Plot', ''),
        'release_date' if media_type == 'movie' else 'first_air_date': omdb_data.get('Year', ''),
        'poster_path': None,
        'backdrop_path': None,
        'poster_url': omdb_data.get('Poster', 'N/A'),
        'runtime': omdb_data.get('Runtime', 'N/A'),
        'genres': [],
        'imdb_rating': omdb_data.get('imdbRating', 'N/A'),
        'imdb_votes': omdb_data.get('imdbVotes', 'N/A'),
        'rated': omdb_data.get('Rated', 'N/A'),
        'director': omdb_data.get('Director', 'N/A'),
        'writer': omdb_data.get('Writer', 'N/A'),
        'actors': omdb_data.get('Actors', 'N/A'),
        'language': omdb_data.get('Language', 'N/A'),
        'country': omdb_data.get('Country', 'N/A'),
        'awards': omdb_data.get('Awards', 'N/A'),
        'metascore': omdb_data.get('Metascore', 'N/A'),
        'production': omdb_data.get('Production', 'N/A'),
        'website': omdb_data.get('Website', 'N/A'),
        'type': omdb_data.get('Type', media_type),
    }
    
    # Convert IMDb rating to vote_average format
    try:
        if omdb_data.get('imdbRating', 'N/A') != 'N/A':
            formatted['vote_average'] = float(omdb_data.get('imdbRating', '0'))
    except:
        formatted['vote_average'] = 0
    
    # Convert IMDb votes to vote_count format
    try:
        if omdb_data.get('imdbVotes', 'N/A') != 'N/A':
            formatted['vote_count'] = int(omdb_data.get('imdbVotes', '0').replace(',', ''))
    except:
        formatted['vote_count'] = 0
    
    # Try to parse genre string into TMDB format
    if 'Genre' in omdb_data:
        genre_list = omdb_data['Genre'].split(', ')
        formatted['genres'] = [{'id': 0, 'name': genre} for genre in genre_list]
    
    # Add OMDB ratings (Rotten Tomatoes, etc.)
    if 'Ratings' in omdb_data:
        formatted['omdb_ratings'] = omdb_data['Ratings']
    
    # Add empty credits and videos arrays to match TMDB format
    formatted['credits'] = {'cast': [], 'crew': []}
    formatted['videos'] = {'results': []}
    
    # Try to parse actors into cast format
    if 'Actors' in omdb_data:
        actor_list = omdb_data['Actors'].split(', ')
        formatted['credits']['cast'] = [
            {
                'id': i,
                'name': actor,
                'character': '',
                'profile_path': None
            } for i, actor in enumerate(actor_list)
        ]
    
    return formatted

@app.route('/api/collection', methods=['GET'])
@cache.cached(timeout=86400, query_string=True)  # Cache for 1 day
def get_collection():
    API_KEY = random.choice(TMBD_KEYS)
    collection_id = request.args.get('id')
    
    if not collection_id:
        return jsonify({"error": "No collection ID provided"}), 400
    
    url = f"{TMDB_BASE_URL}/collection/{collection_id}"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US'
    })
    
    if response.status_code == 200:
        collection_data = response.json()
        if 'parts' in collection_data:
            # Process collection parts in parallel
            if len(collection_data['parts']) > 0:
                with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                    # Map each movie to its future
                    future_to_movie = {
                        executor.submit(enrich_movie_with_omdb, movie): movie 
                        for movie in collection_data['parts']
                    }
                    
                    # Replace each movie with its enriched version
                    for future in concurrent.futures.as_completed(future_to_movie):
                        movie = future_to_movie[future]
                        try:
                            enriched_movie = future.result()
                            # Replace original movie with enriched one in the collection
                            for i, part in enumerate(collection_data['parts']):
                                if part['id'] == movie['id']:
                                    collection_data['parts'][i] = enriched_movie
                                    break
                        except Exception as e:
                            print(f"Error enriching collection movie: {e}")
        
        return jsonify(collection_data)
    else:
        return jsonify({"error": f"Failed to fetch collection. Status: {response.status_code}"}), 500

def enrich_movie_with_omdb(movie):
    """Helper function to enrich a movie with OMDB data in parallel"""
    title = movie.get('title', '')
    year = ''
    
    if movie.get('release_date'):
        year = movie['release_date'][:4]
    
    # Try to get OMDB data
    omdb_data = get_omdb_data_by_title_year(title, year)
    if omdb_data and omdb_data.get('Response') == 'True':
        movie['imdb_rating'] = omdb_data.get('imdbRating', 'N/A')
        movie['imdb_votes'] = omdb_data.get('imdbVotes', 'N/A')
        movie['imdb_id'] = omdb_data.get('imdbID', '')
    
    return movie

@app.route('/api/popular', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)  # Cache for 1 hour
def popular():
    API_KEY = random.choice(TMBD_KEYS)
    media_type = request.args.get('type', 'movie')
    page = request.args.get('page', '1')
    
    url = f"{TMDB_BASE_URL}/{media_type}/popular"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        data = response.json()
        
        # Use parallel processing to enrich results with OMDB data
        enriched_results = parallel_enrich_results(data['results'], media_type)
        data['results'] = enriched_results
        
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch popular"}), 500

@app.route('/api/tv/<id>/season/<season_number>', methods=['GET'])
@cache.cached(timeout=86400, query_string=True)  # Cache for 1 day
def get_tv_season(id, season_number):
    API_KEY = random.choice(TMBD_KEYS)
    if not id or not season_number:
        return jsonify({"error": "Missing TV show ID or season number"}), 400
    
    url = f"{TMDB_BASE_URL}/tv/{id}/season/{season_number}"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'append_to_response': 'credits'
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": f"Failed to fetch season details. Status: {response.status_code}"}), 500
    
@app.route('/api/new', methods=['GET'])
@cache.cached(timeout=3600, query_string=True)  # Cache for 1 hour
def new_releases():
    API_KEY = random.choice(TMBD_KEYS)
    media_type = request.args.get('type', 'movie')
    page = request.args.get('page', '1')
    
    endpoint = 'now_playing' if media_type == 'movie' else 'on_the_air'
    
    url = f"{TMDB_BASE_URL}/{media_type}/{endpoint}"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        data = response.json()
        
        # Use parallel processing to enrich results with OMDB data
        enriched_results = parallel_enrich_results(data['results'], media_type)
        data['results'] = enriched_results
        
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch new releases"}), 500
    
@app.route('/api/omdb', methods=['GET'])
@cache.cached(timeout=86400, query_string=True)  # Cache for 1 day
def get_omdb_data():
    API_KEY = random.choice(OMDB_KEYS)
    title = request.args.get('title', '')
    year = request.args.get('year', '')
    imdb_id = request.args.get('imdbID', '')
    
    if not title and not imdb_id:
        return jsonify({"error": "No title or IMDb ID provided"}), 400
    
    url = OMDB_BASE_URL
    
    params = {
        'apikey': API_KEY
    }
    
    # Prioritize IMDb ID if provided
    if imdb_id:
        params['i'] = imdb_id
    else:
        params['t'] = title
        # Add year parameter if provided
        if year:
            params['y'] = year
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": f"Failed to fetch OMDB data. Status: {response.status_code}"}), 500

# Cache OMDB results (memory cache)
@lru_cache(maxsize=1000)
def get_omdb_data_by_title_year(title, year=''):
    """Helper function to get OMDB data by title and year with caching"""
    if not title:
        return None
    
    # Generate cache key for storage
    cache_key = f"{title}_{year}"
    
    # Check if we have this in our cache
    cached_result = cache.get(cache_key)
    if cached_result:
        return cached_result
    
    # Clean title for better matching (remove special characters, etc.)
    clean_title = re.sub(r'[^\w\s]', '', title).strip()
    
    API_KEY = random.choice(OMDB_KEYS)
    url = OMDB_BASE_URL
    
    params = {
        'apikey': API_KEY,
        't': clean_title
    }
    
    # Add year parameter if provided
    if year:
        params['y'] = year
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            result = response.json()
            # Store in cache
            cache.set(cache_key, result, timeout=86400)  # Cache for 1 day
            return result
    except Exception as e:
        print(f"Error fetching OMDB data by title/year: {e}")
    
    return None

# Cache OMDB results by ID (memory cache)
@lru_cache(maxsize=1000)
def get_omdb_data_by_id(imdb_id):
    """Helper function to get OMDB data by IMDb ID with caching"""
    if not imdb_id:
        return None
    
    # Generate cache key
    cache_key = f"imdb_{imdb_id}"
    
    # Check if we have this in our cache
    cached_result = cache.get(cache_key)
    if cached_result:
        return cached_result
    
    API_KEY = random.choice(OMDB_KEYS)
    url = OMDB_BASE_URL
    
    params = {
        'apikey': API_KEY,
        'i': imdb_id
    }
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            result = response.json()
            # Store in cache
            cache.set(cache_key, result, timeout=86400)  # Cache for 1 day
            return result
    except Exception as e:
        print(f"Error fetching OMDB data by ID: {e}")
    
    return None

def parallel_enrich_results(items, media_type):
    """Process a list of items in parallel to enrich with OMDB data"""
    if not items:
        return []
    
    # Create a list to store the futures
    futures = []
    
    # Submit all tasks to the thread pool
    for item in items:
        title = item.get('title' if media_type == 'movie' else 'name', '')
        year = ''
        
        # Extract year from release date or first air date
        if media_type == 'movie' and item.get('release_date'):
            year = item['release_date'][:4]
        elif media_type == 'tv' and item.get('first_air_date'):
            year = item['first_air_date'][:4]
        
        # Submit the task to the thread pool
        future = executor.submit(enrich_item_with_omdb, item, title, year)
        futures.append((future, item))
    
    # Process results as they complete
    enriched_results = []
    for future, original_item in futures:
        try:
            enriched_item = future.result()
            enriched_results.append(enriched_item)
        except Exception as e:
            print(f"Error enriching item: {e}")
            enriched_results.append(original_item)  # Use original item if enrichment fails
    
    return enriched_results

def enrich_item_with_omdb(item, title, year):
    """Helper function to enrich a single item with OMDB data"""
    # Try to get OMDB data
    omdb_data = get_omdb_data_by_title_year(title, year)
    if omdb_data and omdb_data.get('Response') == 'True':
        # Add IMDb rating and votes to the item
        item['imdb_rating'] = omdb_data.get('imdbRating', 'N/A')
        item['imdb_votes'] = omdb_data.get('imdbVotes', 'N/A')
        item['imdb_id'] = omdb_data.get('imdbID', '')
    
    return item

# Performance monitoring middleware
@app.before_request
def start_timer():
    request.start_time = time.time()

@app.after_request
def log_request(response):
    if hasattr(request, 'start_time'):
        request_time = time.time() - request.start_time
        app.logger.info(f"Request to {request.path} took {request_time:.2f}s")
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)