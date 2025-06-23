from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from models import db, Plant, PlantType, GardenLocation, PlantJournal, PlantPlacement
from services.ai_plant_analysis import ai_plant_service

ai_bp = Blueprint('ai', __name__)

# Configure upload settings
UPLOAD_FOLDER = 'uploads/plant_photos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_dir():
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

@ai_bp.route('/api/ai/identify-plant', methods=['POST'])
@login_required
def identify_plant():
    """Identify plant species from uploaded photo"""
    ensure_upload_dir()
    
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Save uploaded file
        filename = secure_filename(f"{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Identify plant using AI service
            result = ai_plant_service.identify_plant_species(filepath)
            
            # Clean up uploaded file (optional - you might want to keep for records)
            # os.remove(filepath)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'identification': result,
                    'suggested_plants': _find_matching_plant_types(result)
                })
            else:
                return jsonify({'error': result.get('error', 'Identification failed')}), 500
                
        except Exception as e:
            current_app.logger.error(f"Plant identification error: {e}")
            return jsonify({'error': 'Processing failed'}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

@ai_bp.route('/api/ai/analyze-plant-health', methods=['POST'])
@login_required
def analyze_plant_health():
    """Analyze plant health from photo"""
    ensure_upload_dir()
    
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo uploaded'}), 400
    
    file = request.files['photo']
    plant_id = request.form.get('plant_id')
    placement_id = request.form.get('placement_id')
    
    if not plant_id:
        return jsonify({'error': 'Plant ID required'}), 400
    
    # Get plant information
    plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404
    
    if file and allowed_file(file.filename):
        # Save uploaded file
        filename = secure_filename(f"health_{current_user.id}_{plant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Prepare plant info for analysis
            plant_info = {
                'name': plant.plant_type.name if plant.plant_type else 'Unknown',
                'scientific_name': plant.plant_type.scientific_name if plant.plant_type else '',
                'planted_date': plant.planted_date.isoformat() if plant.planted_date else None,
                'status': plant.status
            }
            
            # Analyze plant health
            result = ai_plant_service.analyze_plant_health(filepath, plant_info)
            
            if result['success']:
                # Save analysis to plant journal
                journal_entry = PlantJournal(
                    user_id=current_user.id,
                    plant_id=plant_id,
                    placement_id=placement_id,
                    entry_date=datetime.now().date(),
                    entry_type='ai_health_analysis',
                    title='AI Health Analysis',
                    content=result['analysis'],
                    photos=[filepath]  # Store photo path
                )
                db.session.add(journal_entry)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'analysis': result,
                    'journal_entry_id': journal_entry.id
                })
            else:
                return jsonify({'error': result.get('error', 'Analysis failed')}), 500
                
        except Exception as e:
            current_app.logger.error(f"Plant health analysis error: {e}")
            return jsonify({'error': 'Processing failed'}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

@ai_bp.route('/api/ai/garden-recommendations', methods=['POST'])
@login_required
def get_garden_recommendations():
    """Get AI-powered garden planning recommendations"""
    data = request.get_json()
    prompt = data.get('prompt')
    
    if not prompt:
        return jsonify({'error': 'Prompt required'}), 400
    
    try:
        # Get user's garden location for context
        location = GardenLocation.query.filter_by(user_id=current_user.id).first()
        location_data = location.to_dict() if location else {
            'latitude': 0,
            'longitude': 0,
            'climate_zone': 'Unknown',
            'soil_type': 'Unknown'
        }
        
        # Get AI recommendations
        result = ai_plant_service.get_garden_recommendations(prompt, location_data)
        
        if result['success']:
            return jsonify({
                'success': True,
                'recommendations': result,
                'existing_plants': _get_user_plants_summary()
            })
        else:
            return jsonify({'error': result.get('error', 'Recommendation failed')}), 500
            
    except Exception as e:
        current_app.logger.error(f"Garden recommendation error: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@ai_bp.route('/api/ai/smart-companion-suggestions', methods=['POST'])
@login_required
def get_companion_suggestions():
    """Get AI suggestions for companion planting"""
    data = request.get_json()
    existing_plants = data.get('existing_plants', [])
    plot_conditions = data.get('plot_conditions', {})
    
    try:
        # Create prompt for companion planting
        prompt = f"""
        I have these plants in my garden: {', '.join(existing_plants)}
        
        Plot conditions:
        - Sun exposure: {plot_conditions.get('sun_exposure', 'unknown')}
        - Soil quality: {plot_conditions.get('soil_quality', 'unknown')}
        - Size: {plot_conditions.get('width', 'unknown')} x {plot_conditions.get('height', 'unknown')} feet
        
        What companion plants would work well with these existing plants?
        Consider pest control, nutrient sharing, and space efficiency.
        """
        
        # Get user's location for context
        location = GardenLocation.query.filter_by(user_id=current_user.id).first()
        location_data = location.to_dict() if location else {}
        
        result = ai_plant_service.get_garden_recommendations(prompt, location_data)
        
        if result['success']:
            return jsonify({
                'success': True,
                'companion_suggestions': result,
                'existing_plants': existing_plants
            })
        else:
            return jsonify({'error': result.get('error', 'Suggestion failed')}), 500
            
    except Exception as e:
        current_app.logger.error(f"Companion suggestion error: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@ai_bp.route('/api/ai/plant-care-assistant', methods=['POST'])
@login_required
def plant_care_assistant():
    """AI assistant for plant care questions"""
    data = request.get_json()
    question = data.get('question')
    plant_id = data.get('plant_id')
    
    if not question:
        return jsonify({'error': 'Question required'}), 400
    
    try:
        context = "You are a helpful garden assistant. "
        
        if plant_id:
            plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
            if plant:
                context += f"""
                The user is asking about their {plant.plant_type.name if plant.plant_type else 'plant'}.
                Plant details:
                - Scientific name: {plant.plant_type.scientific_name if plant.plant_type else 'Unknown'}
                - Planted: {plant.planted_date if plant.planted_date else 'Unknown'}
                - Status: {plant.status}
                - Notes: {plant.notes or 'None'}
                """
        
        # Get location context
        location = GardenLocation.query.filter_by(user_id=current_user.id).first()
        if location:
            context += f"""
            Garden location:
            - Climate zone: {location.climate_zone or 'Unknown'}
            - Soil type: {location.soil_type or 'Unknown'}
            """
        
        # Use the AI service to get recommendations
        result = ai_plant_service.get_garden_recommendations(
            f"{context}\n\nUser question: {question}",
            location.to_dict() if location else {}
        )
        
        return jsonify({
            'success': True,
            'answer': result.get('recommendation', 'Unable to provide answer'),
            'context_used': bool(plant_id)
        })
        
    except Exception as e:
        current_app.logger.error(f"Plant care assistant error: {e}")
        return jsonify({'error': 'Processing failed'}), 500

def _find_matching_plant_types(identification_result):
    """Find matching plant types in the database"""
    suggestions = []
    
    # Extract plant names from AI results
    ai_analysis = identification_result.get('ai_analysis', '')
    plantnet_results = identification_result.get('plantnet_suggestions', [])
    
    # Search local plant database
    search_terms = []
    
    # Add PlantNet results
    for result in plantnet_results[:3]:  # Top 3 results
        if 'species' in result:
            search_terms.append(result['species']['scientificNameWithoutAuthor'])
        
    # Simple database search (you could make this more sophisticated)
    for term in search_terms:
        plants = PlantType.query.filter(
            db.or_(
                PlantType.name.ilike(f'%{term}%'),
                PlantType.scientific_name.ilike(f'%{term}%')
            )
        ).limit(5).all()
        
        suggestions.extend([p.to_dict() for p in plants])
    
    return suggestions[:5]  # Return top 5 matches

def _get_user_plants_summary():
    """Get summary of user's existing plants"""
    plants = Plant.query.filter_by(user_id=current_user.id).all()
    return [
        {
            'id': p.id,
            'name': p.plant_type.name if p.plant_type else p.custom_name,
            'status': p.status,
            'planted_date': p.planted_date.isoformat() if p.planted_date else None
        }
        for p in plants
    ] 