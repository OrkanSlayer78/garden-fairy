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

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///garden_fairy.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET')
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup CORS
    CORS(app, 
         origins=['http://localhost:3000', 'http://localhost:5000'],
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
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'garden-fairy-backend'})
    
    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            'message': 'Garden Fairy API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/auth/*',
                'plants': '/api/plants',
                'garden': '/api/garden',
                'calendar': '/api/calendar'
            }
        })
    
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

if __name__ == '__main__':
    app = create_app()
    
    # Create database tables
    with app.app_context():
        db.create_all()
        init_sample_data(app)
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000) 