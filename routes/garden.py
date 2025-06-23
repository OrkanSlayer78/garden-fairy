from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, GardenPlot

garden_bp = Blueprint('garden', __name__)

@garden_bp.route('/api/garden', methods=['GET'])
@login_required
def get_garden_layout():
    """Get the garden layout for the current user"""
    plots = GardenPlot.query.filter_by(user_id=current_user.id).all()
    return jsonify([plot.to_dict() for plot in plots])

@garden_bp.route('/api/garden', methods=['POST'])
@login_required
def create_garden_plot():
    """Create a new garden plot"""
    data = request.get_json()
    
    plot = GardenPlot(
        user_id=current_user.id,
        plant_id=data.get('plant_id'),
        name=data.get('name'),
        x_position=data.get('x_position'),
        y_position=data.get('y_position'),
        width=data.get('width', 1.0),
        height=data.get('height', 1.0),
        soil_type=data.get('soil_type'),
        sun_exposure=data.get('sun_exposure'),
        notes=data.get('notes')
    )
    
    db.session.add(plot)
    db.session.commit()
    
    return jsonify(plot.to_dict()), 201

@garden_bp.route('/api/garden/<int:plot_id>', methods=['GET'])
@login_required
def get_garden_plot(plot_id):
    """Get a specific garden plot"""
    plot = GardenPlot.query.filter_by(id=plot_id, user_id=current_user.id).first()
    
    if not plot:
        return jsonify({'error': 'Garden plot not found'}), 404
    
    return jsonify(plot.to_dict())

@garden_bp.route('/api/garden/<int:plot_id>', methods=['PUT'])
@login_required
def update_garden_plot(plot_id):
    """Update a specific garden plot"""
    plot = GardenPlot.query.filter_by(id=plot_id, user_id=current_user.id).first()
    
    if not plot:
        return jsonify({'error': 'Garden plot not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    if 'plant_id' in data:
        plot.plant_id = data['plant_id']
    if 'name' in data:
        plot.name = data['name']
    if 'x_position' in data:
        plot.x_position = data['x_position']
    if 'y_position' in data:
        plot.y_position = data['y_position']
    if 'width' in data:
        plot.width = data['width']
    if 'height' in data:
        plot.height = data['height']
    if 'soil_type' in data:
        plot.soil_type = data['soil_type']
    if 'sun_exposure' in data:
        plot.sun_exposure = data['sun_exposure']
    if 'notes' in data:
        plot.notes = data['notes']
    
    db.session.commit()
    
    return jsonify(plot.to_dict())

@garden_bp.route('/api/garden/<int:plot_id>', methods=['DELETE'])
@login_required
def delete_garden_plot(plot_id):
    """Delete a specific garden plot"""
    plot = GardenPlot.query.filter_by(id=plot_id, user_id=current_user.id).first()
    
    if not plot:
        return jsonify({'error': 'Garden plot not found'}), 404
    
    db.session.delete(plot)
    db.session.commit()
    
    return jsonify({'message': 'Garden plot deleted successfully'})

@garden_bp.route('/api/garden/bulk', methods=['POST'])
@login_required
def bulk_update_garden():
    """Bulk update garden layout"""
    data = request.get_json()
    plots_data = data.get('plots', [])
    
    # Delete existing plots if requested
    if data.get('replace_all', False):
        GardenPlot.query.filter_by(user_id=current_user.id).delete()
    
    # Create or update plots
    for plot_data in plots_data:
        if plot_data.get('id'):
            # Update existing plot
            plot = GardenPlot.query.filter_by(id=plot_data['id'], user_id=current_user.id).first()
            if plot:
                plot.plant_id = plot_data.get('plant_id')
                plot.name = plot_data.get('name')
                plot.x_position = plot_data.get('x_position')
                plot.y_position = plot_data.get('y_position')
                plot.width = plot_data.get('width', 1.0)
                plot.height = plot_data.get('height', 1.0)
                plot.soil_type = plot_data.get('soil_type')
                plot.sun_exposure = plot_data.get('sun_exposure')
                plot.notes = plot_data.get('notes')
        else:
            # Create new plot
            plot = GardenPlot(
                user_id=current_user.id,
                plant_id=plot_data.get('plant_id'),
                name=plot_data.get('name'),
                x_position=plot_data.get('x_position'),
                y_position=plot_data.get('y_position'),
                width=plot_data.get('width', 1.0),
                height=plot_data.get('height', 1.0),
                soil_type=plot_data.get('soil_type'),
                sun_exposure=plot_data.get('sun_exposure'),
                notes=plot_data.get('notes')
            )
            db.session.add(plot)
    
    db.session.commit()
    
    # Return updated garden layout
    plots = GardenPlot.query.filter_by(user_id=current_user.id).all()
    return jsonify([plot.to_dict() for plot in plots]) 