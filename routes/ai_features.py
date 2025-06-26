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
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Save uploaded file
        filename = secure_filename(f"{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Use direct API call for plant identification
            import base64
            import requests
            
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                return jsonify({'error': 'OpenAI API key not configured'}), 500
            
            # Encode image to base64
            with open(filepath, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'gpt-4-vision-preview',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'text',
                                'text': '''Identify this plant species. Please provide:
                                1. Common name
                                2. Scientific name (if identifiable)
                                3. Plant family
                                4. Basic care instructions
                                5. Any notable characteristics
                                
                                Be specific and accurate. If you're not certain, mention your confidence level.'''
                            },
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f'data:image/jpeg;base64,{base64_image}'
                                }
                            }
                        ]
                    }
                ],
                'max_tokens': 500
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = result['choices'][0]['message']['content']
                
                return jsonify({
                    'success': True,
                    'identification': {
                        'ai_analysis': analysis,
                        'confidence_score': 0.8,  # Default confidence for GPT-4V
                        'plantnet_suggestions': [],  # Could add PlantNet later
                        'success': True,
                        'model_used': 'gpt-4-vision-preview'
                    },
                    'suggested_plants': []  # Could populate based on identification
                })
            else:
                current_app.logger.error(f"OpenAI Vision API error: {response.status_code} - {response.text}")
                return jsonify({
                    'error': f'Plant identification failed: {response.status_code}',
                    'debug': 'Vision API call failed'
                }), 500
                
        except Exception as e:
            current_app.logger.error(f"Plant identification error: {e}")
            return jsonify({'error': 'Processing failed', 'debug': str(e)}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

@ai_bp.route('/api/ai/analyze-health', methods=['POST'])
@login_required
def analyze_plant_health():
    """Analyze plant health from photo"""
    ensure_upload_dir()
    
    # Accept both 'image' (frontend) and 'photo' field names
    file = request.files.get('image') or request.files.get('photo')
    if not file:
        return jsonify({'error': 'No image uploaded'}), 400
    
    plant_id = request.form.get('plant_id')  # Optional now
    placement_id = request.form.get('placement_id')
    
    if file and allowed_file(file.filename):
        # Save uploaded file
        filename = secure_filename(f"health_{current_user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # Use direct API call for health analysis
            import base64
            import requests
            
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                return jsonify({'error': 'OpenAI API key not configured'}), 500
            
            # Prepare plant context if plant_id provided
            plant_context = ""
            if plant_id:
                plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
                if plant:
                    plant_context = f"""
                    Plant context:
                    - Name: {plant.plant_type.name if plant.plant_type else 'Unknown'}
                    - Scientific name: {plant.plant_type.scientific_name if plant.plant_type else 'Unknown'}
                    - Planted: {plant.planted_date if plant.planted_date else 'Unknown'}
                    - Current status: {plant.status}
                    """
            
            # Encode image to base64
            with open(filepath, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'model': 'gpt-4-vision-preview',
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'text',
                                'text': f'''Analyze this plant's health. {plant_context}
                                
                                Please look for and report on:
                                1. Overall health status (healthy, stressed, diseased)
                                2. Any visible diseases or pest damage
                                3. Signs of nutrient deficiencies 
                                4. Watering issues (over/under watering)
                                5. Any other concerns
                                6. Specific recommendations for improvement
                                
                                Provide practical, actionable advice.'''
                            },
                            {
                                'type': 'image_url',
                                'image_url': {
                                    'url': f'data:image/jpeg;base64,{base64_image}'
                                }
                            }
                        ]
                    }
                ],
                'max_tokens': 500
            }
            
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = result['choices'][0]['message']['content']
                
                # Optionally save to journal if plant_id provided
                journal_entry_id = None
                if plant_id:
                    try:
                        journal_entry = PlantJournal(
                            user_id=current_user.id,
                            plant_id=plant_id,
                            placement_id=placement_id,
                            entry_date=datetime.now().date(),
                            entry_type='ai_health_analysis',
                            title='AI Health Analysis',
                            content=analysis,
                            photos=[filepath]
                        )
                        db.session.add(journal_entry)
                        db.session.commit()
                        journal_entry_id = journal_entry.id
                    except Exception as journal_error:
                        current_app.logger.warning(f"Could not save to journal: {journal_error}")
                
                return jsonify({
                    'success': True,
                    'analysis': {
                        'analysis': analysis,
                        'success': True,
                        'model_used': 'gpt-4-vision-preview',
                        'plant_context_used': bool(plant_id and plant_context)
                    },
                    'journal_entry_id': journal_entry_id
                })
            else:
                current_app.logger.error(f"OpenAI Vision API error: {response.status_code} - {response.text}")
                return jsonify({
                    'error': f'Health analysis failed: {response.status_code}',
                    'debug': 'Vision API call failed'
                }), 500
                
        except Exception as e:
            current_app.logger.error(f"Plant health analysis error: {e}")
            return jsonify({'error': 'Processing failed', 'debug': str(e)}), 500
    
    return jsonify({'error': 'Invalid file format'}), 400

