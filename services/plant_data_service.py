import requests
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlantDataService:
    """
    Service for fetching plant data from external APIs and providing 
    companion planting intelligence.
    """
    
    def __init__(self):
        # External API configurations
        self.perenual_api_key = os.getenv('PERENUAL_API_KEY')  # Free tier available
        self.trefle_api_key = os.getenv('TREFLE_API_KEY')      # Free tier available
        
        # Companion planting data (comprehensive database)
        self.companion_data = self._load_companion_data()
        
        # Plant care schedules and problem indicators
        self.care_schedules = self._load_care_schedules()
        
    def _load_companion_data(self) -> Dict:
        """Load companion planting database"""
        return {
            # Vegetables
            'tomatoes': {
                'good_companions': ['basil', 'oregano', 'parsley', 'marigold', 'nasturtium', 'peppers', 'onions', 'garlic', 'carrots'],
                'bad_companions': ['broccoli', 'cabbage', 'fennel', 'kohlrabi', 'walnut_trees'],
                'reasons': {
                    'basil': 'Repels aphids and hornworms, improves flavor',
                    'broccoli': 'Competes for nutrients and can stunt growth',
                    'walnut_trees': 'Walnut roots release juglone, toxic to tomatoes'
                },
                'spacing_requirements': {'min_distance': 18, 'preferred_distance': 24},  # inches
                'pest_warnings': ['hornworms', 'aphids', 'whiteflies'],
                'disease_warnings': ['early_blight', 'late_blight', 'verticillium_wilt']
            },
            'basil': {
                'good_companions': ['tomatoes', 'peppers', 'oregano', 'lettuce'],
                'bad_companions': ['rue', 'sage'],
                'reasons': {
                    'tomatoes': 'Repels pests and improves tomato flavor',
                    'rue': 'Can stunt basil growth'
                },
                'spacing_requirements': {'min_distance': 6, 'preferred_distance': 12},
                'pest_warnings': ['aphids', 'spider_mites'],
                'disease_warnings': ['fusarium_wilt', 'bacterial_leaf_spot']
            },
            'carrots': {
                'good_companions': ['tomatoes', 'onions', 'leeks', 'rosemary', 'sage', 'chives'],
                'bad_companions': ['dill', 'anise', 'fennel'],
                'reasons': {
                    'onions': 'Repel carrot flies',
                    'dill': 'Can reduce carrot yield when mature'
                },
                'spacing_requirements': {'min_distance': 2, 'preferred_distance': 4},
                'pest_warnings': ['carrot_fly', 'wireworms'],
                'disease_warnings': ['carrot_rust_fly', 'leaf_blight']
            },
            'lettuce': {
                'good_companions': ['carrots', 'radishes', 'onions', 'garlic', 'chives', 'marigold'],
                'bad_companions': ['broccoli', 'brussels_sprouts'],
                'reasons': {
                    'carrots': 'Different root depths, no competition',
                    'broccoli': 'Large leaves create too much shade'
                },
                'spacing_requirements': {'min_distance': 4, 'preferred_distance': 8},
                'pest_warnings': ['aphids', 'slugs', 'snails'],
                'disease_warnings': ['downy_mildew', 'bacterial_leaf_spot']
            },
            'onions': {
                'good_companions': ['tomatoes', 'carrots', 'brassicas', 'lettuce', 'peppers'],
                'bad_companions': ['beans', 'peas', 'asparagus'],
                'reasons': {
                    'carrots': 'Repel each other\'s pests',
                    'beans': 'Onions can inhibit bean growth'
                },
                'spacing_requirements': {'min_distance': 4, 'preferred_distance': 6},
                'pest_warnings': ['onion_maggots', 'thrips'],
                'disease_warnings': ['onion_rot', 'downy_mildew']
            },
            'beans': {
                'good_companions': ['corn', 'squash', 'marigold', 'nasturtium', 'radishes'],
                'bad_companions': ['onions', 'garlic', 'fennel'],
                'reasons': {
                    'corn': 'Three Sisters planting - beans fix nitrogen for corn',
                    'onions': 'Can inhibit bean growth'
                },
                'spacing_requirements': {'min_distance': 4, 'preferred_distance': 6},
                'pest_warnings': ['bean_beetles', 'aphids'],
                'disease_warnings': ['bacterial_blight', 'rust']
            },
            'corn': {
                'good_companions': ['beans', 'squash', 'pumpkins', 'cucumbers'],
                'bad_companions': ['tomatoes', 'fennel'],
                'reasons': {
                    'beans': 'Three Sisters - beans provide nitrogen',
                    'tomatoes': 'Both are heavy feeders, compete for nutrients'
                },
                'spacing_requirements': {'min_distance': 12, 'preferred_distance': 18},
                'pest_warnings': ['corn_borers', 'earworms'],
                'disease_warnings': ['corn_smut', 'leaf_blight']
            },
            'peppers': {
                'good_companions': ['tomatoes', 'basil', 'oregano', 'onions', 'carrots'],
                'bad_companions': ['fennel', 'kohlrabi'],
                'reasons': {
                    'basil': 'Repels aphids and other pests',
                    'fennel': 'Can inhibit pepper growth'
                },
                'spacing_requirements': {'min_distance': 12, 'preferred_distance': 18},
                'pest_warnings': ['aphids', 'spider_mites', 'pepper_weevils'],
                'disease_warnings': ['bacterial_spot', 'verticillium_wilt']
            },
            'squash': {
                'good_companions': ['corn', 'beans', 'radishes', 'nasturtium', 'marigold'],
                'bad_companions': ['potatoes', 'aromatic_herbs'],
                'reasons': {
                    'corn': 'Three Sisters planting - squash provides ground cover',
                    'potatoes': 'Both susceptible to similar diseases'
                },
                'spacing_requirements': {'min_distance': 36, 'preferred_distance': 48},
                'pest_warnings': ['squash_bugs', 'cucumber_beetles', 'vine_borers'],
                'disease_warnings': ['powdery_mildew', 'bacterial_wilt']
            },
            'potatoes': {
                'good_companions': ['beans', 'corn', 'cabbage', 'marigold', 'horseradish'],
                'bad_companions': ['tomatoes', 'squash', 'cucumbers', 'sunflowers'],
                'reasons': {
                    'tomatoes': 'Both susceptible to blight diseases',
                    'horseradish': 'Helps repel potato bugs'
                },
                'spacing_requirements': {'min_distance': 12, 'preferred_distance': 15},
                'pest_warnings': ['colorado_potato_beetles', 'wireworms'],
                'disease_warnings': ['late_blight', 'scab', 'black_leg']
            },
            # Herbs
            'marigold': {
                'good_companions': ['tomatoes', 'peppers', 'beans', 'squash', 'lettuce'],
                'bad_companions': [],  # Generally compatible with most plants
                'reasons': {
                    'general': 'Natural pest deterrent, attracts beneficial insects'
                },
                'spacing_requirements': {'min_distance': 6, 'preferred_distance': 12},
                'pest_warnings': ['aphids'],
                'disease_warnings': ['fungal_infections']
            },
            'nasturtium': {
                'good_companions': ['tomatoes', 'cucumbers', 'squash', 'beans'],
                'bad_companions': [],
                'reasons': {
                    'general': 'Trap crop for aphids and cucumber beetles'
                },
                'spacing_requirements': {'min_distance': 8, 'preferred_distance': 12},
                'pest_warnings': ['aphids'],  # Acts as trap crop
                'disease_warnings': ['bacterial_wilt']
            }
        }
    
    def _load_care_schedules(self) -> Dict:
        """Load plant care schedule templates"""
        return {
            'tomatoes': {
                'planting_season': ['spring', 'early_summer'],
                'watering_schedule': {
                    'frequency': 'every_2_days',
                    'amount': 'deep_watering',
                    'notes': 'Water at base to prevent leaf diseases'
                },
                'fertilizing_schedule': {
                    'initial': 'at_planting',
                    'recurring': 'every_3_weeks',
                    'type': 'balanced_then_phosphorus'
                },
                'pruning_schedule': {
                    'suckers': 'weekly',
                    'lower_leaves': 'when_fruiting_begins'
                },
                'harvest_indicators': [
                    'color_change_begins',
                    'slight_give_when_pressed',
                    'days_from_planting_70_85'
                ],
                'common_problems': [
                    {
                        'issue': 'blossom_end_rot',
                        'cause': 'calcium_deficiency_irregular_watering',
                        'solution': 'consistent_watering_calcium_supplement'
                    },
                    {
                        'issue': 'hornworms',
                        'cause': 'moth_larvae',
                        'solution': 'hand_pick_bt_spray_companion_plant_basil'
                    }
                ]
            },
            'lettuce': {
                'planting_season': ['spring', 'fall'],
                'watering_schedule': {
                    'frequency': 'daily',
                    'amount': 'light_frequent',
                    'notes': 'Keep soil consistently moist'
                },
                'fertilizing_schedule': {
                    'initial': 'at_planting',
                    'recurring': 'every_2_weeks',
                    'type': 'nitrogen_rich'
                },
                'harvest_indicators': [
                    'leaves_full_size',
                    'before_bolting',
                    'days_from_planting_45_65'
                ],
                'common_problems': [
                    {
                        'issue': 'bolting',
                        'cause': 'hot_weather_long_days',
                        'solution': 'plant_in_cooler_season_provide_shade'
                    },
                    {
                        'issue': 'slug_damage',
                        'cause': 'moisture_loving_pests',
                        'solution': 'beer_traps_copper_barriers_reduce_watering_frequency'
                    }
                ]
            }
        }
    
    async def get_plant_info_from_apis(self, plant_name: str) -> Dict:
        """
        Fetch comprehensive plant information from external APIs
        """
        plant_info = {
            'name': plant_name,
            'scientific_name': '',
            'care_instructions': {},
            'growth_info': {},
            'pest_disease_info': {},
            'api_sources': []
        }
        
        # Try Perenual API first (good for detailed plant care)
        if self.perenual_api_key:
            try:
                perenual_data = await self._fetch_from_perenual(plant_name)
                if perenual_data:
                    plant_info.update(perenual_data)
                    plant_info['api_sources'].append('perenual')
            except Exception as e:
                logger.warning(f"Perenual API error for {plant_name}: {e}")
        
        # Try Trefle API for botanical information
        if self.trefle_api_key:
            try:
                trefle_data = await self._fetch_from_trefle(plant_name)
                if trefle_data:
                    plant_info.update(trefle_data)
                    plant_info['api_sources'].append('trefle')
            except Exception as e:
                logger.warning(f"Trefle API error for {plant_name}: {e}")
        
        # Enrich with our companion planting data
        companion_info = self.get_companion_planting_info(plant_name.lower())
        if companion_info:
            plant_info['companion_planting'] = companion_info
        
        # Add care schedules
        care_schedule = self.get_care_schedule(plant_name.lower())
        if care_schedule:
            plant_info['care_schedule'] = care_schedule
        
        return plant_info
    
    async def _fetch_from_perenual(self, plant_name: str) -> Optional[Dict]:
        """Fetch data from Perenual Plant API"""
        try:
            # Search for plant
            search_url = f"https://perenual.com/api/species-list"
            params = {
                'key': self.perenual_api_key,
                'q': plant_name,
                'indoor': 0  # Focus on garden plants
            }
            
            response = requests.get(search_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('data') and len(data['data']) > 0:
                plant = data['data'][0]  # Take first match
                
                # Get detailed information
                detail_url = f"https://perenual.com/api/species/details/{plant['id']}"
                detail_params = {'key': self.perenual_api_key}
                
                detail_response = requests.get(detail_url, params=detail_params, timeout=10)
                detail_response.raise_for_status()
                detail_data = detail_response.json()
                
                return {
                    'scientific_name': plant.get('scientific_name', []),
                    'common_names': plant.get('common_name', ''),
                    'cycle': plant.get('cycle', ''),
                    'watering': plant.get('watering', ''),
                    'sunlight': plant.get('sunlight', []),
                    'care_level': detail_data.get('care_level', ''),
                    'growth_rate': detail_data.get('growth_rate', ''),
                    'hardiness': detail_data.get('hardiness', {}),
                    'propagation': detail_data.get('propagation', []),
                    'pruning_month': detail_data.get('pruning_month', [])
                }
        except Exception as e:
            logger.error(f"Error fetching from Perenual API: {e}")
            return None
    
    async def _fetch_from_trefle(self, plant_name: str) -> Optional[Dict]:
        """Fetch data from Trefle API"""
        try:
            search_url = "https://trefle.io/api/v1/plants/search"
            params = {
                'token': self.trefle_api_key,
                'q': plant_name,
                'limit': 1
            }
            
            response = requests.get(search_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data.get('data') and len(data['data']) > 0:
                plant = data['data'][0]
                
                return {
                    'scientific_name': plant.get('scientific_name', ''),
                    'family': plant.get('family', ''),
                    'genus': plant.get('genus', ''),
                    'year': plant.get('year', ''),
                    'bibliography': plant.get('bibliography', ''),
                    'author': plant.get('author', ''),
                    'status': plant.get('status', ''),
                    'rank': plant.get('rank', ''),
                    'family_common_name': plant.get('family_common_name', '')
                }
        except Exception as e:
            logger.error(f"Error fetching from Trefle API: {e}")
            return None
    
    def get_companion_planting_info(self, plant_name: str) -> Optional[Dict]:
        """Get companion planting information for a plant"""
        plant_key = plant_name.lower().replace(' ', '_')
        return self.companion_data.get(plant_key)
    
    def get_care_schedule(self, plant_name: str) -> Optional[Dict]:
        """Get care schedule for a plant"""
        plant_key = plant_name.lower().replace(' ', '_')
        return self.care_schedules.get(plant_key)
    
    def check_plant_compatibility(self, plant1: str, plant2: str, distance_inches: float = None) -> Dict:
        """
        Check compatibility between two plants
        Returns detailed compatibility analysis
        """
        result = {
            'compatible': True,
            'compatibility_score': 0,  # -10 (very bad) to +10 (very good)
            'warnings': [],
            'benefits': [],
            'recommended_distance': None,
            'spacing_issues': []
        }
        
        plant1_data = self.get_companion_planting_info(plant1.lower())
        plant2_data = self.get_companion_planting_info(plant2.lower())
        
        if not plant1_data or not plant2_data:
            result['warnings'].append("Limited companion planting data available")
            return result
        
        # Check direct compatibility
        plant1_key = plant1.lower().replace(' ', '_')
        plant2_key = plant2.lower().replace(' ', '_')
        
        # Check if plant2 is in plant1's good companions
        if plant2_key in plant1_data.get('good_companions', []):
            result['compatibility_score'] += 5
            result['benefits'].append(plant1_data.get('reasons', {}).get(plant2_key, 'Good companion plant'))
        
        # Check if plant2 is in plant1's bad companions
        if plant2_key in plant1_data.get('bad_companions', []):
            result['compatible'] = False
            result['compatibility_score'] -= 5
            result['warnings'].append(plant1_data.get('reasons', {}).get(plant2_key, 'Incompatible companion plants'))
        
        # Check reverse compatibility
        if plant1_key in plant2_data.get('good_companions', []):
            result['compatibility_score'] += 5
            result['benefits'].append(plant2_data.get('reasons', {}).get(plant1_key, 'Mutually beneficial'))
        
        if plant1_key in plant2_data.get('bad_companions', []):
            result['compatible'] = False
            result['compatibility_score'] -= 5
            result['warnings'].append(plant2_data.get('reasons', {}).get(plant1_key, 'Plants negatively affect each other'))
        
        # Check spacing requirements
        if distance_inches:
            plant1_spacing = plant1_data.get('spacing_requirements', {})
            plant2_spacing = plant2_data.get('spacing_requirements', {})
            
            plant1_min = plant1_spacing.get('preferred_distance', plant1_spacing.get('min_distance', 0))
            plant2_min = plant2_spacing.get('preferred_distance', plant2_spacing.get('min_distance', 0))
            
            required_distance = max(plant1_min, plant2_min)
            result['recommended_distance'] = required_distance
            
            if distance_inches < required_distance:
                result['spacing_issues'].append(f"Plants too close. Recommended distance: {required_distance} inches")
                result['compatibility_score'] -= 2
        
        # Check for shared pest/disease vulnerabilities
        plant1_pests = set(plant1_data.get('pest_warnings', []))
        plant2_pests = set(plant2_data.get('pest_warnings', []))
        shared_pests = plant1_pests.intersection(plant2_pests)
        
        if shared_pests:
            result['warnings'].append(f"Shared pest vulnerabilities: {', '.join(shared_pests)}")
            result['compatibility_score'] -= 1
        
        plant1_diseases = set(plant1_data.get('disease_warnings', []))
        plant2_diseases = set(plant2_data.get('disease_warnings', []))
        shared_diseases = plant1_diseases.intersection(plant2_diseases)
        
        if shared_diseases:
            result['warnings'].append(f"Shared disease vulnerabilities: {', '.join(shared_diseases)}")
            result['compatibility_score'] -= 1
        
        return result
    
    def analyze_garden_layout(self, plant_positions: List[Dict]) -> Dict:
        """
        Analyze an entire garden layout for compatibility issues
        plant_positions: [{'plant_name': str, 'x': float, 'y': float, 'id': str}, ...]
        """
        analysis = {
            'overall_score': 0,
            'compatibility_issues': [],
            'benefits': [],
            'recommendations': [],
            'critical_warnings': []
        }
        
        # Check each pair of plants
        for i, plant1 in enumerate(plant_positions):
            for j, plant2 in enumerate(plant_positions[i+1:], i+1):
                # Calculate distance (assuming coordinates are in inches)
                distance = ((plant1['x'] - plant2['x'])**2 + (plant1['y'] - plant2['y'])**2)**0.5
                
                compatibility = self.check_plant_compatibility(
                    plant1['plant_name'], 
                    plant2['plant_name'], 
                    distance
                )
                
                analysis['overall_score'] += compatibility['compatibility_score']
                
                if not compatibility['compatible']:
                    analysis['critical_warnings'].append({
                        'plant1': plant1['plant_name'],
                        'plant2': plant2['plant_name'],
                        'distance': distance,
                        'issues': compatibility['warnings']
                    })
                
                if compatibility['spacing_issues']:
                    analysis['compatibility_issues'].extend([
                        {
                            'plant1': plant1['plant_name'],
                            'plant2': plant2['plant_name'],
                            'issue': issue
                        } for issue in compatibility['spacing_issues']
                    ])
                
                if compatibility['benefits']:
                    analysis['benefits'].extend([
                        {
                            'plant1': plant1['plant_name'],
                            'plant2': plant2['plant_name'],
                            'benefit': benefit
                        } for benefit in compatibility['benefits']
                    ])
        
        # Generate recommendations
        if analysis['critical_warnings']:
            analysis['recommendations'].append("Consider relocating incompatible plants")
        
        if analysis['compatibility_issues']:
            analysis['recommendations'].append("Increase spacing between overcrowded plants")
        
        if analysis['overall_score'] > 5:
            analysis['recommendations'].append("Great plant combinations! Your garden layout promotes healthy growth")
        
        return analysis
    
    def get_seasonal_care_reminders(self, plant_name: str, current_date: datetime = None) -> List[Dict]:
        """
        Get care reminders based on plant type and current season
        """
        if not current_date:
            current_date = datetime.now()
        
        care_schedule = self.get_care_schedule(plant_name.lower())
        if not care_schedule:
            return []
        
        reminders = []
        month = current_date.month
        
        # Season-based reminders
        if month in [3, 4, 5]:  # Spring
            if 'spring' in care_schedule.get('planting_season', []):
                reminders.append({
                    'type': 'planting',
                    'message': f'Ideal time to plant {plant_name}',
                    'priority': 'high'
                })
        
        # Add more seasonal logic here based on care_schedules data
        
        return reminders

# Initialize service instance
plant_data_service = PlantDataService() 