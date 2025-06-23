from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, CalendarEvent, PlotArea
from datetime import datetime, date
from services.garden_scheduler import garden_scheduler
import asyncio

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/api/calendar', methods=['GET'])
@login_required
def get_calendar_events():
    """Get all calendar events for the current user"""
    # Optional date filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = CalendarEvent.query.filter_by(user_id=current_user.id)
    
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        query = query.filter(CalendarEvent.event_date >= start_date)
    
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        query = query.filter(CalendarEvent.event_date <= end_date)
    
    events = query.order_by(CalendarEvent.event_date).all()
    return jsonify([event.to_dict() for event in events])

@calendar_bp.route('/api/calendar', methods=['POST'])
@login_required
def create_calendar_event():
    """Create a new calendar event"""
    data = request.get_json()
    
    event_date = datetime.strptime(data['event_date'], '%Y-%m-%d').date()
    
    event = CalendarEvent(
        user_id=current_user.id,
        plant_id=data.get('plant_id'),
        title=data.get('title'),
        description=data.get('description'),
        event_date=event_date,
        event_type=data.get('event_type'),
        completed=data.get('completed', False)
    )
    
    db.session.add(event)
    db.session.commit()
    
    return jsonify(event.to_dict()), 201

@calendar_bp.route('/api/calendar/<int:event_id>', methods=['GET'])
@login_required
def get_calendar_event(event_id):
    """Get a specific calendar event"""
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    
    if not event:
        return jsonify({'error': 'Calendar event not found'}), 404
    
    return jsonify(event.to_dict())

@calendar_bp.route('/api/calendar/<int:event_id>', methods=['PUT'])
@login_required
def update_calendar_event(event_id):
    """Update a specific calendar event"""
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    
    if not event:
        return jsonify({'error': 'Calendar event not found'}), 404
    
    data = request.get_json()
    
    # Update fields
    if 'plant_id' in data:
        event.plant_id = data['plant_id']
    if 'title' in data:
        event.title = data['title']
    if 'description' in data:
        event.description = data['description']
    if 'event_date' in data:
        event.event_date = datetime.strptime(data['event_date'], '%Y-%m-%d').date()
    if 'event_type' in data:
        event.event_type = data['event_type']
    if 'completed' in data:
        event.completed = data['completed']
    
    db.session.commit()
    
    return jsonify(event.to_dict())

@calendar_bp.route('/api/calendar/<int:event_id>', methods=['DELETE'])
@login_required
def delete_calendar_event(event_id):
    """Delete a specific calendar event"""
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    
    if not event:
        return jsonify({'error': 'Calendar event not found'}), 404
    
    db.session.delete(event)
    db.session.commit()
    
    return jsonify({'message': 'Calendar event deleted successfully'})

@calendar_bp.route('/api/calendar/<int:event_id>/complete', methods=['POST'])
@login_required
def complete_calendar_event(event_id):
    """Mark a calendar event as completed"""
    event = CalendarEvent.query.filter_by(id=event_id, user_id=current_user.id).first()
    
    if not event:
        return jsonify({'error': 'Calendar event not found'}), 404
    
    event.completed = True
    db.session.commit()
    
    return jsonify(event.to_dict())

@calendar_bp.route('/api/calendar/upcoming', methods=['GET'])
@login_required
def get_upcoming_events():
    """Get upcoming events for the current user"""
    today = date.today()
    
    events = CalendarEvent.query.filter_by(
        user_id=current_user.id,
        completed=False
    ).filter(
        CalendarEvent.event_date >= today
    ).order_by(CalendarEvent.event_date).limit(10).all()
    
    return jsonify([event.to_dict() for event in events])

@calendar_bp.route('/api/calendar/overdue', methods=['GET'])
@login_required
def get_overdue_events():
    """Get overdue events for the current user"""
    today = date.today()
    
    events = CalendarEvent.query.filter_by(
        user_id=current_user.id,
        completed=False
    ).filter(
        CalendarEvent.event_date < today
    ).order_by(CalendarEvent.event_date).all()
    
    return jsonify([event.to_dict() for event in events])

