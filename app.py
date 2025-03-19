from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get API key from environment variables
API_KEY = os.environ.get('API_KEY', "afdedf165ae83c0b4bab280a28d5902c")
BASE_URL = "https://api.themoviedb.org/3"  # Using TMDB API as it's more accessible than IMDb API

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/genres', methods=['GET'])
def get_genres():
    media_type = request.args.get('type', 'movie')  # Default to movie
    url = f"{BASE_URL}/genre/{media_type}/list"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US'
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch genres"}), 500

@app.route('/api/discover', methods=['GET'])
def discover():
    media_type = request.args.get('type', 'movie')  # Default to movie
    genre = request.args.get('genre', '')
    rating = request.args.get('rating', '0')
    vote_count = request.args.get('vote_count', '0')  # Added vote count parameter
    sort_by = request.args.get('sort_by', 'popularity.desc')  # Default to popular
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
        'vote_average.gte': float(rating),  # Convert to float for correct comparison
        'include_adult': 'false'
    }
    
    # Add vote count parameter if specified
    if vote_count and int(vote_count) > 0:
        params['vote_count.gte'] = int(vote_count)
    
    # Handle year filter - different param names for movies vs TV shows
    year = request.args.get('primary_release_year' if media_type == 'movie' else 'first_air_date_year', '')
    if year and year != '1900':
        if media_type == 'movie':
            # Change from exact year to minimum year (year and newer)
            params['primary_release_date.gte'] = f"{year}-01-01"
        else:
            # Change from exact year to minimum year (year and newer)
            params['first_air_date.gte'] = f"{year}-01-01"
    
    if genre:
        params['with_genres'] = genre
    
    url = f"{BASE_URL}/discover/{media_type}"
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        # Additional filtering to ensure rating threshold is met
        data = response.json()
        if float(rating) > 0:
            # Double-check the results to filter out any items below the threshold
            data['results'] = [item for item in data['results'] if item.get('vote_average', 0) >= float(rating)]
        return jsonify(data)
    else:
        return jsonify({"error": "Failed to fetch data"}), 500

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query', '')
    media_type = request.args.get('type', 'movie')  # Default to movie
    page = request.args.get('page', '1')
    
    if not query:
        return jsonify({"error": "No search query provided"}), 400
    
    url = f"{BASE_URL}/search/{media_type}"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'query': query,
        'page': page,
        'include_adult': 'false'
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": f"Failed to search. Status: {response.status_code}"}), 500

@app.route('/api/top_rated', methods=['GET'])
def top_rated():
    media_type = request.args.get('type', 'movie')  # Default to movie
    page = request.args.get('page', '1')
    
    url = f"{BASE_URL}/{media_type}/top_rated"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch top rated"}), 500

@app.route('/api/detail', methods=['GET'])
def get_detail():
    media_id = request.args.get('id')
    media_type = request.args.get('type', 'movie')  # Default to movie
    
    if not media_id:
        return jsonify({"error": "No ID provided"}), 400
    
    # Validate media type
    if media_type not in ['movie', 'tv']:
        media_type = 'movie'
    
    url = f"{BASE_URL}/{media_type}/{media_id}"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'append_to_response': 'videos,credits'  # This includes both videos and cast information
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": f"Failed to fetch details. Status: {response.status_code}"}), 500

@app.route('/api/collection', methods=['GET'])
def get_collection():
    collection_id = request.args.get('id')
    
    if not collection_id:
        return jsonify({"error": "No collection ID provided"}), 400
    
    url = f"{BASE_URL}/collection/{collection_id}"
    
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US'
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": f"Failed to fetch collection. Status: {response.status_code}"}), 500

@app.route('/api/popular', methods=['GET'])
def popular():
    media_type = request.args.get('type', 'movie')  # Default to movie
    page = request.args.get('page', '1')
    
    url = f"{BASE_URL}/{media_type}/popular"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch popular"}), 500

@app.route('/api/new', methods=['GET'])
def new_releases():
    media_type = request.args.get('type', 'movie')  # Default to movie
    page = request.args.get('page', '1')
    
    # For movies, we can use the "now_playing" endpoint
    # For TV shows, we can use the "on_the_air" endpoint
    endpoint = 'now_playing' if media_type == 'movie' else 'on_the_air'
    
    url = f"{BASE_URL}/{media_type}/{endpoint}"
    response = requests.get(url, params={
        'api_key': API_KEY,
        'language': 'en-US',
        'page': page
    })
    
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch new releases"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)