@ai_bp.route('/api/ai/garden-advice', methods=['POST'])
@login_required
def get_garden_advice():
    """Get AI-powered garden planning recommendations"""
    data = request.get_json()
    
    # Handle both prompt format and structured format from frontend
    prompt = data.get('prompt')
    if not prompt:
        # Build prompt from structured data
        location = data.get('location', '')
        garden_type = data.get('garden_type', '')
        experience_level = data.get('experience_level', '')
        
        if not location or not garden_type or not experience_level:
            return jsonify({'error': 'Location, garden type, and experience level required'}), 400
        
        prompt = f"""I'm a {experience_level} gardener in {location} planning a {garden_type} garden. 
        What plants would work well for my setup? Please suggest specific plants, 
        planting timeline, and care tips based on my location and garden type."""
    
    try:
        # Use direct API call to bypass library issues
        import requests
        import os
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        # Get user's garden location for context
        location_obj = GardenLocation.query.filter_by(user_id=current_user.id).first()
        location_context = ""
        if location_obj:
            location_context = f"""
            Garden location context:
            - Climate zone: {location_obj.climate_zone or 'Unknown'}
            - Soil type: {location_obj.soil_type or 'Unknown'}
            """
        
        # Enhanced prompt with context
        enhanced_prompt = f"""You are a knowledgeable garden advisor. {location_context}
        
        User request: {prompt}
        
        Please provide specific, actionable gardening advice including:
        1. Recommended plants for their conditions
        2. Planting timeline
        3. Care instructions
        4. Any special considerations for their location/experience level
        
        Keep the response practical and helpful."""
        
        # Direct API call
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'user', 'content': enhanced_prompt}
            ],
            'max_tokens': 500,
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            advice = result['choices'][0]['message']['content']
            
            return jsonify({
                'success': True,
                'recommendations': {
                    'recommendation': advice,
                    'model_used': 'gpt-3.5-turbo',
                    'location_context_used': bool(location_obj)
                },
                'existing_plants': _get_user_plants_summary()
            })
        else:
            current_app.logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'OpenAI API error: {response.status_code}',
                'debug': 'Direct API call failed'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Garden recommendation error: {e}")
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__,
            'debug': 'Garden advice endpoint error'
        }), 500

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
        # Use direct API call like our working garden advice endpoint
        import requests
        import os
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500
        
        context = "You are a helpful and knowledgeable garden assistant. "
        
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
        
        # Create enhanced prompt
        enhanced_prompt = f"""{context}

        User question: {question}

        Please provide helpful, specific gardening advice. Include practical steps and tips."""
        
        # Direct API call
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'user', 'content': enhanced_prompt}
            ],
            'max_tokens': 400,
            'temperature': 0.7
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result['choices'][0]['message']['content']
            
            return jsonify({
                'success': True,
                'answer': answer,
                'context_used': bool(plant_id or location),
                'model_used': 'gpt-3.5-turbo'
            })
        else:
            current_app.logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
            return jsonify({
                'success': False,
                'error': f'Care assistant failed: {response.status_code}',
                'answer': 'Unable to provide answer due to API error'
            }), 500
        
    except Exception as e:
        current_app.logger.error(f"Plant care assistant error: {e}")
        return jsonify({
            'success': False,
            'error': 'Processing failed',
            'answer': 'Unable to provide answer due to processing error'
        }), 500

@ai_bp.route('/api/ai/care-question', methods=['POST'])
@login_required
def care_question():
    """Plant care assistant - frontend-compatible endpoint"""
    return plant_care_assistant()

@ai_bp.route('/api/ai/test', methods=['GET'])
@login_required  
def test_openai():
    """Simple test endpoint to debug OpenAI connection"""
    try:
        import os
        api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY not set', 'success': False})
        
        # Test basic OpenAI client creation
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Simple test call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'Garden Fairy test successful'"}],
            max_tokens=10
        )
        
        return jsonify({
            'success': True,
            'response': response.choices[0].message.content,
            'key_length': len(api_key),
            'model_used': 'gpt-3.5-turbo'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        })

@ai_bp.route('/api/ai/test-simple', methods=['GET'])
@login_required  
def test_openai_simple():
    """Simple OpenAI test bypassing AI service"""
    try:
        import os
        import requests
        import json
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY not set', 'success': False})
        
        # Direct API call to bypass library issues
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'user', 'content': 'Say "Garden test successful"'}
            ],
            'max_tokens': 10
        }
        
        # Direct HTTP request to OpenAI API
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'success': True,
                'response': result['choices'][0]['message']['content'],
                'model': 'gpt-3.5-turbo',
                'method': 'direct_http'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'OpenAI API error: {response.status_code}',
                'details': response.text[:200]
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        })

# Public test endpoint for OpenAI connectivity (no auth required)
@ai_bp.route('/api/ai/test-connection', methods=['GET'])
def test_openai_connection():
    """Simple public test endpoint to verify OpenAI connectivity"""
    try:
        # Simple test query
        import requests
        import json
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'OpenAI API key not configured',
                'debug': 'OPENAI_API_KEY environment variable not found'
            }), 500
        
        # Direct API call to avoid library issues
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'user', 'content': 'Say "Garden Fairy AI is working!" if you can read this.'}
            ],
            'max_tokens': 50
        }
        
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            message = result['choices'][0]['message']['content']
            
            return jsonify({
                'success': True,
                'message': message,
                'test_status': 'OpenAI API working correctly',
                'api_key_length': len(api_key),
                'model_used': 'gpt-3.5-turbo'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'OpenAI API error: {response.status_code}',
                'response': response.text,
                'debug': 'Direct API call failed'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'debug': 'Exception in test endpoint'
        }), 500

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

# Additional routes to match frontend API expectations
# Note: care_question route is already defined above