@calendar_bp.route('/api/calendar/generate-schedule', methods=['POST'])
@login_required
def generate_smart_schedule():
    """Generate intelligent garden schedule for all plots"""
    try:
        from models import PlotArea, PlantPlacement, Plant, PlantType, GardenLocation
        from datetime import timedelta
        
        # Get user's plots with plants
        plots = PlotArea.query.filter_by(user_id=current_user.id).all()
        
        if not plots:
            return jsonify({
                'success': False,
                'error': 'No garden plots found. Please create some plots first.'
            }), 400
        
        total_events = 0
        plot_schedules = {}
        
        # Simple plant care database
        care_schedules = {
            'tomato': {
                'watering_days': [2, 4, 6, 8, 10, 12, 14],  # Every 2 days for 2 weeks
                'fertilizing_days': [14, 35, 56],
                'pruning_days': [21, 42, 63],
                'harvest_days': [75, 90, 105]
            },
            'lettuce': {
                'watering_days': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],  # Daily for 10 days
                'fertilizing_days': [7, 21, 35],
                'harvest_days': [45, 50, 55, 60]
            },
            'carrot': {
                'watering_days': [3, 6, 9, 12, 15, 18, 21],  # Every 3 days
                'fertilizing_days': [21, 49],
                'harvest_days': [70, 85, 100]
            },
            'bell_pepper': {
                'watering_days': [2, 4, 6, 8, 10, 12, 14],
                'fertilizing_days': [14, 35, 56, 77],
                'pruning_days': [28, 49],
                'harvest_days': [70, 85, 100, 115]
            }
        }
        
        # Generate events for each plot
        for plot in plots:
            plot_events = []
            
            # Get plants in this plot
            placements = PlantPlacement.query.filter_by(plot_id=plot.id, user_id=current_user.id).filter(
                PlantPlacement.removed_date.is_(None)
            ).all()
            
            for placement in placements:
                if not placement.planted_date or not placement.plant or not placement.plant.plant_type:
                    continue
                
                plant_name = placement.plant.plant_type.name.lower()
                care_schedule = care_schedules.get(plant_name, care_schedules['tomato'])  # Default to tomato
                
                # Generate watering events
                for days_after in care_schedule['watering_days']:
                    event_date = placement.planted_date + timedelta(days=days_after)
                    if event_date >= date.today():  # Only future events
                        
                        # Check if event already exists
                        existing = CalendarEvent.query.filter_by(
                            user_id=current_user.id,
                            plant_id=placement.plant_id,
                            event_date=event_date,
                            event_type='watering'
                        ).first()
                        
                        if not existing:
                            plant_display_name = placement.plant.custom_name if placement.plant.custom_name else placement.plant.plant_type.name
                            event = CalendarEvent(
                                user_id=current_user.id,
                                plant_id=placement.plant_id,
                                title=f'💧 Water {plant_display_name}',
                                description=f'Water your {plant_name} in {plot.name}',
                                event_date=event_date,
                                event_type='watering',
                                completed=False
                            )
                            db.session.add(event)
                            plot_events.append(event)
                            total_events += 1
                
                # Generate fertilizing events
                for days_after in care_schedule.get('fertilizing_days', []):
                    event_date = placement.planted_date + timedelta(days=days_after)
                    if event_date >= date.today():
                        
                        existing = CalendarEvent.query.filter_by(
                            user_id=current_user.id,
                            plant_id=placement.plant_id,
                            event_date=event_date,
                            event_type='fertilizing'
                        ).first()
                        
                        if not existing:
                            plant_display_name = placement.plant.custom_name if placement.plant.custom_name else placement.plant.plant_type.name
                            event = CalendarEvent(
                                user_id=current_user.id,
                                plant_id=placement.plant_id,
                                title=f'🌱 Fertilize {plant_display_name}',
                                description=f'Apply fertilizer to your {plant_name} in {plot.name}',
                                event_date=event_date,
                                event_type='fertilizing',
                                completed=False
                            )
                            db.session.add(event)
                            plot_events.append(event)
                            total_events += 1
                
                # Generate harvest events
                for days_after in care_schedule.get('harvest_days', []):
                    event_date = placement.planted_date + timedelta(days=days_after)
                    if event_date >= date.today():
                        
                        existing = CalendarEvent.query.filter_by(
                            user_id=current_user.id,
                            plant_id=placement.plant_id,
                            event_date=event_date,
                            event_type='harvesting'
                        ).first()
                        
                        if not existing:
                            plant_display_name = placement.plant.custom_name if placement.plant.custom_name else placement.plant.plant_type.name
                            event = CalendarEvent(
                                user_id=current_user.id,
                                plant_id=placement.plant_id,
                                title=f'🌾 Harvest {plant_display_name}',
                                description=f'Check if your {plant_name} is ready to harvest in {plot.name}',
                                event_date=event_date,
                                event_type='harvesting',
                                completed=False
                            )
                            db.session.add(event)
                            plot_events.append(event)
                            total_events += 1
            
            plot_schedules[plot.id] = len(plot_events)
        
        # Commit all events to database
        db.session.commit()
        
        # Auto-sync to Google Calendar if enabled
        google_sync_message = ""
        if current_user.calendar_enabled:
            try:
                from services.google_calendar_service import google_calendar_service
                sync_success, sync_message = google_calendar_service.sync_all_events(current_user)
                if sync_success:
                    google_sync_message = f" Events synced to Google Calendar! 📅"
                else:
                    google_sync_message = f" (Google Calendar sync failed: {sync_message})"
            except Exception as e:
                google_sync_message = f" (Google Calendar sync error)"
        
        return jsonify({
            'success': True,
            'message': f'Generated {total_events} garden tasks across {len(plots)} plots{google_sync_message}',
            'plot_schedules': plot_schedules,
            'total_events': total_events,
            'google_synced': current_user.calendar_enabled
        })
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error generating schedule: {e}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/api/calendar/weather-forecast', methods=['GET'])
@login_required
def get_weather_forecast():
    """Get weather forecast for garden location"""
    try:
        # For now, return mock weather data to avoid API complexity
        # In a real implementation, you would call a weather API here
        
        mock_weather = {
            'current': {
                'temperature': 22.5,
                'description': 'partly cloudy',
                'humidity': 62
            },
            'forecast': [
                {'date': '2025-06-08', 'temperature': 24, 'precipitation': 0},
                {'date': '2025-06-09', 'temperature': 22, 'precipitation': 0.1},
                {'date': '2025-06-10', 'temperature': 20, 'precipitation': 8.5},
                {'date': '2025-06-11', 'temperature': 21, 'precipitation': 2.3},
                {'date': '2025-06-12', 'temperature': 25, 'precipitation': 0},
                {'date': '2025-06-13', 'temperature': 26, 'precipitation': 0},
                {'date': '2025-06-14', 'temperature': 23, 'precipitation': 0}
            ]
        }
        
        return jsonify({
            'success': True,
            'location': {
                'name': 'My Garden',
                'latitude': 40.7128,
                'longitude': -74.0060
            },
            'weather': mock_weather
        })
        
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/api/calendar/smart-insights', methods=['GET'])
@login_required
def get_smart_insights():
    """Get smart garden insights and recommendations"""
    try:
        from models import PlotArea, PlantPlacement, Plant, PlantType
        from datetime import timedelta
        
        insights = {
            'weather_alerts': [],
            'harvest_ready': [],
            'care_needed': [],
            'pest_warnings': []
        }
        
        # Get upcoming harvest events
        harvest_events = CalendarEvent.query.filter_by(
            user_id=current_user.id,
            event_type='harvesting',
            completed=False
        ).filter(
            CalendarEvent.event_date <= date.today() + timedelta(days=7)
        ).order_by(CalendarEvent.event_date).all()
        
        for event in harvest_events:
            insights['harvest_ready'].append({
                'plant_name': event.title.replace('🌾 Harvest ', ''),
                'days_until': (event.event_date - date.today()).days,
                'date': event.event_date.strftime('%Y-%m-%d')
            })
        
        # Get overdue watering events
        overdue_watering = CalendarEvent.query.filter_by(
            user_id=current_user.id,
            event_type='watering',
            completed=False
        ).filter(
            CalendarEvent.event_date < date.today()
        ).order_by(CalendarEvent.event_date).all()
        
        for event in overdue_watering:
            insights['care_needed'].append({
                'plant_name': event.title.replace('💧 Water ', ''),
                'action': 'Watering overdue',
                'days_overdue': (date.today() - event.event_date).days
            })
        
        # Mock weather alerts
        insights['weather_alerts'].append({
            'type': 'rain',
            'message': 'Heavy rain expected June 10th - skip watering that day',
            'severity': 'info'
        })
        
        # Mock pest warnings based on season
        insights['pest_warnings'].append({
            'pest': 'Aphids',
            'plants_affected': ['Tomato', 'Bell Pepper'],
            'emergence_date': '2025-06-15',
            'prevention': 'Check undersides of leaves weekly'
        })
        
        return jsonify({
            'success': True,
            'insights': insights
        })
        
    except Exception as e:
        print(f"Error generating insights: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Google Calendar Integration Endpoints
@calendar_bp.route('/api/calendar/google-status', methods=['GET'])
@login_required
def get_google_calendar_status():
    """Get Google Calendar integration status"""
    return jsonify({
        'success': True,
        'google_calendar_connected': current_user.calendar_enabled,
        'message': 'Google Calendar sync available!' if current_user.calendar_enabled else 'Connect your Google Calendar to enable sync',
        'features_available': [
            'Separate calendar for each garden plot',
            'Automatic sync of garden tasks',
            'Smart reminders and notifications',
            'Color-coded task types'
        ]
    })

@calendar_bp.route('/api/calendar/google-sync', methods=['POST'])
@login_required 
def sync_to_google_calendar():
    """Sync all garden events to Google Calendar"""
    try:
        if not current_user.calendar_enabled:
            return jsonify({
                'success': False,
                'error': 'Google Calendar not connected. Please authorize access first.'
            }), 400
        
        from services.google_calendar_service import google_calendar_service
        success, message = google_calendar_service.sync_all_events(current_user)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"Error syncing to Google Calendar: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to sync with Google Calendar'
        }), 500

