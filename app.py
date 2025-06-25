import os
from flask import Flask, jsonify
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
    # Configure Flask to serve React build files
    app = Flask(__name__, static_folder='.', static_url_path='')
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database configuration (supports both SQLite and PostgreSQL)
    database_url = os.getenv('DATABASE_URL', 'sqlite:///garden_fairy.db')
    if database_url and database_url.startswith('postgres://'):
        # Fix for newer SQLAlchemy versions
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup CORS - Allow frontend domains
    allowed_origins = [
        'http://localhost:3000', 
        'http://localhost:5000',
        os.getenv('FRONTEND_URL', '')  # Add your frontend URL here
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
    
    # Configuration endpoint for frontend
    @app.route('/api/config')
    def get_config():
        return jsonify({
            'googleClientId': app.config.get('GOOGLE_CLIENT_ID'),
            'environment': os.getenv('FLASK_ENV', 'production')
        })
    
    # React Router catch-all - serves React app for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        # API routes should be handled by blueprints above
        if path.startswith('api/') or path.startswith('auth/') or path == 'health':
            return jsonify({'error': 'API endpoint not found'}), 404
        
        # Serve React app for all other routes (/, /dashboard, /plants, etc.)
        return app.send_static_file('index.html')
    
    return app

def init_sample_data(app):
    """Initialize sample plant types for development"""
    with app.app_context():
        from models import PlantType
        
        # Check if sample data already exists
        if PlantType.query.count() > 0:
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

# Create app instance at module level for gunicorn
app = create_app()

if __name__ == '__main__':
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