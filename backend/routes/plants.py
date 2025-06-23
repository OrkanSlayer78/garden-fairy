from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Plant, PlantType, GardenPlot
from datetime import datetime, date
from services.plant_data_service import plant_data_service
import asyncio

plants_bp = Blueprint('plants', __name__)

@plants_bp.route('/api/plant-types', methods=['GET'])
def get_plant_types():
    """Get all available plant types"""
    plant_types = PlantType.query.all()
    return jsonify([plant_type.to_dict() for plant_type in plant_types])

@plants_bp.route('/api/plant-types', methods=['POST'])
@login_required
def create_plant_type():
    """Create a new plant type (admin functionality)"""
    data = request.get_json()
    
    plant_type = PlantType(
        name=data.get('name'),
        scientific_name=data.get('scientific_name'),
        category=data.get('category'),
        planting_season=data.get('planting_season'),
        days_to_harvest=data.get('days_to_harvest'),
        spacing_inches=data.get('spacing_inches'),
        sun_requirement=data.get('sun_requirement'),
        water_requirement=data.get('water_requirement'),
        description=data.get('description'),
        care_instructions=data.get('care_instructions')
    )
    
    db.session.add(plant_type)
    db.session.commit()
    
    return jsonify(plant_type.to_dict()), 201

@plants_bp.route('/api/plants', methods=['GET'])
@login_required
def get_user_plants():
    """Get all plants for the current user"""
    plants = Plant.query.filter_by(user_id=current_user.id).all()
    return jsonify([plant.to_dict() for plant in plants])

@plants_bp.route('/api/plants', methods=['POST'])
@login_required
def create_plant():
    """Create a new plant for the current user"""
    data = request.get_json()
    
    # Parse dates
    planted_date = None
    expected_harvest_date = None
    
    if data.get('planted_date'):
        planted_date = datetime.strptime(data['planted_date'], '%Y-%m-%d').date()
    
    if data.get('expected_harvest_date'):
        expected_harvest_date = datetime.strptime(data['expected_harvest_date'], '%Y-%m-%d').date()
    
    plant = Plant(
        user_id=current_user.id,
        plant_type_id=data.get('plant_type_id'),
        custom_name=data.get('custom_name'),
        planted_date=planted_date,
        expected_harvest_date=expected_harvest_date,
        status=data.get('status', 'planned'),
        notes=data.get('notes')
    )
    
    db.session.add(plant)
    db.session.commit()
    
    return jsonify(plant.to_dict()), 201

@plants_bp.route('/api/plants/<int:plant_id>', methods=['GET'])
@login_required
def get_plant(plant_id):
    """Get a specific plant"""
    plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
    
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404
    
    return jsonify(plant.to_dict())

@plants_bp.route('/api/plants/<int:plant_id>', methods=['PUT'])
@login_required
def update_plant(plant_id):
    """Update a specific plant"""
    plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
    
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    if 'custom_name' in data:
        plant.custom_name = data['custom_name']
    if 'planted_date' in data and data['planted_date']:
        plant.planted_date = datetime.strptime(data['planted_date'], '%Y-%m-%d').date()
    if 'expected_harvest_date' in data and data['expected_harvest_date']:
        plant.expected_harvest_date = datetime.strptime(data['expected_harvest_date'], '%Y-%m-%d').date()
    if 'actual_harvest_date' in data and data['actual_harvest_date']:
        plant.actual_harvest_date = datetime.strptime(data['actual_harvest_date'], '%Y-%m-%d').date()
    if 'status' in data:
        plant.status = data['status']
    if 'notes' in data:
        plant.notes = data['notes']
    
    db.session.commit()
    
    return jsonify(plant.to_dict())

@plants_bp.route('/api/plants/<int:plant_id>', methods=['DELETE'])
@login_required
def delete_plant(plant_id):
    """Delete a specific plant"""
    plant = Plant.query.filter_by(id=plant_id, user_id=current_user.id).first()
    
    if not plant:
        return jsonify({'error': 'Plant not found'}), 404
    
    db.session.delete(plant)
    db.session.commit()
    
    return jsonify({'message': 'Plant deleted successfully'})

@plants_bp.route('/api/plants/stats', methods=['GET'])
@login_required
def get_plant_stats():
    """Get plant statistics for the current user"""
    total_plants = Plant.query.filter_by(user_id=current_user.id).count()
    planned_plants = Plant.query.filter_by(user_id=current_user.id, status='planned').count()
    planted_plants = Plant.query.filter_by(user_id=current_user.id, status='planted').count()
    growing_plants = Plant.query.filter_by(user_id=current_user.id, status='growing').count()
    harvested_plants = Plant.query.filter_by(user_id=current_user.id, status='harvested').count()
    
    return jsonify({
        'total_plants': total_plants,
        'planned_plants': planned_plants,
        'planted_plants': planted_plants,
        'growing_plants': growing_plants,
        'harvested_plants': harvested_plants
    })

