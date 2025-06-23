# Garden Fairy - Garden Planning & Management App

A modern web application that helps users plan and manage their gardens using Google OAuth authentication.

## Features

- 🌱 **Garden Planning**: Plan your garden layout and track plant locations
- 📅 **Planting Calendar**: Track planting schedules and harvest times
- 🌿 **Plant Database**: Browse and search plant information
- 📊 **Garden Analytics**: View garden statistics and growth tracking
- 🔐 **Secure Authentication**: Google OAuth integration
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
garden-fairy/
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── auth.py             # OAuth authentication
│   ├── routes/             # API routes
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/                # React source code
│   ├── public/             # Static files
│   └── package.json        # Node.js dependencies
└── README.md              # This file
```

## Setup Instructions

### Backend Setup (Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your Google OAuth credentials
   - Set database configuration

6. Initialize the database:
   ```bash
   python -c "from app import app, db; app.app_context().push(); db.create_all()"
   ```

7. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup (React)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Set the backend API URL

4. Start the development server:
   ```bash
   npm start
   ```

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000` (for React frontend)
   - `http://localhost:5000/auth/callback` (for Flask backend)
6. Copy the Client ID and Client Secret to your environment files

## API Endpoints

- `GET /api/plants` - Get all plants
- `POST /api/plants` - Add a new plant
- `GET /api/garden` - Get garden layout
- `POST /api/garden` - Update garden layout
- `GET /api/calendar` - Get planting calendar
- `POST /api/calendar` - Add calendar event

## Technologies Used

### Backend
- Flask (Python web framework)
- SQLAlchemy (Database ORM)
- Flask-Login (Session management)
- Google OAuth2 (Authentication)
- SQLite (Database)

### Frontend
- React (JavaScript library)
- Material-UI (UI components)
- Axios (HTTP client)
- React Router (Navigation)
- Google OAuth2 (Authentication)

## License

MIT License 