@calendar_bp.route('/api/calendar/google-auth-url', methods=['GET'])
@login_required
def get_google_auth_url():
    """Get Google Calendar authorization URL"""
    try:
        from services.google_calendar_service import google_calendar_service
        auth_url, state = google_calendar_service.get_authorization_url()
        
        return jsonify({
            'success': True,
            'auth_url': auth_url,
            'state': state
        })
        
    except Exception as e:
        current_app.logger.error(f"Error getting auth URL: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get authorization URL'
        }), 500

@calendar_bp.route('/api/calendar/google-callback', methods=['POST'])
@login_required
def handle_google_calendar_callback():
    """Handle Google Calendar OAuth callback"""
    try:
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({'error': 'No authorization code provided'}), 400
        
        from services.google_calendar_service import google_calendar_service
        credentials = google_calendar_service.exchange_code_for_credentials(code)
        google_calendar_service.store_credentials(current_user, credentials)
        
        return jsonify({
            'success': True,
            'message': 'Google Calendar connected successfully!',
            'calendar_enabled': True
        })
        
    except Exception as e:
        current_app.logger.error(f"Calendar callback error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to connect Google Calendar'
        }), 500

@calendar_bp.route('/api/calendar/google-disconnect', methods=['POST'])
@login_required
def disconnect_google_calendar():
    """Disconnect Google Calendar integration"""
    try:
        current_user.google_credentials = None
        current_user.calendar_enabled = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Google Calendar disconnected successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Error disconnecting calendar: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to disconnect Google Calendar'
        }), 500