@plants_bp.route('/api/plants/<int:plant_id>/compatibility/<int:other_plant_id>')
@login_required
def check_plant_compatibility(plant_id, other_plant_id):
    """Check compatibility between two plants"""
    try:
        plant1 = Plant.query.get_or_404(plant_id)
        plant2 = Plant.query.get_or_404(other_plant_id)
        
        # Get distance if plants are placed in garden
        distance = None
        if plant1.garden_plot and plant2.garden_plot:
            # Calculate distance between garden plots (simplified)
            dx = plant1.garden_plot.x_position - plant2.garden_plot.x_position
            dy = plant1.garden_plot.y_position - plant2.garden_plot.y_position
            distance = (dx*dx + dy*dy)**0.5 * 12  # Convert to inches
        
        compatibility = plant_data_service.check_plant_compatibility(
            plant1.plant_type.name,
            plant2.plant_type.name,
            distance
        )
        
        return jsonify({
            'success': True,
            'compatibility': compatibility,
            'plant1': {'id': plant1.id, 'name': plant1.custom_name or plant1.plant_type.name},
            'plant2': {'id': plant2.id, 'name': plant2.custom_name or plant2.plant_type.name}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@plants_bp.route('/api/plants/external-info/<plant_name>')
@login_required
def get_external_plant_info(plant_name):
    """Get plant information from external APIs"""
    try:
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        plant_info = loop.run_until_complete(
            plant_data_service.get_plant_info_from_apis(plant_name)
        )
        loop.close()
        
        return jsonify({
            'success': True,
            'plant_info': plant_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@plants_bp.route('/api/plants/companion-info/<plant_name>')
@login_required
def get_companion_info(plant_name):
    """Get companion planting information for a plant"""
    try:
        companion_info = plant_data_service.get_companion_planting_info(plant_name)
        care_schedule = plant_data_service.get_care_schedule(plant_name)
        
        return jsonify({
            'success': True,
            'companion_info': companion_info,
            'care_schedule': care_schedule
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@plants_bp.route('/api/garden/analyze-layout')
@login_required
def analyze_garden_layout():
    """Analyze the entire garden layout for compatibility issues"""
    try:
        # Get all planted plants with positions
        plants_with_positions = db.session.query(Plant, GardenPlot).join(
            GardenPlot, Plant.id == GardenPlot.plant_id
        ).filter(Plant.user_id == current_user.id).all()
        
        plant_positions = []
        for plant, plot in plants_with_positions:
            plant_positions.append({
                'plant_name': plant.plant_type.name,
                'x': plot.x_position * 12,  # Convert to inches
                'y': plot.y_position * 12,  # Convert to inches
                'id': str(plant.id),
                'custom_name': plant.custom_name
            })
        
        analysis = plant_data_service.analyze_garden_layout(plant_positions)
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'total_plants': len(plant_positions)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@plants_bp.route('/api/plants/<int:plant_id>/care-reminders')
@login_required
def get_plant_care_reminders(plant_id):
    """Get care reminders for a specific plant"""
    try:
        plant = Plant.query.get_or_404(plant_id)
        
        reminders = plant_data_service.get_seasonal_care_reminders(
            plant.plant_type.name
        )
        
        return jsonify({
            'success': True,
            'reminders': reminders,
            'plant': {
                'id': plant.id,
                'name': plant.custom_name or plant.plant_type.name,
                'type': plant.plant_type.name,
                'status': plant.status
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@plants_bp.route('/api/plants/bulk-compatibility-check', methods=['POST'])
@login_required
def bulk_compatibility_check():
    """Check compatibility for multiple plant combinations"""
    try:
        data = request.get_json()
        plant_ids = data.get('plant_ids', [])
        
        if len(plant_ids) < 2:
            return jsonify({'success': False, 'error': 'At least 2 plants required'}), 400
        
        plants = Plant.query.filter(
            Plant.id.in_(plant_ids),
            Plant.user_id == current_user.id
        ).all()
        
        results = []
        for i, plant1 in enumerate(plants):
            for plant2 in plants[i+1:]:
                compatibility = plant_data_service.check_plant_compatibility(
                    plant1.plant_type.name,
                    plant2.plant_type.name
                )
                
                results.append({
                    'plant1': {'id': plant1.id, 'name': plant1.custom_name or plant1.plant_type.name},
                    'plant2': {'id': plant2.id, 'name': plant2.custom_name or plant2.plant_type.name},
                    'compatibility': compatibility
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'total_combinations': len(results)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500 