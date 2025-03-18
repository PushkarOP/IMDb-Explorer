# IMDb Explorer

![IMDb Explorer Logo](/static/img/icon.png)

A web application for discovering and exploring movies and TV shows using the TMDB API.

**Live Demo:** [https://imdb-explorer.onrender.com/](https://imdb-explorer.onrender.com/)

## Features

- 🎬 Browse and search movies and TV shows
- 🔍 Advanced filtering by genre, year, rating, and vote count
- 🔥 Sort by popularity or top-rated
- 📊 Detailed view with cast information, ratings, and trailers
- 📱 Responsive design for mobile and desktop
- 🔖 Create and manage your personal watchlist

## Screenshot

![IMDb Explorer Screenshot](/static/img/screenshot.png)

## Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** HTML, CSS, JavaScript
- **API:** The Movie Database (TMDB) API
- **Hosting:** Render

## Self-Hosting Guide

### Prerequisites

- Python 3.7+
- TMDB API key (get one from [themoviedb.org](https://www.themoviedb.org/settings/api))

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/PushkarOP/IMDb-Explorer.git
   cd IMDb-Explorer
   ```

2. Create a virtual environment
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the root directory with your TMDB API key
   ```
   API_KEY=your_tmdb_api_key
   ```

### Running the Application

```bash
python app.py
```

The application will be available at [http://localhost:5000](http://localhost:5000)

### Deployment

This application can be deployed to platforms like Render, Heroku, or any other hosting service that supports Flask applications.

#### Deploying to Render

1. Fork this repository to your GitHub account
2. Sign up or log in to [Render](https://render.com)
3. Create a new Web Service and connect your GitHub repository
4. Configure the build and start command:
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
5. Add your TMDB API key as an environment variable named `API_KEY`
6. Deploy your application

## API Endpoints

- `/api/genres` - Get genre list for movies or TV shows
- `/api/discover` - Discover movies or TV shows with various filters
- `/api/search` - Search for movies or TV shows
- `/api/top_rated` - Get top-rated movies or TV shows
- `/api/detail` - Get detailed information about a specific movie or TV show
- `/api/popular` - Get popular movies or TV shows

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the API
- [Font Awesome](https://fontawesome.com/) for the icons
- [Notyf](https://github.com/caroso1222/notyf) for toast notifications

## Author

Created with ❤️ by [PushkarOP](https://github.com/PushkarOP)

---

If you find this project useful, please consider giving it a star on [GitHub](https://github.com/PushkarOP/IMDb-Explorer)!