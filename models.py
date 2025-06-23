from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    picture = db.Column(db.String(200))
    google_credentials = db.Column(db.Text)  # Store encrypted OAuth credentials for calendar access
    calendar_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    plants = db.relationship('Plant', backref='owner', lazy=True, cascade='all, delete-orphan')
    garden_plots = db.relationship('GardenPlot', backref='owner', lazy=True, cascade='all, delete-orphan')
    calendar_events = db.relationship('CalendarEvent', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'picture': self.picture,
            'calendar_enabled': self.calendar_enabled,
            'created_at': self.created_at.isoformat()
        }

class PlantType(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    scientific_name = db.Column(db.String(100))
    category = db.Column(db.String(50))  # vegetable, herb, flower, fruit
    planting_season = db.Column(db.String(50))  # spring, summer, fall, winter
    days_to_harvest = db.Column(db.Integer)
    spacing_inches = db.Column(db.Integer)
    sun_requirement = db.Column(db.String(20))  # full, partial, shade
    water_requirement = db.Column(db.String(20))  # low, medium, high
    description = db.Column(db.Text)
    care_instructions = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'scientific_name': self.scientific_name,
            'category': self.category,
            'planting_season': self.planting_season,
            'days_to_harvest': self.days_to_harvest,
            'spacing_inches': self.spacing_inches,
            'sun_requirement': self.sun_requirement,
            'water_requirement': self.water_requirement,
            'description': self.description,
            'care_instructions': self.care_instructions
        }

class Plant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plant_type_id = db.Column(db.Integer, db.ForeignKey('plant_type.id'), nullable=False)
    custom_name = db.Column(db.String(100))  # User's custom name for this plant
    planted_date = db.Column(db.Date)
    expected_harvest_date = db.Column(db.Date)
    actual_harvest_date = db.Column(db.Date)
    status = db.Column(db.String(20), default='planned')  # planned, planted, growing, harvested
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    plant_type = db.relationship('PlantType', backref='user_plants')
    
    def to_dict(self):
        return {
            'id': self.id,
            'custom_name': self.custom_name,
            'planted_date': self.planted_date.isoformat() if self.planted_date else None,
            'expected_harvest_date': self.expected_harvest_date.isoformat() if self.expected_harvest_date else None,
            'actual_harvest_date': self.actual_harvest_date.isoformat() if self.actual_harvest_date else None,
            'status': self.status,
            'notes': self.notes,
            'plant_type': self.plant_type.to_dict() if self.plant_type else None,
            'created_at': self.created_at.isoformat()
        }

class GardenPlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plant_id = db.Column(db.Integer, db.ForeignKey('plant.id'))
    name = db.Column(db.String(100), nullable=False)
    x_position = db.Column(db.Float, nullable=False)  # X coordinate in garden grid
    y_position = db.Column(db.Float, nullable=False)  # Y coordinate in garden grid
    width = db.Column(db.Float, default=1.0)  # Width in grid units
    height = db.Column(db.Float, default=1.0)  # Height in grid units
    soil_type = db.Column(db.String(50))
    sun_exposure = db.Column(db.String(20))  # full, partial, shade
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    plant = db.relationship('Plant', backref='garden_plots')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'x_position': self.x_position,
            'y_position': self.y_position,
            'width': self.width,
            'height': self.height,
            'soil_type': self.soil_type,
            'sun_exposure': self.sun_exposure,
            'notes': self.notes,
            'plant': self.plant.to_dict() if self.plant else None,
            'created_at': self.created_at.isoformat()
        }

class CalendarEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plant_id = db.Column(db.Integer, db.ForeignKey('plant.id'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    event_date = db.Column(db.Date, nullable=False)
    event_type = db.Column(db.String(50))  # planting, watering, fertilizing, harvesting, pruning
    completed = db.Column(db.Boolean, default=False)
    reminder_sent = db.Column(db.Boolean, default=False)
    google_event_id = db.Column(db.String(200))  # Google Calendar event ID for sync
    google_calendar_id = db.Column(db.String(200))  # Which Google Calendar this event belongs to
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    plant = db.relationship('Plant', backref='calendar_events')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'event_date': self.event_date.isoformat(),
            'event_type': self.event_type,
            'completed': self.completed,
            'plant': self.plant.to_dict() if self.plant else None,
            'created_at': self.created_at.isoformat()
        }

class GardenLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), default='My Garden')
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(500))
    zip_code = db.Column(db.String(20))
    climate_zone = db.Column(db.String(50))
    soil_type = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'zip_code': self.zip_code,
            'climate_zone': self.climate_zone,
            'soil_type': self.soil_type,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class PlotArea(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    garden_location_id = db.Column(db.Integer, db.ForeignKey('garden_location.id'), nullable=False)
    name = db.Column(db.String(200))
    plot_type = db.Column(db.String(50), default='rectangular')  # rectangular, circular, polygon
    coordinates = db.Column(db.JSON)  # Store plot boundary coordinates
    center_x = db.Column(db.Float)  # Center position for plant placement
    center_y = db.Column(db.Float)
    width = db.Column(db.Float)  # in feet
    height = db.Column(db.Float)  # in feet
    soil_quality = db.Column(db.String(50))  # poor, fair, good, excellent
    sun_exposure = db.Column(db.String(50))  # full_sun, partial_sun, partial_shade, full_shade
    irrigation_type = db.Column(db.String(50))  # manual, drip, sprinkler, none
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    garden_location = db.relationship('GardenLocation', backref='plots')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'plot_type': self.plot_type,
            'coordinates': self.coordinates,
            'center_x': self.center_x,
            'center_y': self.center_y,
            'width': self.width,
            'height': self.height,
            'soil_quality': self.soil_quality,
            'sun_exposure': self.sun_exposure,
            'irrigation_type': self.irrigation_type,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'plant_placements': [placement.to_dict() for placement in self.plant_placements],
            'plant_count': len(self.plant_placements)
        }

