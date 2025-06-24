from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
import os
import datetime

import firebase_admin
from firebase_admin import credentials, db as firebase_db

# Toggle Firebase integration on/off
firebase_enabled = False

# ────────────────────────────────────────────
# Flask initialisation + CORS (allow Authorization)
# ────────────────────────────────────────────
app = Flask(__name__)

# Allow any origin to hit any /api/* endpoint **and** keep the
# "Authorization" header so browsers can send `Bearer <jwt>`.
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Authorization"],
)

# -------------------------------------------
# JWT / DB configs
# -------------------------------------------
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')  # Change in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# Configure SQLite (or Postgres) database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///evolvx.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ——— Firebase init (will skip on error) ———
import traceback

FIREBASE_CRED = os.path.join(os.getcwd(), 'firebase-credentials.json')
FIREBASE_DB_URL = os.getenv('FIREBASE_DATABASE_URL')

if firebase_enabled and os.path.isfile(FIREBASE_CRED) and FIREBASE_DB_URL:
    try:
        cred = credentials.Certificate(FIREBASE_CRED)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DB_URL
        })
        print("✅ Firebase initialized")
    except Exception as e:
        print("❌ Firebase init failed:", e)
else:
    print("⚠️  Skipping Firebase init")

# -------------------------------------------------
# Database Models
# -------------------------------------------------
class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))
    height = db.Column(db.Float)
    weight = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    workouts = db.relationship('Workout', backref='user', lazy=True)
    rankings = db.relationship('UserRanking', backref='user', lazy=True)
    avatar = db.relationship('UserAvatar', backref='user', uselist=False, lazy=True)

class Workout(db.Model):
    __tablename__ = 'workouts'
    
    workout_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    workout_name = db.Column(db.String(100), nullable=False)
    workout_date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer)  # in minutes
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    exercises = db.relationship('WorkoutExercise', backref='workout', lazy=True, cascade="all, delete-orphan")

class Exercise(db.Model):
    __tablename__ = 'exercises'
    
    exercise_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    is_compound = db.Column(db.Boolean, default=False)

class WorkoutExercise(db.Model):
    __tablename__ = 'workout_exercises'
    
    workout_exercise_id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.workout_id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.exercise_id'), nullable=False)
    sets = db.Column(db.Integer, nullable=False)
    reps = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    exercise = db.relationship('Exercise', backref='workout_exercises', lazy=True)

class UserRanking(db.Model):
    __tablename__ = 'user_rankings'
    
    ranking_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    mmr_score = db.Column(db.Integer, nullable=False)
    rank_tier = db.Column(db.String(20), nullable=False)  # Bronze, Silver, Gold, etc.
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SharedWorkout(db.Model):
    __tablename__ = 'shared_workouts'
    
    shared_workout_id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    workout_name = db.Column(db.String(100), nullable=False)
    workout_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    participants = db.relationship('SharedWorkoutParticipant', backref='shared_workout', lazy=True, cascade="all, delete-orphan")
    creator = db.relationship('User', backref='created_workouts', lazy=True)

