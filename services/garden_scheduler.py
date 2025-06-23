import requests
import json
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from models import db, CalendarEvent, PlantPlacement, PlotArea, Plant, PlantType, GardenLocation
from sqlalchemy import and_

class GardenScheduler:
    """
    Intelligent Garden Task Scheduler
    
    Features:
    - Weather-aware watering schedules
    - Plant-specific care calendars
    - Pest lifecycle tracking
    - Automatic Google Calendar sync
    - Dynamic schedule adjustments
    """
    
    def __init__(self):
        self.weather_api_key = "your_openweather_api_key"  # Configure in environment
        self.plant_care_database = self._load_plant_care_database()
        self.pest_calendar = self._load_pest_calendar()
        
    def _load_plant_care_database(self) -> Dict[str, Dict]:
        """Load comprehensive plant care schedules"""
        return {
            'tomato': {
                'category': 'vegetable',
                'watering_frequency': 2,  # days
                'watering_amount': 'deep',  # light, medium, deep
                'fertilizing_schedule': [14, 35, 56],  # days after planting
                'pruning_schedule': [21, 42, 63],  # days after planting
                'harvest_window': [75, 120],  # days after planting
                'companion_planting_time': 0,  # same time as main plant
                'pest_susceptible_to': ['hornworm', 'aphids', 'cutworm'],
                'disease_watch': ['blight', 'wilt', 'mosaic_virus'],
                'cold_sensitivity': True,
                'heat_tolerance': 'high'
            },
            'lettuce': {
                'category': 'leafy_green',
                'watering_frequency': 1,  # daily in hot weather
                'watering_amount': 'light',
                'fertilizing_schedule': [7, 21, 35],
                'pruning_schedule': [],  # no pruning needed
                'harvest_window': [45, 65],
                'companion_planting_time': 0,
                'pest_susceptible_to': ['aphids', 'slugs', 'flea_beetles'],
                'disease_watch': ['downy_mildew', 'lettuce_drop'],
                'cold_sensitivity': False,
                'heat_tolerance': 'low'
            },
            'carrot': {
                'category': 'root_vegetable',
                'watering_frequency': 3,
                'watering_amount': 'medium',
                'fertilizing_schedule': [21, 49],
                'pruning_schedule': [],
                'harvest_window': [70, 100],
                'companion_planting_time': 0,
                'pest_susceptible_to': ['carrot_fly', 'wireworms'],
                'disease_watch': ['leaf_blight', 'root_rot'],
                'cold_sensitivity': False,
                'heat_tolerance': 'medium'
            },
            'bell_pepper': {
                'category': 'vegetable',
                'watering_frequency': 2,
                'watering_amount': 'deep',
                'fertilizing_schedule': [14, 35, 56, 77],
                'pruning_schedule': [28, 49],
                'harvest_window': [70, 120],
                'companion_planting_time': 0,
                'pest_susceptible_to': ['aphids', 'spider_mites', 'hornworm'],
                'disease_watch': ['bacterial_spot', 'anthracnose'],
                'cold_sensitivity': True,
                'heat_tolerance': 'high'
            },
            'basil': {
                'category': 'herb',
                'watering_frequency': 2,
                'watering_amount': 'medium',
                'fertilizing_schedule': [14, 35, 56],
                'pruning_schedule': [21, 35, 49, 63],  # frequent pruning for herbs
                'harvest_window': [30, 120],  # continuous harvest
                'companion_planting_time': 0,
                'pest_susceptible_to': ['aphids', 'spider_mites', 'whiteflies'],
                'disease_watch': ['fusarium_wilt', 'bacterial_leaf_spot'],
                'cold_sensitivity': True,
                'heat_tolerance': 'high'
            },
            'marigold': {
                'category': 'flower',
                'watering_frequency': 3,
                'watering_amount': 'medium',
                'fertilizing_schedule': [21, 49],
                'pruning_schedule': [28, 49, 70],  # deadheading
                'harvest_window': [60, 120],  # flower harvest
                'companion_planting_time': -7,  # plant week before vegetables
                'pest_susceptible_to': ['spider_mites', 'aphids'],
                'disease_watch': ['powdery_mildew', 'root_rot'],
                'cold_sensitivity': True,
                'heat_tolerance': 'high'
            }
        }
    
    def _load_pest_calendar(self) -> Dict[str, Dict]:
        """Load pest lifecycle and emergence dates by region"""
        return {
            'hornworm': {
                'emergence_months': [5, 6, 7, 8],  # May-August
                'lifecycle_days': 30,
                'peak_activity': [6, 7],  # June-July
                'treatment_window': 14,  # days before peak
                'affects_plants': ['tomato', 'pepper', 'eggplant']
            },
            'aphids': {
                'emergence_months': [3, 4, 5, 6, 9, 10],
                'lifecycle_days': 21,
                'peak_activity': [4, 5, 9],
                'treatment_window': 7,
                'affects_plants': ['all']  # affects most plants
            },
            'cutworm': {
                'emergence_months': [4, 5, 6],
                'lifecycle_days': 35,
                'peak_activity': [5, 6],
                'treatment_window': 10,
                'affects_plants': ['tomato', 'pepper', 'lettuce', 'cabbage']
            },
            'carrot_fly': {
                'emergence_months': [5, 6, 8, 9],
                'lifecycle_days': 42,
                'peak_activity': [5, 8],
                'treatment_window': 14,
                'affects_plants': ['carrot', 'parsnip', 'celery']
            },
            'flea_beetles': {
                'emergence_months': [4, 5, 6, 7, 8],
                'lifecycle_days': 28,
                'peak_activity': [5, 6],
                'treatment_window': 7,
                'affects_plants': ['lettuce', 'radish', 'cabbage', 'tomato']
            }
        }
    
    async def get_weather_data(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Get current weather and 7-day forecast"""
        try:
            # Current weather
            current_url = f"http://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={self.weather_api_key}&units=metric"
            
            # 7-day forecast
            forecast_url = f"http://api.openweathermap.org/data/2.5/forecast?lat={latitude}&lon={longitude}&appid={self.weather_api_key}&units=metric"
            
            # For development, return mock data if no API key
            if self.weather_api_key == "your_openweather_api_key":
                return self._get_mock_weather_data()
            
            current_response = requests.get(current_url)
            forecast_response = requests.get(forecast_url)
            
            if current_response.status_code == 200 and forecast_response.status_code == 200:
                current_data = current_response.json()
                forecast_data = forecast_response.json()
                
                return {
                    'current': {
                        'temperature': current_data['main']['temp'],
                        'humidity': current_data['main']['humidity'],
                        'description': current_data['weather'][0]['description'],
                        'precipitation': current_data.get('rain', {}).get('1h', 0)
                    },
                    'forecast': self._process_forecast_data(forecast_data)
                }
            else:
                return self._get_mock_weather_data()
                
        except Exception as e:
            print(f"Weather API error: {e}")
            return self._get_mock_weather_data()
    
    def _get_mock_weather_data(self) -> Dict[str, Any]:
        """Mock weather data for development"""
        return {
            'current': {
                'temperature': 22,
                'humidity': 65,
                'description': 'partly cloudy',
                'precipitation': 0
            },
            'forecast': [
                {'date': date.today() + timedelta(days=i), 'precipitation': 0.5 if i % 3 == 0 else 0, 'temperature': 20 + i}
                for i in range(7)
            ]
        }
    
    def _process_forecast_data(self, forecast_data: Dict) -> List[Dict]:
        """Process weather forecast into daily summaries"""
        daily_data = {}
        
        for item in forecast_data['list']:
            dt = datetime.fromtimestamp(item['dt'])
            day = dt.date()
            
            if day not in daily_data:
                daily_data[day] = {
                    'date': day,
                    'precipitation': 0,
                    'temperature': item['main']['temp'],
                    'humidity': item['main']['humidity']
                }
            
            # Accumulate precipitation
            if 'rain' in item:
                daily_data[day]['precipitation'] += item['rain'].get('3h', 0)
            
            # Update temperature (take midday reading)
            if 10 <= dt.hour <= 14:
                daily_data[day]['temperature'] = item['main']['temp']
        
        return list(daily_data.values())[:7]  # Return 7 days
    
    def calculate_watering_schedule(self, plant_placement: PlantPlacement, weather_data: Dict) -> List[Dict]:
        """Calculate intelligent watering schedule based on plant needs and weather"""
        plant_name = plant_placement.plant.plant_type.name.lower() if plant_placement.plant and plant_placement.plant.plant_type else 'unknown'
        care_info = self.plant_care_database.get(plant_name, self.plant_care_database['tomato'])
        
        base_frequency = care_info['watering_frequency']
        watering_events = []
        
        # Get next 14 days
        for day_offset in range(14):
            check_date = date.today() + timedelta(days=day_offset)
            
            # Check if watering is needed based on frequency
            days_since_planted = (check_date - plant_placement.planted_date).days if plant_placement.planted_date else 0
            
            if days_since_planted % base_frequency == 0:
                # Check weather forecast for this date
                forecast_precip = 0
                for forecast_day in weather_data.get('forecast', []):
                    if forecast_day['date'] == check_date:
                        forecast_precip = forecast_day['precipitation']
                        break
                
                # Adjust watering based on precipitation
                watering_needed = True
                adjustment_note = ""
                
                if forecast_precip > 5:  # Heavy rain expected
                    watering_needed = False
                    adjustment_note = "⛈️ Heavy rain expected - watering skipped"
                elif forecast_precip > 2:  # Light rain expected
                    if care_info['watering_amount'] == 'light':
                        watering_needed = False
                        adjustment_note = "🌧️ Light rain expected - sufficient for this plant"
                    else:
                        adjustment_note = "🌦️ Light rain expected - reduce watering amount"
                
                if watering_needed:
                    watering_events.append({
                        'date': check_date,
                        'type': 'watering',
                        'title': f'💧 Water {plant_placement.plant_name}',
                        'description': f'Water {care_info["watering_amount"]} amount. {adjustment_note}',
                        'plant_id': plant_placement.plant_id,
                        'plot_id': plant_placement.plot_id,
                        'weather_adjusted': bool(adjustment_note)
                    })
        
        return watering_events
    
    def generate_plant_care_schedule(self, plant_placement: PlantPlacement) -> List[Dict]:
        """Generate complete care schedule for a plant"""
        if not plant_placement.planted_date:
            return []
        
        plant_name = plant_placement.plant.plant_type.name.lower() if plant_placement.plant and plant_placement.plant.plant_type else 'unknown'
        care_info = self.plant_care_database.get(plant_name, self.plant_care_database['tomato'])
        
        events = []
        planted_date = plant_placement.planted_date
        
        # Fertilizing schedule
        for days_after in care_info['fertilizing_schedule']:
            event_date = planted_date + timedelta(days=days_after)
            if event_date >= date.today():  # Only future events
                events.append({
                    'date': event_date,
                    'type': 'fertilizing',
                    'title': f'🌱 Fertilize {plant_placement.plant_name}',
                    'description': f'Apply fertilizer according to {plant_name} feeding schedule',
                    'plant_id': plant_placement.plant_id,
                    'plot_id': plant_placement.plot_id
                })
        
        # Pruning schedule
        for days_after in care_info['pruning_schedule']:
            event_date = planted_date + timedelta(days=days_after)
            if event_date >= date.today():
                events.append({
                    'date': event_date,
                    'type': 'pruning',
                    'title': f'✂️ Prune {plant_placement.plant_name}',
                    'description': f'Pruning time for optimal {plant_name} growth',
                    'plant_id': plant_placement.plant_id,
                    'plot_id': plant_placement.plot_id
                })
        
        # Harvest window
        start_harvest = planted_date + timedelta(days=care_info['harvest_window'][0])
        end_harvest = planted_date + timedelta(days=care_info['harvest_window'][1])
        
        if start_harvest >= date.today():
            events.append({
                'date': start_harvest,
                'type': 'harvesting',
                'title': f'🌾 Harvest Ready: {plant_placement.plant_name}',
                'description': f'First harvest window opens! Check {plant_name} for readiness',
                'plant_id': plant_placement.plant_id,
                'plot_id': plant_placement.plot_id
            })
        
        # Pest monitoring
        current_month = date.today().month
        for pest_name, pest_info in self.pest_calendar.items():
            if (plant_name in pest_info['affects_plants'] or 'all' in pest_info['affects_plants']) and \
               current_month in pest_info['emergence_months']:
                
                # Schedule pest monitoring before peak activity
                for peak_month in pest_info['peak_activity']:
                    if peak_month >= current_month:
                        monitoring_date = date(date.today().year, peak_month, 1) - timedelta(days=pest_info['treatment_window'])
                        if monitoring_date >= date.today():
                            events.append({
                                'date': monitoring_date,
                                'type': 'pest_control',
                                'title': f'🐛 Monitor for {pest_name.title()}',
                                'description': f'Check {plant_placement.plant_name} for {pest_name} activity before peak season',
                                'plant_id': plant_placement.plant_id,
                                'plot_id': plant_placement.plot_id
                            })
        
        return events
    
    async def generate_plot_schedule(self, plot_id: int, user_id: int) -> List[Dict]:
        """Generate complete schedule for all plants in a plot"""
        plot = PlotArea.query.filter_by(id=plot_id, user_id=user_id).first()
        if not plot:
            return []
        
        # Get garden location for weather data
        garden_location = plot.garden_location
        weather_data = await self.get_weather_data(garden_location.latitude, garden_location.longitude)
        
        all_events = []
        
        # Process each plant in the plot
        for placement in plot.plant_placements:
            if placement.removed_date:  # Skip removed plants
                continue
            
            # Generate care schedule
            care_events = self.generate_plant_care_schedule(placement)
            all_events.extend(care_events)
            
            # Generate weather-aware watering schedule
            watering_events = self.calculate_watering_schedule(placement, weather_data)
            all_events.extend(watering_events)
        
        # Sort by date
        all_events.sort(key=lambda x: x['date'])
        
        return all_events
    
    async def sync_to_database(self, events: List[Dict], user_id: int) -> None:
        """Save generated events to database"""
        for event_data in events:
            # Check if event already exists
            existing = CalendarEvent.query.filter_by(
                user_id=user_id,
                plant_id=event_data.get('plant_id'),
                event_date=event_data['date'],
                event_type=event_data['type']
            ).first()
            
            if not existing:
                event = CalendarEvent(
                    user_id=user_id,
                    plant_id=event_data.get('plant_id'),
                    title=event_data['title'],
                    description=event_data['description'],
                    event_date=event_data['date'],
                    event_type=event_data['type'],
                    completed=False
                )
                db.session.add(event)
        
        db.session.commit()
    
    async def generate_all_garden_schedules(self, user_id: int) -> Dict[int, List[Dict]]:
        """Generate schedules for all plots in user's garden"""
        plots = PlotArea.query.filter_by(user_id=user_id).all()
        plot_schedules = {}
        
        for plot in plots:
            schedule = await self.generate_plot_schedule(plot.id, user_id)
            plot_schedules[plot.id] = schedule
            
            # Save to database
            await self.sync_to_database(schedule, user_id)
        
        return plot_schedules

# Global scheduler instance
garden_scheduler = GardenScheduler() 