class PlantPlacement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plant_id = db.Column(db.Integer, db.ForeignKey('plant.id'), nullable=False)
    plot_id = db.Column(db.Integer, db.ForeignKey('plot_area.id'), nullable=False)
    x_position = db.Column(db.Float, nullable=False)  # Position within the plot
    y_position = db.Column(db.Float, nullable=False)
    planted_date = db.Column(db.Date)
    removed_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    plant = db.relationship('Plant', backref='placements')
    plot = db.relationship('PlotArea', backref='plant_placements')
    
    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'plot_id': self.plot_id,
            'x_position': self.x_position,
            'y_position': self.y_position,
            # Also provide as latitude/longitude for map compatibility
            'latitude': self.y_position,
            'longitude': self.x_position,
            'planted_date': self.planted_date.isoformat() if self.planted_date else None,
            'removed_date': self.removed_date.isoformat() if self.removed_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'plant': self.plant.to_dict() if self.plant else None,
            # Include basic plot info to avoid circular reference 
            'plot_name': self.plot.name if self.plot else None,
            # Add convenient plant info at top level
            'plant_name': self.plant.custom_name if self.plant else 'Unknown Plant',
            'plant_icon': self._get_plant_icon(),
            'plant_color': self._get_plant_color()
        }
    
    def _get_plant_icon(self):
        """Get plant icon based on plant type name"""
        if not self.plant or not self.plant.plant_type:
            return '🌱'
        
        plant_name = self.plant.plant_type.name
        if not plant_name:
            return '🌱'
            
        plant_name = plant_name.lower()
        icon_map = {
            'tomato': '🍅',
            'lettuce': '🥬', 
            'carrot': '🥕',
            'bell pepper': '🫑',
            'pepper': '🫑',
            'basil': '🌿',
            'rosemary': '🌲',
            'mint': '🌱',
            'marigold': '🌼',
            'sunflower': '🌻',
            'zinnia': '🌺'
        }
        return icon_map.get(plant_name, '🌱')
    
    def _get_plant_color(self):
        """Get plant color based on plant type category"""
        if not self.plant or not self.plant.plant_type:
            return '#4CAF50'
        
        category = self.plant.plant_type.category
        if not category:
            return '#4CAF50'
            
        category = category.lower()
        color_map = {
            'vegetable': '#4CAF50',  # Green
            'vegetables': '#4CAF50',
            'herb': '#2E7D32',       # Dark green
            'herbs': '#2E7D32',
            'flower': '#E91E63',     # Pink
            'flowers': '#E91E63',
            'fruit': '#FF9800'       # Orange
        }
        return color_map.get(category, '#4CAF50')

class PlantJournal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plant_id = db.Column(db.Integer, db.ForeignKey('plant.id'), nullable=False)
    placement_id = db.Column(db.Integer, db.ForeignKey('plant_placement.id'))
    entry_date = db.Column(db.Date, nullable=False)
    entry_type = db.Column(db.String(50))  # observation, care, pest, disease, harvest, general
    title = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    mood = db.Column(db.String(20))  # excited, concerned, satisfied, disappointed
    weather = db.Column(db.String(100))
    temperature = db.Column(db.Float)
    photos = db.Column(db.JSON)  # Array of photo URLs/paths
    tags = db.Column(db.JSON)  # Array of tags like ['pest', 'aphids', 'treatment']
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    plant = db.relationship('Plant', backref='journal_entries')
    placement = db.relationship('PlantPlacement', backref='journal_entries')
    
    def to_dict(self):
        return {
            'id': self.id,
            'plant_id': self.plant_id,
            'placement_id': self.placement_id,
            'entry_date': self.entry_date.isoformat(),
            'entry_type': self.entry_type,
            'title': self.title,
            'content': self.content,
            'mood': self.mood,
            'weather': self.weather,
            'temperature': self.temperature,
            'photos': self.photos,
            'tags': self.tags,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'plant': self.plant.to_dict() if self.plant else None
        } 