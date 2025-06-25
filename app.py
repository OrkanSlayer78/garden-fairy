import os
from flask import Flask, jsonify, send_from_directory, send_file
from flask_login import LoginManager
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import models and routes
from models import db, User
from auth import auth_bp
from routes.plants import plants_bp
from routes.garden import garden_bp
from routes.calendar import calendar_bp
from routes.garden_layout import garden_layout_bp
from routes.ai_features import ai_bp

def create_app():
    # Configure Flask to serve static files from current directory
    app = Flask(__name__, static_folder='.', static_url_path='')
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Session configuration for production
    app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    
    # Database configuration (supports both SQLite and PostgreSQL)
    database_url = os.getenv('DATABASE_URL', 'sqlite:///garden_fairy.db')
    print(f"DATABASE_URL from environment: {database_url}")
    
    if database_url and database_url.startswith('postgres://'):
        # Fix for newer SQLAlchemy versions
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print(f"Final database URI: {database_url[:50]}...")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup CORS - Allow production domain
    allowed_origins = [
        'http://localhost:3000',  # Development
        'http://localhost:5000',  # Development
        'https://garden-fairy-production.up.railway.app',  # Production1
        os.getenv('FRONTEND_URL', '')  # Custom domain if set
    ]
    # Filter out empty strings
    allowed_origins = [origin for origin in allowed_origins if origin]
    
    CORS(app, 
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Setup Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    # Don't set login_view since this is a SPA with Google OAuth only
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    @login_manager.unauthorized_handler
    def unauthorized():
        # Return JSON error instead of redirecting to login page
        return jsonify({'error': 'Authentication required', 'authenticated': False}), 401
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(plants_bp)
    app.register_blueprint(garden_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(garden_layout_bp)
    app.register_blueprint(ai_bp)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'garden-fairy-backend'})
    
    # Test SPA routing endpoint
    @app.route('/test-spa')
    def test_spa():
        return jsonify({
            'message': 'SPA routing is working!',
            'note': 'If you can see this, the backend is serving React routes correctly'
        })
    
    # Database initialization endpoint (for production setup)
    @app.route('/init-db')
    def init_database():
        try:
            # Create all tables
            db.create_all()
            
            # Initialize sample data
            init_sample_data(app)
            
            return jsonify({
                'status': 'success', 
                'message': 'Database initialized with sample data',
                'database_url': app.config['SQLALCHEMY_DATABASE_URI'][:50] + '...'  # Don't expose full URL
            })
        except Exception as e:
            return jsonify({
                'status': 'error', 
                'message': f'Database initialization failed: {str(e)}'
            }), 500
    
    # API info endpoint
    @app.route('/api')
    def api_info():
        return jsonify({
            'message': 'Garden Fairy API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/auth/*',
                'plants': '/api/plants',
                'garden': '/api/garden',
                'calendar': '/api/calendar',
                'ai': '/api/ai/*'
            }
        })
    
    # Serve static files first (higher priority than catch-all)
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        try:
            # First try the nested static structure (React build creates static/static/)
            response = send_from_directory('static/static', filename)
        except:
            # Fallback to regular static directory
            response = send_from_directory('static', filename)
        
        # Force Railway to refresh cached files - especially important for JS/CSS
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['X-Force-Refresh'] = 'FRESH_CLEAN_BUILD_202506240'
        return response
    
    # Serve main React app files
    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory('.', 'favicon.ico')
    
    @app.route('/manifest.json')
    def manifest():
        return send_from_directory('.', 'manifest.json')
    
    @app.route('/asset-manifest.json')
    def asset_manifest():
        return send_from_directory('.', 'asset-manifest.json')
    
    # Emergency route to bypass index.html caching
    @app.route('/fresh')
    def fresh_app():
        response = send_file('static/index_new.html')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['X-Fresh-Load'] = 'TRUE'
        return response
    
    # Explicit React Router routes for better SPA support
    @app.route('/dashboard')
    @app.route('/plants')  
    @app.route('/garden')
    @app.route('/calendar')
    @app.route('/login')
    @app.route('/settings')
    def react_routes():
        """Explicit routes for React Router paths to ensure proper SPA navigation"""
        response = send_file('static/index_new.html')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    
    # React Router catch-all - MUST BE LAST!
    # This handles all client-side routes for the SPA
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        # API routes should be handled by blueprints above
        if path.startswith('api/') or path.startswith('auth/') or path in ['health', 'init-db', 'fresh']:
            return jsonify({'error': 'API endpoint not found'}), 404
        
        # Static files with extensions - try to serve them
        if '.' in path:
            try:
                # Try to serve from root directory first
                return send_from_directory('.', path)
            except Exception:
                try:
                    # Try to serve from static directory
                    return send_from_directory('static', path)
                except Exception:
                    return jsonify({'error': 'File not found'}), 404
        
        # ALL React Router paths (/, /dashboard, /plants, /garden, etc.)
        # Always serve the React app for client-side routing
        response = send_file('static/index_new.html')
        # SPA-specific headers for proper navigation
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['X-Force-Refresh'] = 'FRESH_CLEAN_BUILD_202506240'
        return response
    
    return app