class SharedWorkoutParticipant(db.Model):
    __tablename__ = 'shared_workout_participants'
    
    participant_id = db.Column(db.Integer, primary_key=True)
    shared_workout_id = db.Column(db.Integer, db.ForeignKey('shared_workouts.shared_workout_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    user = db.relationship('User', backref='shared_workout_participations', lazy=True)

class UserAvatar(db.Model):
    __tablename__ = 'user_avatars'
    
    avatar_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    body_type = db.Column(db.String(50))
    hair_style = db.Column(db.String(50))
    hair_color = db.Column(db.String(50))
    skin_tone = db.Column(db.String(50))
    outfit = db.Column(db.String(50))
    accessories = db.Column(JSON, default=list)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Friend(db.Model):
    __tablename__ = 'friends'
    
    friendship_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    status = db.Column(db.String(20), nullable=False)  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='friend_requests_sent', lazy=True)
    friend = db.relationship('User', foreign_keys=[friend_id], backref='friend_requests_received', lazy=True)

# API Routes

# Authentication Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password', 'date_of_birth']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 400
    
    try:
        # Parse date of birth
        dob = datetime.datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
        
        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            date_of_birth=dob,
            gender=data.get('gender'),
            height=data.get('height'),
            weight=data.get('weight')
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Initialize user in Firebase for real-time features
        if firebase_enabled:
            firebase_db.child('users').child(str(new_user.user_id)).set({
                'username': new_user.username,
                'online_status': 'offline',
                'last_active': datetime.datetime.utcnow().isoformat()
            })
        
        # Create access token
        access_token = create_access_token(identity=new_user.user_id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': new_user.user_id,
            'access_token': access_token
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate required fields
    if 'email' not in data or 'password' not in data:
        return jsonify({'error': 'Email and password are required'}), 400
    
    try:
        # Find user by email
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user.user_id)
        
        # Update user status in Firebase
        if firebase_enabled:
            firebase_db.child('users').child(str(user.user_id)).update({
                'online_status': 'online',
                'last_active': datetime.datetime.utcnow().isoformat()
            })
        
        return jsonify({
            'message': 'Login successful',
            'user_id': user.user_id,
            'username': user.username,
            'access_token': access_token
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user_id = get_jwt_identity()
    
    try:
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user_id': user.user_id,
            'username': user.username,
            'email': user.email,
            'date_of_birth': user.date_of_birth.isoformat(),
            'gender': user.gender,
            'height': user.height,
            'weight': user.weight,
            'created_at': user.created_at.isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user fields
        updateable_fields = ['username', 'gender', 'height', 'weight']
        for field in updateable_fields:
            if field in data:
                setattr(user, field, data[field])
        
        # Special handling for password update
        if 'password' in data and data['password']:
            user.password_hash = generate_password_hash(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user_id': user.user_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Workout Routes
@app.route('/api/workouts', methods=['GET'])
@jwt_required()
def get_workouts():
    user_id  = get_jwt_identity()
    page     = request.args.get('page',     1,  type=int)
    per_page = request.args.get('per_page', 10, type=int)

    if page < 1 or per_page < 1:
        return jsonify({ 'error': 'page and per_page must be positive integers' }), 422

    paginated = (
        Workout.query
        .filter_by(user_id=user_id)
        .order_by(Workout.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    # <-- your manual mapping here -->
    result = []
    for workout in paginated.items:
        workout_data = {
            'workout_id':   workout.workout_id,
            'workout_name': workout.workout_name,
            'workout_date': workout.workout_date.isoformat(),
            'duration':     workout.duration,
            'notes':        workout.notes,
            'created_at':   workout.created_at.isoformat(),
            'exercises':    []
        }
        for we in workout.exercises:
            ex = we.exercise
            workout_data['exercises'].append({
                'exercise_id':   ex.exercise_id,
                'name':          ex.name,
                'muscle_group':  ex.muscle_group,
                'sets':          we.sets,
                'reps':          we.reps,
                'weight':        we.weight,
            })
        result.append(workout_data)

    return jsonify({
        'workouts': result,
        'total':    paginated.total,
        'page':     page
    })


@app.route('/api/workouts', methods=['POST'])
@jwt_required()
def create_workout():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['workout_name', 'workout_date', 'exercises']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Parse workout date
        workout_date = datetime.datetime.fromisoformat(data['workout_date'])
        
        # Create new workout
        new_workout = Workout(
            user_id=current_user_id,
            workout_name=data['workout_name'],
            workout_date=workout_date,
            duration=data.get('duration'),
            notes=data.get('notes')
        )
        
        db.session.add(new_workout)
        db.session.flush()  # Get workout_id without committing
        
        # Add exercises to workout
        for exercise_data in data['exercises']:
            # Validate required exercise fields
            if 'exercise_id' not in exercise_data or 'sets' not in exercise_data or 'reps' not in exercise_data:
                db.session.rollback()
                return jsonify({'error': 'Each exercise must have exercise_id, sets, and reps'}), 400
            
            # Check if exercise exists
            exercise = Exercise.query.get(exercise_data['exercise_id'])
            if not exercise:
                db.session.rollback()
                return jsonify({'error': f'Exercise with ID {exercise_data["exercise_id"]} not found'}), 404
            
            # Create workout exercise
            workout_exercise = WorkoutExercise(
                workout_id=new_workout.workout_id,
                exercise_id=exercise_data['exercise_id'],
                sets=exercise_data['sets'],
                reps=exercise_data['reps'],
                weight=exercise_data.get('weight')
            )
            
            db.session.add(workout_exercise)
        
        db.session.commit()
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        return jsonify({
            'message': 'Workout created successfully',
            'workout_id': new_workout.workout_id
        }), 201
    
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['GET'])
@jwt_required()
def get_workout(workout_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Prepare workout data
        workout_data = {
            'workout_id': workout.workout_id,
            'workout_name': workout.workout_name,
            'workout_date': workout.workout_date.isoformat(),
            'duration': workout.duration,
            'notes': workout.notes,
            'created_at': workout.created_at.isoformat(),
            'exercises': []
        }
        
        for workout_exercise in workout.exercises:
            exercise = workout_exercise.exercise
            exercise_data = {
                'exercise_id': exercise.exercise_id,
                'name': exercise.name,
                'muscle_group': exercise.muscle_group,
                'sets': workout_exercise.sets,
                'reps': workout_exercise.reps,
                'weight': workout_exercise.weight
            }
            workout_data['exercises'].append(exercise_data)
        
        return jsonify(workout_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['PUT'])
@jwt_required()
def update_workout(workout_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Update workout fields
        updateable_fields = ['workout_name', 'duration', 'notes']
        for field in updateable_fields:
            if field in data:
                setattr(workout, field, data[field])
        
        # Update workout date if provided
        if 'workout_date' in data:
            try:
                workout.workout_date = datetime.datetime.fromisoformat(data['workout_date'])
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Update exercises if provided
        if 'exercises' in data:
            # Remove existing exercises
            for exercise in workout.exercises:
                db.session.delete(exercise)
            
            # Add new exercises
            for exercise_data in data['exercises']:
                # Validate required exercise fields
                if 'exercise_id' not in exercise_data or 'sets' not in exercise_data or 'reps' not in exercise_data:
                    db.session.rollback()
                    return jsonify({'error': 'Each exercise must have exercise_id, sets, and reps'}), 400
                
                # Check if exercise exists
                exercise = Exercise.query.get(exercise_data['exercise_id'])
                if not exercise:
                    db.session.rollback()
                    return jsonify({'error': f'Exercise with ID {exercise_data["exercise_id"]} not found'}), 404
                
                # Create workout exercise
                workout_exercise = WorkoutExercise(
                    workout_id=workout.workout_id,
                    exercise_id=exercise_data['exercise_id'],
                    sets=exercise_data['sets'],
                    reps=exercise_data['reps'],
                    weight=exercise_data.get('weight')
                )
                
                db.session.add(workout_exercise)
        
        db.session.commit()
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        return jsonify({
            'message': 'Workout updated successfully',
            'workout_id': workout.workout_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/workouts/<int:workout_id>', methods=['DELETE'])
@jwt_required()
def delete_workout(workout_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Get workout
        workout = Workout.query.get(workout_id)
        
        if not workout:
            return jsonify({'error': 'Workout not found'}), 404
        
        # Check if workout belongs to current user
        if workout.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to workout'}), 403
        
        # Delete workout
        db.session.delete(workout)
        db.session.commit()
        
        # Update user rankings based on workout
        update_user_rankings(current_user_id)
        
        return jsonify({
            'message': 'Workout deleted successfully'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Exercise Routes
@app.route('/api/exercises', methods=['GET'])
@jwt_required()
def get_exercises():
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group')
        search = request.args.get('search')
        
        # Build query
        query = Exercise.query
        
        if muscle_group:
            query = query.filter_by(muscle_group=muscle_group)
        
        if search:
            query = query.filter(Exercise.name.ilike(f'%{search}%'))
        
        # Execute query
        exercises = query.order_by(Exercise.name).all()
        
        result = []
        for exercise in exercises:
            exercise_data = {
                'exercise_id': exercise.exercise_id,
                'name': exercise.name,
                'muscle_group': exercise.muscle_group,
                'description': exercise.description,
                'is_compound': exercise.is_compound
            }
            result.append(exercise_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ranking Routes
@app.route('/api/rankings/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_rankings(user_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Check if user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=user_id).all()
        
        result = []
        for ranking in rankings:
            ranking_data = {
                'muscle_group': ranking.muscle_group,
                'mmr_score': ranking.mmr_score,
                'rank_tier': ranking.rank_tier,
                'updated_at': ranking.updated_at.isoformat()
            }
            result.append(ranking_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group', 'overall')
        min_age = request.args.get('min_age', type=int)
        max_age = request.args.get('max_age', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Build base query
        if muscle_group == 'overall':
            # For overall ranking, we need to calculate the average MMR across all muscle groups
            # This is a simplified approach - in a real app, you might use a more complex algorithm
            subquery = db.session.query(
                UserRanking.user_id,
                db.func.avg(UserRanking.mmr_score).label('avg_mmr')
            ).group_by(UserRanking.user_id).subquery()
            
            query = db.session.query(
                User,
                subquery.c.avg_mmr
            ).join(
                subquery,
                User.user_id == subquery.c.user_id
            )
        else:
            # For specific muscle group, get the ranking for that muscle group
            query = db.session.query(
                User,
                UserRanking.mmr_score,
                UserRanking.rank_tier
            ).join(
                UserRanking,
                db.and_(
                    User.user_id == UserRanking.user_id,
                    UserRanking.muscle_group == muscle_group
                )
            )
        
        # Apply age filter if provided
        if min_age is not None or max_age is not None:
            today = datetime.date.today()
            if min_age is not None:
                min_date = today.replace(year=today.year - min_age)
                query = query.filter(User.date_of_birth <= min_date)
            if max_age is not None:
                max_date = today.replace(year=today.year - max_age - 1)
                query = query.filter(User.date_of_birth > max_date)
        
        # Order by MMR score
        if muscle_group == 'overall':
            query = query.order_by(subquery.c.avg_mmr.desc())
        else:
            query = query.order_by(UserRanking.mmr_score.desc())
        
        # Paginate results
        paginated_results = query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for item in paginated_results.items:
            user = item[0]
            
            # Calculate age
            today = datetime.date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'age': age
            }
            
            if muscle_group == 'overall':
                user_data['mmr_score'] = int(item[1])  # Convert Decimal to int
                
                # Determine rank tier based on MMR score
                if user_data['mmr_score'] >= 1000:
                    user_data['rank_tier'] = 'Gold'
                elif user_data['mmr_score'] >= 500:
                    user_data['rank_tier'] = 'Silver'
                else:
                    user_data['rank_tier'] = 'Bronze'
            else:
                user_data['mmr_score'] = item[1]
                user_data['rank_tier'] = item[2]
            
            result.append(user_data)
        
        return jsonify({
            'leaderboard': result,
            'total': paginated_results.total,
            'pages': paginated_results.pages,
            'current_page': page,
            'muscle_group': muscle_group
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rankings/leaderboard/friends', methods=['GET'])
@jwt_required()
def get_friends_leaderboard():
    current_user_id = get_jwt_identity()
    
    try:
        # Get query parameters
        muscle_group = request.args.get('muscle_group', 'overall')
        
        # Get user's friends
        friends_query = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
            )
        )
        
        friend_ids = []
        for friendship in friends_query.all():
            if friendship.user_id == current_user_id:
                friend_ids.append(friendship.friend_id)
            else:
                friend_ids.append(friendship.user_id)
        
        # Add current user to the list
        friend_ids.append(current_user_id)
        
        # Build base query
        if muscle_group == 'overall':
            # For overall ranking, calculate the average MMR across all muscle groups
            subquery = db.session.query(
                UserRanking.user_id,
                db.func.avg(UserRanking.mmr_score).label('avg_mmr')
            ).filter(UserRanking.user_id.in_(friend_ids)).group_by(UserRanking.user_id).subquery()
            
            query = db.session.query(
                User,
                subquery.c.avg_mmr
            ).join(
                subquery,
                User.user_id == subquery.c.user_id
            )
        else:
            # For specific muscle group, get the ranking for that muscle group
            query = db.session.query(
                User,
                UserRanking.mmr_score,
                UserRanking.rank_tier
            ).join(
                UserRanking,
                db.and_(
                    User.user_id == UserRanking.user_id,
                    UserRanking.muscle_group == muscle_group
                )
            ).filter(User.user_id.in_(friend_ids))
        
        # Order by MMR score
        if muscle_group == 'overall':
            query = query.order_by(subquery.c.avg_mmr.desc())
        else:
            query = query.order_by(UserRanking.mmr_score.desc())
        
        # Execute query
        results = query.all()
        
        result = []
        for item in results:
            user = item[0]
            
            # Calculate age
            today = datetime.date.today()
            age = today.year - user.date_of_birth.year - ((today.month, today.day) < (user.date_of_birth.month, user.date_of_birth.day))
            
            user_data = {
                'user_id': user.user_id,
                'username': user.username,
                'age': age,
                'is_current_user': user.user_id == current_user_id
            }
            
            if muscle_group == 'overall':
                user_data['mmr_score'] = int(item[1])  # Convert Decimal to int
                
                # Determine rank tier based on MMR score
                if user_data['mmr_score'] >= 1000:
                    user_data['rank_tier'] = 'Gold'
                elif user_data['mmr_score'] >= 500:
                    user_data['rank_tier'] = 'Silver'
                else:
                    user_data['rank_tier'] = 'Bronze'
            else:
                user_data['mmr_score'] = item[1]
                user_data['rank_tier'] = item[2]
            
            result.append(user_data)
        
        return jsonify({
            'leaderboard': result,
            'muscle_group': muscle_group
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Coaching Routes
@app.route('/api/coaching/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    current_user_id = get_jwt_identity()
    
    try:
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=current_user_id).all()
        
        if not rankings:
            return jsonify({'message': 'No workout data available for recommendations'}), 200
        
        # Find the lowest ranked muscle groups
        rankings_by_score = sorted(rankings, key=lambda r: r.mmr_score)
        lowest_ranked = rankings_by_score[:2]  # Get the two lowest ranked muscle groups
        
        recommendations = []
        for ranking in lowest_ranked:
            # Get exercises for this muscle group
            exercises = Exercise.query.filter_by(muscle_group=ranking.muscle_group).limit(3).all()
            
            exercise_list = []
            for exercise in exercises:
                exercise_data = {
                    'exercise_id': exercise.exercise_id,
                    'name': exercise.name,
                    'description': exercise.description,
                    'is_compound': exercise.is_compound
                }
                exercise_list.append(exercise_data)
            
            recommendation = {
                'muscle_group': ranking.muscle_group,
                'rank_tier': ranking.rank_tier,
                'mmr_score': ranking.mmr_score,
                'message': f'Focus on improving your {ranking.muscle_group} strength to increase your rank.',
                'recommended_exercises': exercise_list
            }
            
            recommendations.append(recommendation)
        
        return jsonify({
            'recommendations': recommendations
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/coaching/progress', methods=['GET'])
@jwt_required()
def get_progress():
    current_user_id = get_jwt_identity()
    
    try:
        # Get time period from query parameters
        period = request.args.get('period', 'month')  # week, month, year
        
        # Calculate start date based on period
        today = datetime.datetime.now()
        if period == 'week':
            start_date = today - datetime.timedelta(days=7)
        elif period == 'month':
            start_date = today - datetime.timedelta(days=30)
        elif period == 'year':
            start_date = today - datetime.timedelta(days=365)
        else:
            return jsonify({'error': 'Invalid period. Use week, month, or year.'}), 400
        
        # Get workouts in the period
        workouts = Workout.query.filter(
            Workout.user_id == current_user_id,
            Workout.workout_date >= start_date
        ).order_by(Workout.workout_date).all()
        
        if not workouts:
            return jsonify({'message': 'No workout data available for the selected period'}), 200
        
        # Calculate progress metrics
        total_workouts = len(workouts)
        total_volume = 0
        muscle_group_volume = {}
        
        for workout in workouts:
            for workout_exercise in workout.exercises:
                exercise = workout_exercise.exercise
                volume = workout_exercise.sets * workout_exercise.reps * (workout_exercise.weight or 0)
                total_volume += volume
                
                if exercise.muscle_group not in muscle_group_volume:
                    muscle_group_volume[exercise.muscle_group] = 0
                
                muscle_group_volume[exercise.muscle_group] += volume
        
        # Get user rankings
        rankings = UserRanking.query.filter_by(user_id=current_user_id).all()
        ranking_data = {}
        
        for ranking in rankings:
            ranking_data[ranking.muscle_group] = {
                'rank_tier': ranking.rank_tier,
                'mmr_score': ranking.mmr_score
            }
        
        # Prepare progress data
        progress_data = {
            'period': period,
            'total_workouts': total_workouts,
            'total_volume': total_volume,
            'muscle_groups': []
        }
        
        for muscle_group, volume in muscle_group_volume.items():
            muscle_group_data = {
                'muscle_group': muscle_group,
                'volume': volume,
                'percentage': (volume / total_volume * 100) if total_volume > 0 else 0
            }
            
            if muscle_group in ranking_data:
                muscle_group_data['rank_tier'] = ranking_data[muscle_group]['rank_tier']
                muscle_group_data['mmr_score'] = ranking_data[muscle_group]['mmr_score']
            
            progress_data['muscle_groups'].append(muscle_group_data)
        
        # Sort muscle groups by volume
        progress_data['muscle_groups'] = sorted(
            progress_data['muscle_groups'],
            key=lambda x: x['volume'],
            reverse=True
        )
        
        return jsonify(progress_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Social Routes
@app.route('/api/social/friends', methods=['GET'])
@jwt_required()
def get_friends():
    current_user_id = get_jwt_identity()
    
    try:
        # Get status filter from query parameters
        status = request.args.get('status', 'accepted')  # accepted, pending, all
        
        # Build query based on status
        if status == 'all':
            query = Friend.query.filter(
                db.or_(
                    Friend.user_id == current_user_id,
                    Friend.friend_id == current_user_id
                )
            )
        elif status == 'pending':
            query = Friend.query.filter(
                db.or_(
                    db.and_(Friend.user_id == current_user_id, Friend.status == 'pending'),
                    db.and_(Friend.friend_id == current_user_id, Friend.status == 'pending')
                )
            )
        else:  # accepted
            query = Friend.query.filter(
                db.or_(
                    db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                    db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
                )
            )
        
        # Execute query
        friendships = query.all()
        
        result = []
        for friendship in friendships:
            # Determine which user is the friend
            if friendship.user_id == current_user_id:
                friend = User.query.get(friendship.friend_id)
                is_outgoing = True
            else:
                friend = User.query.get(friendship.user_id)
                is_outgoing = False
            
            # Get friend's workout count
            workout_count = Workout.query.filter_by(user_id=friend.user_id).count()
            
            # Get friend's online status from Firebase
            online_status = 'unknown'
            last_active = None
            
            if firebase_enabled:
                try:
                    friend_data = firebase_db.child('users').child(str(friend.user_id)).get()
                    if friend_data:
                        online_status = friend_data.get('online_status', 'offline')
                        last_active = friend_data.get('last_active')
                except Exception as e:
                    print(f"Firebase error: {e}")
            
            friend_data = {
                'friendship_id': friendship.friendship_id,
                'user_id': friend.user_id,
                'username': friend.username,
                'status': friendship.status,
                'is_outgoing': is_outgoing,
                'created_at': friendship.created_at.isoformat(),
                'workout_count': workout_count,
                'online_status': online_status,
                'last_active': last_active
            }
            
            result.append(friend_data)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if 'friend_id' not in data:
        return jsonify({'error': 'Friend ID is required'}), 400
    
    friend_id = data['friend_id']
    
    # Check if friend ID is valid
    if friend_id == current_user_id:
        return jsonify({'error': 'Cannot send friend request to yourself'}), 400
    
    try:
        # Check if friend exists
        friend = User.query.get(friend_id)
        if not friend:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if friendship already exists
        existing_friendship = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.friend_id == friend_id),
                db.and_(Friend.user_id == friend_id, Friend.friend_id == current_user_id)
            )
        ).first()
        
        if existing_friendship:
            return jsonify({'error': 'Friendship already exists or pending'}), 400
        
        # Create new friendship
        new_friendship = Friend(
            user_id=current_user_id,
            friend_id=friend_id,
            status='pending'
        )
        
        db.session.add(new_friendship)
        db.session.commit()
        
        return jsonify({
            'message': 'Friend request sent successfully',
            'friendship_id': new_friendship.friendship_id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/friends/request/<int:friendship_id>', methods=['PUT'])
@jwt_required()
def respond_to_friend_request(friendship_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    if 'action' not in data:
        return jsonify({'error': 'Action is required (accept or reject)'}), 400
    
    action = data['action']
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action. Use accept or reject.'}), 400
    
    try:
        # Get friendship
        friendship = Friend.query.get(friendship_id)
        
        if not friendship:
            return jsonify({'error': 'Friendship not found'}), 404
        
        # Check if current user is the recipient of the friend request
        if friendship.friend_id != current_user_id:
            return jsonify({'error': 'Unauthorized to respond to this friend request'}), 403
        
        # Check if friendship is pending
        if friendship.status != 'pending':
            return jsonify({'error': 'Friend request is not pending'}), 400
        
        # Update friendship status
        if action == 'accept':
            friendship.status = 'accepted'
            message = 'Friend request accepted'
        else:  # reject
            friendship.status = 'rejected'
            message = 'Friend request rejected'
        
        db.session.commit()
        
        return jsonify({
            'message': message,
            'friendship_id': friendship.friendship_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/shared-workouts', methods=['GET'])
@jwt_required()
def get_shared_workouts():
    current_user_id = get_jwt_identity()
    
    try:
        # Get active shared workouts
        # This includes workouts created by friends and workouts the user is participating in
        
        # Get user's friends
        friends_query = Friend.query.filter(
            db.or_(
                db.and_(Friend.user_id == current_user_id, Friend.status == 'accepted'),
                db.and_(Friend.friend_id == current_user_id, Friend.status == 'accepted')
            )
        )
        
        friend_ids = []
        for friendship in friends_query.all():
            if friendship.user_id == current_user_id:
                friend_ids.append(friendship.friend_id)
            else:
                friend_ids.append(friendship.user_id)
        
        # Get shared workouts created by friends or the user
        creator_workouts = SharedWorkout.query.filter(
            SharedWorkout.creator_id.in_(friend_ids + [current_user_id]),
            SharedWorkout.is_active == True
        ).all()
        
        # Get shared workouts the user is participating in
        participant_workouts_query = db.session.query(SharedWorkout).join(
            SharedWorkoutParticipant,
            db.and_(
                SharedWorkout.shared_workout_id == SharedWorkoutParticipant.shared_workout_id,
                SharedWorkoutParticipant.user_id == current_user_id
            )
        ).filter(SharedWorkout.is_active == True)
        
        participant_workouts = participant_workouts_query.all()
        
        # Combine and deduplicate workouts
        all_workouts = list(set(creator_workouts + participant_workouts))
        
        result = []
        for workout in all_workouts:
            # Get creator
            creator = User.query.get(workout.creator_id)
            
            # Get participants
            participants = SharedWorkoutParticipant.query.filter_by(shared_workout_id=workout.shared_workout_id).all()
            participant_count = len(participants)
            
            # Check if current user is participating
            is_participating = any(p.user_id == current_user_id for p in participants)
            
            # Get real-time data from Firebase
            participant_data = []
            if firebase_enabled:
                try:
                    firebase_workout = firebase_db.child('shared_workouts').child(str(workout.shared_workout_id)).get()
                    if firebase_workout and 'participants' in firebase_workout:
                        for user_id, data in firebase_workout['participants'].items():
                            user = User.query.get(int(user_id))
                            if user:
                                participant_data.append({
                                    'user_id': user.user_id,
                                    'username': user.username,
                                    'joined_at': data.get('joined_at'),
                                    'exercises_completed': data.get('exercises_completed', 0)
                                })
                except Exception as e:
                    print(f"Firebase error: {e}")
            
            workout_data = {
                'shared_workout_id': workout.shared_workout_id,
                'workout_name': workout.workout_name,
                'creator_id': workout.creator_id,
                'creator_name': creator.username if creator else 'Unknown',
                'workout_date': workout.workout_date.isoformat(),
                'is_active': workout.is_active,
                'created_at': workout.created_at.isoformat(),
                'participant_count': participant_count,
                'is_participating': is_participating,
                'is_creator': workout.creator_id == current_user_id,
                'participants': participant_data
            }
            
            result.append(workout_data)
        
        # Sort by creation date, newest first
        result = sorted(result, key=lambda x: x['created_at'], reverse=True)
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/shared-workouts', methods=['POST'])
@jwt_required()
def create_shared_workout():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['workout_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create new shared workout
        new_shared_workout = SharedWorkout(
            creator_id=current_user_id,
            workout_name=data['workout_name'],
            workout_date=datetime.datetime.utcnow(),
            is_active=True
        )
        
        db.session.add(new_shared_workout)
        db.session.flush()  # Get shared_workout_id without committing
        
        # Add creator as first participant
        participant = SharedWorkoutParticipant(
            shared_workout_id=new_shared_workout.shared_workout_id,
            user_id=current_user_id
        )
        
        db.session.add(participant)
        db.session.commit()
        
        # Create entry in Firebase for real-time updates
        if firebase_enabled:
            firebase_db.child('shared_workouts').child(str(new_shared_workout.shared_workout_id)).set({
                'workout_name': new_shared_workout.workout_name,
                'creator_id': new_shared_workout.creator_id,
                'start_time': datetime.datetime.utcnow().isoformat(),
                'is_active': True,
                'participants': {
                    str(current_user_id): {
                        'joined_at': datetime.datetime.utcnow().isoformat(),
                        'exercises_completed': 0
                    }
                }
            })
        
        return jsonify({
            'message': 'Shared workout created successfully',
            'shared_workout_id': new_shared_workout.shared_workout_id
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/social/shared-workouts/<int:shared_workout_id>/join', methods=['POST'])
@jwt_required()
def join_shared_workout(shared_workout_id):
    current_user_id = get_jwt_identity()
    
    try:
        # Check if shared workout exists and is active
        shared_workout = SharedWorkout.query.get(shared_workout_id)
        
        if not shared_workout:
            return jsonify({'error': 'Shared workout not found'}), 404
        
        if not shared_workout.is_active:
            return jsonify({'error': 'Shared workout is not active'}), 400
        
        # Check if user is already a participant
        existing_participant = SharedWorkoutParticipant.query.filter_by(
            shared_workout_id=shared_workout_id,
            user_id=current_user_id
        ).first()
        
        if existing_participant:
            return jsonify({'error': 'User is already a participant'}), 400
        
        # Add user as participant
        participant = SharedWorkoutParticipant(
            shared_workout_id=shared_workout_id,
            user_id=current_user_id
        )
        
        db.session.add(participant)
        db.session.commit()
        
        # Update Firebase for real-time updates
        if firebase_enabled:
            firebase_db.child('shared_workouts').child(str(shared_workout_id)).child('participants').child(str(current_user_id)).set({
                'joined_at': datetime.datetime.utcnow().isoformat(),
                'exercises_completed': 0
            })
        
        return jsonify({
            'message': 'Joined shared workout successfully',
            'shared_workout_id': shared_workout_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Avatar Routes
@app.route('/api/avatar/<int:user_id>', methods=['GET'])
@jwt_required()
def get_avatar(user_id):
    try:
        # Get avatar
        avatar = UserAvatar.query.filter_by(user_id=user_id).first()
        
        if not avatar:
            return jsonify({'message': 'No avatar found for this user'}), 404
        
        avatar_data = {
            'avatar_id': avatar.avatar_id,
            'user_id': avatar.user_id,
            'body_type': avatar.body_type,
            'hair_style': avatar.hair_style,
            'hair_color': avatar.hair_color,
            'skin_tone': avatar.skin_tone,
            'outfit': avatar.outfit,
            'accessories': avatar.accessories,
            'updated_at': avatar.updated_at.isoformat()
        }
        
        return jsonify(avatar_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/avatar/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_avatar(user_id):
    current_user_id = get_jwt_identity()
    
    # Check if user is authorized to update this avatar
    if user_id != current_user_id:
        return jsonify({'error': 'Unauthorized to update this avatar'}), 403
    
    data = request.get_json()
    
    try:
        # Check if user has an avatar
        avatar = UserAvatar.query.filter_by(user_id=user_id).first()
        
        if avatar:
            # Update existing avatar
            updateable_fields = ['body_type', 'hair_style', 'hair_color', 'skin_tone', 'outfit', 'accessories']
            for field in updateable_fields:
                if field in data:
                    setattr(avatar, field, data[field])
        else:
            # Create new avatar
            avatar = UserAvatar(
                user_id=user_id,
                body_type=data.get('body_type'),
                hair_style=data.get('hair_style'),
                hair_color=data.get('hair_color'),
                skin_tone=data.get('skin_tone'),
                outfit=data.get('outfit'),
                accessories=data.get('accessories', [])
            )
            db.session.add(avatar)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Avatar updated successfully',
            'avatar_id': avatar.avatar_id
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Helper Functions
def update_user_rankings(user_id):
    """
    Update user rankings based on workout performance.
    This is a simplified implementation - in a real app, you would use a more complex algorithm.
    """
    try:
        # Get user's workouts
        workouts = Workout.query.filter_by(user_id=user_id).all()
        
        if not workouts:
            return
        
        # Calculate volume and performance for each muscle group
        muscle_group_stats = {}
        
        for workout in workouts:
            for workout_exercise in workout.exercises:
                exercise = workout_exercise.exercise
                muscle_group = exercise.muscle_group
                
                if muscle_group not in muscle_group_stats:
                    muscle_group_stats[muscle_group] = {
                        'total_volume': 0,
                        'workout_count': 0
                    }
                
                # Calculate volume (sets * reps * weight)
                volume = workout_exercise.sets * workout_exercise.reps * (workout_exercise.weight or 0)
                muscle_group_stats[muscle_group]['total_volume'] += volume
                muscle_group_stats[muscle_group]['workout_count'] += 1
        
        # Update rankings for each muscle group
        for muscle_group, stats in muscle_group_stats.items():
            # Calculate MMR score based on volume and workout count
            # This is a simplified formula - in a real app, you would use a more complex algorithm
            mmr_score = int(stats['total_volume'] * 0.1 + stats['workout_count'] * 10)
            
            # Determine rank tier based on MMR score
            if mmr_score >= 1000:
                rank_tier = 'Gold'
            elif mmr_score >= 500:
                rank_tier = 'Silver'
            else:
                rank_tier = 'Bronze'
            
            # Check if ranking exists
            ranking = UserRanking.query.filter_by(user_id=user_id, muscle_group=muscle_group).first()
            
            if ranking:
                # Update existing ranking
                ranking.mmr_score = mmr_score
                ranking.rank_tier = rank_tier
            else:
                # Create new ranking
                ranking = UserRanking(
                    user_id=user_id,
                    muscle_group=muscle_group,
                    mmr_score=mmr_score,
                    rank_tier=rank_tier
                )
                db.session.add(ranking)
        
        db.session.commit()
        
        # Update Firebase for real-time leaderboard
        if firebase_enabled:
            firebase_db.child('rankings').child(str(user_id)).update({
                'updated_at': datetime.datetime.utcnow().isoformat(),
                'muscle_groups': {
                    muscle_group: {
                        'mmr_score': stats['total_volume'] * 0.1 + stats['workout_count'] * 10,
                        'rank_tier': 'Gold' if stats['total_volume'] * 0.1 + stats['workout_count'] * 10 >= 1000 else 'Silver' if stats['total_volume'] * 0.1 + stats['workout_count'] * 10 >= 500 else 'Bronze'
                    } for muscle_group, stats in muscle_group_stats.items()
                }
            })
    
    except Exception as e:
        db.session.rollback()
        print(f"Error updating user rankings: {e}")
# ────────────────────────────────────────────
# New ranking & social endpoints (stubs)
# ────────────────────────────────────────────
@app.route('/api/rankings/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_rankings(user_id):
    # TODO: wire up real ranking logic
    mock_rankings = [
        {"muscle_group": "chest", "rank": "Silver", "mmr": 750},
        {"muscle_group": "back",  "rank": "Gold",   "mmr":1100},
        {"muscle_group": "legs",  "rank": "Bronze", "mmr": 450}
    ]
    return jsonify(mock_rankings), 200

@app.route('/api/social/shared-workouts', methods=['GET'])
@jwt_required()
def get_shared_workouts():
    # TODO: return real shared workouts list
    return jsonify([]), 200

@app.route('/api/social/friends', methods=['GET'])
@jwt_required()
def get_friends():
    status = request.args.get('status', 'accepted')
    # TODO: filter by status
    return jsonify([]), 200

# Initialize database
def initialize_database():
    db.create_all()
    
    # Check if exercises table is empty
    if Exercise.query.count() == 0:
        # Add some default exercises
        default_exercises = [
            # Chest exercises
            {'name': 'Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on a flat bench and press weight upward.', 'is_compound': True},
            {'name': 'Incline Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on an inclined bench and press weight upward.', 'is_compound': True},
            {'name': 'Decline Bench Press', 'muscle_group': 'Chest', 'description': 'Lie on a declined bench and press weight upward.', 'is_compound': True},
            {'name': 'Dumbbell Fly', 'muscle_group': 'Chest', 'description': 'Lie on a bench and move dumbbells in an arc.', 'is_compound': False},
            {'name': 'Push-Up', 'muscle_group': 'Chest', 'description': 'Push body up from the ground.', 'is_compound': True},
            
            # Back exercises
            {'name': 'Pull-Up', 'muscle_group': 'Back', 'description': 'Pull body up to a bar.', 'is_compound': True},
            {'name': 'Lat Pulldown', 'muscle_group': 'Back', 'description': 'Pull a bar down to chest level.', 'is_compound': True},
            {'name': 'Bent Over Row', 'muscle_group': 'Back', 'description': 'Bend over and pull weight to chest.', 'is_compound': True},
            {'name': 'Deadlift', 'muscle_group': 'Back', 'description': 'Lift weight from ground to hip level.', 'is_compound': True},
            {'name': 'T-Bar Row', 'muscle_group': 'Back', 'description': 'Row weight upward using a T-bar.', 'is_compound': True},
            
            # Legs exercises
            {'name': 'Squat', 'muscle_group': 'Legs', 'description': 'Bend knees and lower body, then stand up.', 'is_compound': True},
            {'name': 'Leg Press', 'muscle_group': 'Legs', 'description': 'Push weight away using legs.', 'is_compound': True},
            {'name': 'Leg Extension', 'muscle_group': 'Legs', 'description': 'Extend legs to lift weight.', 'is_compound': False},
            {'name': 'Leg Curl', 'muscle_group': 'Legs', 'description': 'Curl legs to lift weight.', 'is_compound': False},
            {'name': 'Calf Raise', 'muscle_group': 'Legs', 'description': 'Raise heels to lift weight.', 'is_compound': False},
            
            # Shoulders exercises
            {'name': 'Overhead Press', 'muscle_group': 'Shoulders', 'description': 'Press weight overhead.', 'is_compound': True},
            {'name': 'Lateral Raise', 'muscle_group': 'Shoulders', 'description': 'Raise arms to sides.', 'is_compound': False},
            {'name': 'Front Raise', 'muscle_group': 'Shoulders', 'description': 'Raise arms to front.', 'is_compound': False},
            {'name': 'Reverse Fly', 'muscle_group': 'Shoulders', 'description': 'Raise arms to back.', 'is_compound': False},
            {'name': 'Shrug', 'muscle_group': 'Shoulders', 'description': 'Lift shoulders upward.', 'is_compound': False},
            
            # Arms exercises
            {'name': 'Bicep Curl', 'muscle_group': 'Arms', 'description': 'Curl weight toward shoulder.', 'is_compound': False},
            {'name': 'Tricep Extension', 'muscle_group': 'Arms', 'description': 'Extend arms to straighten.', 'is_compound': False},
            {'name': 'Hammer Curl', 'muscle_group': 'Arms', 'description': 'Curl weight with neutral grip.', 'is_compound': False},
            {'name': 'Skull Crusher', 'muscle_group': 'Arms', 'description': 'Lower weight to forehead, then extend arms.', 'is_compound': False},
            {'name': 'Chin-Up', 'muscle_group': 'Arms', 'description': 'Pull body up to a bar with underhand grip.', 'is_compound': True}
        ]
        
        for exercise_data in default_exercises:
            exercise = Exercise(**exercise_data)
            db.session.add(exercise)
        
        db.session.commit()
        print("Added default exercises to database")

with app.app_context():
    initialize_database()

# Run the app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
