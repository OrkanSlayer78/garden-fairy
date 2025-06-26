import os
import base64
import requests
from typing import Dict, List, Any, Optional
from flask import current_app
import openai
from PIL import Image
import io
from datetime import datetime

class AIPlantAnalysisService:
    """
    AI-powered plant identification and health analysis service
    
    Features:
    - Plant species identification from photos
    - Health analysis (diseases, pests, deficiencies)
    - Growth progress tracking
    - Care recommendations
    """
    
    def __init__(self):
        self.openai_client = None
        self.plantnet_api_key = os.getenv('PLANTNET_API_KEY')
        
    def _get_openai_client(self):
        """Lazy initialization of OpenAI client"""
        if self.openai_client is None:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            
            # Railway-compatible client initialization
            try:
                self.openai_client = openai.OpenAI(api_key=api_key)
            except TypeError as e:
                # Fallback for Railway environment issues
                if "proxies" in str(e):
                    # Use legacy API approach
                    openai.api_key = api_key
                    self.openai_client = openai
                else:
                    raise e
        return self.openai_client
        
    def identify_plant_species(self, image_path: str) -> Dict[str, Any]:
        """Identify plant species using PlantNet API + OpenAI Vision"""
        try:
            # First try PlantNet for scientific accuracy
            plantnet_result = self._query_plantnet(image_path)
            
            # Then use OpenAI Vision for additional context
            openai_result = self._analyze_with_openai_vision(image_path, 
                "Identify this plant species. Provide the common name, scientific name, and brief care tips.")
            
            return {
                'success': True,
                'plantnet_suggestions': plantnet_result,
                'ai_analysis': openai_result,
                'confidence_score': self._calculate_confidence(plantnet_result, openai_result)
            }
            
        except Exception as e:
            current_app.logger.error(f"Plant identification error: {e}")
            return {'success': False, 'error': str(e)}
    
    def analyze_plant_health(self, image_path: str, plant_info: Dict) -> Dict[str, Any]:
        """Analyze plant health from photo"""
        try:
            prompt = f"""
            Analyze this {plant_info.get('name', 'plant')} for health issues. Look for:
            1. Disease symptoms (spots, wilting, discoloration)
            2. Pest damage (holes, sticky residue, visible insects)
            3. Nutrient deficiencies (yellowing patterns, stunted growth)
            4. Watering issues (over/under watering signs)
            5. Overall plant health score (1-10)
            
            Provide specific, actionable recommendations for any issues found.
            Format response as JSON with: health_score, issues_detected, recommendations, urgency_level
            """
            
            analysis = self._analyze_with_openai_vision(image_path, prompt)
            
            return {
                'success': True,
                'analysis': analysis,
                'plant_info': plant_info,
                'analysis_date': datetime.now().isoformat()
            }
            
        except Exception as e:
            current_app.logger.error(f"Plant health analysis error: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_garden_recommendations(self, prompt: str, location_data: Dict) -> Dict[str, Any]:
        """Get AI-powered garden planning recommendations"""
        try:
            system_prompt = f"""
            You are a garden planning expert. The user is located in:
            - Latitude: {location_data.get('latitude')}
            - Longitude: {location_data.get('longitude')}
            - Climate Zone: {location_data.get('climate_zone', 'Unknown')}
            - Soil Type: {location_data.get('soil_type', 'Unknown')}
            
            Provide specific plant recommendations that:
            1. Match their climate zone and growing conditions
            2. Are appropriate for their soil type
            3. Consider companion planting benefits
            4. Include planting timeline and care tips
            5. Suggest local nurseries/suppliers when possible
            
            Format as JSON with: recommended_plants, planting_timeline, care_tips, companion_suggestions, local_suppliers
            """
            
            client = self._get_openai_client()
            
            # Handle both new and legacy OpenAI APIs
            if hasattr(client, 'chat') and hasattr(client.chat, 'completions'):
                # New client API
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",  # Temporarily use GPT-3.5 for debugging
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                )
            else:
                # Legacy API
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ]
                )
            
            recommendation = response.choices[0].message.content
            
            return {
                'success': True,
                'recommendation': recommendation,
                'prompt': prompt,
                'location_context': location_data
            }
            
        except Exception as e:
            current_app.logger.error(f"Garden recommendation error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _query_plantnet(self, image_path: str) -> List[Dict]:
        """Query PlantNet API for plant identification"""
        if not self.plantnet_api_key:
            return []
            
        try:
            files = {'images': open(image_path, 'rb')}
            data = {
                'organs': 'leaf',  # Can be leaf, flower, fruit, bark
                'modifiers': 'planted',
                'language': 'en',
                'api-key': self.plantnet_api_key
            }
            
            response = requests.post(
                'https://my-api.plantnet.org/v2/identify/world',
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                return response.json().get('results', [])
            return []
            
        except Exception as e:
            current_app.logger.error(f"PlantNet API error: {e}")
            return []
    
    def _analyze_with_openai_vision(self, image_path: str, prompt: str) -> str:
        """Analyze image using OpenAI Vision API"""
        try:
            # Encode image to base64
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            response = self._get_openai_client().chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            current_app.logger.error(f"OpenAI Vision API error: {e}")
            return "Analysis failed"
    
    def _calculate_confidence(self, plantnet_result: List, openai_result: str) -> float:
        """Calculate confidence score from multiple sources"""
        confidence = 0.5  # Base confidence
        
        if plantnet_result and len(plantnet_result) > 0:
            # PlantNet provides confidence scores
            top_score = plantnet_result[0].get('score', 0)
            confidence += top_score * 0.3
        
        if "confident" in openai_result.lower() or "certain" in openai_result.lower():
            confidence += 0.2
        
        return min(confidence, 1.0)

# Global service instance
ai_plant_service = AIPlantAnalysisService() 