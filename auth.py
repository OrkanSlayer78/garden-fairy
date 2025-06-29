import os
import json
from flask import Blueprint, request, redirect, url_for, session, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from google.oauth2 import id_token
from google.auth.transport import requests
from google_auth_oauthlib.flow import Flow
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/google', methods=['POST'])
def google_auth():
    """Handle Google OAuth authentication"""
    try:
        # Get the token from the request
        token = request.json.get('token')
        if not token:
            return jsonify({'error': 'No token provided'}), 400
        
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            current_app.config['GOOGLE_CLIENT_ID']
        )
        
        # Check if the token is from Google
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return jsonify({'error': 'Invalid token issuer'}), 400
        
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo['name']
        picture = idinfo.get('picture', '')
        
        # Check if user exists
        user = User.query.filter_by(google_id=google_id).first()
        
        if not user:
            # Create new user
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture
            )
            db.session.add(user)
            db.session.commit()
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            db.session.commit()
        
        # Log in the user
        login_user(user, remember=True)
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
        
    except ValueError as e:
        return jsonify({'error': 'Invalid token'}), 400
    except Exception as e:
        current_app.logger.error(f"Auth error: {str(e)}")
        return jsonify({'error': 'Authentication failed'}), 500

@auth_bp.route('/auth/logout', methods=['POST'])
@login_required
def logout():
    """Log out the current user"""
    logout_user()
    return jsonify({'success': True})

@auth_bp.route('/auth/user')
def get_current_user():
    """Get current authenticated user info"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': current_user.to_dict()
        })
    else:
        return jsonify({
            'authenticated': False,
            'user': None
        })

@auth_bp.route('/auth/check')
def check_auth():
    """Check if user is authenticated"""
    return jsonify({
        'authenticated': current_user.is_authenticated
    })

@auth_bp.route('/auth/oauth/callback', methods=['POST'])
def oauth_callback():
    """Handle OAuth callback with authorization code"""
    try:
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({'error': 'No authorization code provided'}), 400
        
        # Set up the OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                    "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=['https://www.googleapis.com/auth/userinfo.email', 
                   'https://www.googleapis.com/auth/userinfo.profile', 
                   'https://www.googleapis.com/auth/calendar',
                   'openid']
        )
        
        # Set the redirect URI
        flow.redirect_uri = 'http://localhost:3000/auth/callback'
        
        # Exchange code for tokens
        try:
            flow.fetch_token(code=code)
        except Exception as token_error:
            current_app.logger.error(f"Token exchange error: {str(token_error)}")
            return jsonify({'error': 'Failed to exchange authorization code for tokens'}), 400
        
        # Get user info from the ID token
        credentials = flow.credentials
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            requests.Request(),
            current_app.config['GOOGLE_CLIENT_ID']
        )
        
        google_id = id_info['sub']
        email = id_info['email']
        name = id_info['name']
        picture = id_info.get('picture', '')
        
        # Check if user exists
        user = User.query.filter_by(google_id=google_id).first()
        
        if not user:
            # Create new user
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture
            )
            db.session.add(user)
            db.session.commit()
        else:
            # Update existing user info
            user.email = email
            user.name = name
            user.picture = picture
            db.session.commit()
        
        # Store calendar credentials if we have them
        if credentials and 'https://www.googleapis.com/auth/calendar' in credentials.scopes:
            from services.google_calendar_service import google_calendar_service
            google_calendar_service.store_credentials(user, credentials)
        
        # Log in the user
        login_user(user, remember=True)
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"OAuth callback error: {str(e)}")
        return jsonify({'error': 'OAuth authentication failed'}), 500 