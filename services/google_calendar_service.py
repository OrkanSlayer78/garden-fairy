import os
import json
import pickle
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app
from models import CalendarEvent, PlotArea, PlantPlacement, GardenLocation, db, User

class GoogleCalendarService:
    """
    Google Calendar Integration Service
    
    Features:
    - Create separate calendars for each garden plot
    - Sync garden tasks to Google Calendar
    - Handle calendar permissions and sharing
    - Automatic event creation and updates
    - Color coding by task type
    """
    
    SCOPES = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ]
    
    def __init__(self):
        self.service = None
        self.credentials = None
    
    def get_authorization_url(self):
        """Get Google OAuth authorization URL for calendar access"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                    "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.SCOPES
        )
        # Dynamic redirect URI based on environment
        base_url = os.getenv('FRONTEND_URL', 'https://garden-fairy-production.up.railway.app')
        if current_app and hasattr(current_app, 'config') and current_app.config.get('ENV') == 'development':
            base_url = 'http://localhost:3000'
        flow.redirect_uri = f'{base_url}/auth-callback.html'
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return authorization_url, state
    
    def exchange_code_for_credentials(self, code):
        """Exchange authorization code for credentials"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                    "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=self.SCOPES
        )
        # Dynamic redirect URI based on environment
        base_url = os.getenv('FRONTEND_URL', 'https://garden-fairy-production.up.railway.app')
        if current_app and hasattr(current_app, 'config') and current_app.config.get('ENV') == 'development':
            base_url = 'http://localhost:3000'
        flow.redirect_uri = f'{base_url}/auth-callback.html'
        
        flow.fetch_token(code=code)
        return flow.credentials
    
    def store_credentials(self, user, credentials):
        """Store credentials securely for a user"""
        # Convert credentials to JSON and encode
        creds_dict = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Store as base64 encoded JSON (in production, use proper encryption)
        creds_json = json.dumps(creds_dict)
        encoded_creds = base64.b64encode(creds_json.encode()).decode()
        
        user.google_credentials = encoded_creds
        user.calendar_enabled = True
        db.session.commit()
    
    def load_credentials(self, user):
        """Load stored credentials for a user"""
        if not user.google_credentials:
            return None
        
        try:
            # Decode credentials
            creds_json = base64.b64decode(user.google_credentials.encode()).decode()
            creds_dict = json.loads(creds_json)
            
            # Create Credentials object
            credentials = Credentials(
                token=creds_dict['token'],
                refresh_token=creds_dict['refresh_token'],
                token_uri=creds_dict['token_uri'],
                client_id=creds_dict['client_id'],
                client_secret=creds_dict['client_secret'],
                scopes=creds_dict['scopes']
            )
            
            # Check if credentials need refresh
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                # Update stored credentials
                self.store_credentials(user, credentials)
            
            return credentials
            
        except Exception as e:
            current_app.logger.error(f"Error loading credentials: {e}")
            return None
    
    def get_service(self, user):
        """Get authenticated Google Calendar service"""
        credentials = self.load_credentials(user)
        if not credentials:
            return None
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            return service
        except Exception as e:
            current_app.logger.error(f"Error building calendar service: {e}")
            return None
    
    def create_garden_calendar(self, user, plot_name):
        """Create a dedicated calendar for a garden plot"""
        service = self.get_service(user)
        if not service:
            return None
        
        try:
            calendar_body = {
                'summary': f'🌱 {plot_name} - Garden Tasks',
                'description': f'Garden care tasks and reminders for {plot_name}',
                'timeZone': 'UTC'
            }
            
            created_calendar = service.calendars().insert(body=calendar_body).execute()
            
            # Set calendar color to green
            color_body = {
                'colorId': '11'  # Green color
            }
            service.calendars().patch(
                calendarId=created_calendar['id'],
                body=color_body
            ).execute()
            
            return created_calendar['id']
            
        except Exception as e:
            current_app.logger.error(f"Error creating calendar: {e}")
            return None
    
    def sync_event_to_google(self, user, calendar_event, google_calendar_id):
        """Sync a local calendar event to Google Calendar"""
        service = self.get_service(user)
        if not service:
            return False
        
        try:
            # Convert event to Google Calendar format
            google_event = {
                'summary': calendar_event.title,
                'description': calendar_event.description,
                'start': {
                    'date': calendar_event.event_date.isoformat(),
                    'timeZone': 'UTC'
                },
                'end': {
                    'date': calendar_event.event_date.isoformat(),
                    'timeZone': 'UTC'
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 480},  # 8 hours before
                        {'method': 'popup', 'minutes': 60}    # 1 hour before
                    ]
                },
                'colorId': self.get_event_color_id(calendar_event.event_type)
            }
            
            if calendar_event.google_event_id:
                # Update existing event
                updated_event = service.events().update(
                    calendarId=google_calendar_id,
                    eventId=calendar_event.google_event_id,
                    body=google_event
                ).execute()
                return True
            else:
                # Create new event
                created_event = service.events().insert(
                    calendarId=google_calendar_id,
                    body=google_event
                ).execute()
                
                # Update local event with Google IDs
                calendar_event.google_event_id = created_event['id']
                calendar_event.google_calendar_id = google_calendar_id
                db.session.commit()
                return True
                
        except Exception as e:
            current_app.logger.error(f"Error syncing event to Google: {e}")
            return False
    
    def delete_google_event(self, user, calendar_event):
        """Delete an event from Google Calendar"""
        if not calendar_event.google_event_id or not calendar_event.google_calendar_id:
            return True  # Nothing to delete
        
        service = self.get_service(user)
        if not service:
            return False
        
        try:
            service.events().delete(
                calendarId=calendar_event.google_calendar_id,
                eventId=calendar_event.google_event_id
            ).execute()
            return True
        except Exception as e:
            current_app.logger.error(f"Error deleting Google event: {e}")
            return False
    
    def get_event_color_id(self, event_type):
        """Get Google Calendar color ID for different event types"""
        color_map = {
            'watering': '1',      # Blue
            'fertilizing': '11',  # Green
            'pruning': '6',       # Orange
            'harvesting': '9',    # Purple
            'pest_control': '4',  # Red
            'planting': '2'       # Light green
        }
        return color_map.get(event_type, '1')  # Default to blue
    
    def sync_all_events(self, user):
        """Sync all user's calendar events to Google Calendar"""
        if not user.calendar_enabled:
            return False, "Calendar sync not enabled"
        
        service = self.get_service(user)
        if not service:
            return False, "Unable to connect to Google Calendar"
        
        try:
            # Get user's plots and create calendars if needed
            plots = PlotArea.query.filter_by(user_id=user.id).all()
            
            plot_calendar_map = {}
            
            for plot in plots:
                # Create calendar for this plot
                calendar_id = self.create_garden_calendar(user, plot.name)
                if calendar_id:
                    plot_calendar_map[plot.id] = calendar_id
            
            # Sync events to appropriate calendars
            events = CalendarEvent.query.filter_by(user_id=user.id).all()
            synced_count = 0
            
            for event in events:
                if event.plant and hasattr(event.plant, 'placements') and event.plant.placements:
                    # Find which plot this event belongs to
                    placement = event.plant.placements[0]  # Use first placement
                    if placement.plot_id in plot_calendar_map:
                        calendar_id = plot_calendar_map[placement.plot_id]
                        if self.sync_event_to_google(user, event, calendar_id):
                            synced_count += 1
            
            return True, f"Successfully synced {synced_count} events to Google Calendar"
            
        except Exception as e:
            current_app.logger.error(f"Error syncing all events: {e}")
            return False, f"Sync failed: {str(e)}"

# Global service instance
google_calendar_service = GoogleCalendarService() 