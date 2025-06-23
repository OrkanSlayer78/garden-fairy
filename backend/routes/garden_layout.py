from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, GardenLocation, PlotArea, PlantPlacement, PlantJournal, Plant, PlantType, CalendarEvent
from datetime import datetime, date
import requests
import os

garden_layout_bp = Blueprint('garden_layout', __name__)

# Garden Location Routes
@garden_layout_bp.route('/api/garden/location', methods=['GET'])
@login_required
def get_garden_location():
    """Get user's garden location"""
    location = GardenLocation.query.filter_by(user_id=current_user.id).first()
    if location:
        return jsonify({'success': True, 'location': location.to_dict()})
    return jsonify({'success': True, 'location': None})

@garden_layout_bp.route('/api/garden/location', methods=['POST'])
@login_required
def set_garden_location():
    """Set or update user's garden location"""
    try:
        data = request.get_json()
        
        # Check if location already exists
        location = GardenLocation.query.filter_by(user_id=current_user.id).first()
        
        if location:
            # Update existing location
            location.name = data.get('name', location.name)
            location.latitude = data['latitude']
            location.longitude = data['longitude']
            location.address = data.get('address')
            location.zip_code = data.get('zip_code')
            location.climate_zone = data.get('climate_zone')
            location.soil_type = data.get('soil_type')
            location.notes = data.get('notes')
            location.updated_at = datetime.utcnow()
        else:
            # Create new location
            location = GardenLocation(
                user_id=current_user.id,
                name=data.get('name', 'My Garden'),
                latitude=data['latitude'],
                longitude=data['longitude'],
                address=data.get('address'),
                zip_code=data.get('zip_code'),
                climate_zone=data.get('climate_zone'),
                soil_type=data.get('soil_type'),
                notes=data.get('notes')
            )
            db.session.add(location)
        
        db.session.commit()
        return jsonify({'success': True, 'location': location.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/environmental-data/<float:lat>/<float:lng>')
@login_required
def get_environmental_data(lat, lng):
    """Get environmental data for a location"""
    try:
        # This would integrate with weather, soil, and environmental APIs
        # For now, return mock data
        environmental_data = {
            'climate_zone': get_climate_zone(lat, lng),
            'average_rainfall': get_rainfall_data(lat, lng),
            'soil_data': get_soil_data(lat, lng),
            'fire_risk': get_fire_risk(lat, lng),
            'frost_dates': get_frost_dates(lat, lng)
        }
        
        return jsonify({'success': True, 'data': environmental_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Plot Management Routes
@garden_layout_bp.route('/api/garden/plots', methods=['GET'])
@login_required
def get_garden_plots():
    """Get all user's garden plots"""
    plots = PlotArea.query.filter_by(user_id=current_user.id).all()
    return jsonify({'success': True, 'plots': [plot.to_dict() for plot in plots]})

@garden_layout_bp.route('/api/garden/plots', methods=['POST'])
@login_required
def create_garden_plot():
    """Create a new garden plot"""
    try:
        data = request.get_json()
        
        plot = PlotArea(
            user_id=current_user.id,
            garden_location_id=data.get('garden_location_id'),
            name=data.get('name'),
            plot_type=data.get('plot_type', 'rectangular'),
            coordinates=data.get('coordinates'),
            center_x=data.get('center_x'),
            center_y=data.get('center_y'),
            width=data.get('width'),
            height=data.get('height'),
            soil_quality=data.get('soil_quality'),
            sun_exposure=data.get('sun_exposure'),
            irrigation_type=data.get('irrigation_type'),
            notes=data.get('notes')
        )
        
        db.session.add(plot)
        db.session.commit()
        return jsonify({'success': True, 'plot': plot.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/plots/<int:plot_id>', methods=['PUT'])
@login_required
def update_garden_plot(plot_id):
    """Update a garden plot"""
    try:
        plot = PlotArea.query.filter_by(id=plot_id, user_id=current_user.id).first_or_404()
        data = request.get_json()
        
        plot.name = data.get('name', plot.name)
        plot.coordinates = data.get('coordinates', plot.coordinates)
        plot.center_x = data.get('center_x', plot.center_x)
        plot.center_y = data.get('center_y', plot.center_y)
        plot.width = data.get('width', plot.width)
        plot.height = data.get('height', plot.height)
        plot.soil_quality = data.get('soil_quality', plot.soil_quality)
        plot.sun_exposure = data.get('sun_exposure', plot.sun_exposure)
        plot.irrigation_type = data.get('irrigation_type', plot.irrigation_type)
        plot.notes = data.get('notes', plot.notes)
        
        db.session.commit()
        return jsonify({'success': True, 'plot': plot.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/plots/<int:plot_id>', methods=['DELETE'])
@login_required
def delete_garden_plot(plot_id):
    """Delete a garden plot"""
    try:
        plot = PlotArea.query.filter_by(id=plot_id, user_id=current_user.id).first_or_404()
        db.session.delete(plot)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Plant Placement Routes
@garden_layout_bp.route('/api/garden/placements', methods=['GET'])
@login_required
def get_plant_placements():
    """Get all plant placements"""
    placements = PlantPlacement.query.filter_by(user_id=current_user.id).all()
    return jsonify({'success': True, 'placements': [placement.to_dict() for placement in placements]})

@garden_layout_bp.route('/api/garden/placements', methods=['POST'])
@login_required
def create_plant_placement():
    """Place a plant in a plot"""
    try:
        data = request.get_json()
        
        # Check if we need to create a Plant record first
        plant_id = data.get('plant_id')
        if not plant_id:
            # Try to find or create plant type by name (since frontend sends mock data)
            plant_name = data.get('plant_name', 'Unknown Plant')
            plant_type = PlantType.query.filter_by(name=plant_name).first()
            
            if not plant_type:
                # Create a new plant type
                plant_type = PlantType(
                    name=plant_name,
                    scientific_name=data.get('scientific_name', ''),
                    category=data.get('category', 'vegetable'),
                    days_to_harvest=data.get('days_to_harvest', 0),
                    spacing_inches=data.get('spacing_inches', 12),
                    sun_requirement=data.get('sun_requirement', 'full'),
                    water_requirement=data.get('water_requirement', 'medium'),
                    description=data.get('description', '')
                )
                db.session.add(plant_type)
                db.session.flush()  # Get the ID
            
            # Create a Plant record for this user
            plant = Plant(
                user_id=current_user.id,
                plant_type_id=plant_type.id,
                custom_name=plant_name,
                planted_date=datetime.strptime(data['planted_date'], '%Y-%m-%d').date() if data.get('planted_date') else None,
                status='planted'
            )
            db.session.add(plant)
            db.session.flush()  # Get the ID
            plant_id = plant.id
        
        # Convert lat/lng to x/y positions (for now, just use the coordinates directly)
        x_position = data.get('x_position', data.get('longitude', 0))
        y_position = data.get('y_position', data.get('latitude', 0))
        
        placement = PlantPlacement(
            user_id=current_user.id,
            plant_id=plant_id,
            plot_id=data['plot_id'],
            x_position=x_position,
            y_position=y_position,
            planted_date=datetime.strptime(data['planted_date'], '%Y-%m-%d').date() if data.get('planted_date') else None,
            notes=data.get('notes')
        )
        
        db.session.add(placement)
        db.session.commit()
        return jsonify({'success': True, 'placement': placement.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/placements/<int:placement_id>', methods=['PUT'])
@login_required
def update_plant_placement(placement_id):
    """Update a plant placement"""
    try:
        placement = PlantPlacement.query.filter_by(id=placement_id, user_id=current_user.id).first_or_404()
        data = request.get_json()
        
        placement.x_position = data.get('x_position', placement.x_position)
        placement.y_position = data.get('y_position', placement.y_position)
        placement.notes = data.get('notes', placement.notes)
        
        if data.get('planted_date'):
            placement.planted_date = datetime.strptime(data['planted_date'], '%Y-%m-%d').date()
        if data.get('removed_date'):
            placement.removed_date = datetime.strptime(data['removed_date'], '%Y-%m-%d').date()
        
        db.session.commit()
        return jsonify({'success': True, 'placement': placement.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/placements/<int:placement_id>', methods=['DELETE'])
@login_required
def remove_plant_placement(placement_id):
    """Remove a plant from a plot"""
    try:
        placement = PlantPlacement.query.filter_by(id=placement_id, user_id=current_user.id).first_or_404()
        db.session.delete(placement)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Plant Journal Routes
@garden_layout_bp.route('/api/garden/journal/<int:plant_id>', methods=['GET'])
@login_required
def get_plant_journal(plant_id):
    """Get journal entries for a plant"""
    entries = PlantJournal.query.filter_by(
        user_id=current_user.id, 
        plant_id=plant_id
    ).order_by(PlantJournal.entry_date.desc()).all()
    
    return jsonify({'success': True, 'entries': [entry.to_dict() for entry in entries]})

@garden_layout_bp.route('/api/garden/calendar/plant/<int:plant_id>', methods=['GET'])
@login_required
def get_plant_calendar_events(plant_id):
    """Get calendar events for a specific plant"""
    events = CalendarEvent.query.filter_by(
        user_id=current_user.id,
        plant_id=plant_id
    ).order_by(CalendarEvent.event_date.asc()).all()
    
    return jsonify({'success': True, 'events': [event.to_dict() for event in events]})

@garden_layout_bp.route('/api/garden/journal', methods=['POST'])
@login_required
def create_journal_entry():
    """Create a new journal entry"""
    try:
        data = request.get_json()
        
        entry = PlantJournal(
            user_id=current_user.id,
            plant_id=data['plant_id'],
            placement_id=data.get('placement_id'),
            entry_date=datetime.strptime(data['entry_date'], '%Y-%m-%d').date(),
            entry_type=data.get('entry_type', 'general'),
            title=data.get('title'),
            content=data['content'],
            mood=data.get('mood'),
            weather=data.get('weather'),
            temperature=data.get('temperature'),
            photos=data.get('photos', []),
            tags=data.get('tags', [])
        )
        
        db.session.add(entry)
        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/journal/<int:entry_id>', methods=['PUT'])
@login_required
def update_journal_entry(entry_id):
    """Update a journal entry"""
    try:
        entry = PlantJournal.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
        data = request.get_json()
        
        entry.title = data.get('title', entry.title)
        entry.content = data.get('content', entry.content)
        entry.entry_type = data.get('entry_type', entry.entry_type)
        entry.mood = data.get('mood', entry.mood)
        entry.weather = data.get('weather', entry.weather)
        entry.temperature = data.get('temperature', entry.temperature)
        entry.photos = data.get('photos', entry.photos)
        entry.tags = data.get('tags', entry.tags)
        entry.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify({'success': True, 'entry': entry.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@garden_layout_bp.route('/api/garden/journal/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_journal_entry(entry_id):
    """Delete a journal entry"""
    try:
        entry = PlantJournal.query.filter_by(id=entry_id, user_id=current_user.id).first_or_404()
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Helper functions for environmental data
def get_climate_zone(lat, lng):
    """Get USDA climate zone for coordinates"""
    # This would integrate with USDA plant hardiness zone API
    # For now, return mock data based on approximate latitude
    if lat > 45:
        return "3-4"
    elif lat > 40:
        return "5-6"
    elif lat > 35:
        return "7-8"
    elif lat > 30:
        return "9-10"
    else:
        return "10-11"

def get_rainfall_data(lat, lng):
    """Get average rainfall data"""
    # Mock data - would integrate with weather APIs
    return {
        'annual_average': 35.5,
        'growing_season': 22.3,
        'unit': 'inches'
    }

def get_soil_data(lat, lng):
    """Get soil type and quality data"""
    # Mock data - would integrate with USGS or agricultural APIs
    return {
        'type': 'loamy',
        'ph': 6.8,
        'drainage': 'well-drained',
        'fertility': 'moderate'
    }

def get_fire_risk(lat, lng):
    """Get fire risk assessment"""
    # Mock data - would integrate with fire danger APIs
    return {
        'risk_level': 'moderate',
        'season': 'summer',
        'recommendations': ['maintain defensible space', 'avoid planting flammable species near structures']
    }

def get_frost_dates(lat, lng):
    """Get first and last frost dates"""
    # Mock data - would integrate with agricultural/weather APIs
    return {
        'first_frost': '2024-10-15',
        'last_frost': '2024-04-15',
        'growing_days': 183
    } 