def init_sample_data(app):
    """Initialize sample plant types for development and production"""
    with app.app_context():
        from models import PlantType
        
        # Check if sample data already exists
        if PlantType.query.count() > 0:
            print("Sample data already exists, skipping initialization.")
            return
        
        sample_plants = [
            {
                'name': 'Tomato',
                'scientific_name': 'Solanum lycopersicum',
                'category': 'vegetable',
                'planting_season': 'spring',
                'days_to_harvest': 80,
                'spacing_inches': 24,
                'sun_requirement': 'full',
                'water_requirement': 'medium',
                'description': 'Popular garden vegetable with red, juicy fruits.',
                'care_instructions': 'Plant after last frost. Provide support with stakes or cages. Water regularly but avoid wetting leaves.'
            },
            {
                'name': 'Basil',
                'scientific_name': 'Ocimum basilicum',
                'category': 'herb',
                'planting_season': 'spring',
                'days_to_harvest': 60,
                'spacing_inches': 12,
                'sun_requirement': 'full',
                'water_requirement': 'medium',
                'description': 'Aromatic herb perfect for cooking and companion planting.',
                'care_instructions': 'Pinch flowers to encourage leaf growth. Harvest regularly for best flavor.'
            },
            {
                'name': 'Lettuce',
                'scientific_name': 'Lactuca sativa',
                'category': 'vegetable',
                'planting_season': 'spring',
                'days_to_harvest': 45,
                'spacing_inches': 8,
                'sun_requirement': 'partial',
                'water_requirement': 'high',
                'description': 'Cool-season leafy green vegetable.',
                'care_instructions': 'Keep soil consistently moist. Harvest outer leaves first for continuous production.'
            },
            {
                'name': 'Marigold',
                'scientific_name': 'Tagetes',
                'category': 'flower',
                'planting_season': 'spring',
                'days_to_harvest': 50,
                'spacing_inches': 6,
                'sun_requirement': 'full',
                'water_requirement': 'low',
                'description': 'Bright flowers that repel garden pests.',
                'care_instructions': 'Deadhead spent flowers for continuous blooming. Very low maintenance.'
            },
            {
                'name': 'Carrot',
                'scientific_name': 'Daucus carota',
                'category': 'vegetable',
                'planting_season': 'spring',
                'days_to_harvest': 70,
                'spacing_inches': 2,
                'sun_requirement': 'full',
                'water_requirement': 'medium',
                'description': 'Root vegetable with sweet, crunchy orange roots.',
                'care_instructions': 'Plant in loose, well-draining soil. Thin seedlings to prevent crowding.'
            }
        ]
        
        for plant_data in sample_plants:
            plant = PlantType(**plant_data)
            db.session.add(plant)
        
        db.session.commit()
        print("Sample plant data initialized!")

if __name__ == '__main__':
    app = create_app()
    
    # Production settings
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    
    # Create database tables
    with app.app_context():
        db.create_all()
        # Only initialize sample data in development
        if debug:
            init_sample_data(app)
    
    # Run the application
    app.run(debug=debug, host='0.0.0.0', port=port) 