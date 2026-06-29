"""
YOLO-based AI Proctoring System
Detects: phone, multiple faces, books, face not visible, looking away, etc.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from ultralytics import YOLO
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize YOLO model (YOLOv8)
# You can use custom trained model or pretrained COCO model
yolo_model = YOLO('yolov8n.pt')  # nano model for speed, use 'yolov8m.pt' for better accuracy

# Initialize Haar Cascade for face detection (more reliable than MediaPipe in this version)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Define classes of interest for proctoring
# Using very low confidence thresholds to catch more objects
RESTRICTED_OBJECTS = {
    'cell phone': 'phone_detected',
    'book': 'book_detected',
    'laptop': 'laptop_detected',
    'keyboard': 'external_keyboard_detected',
    'mouse': 'external_mouse_detected',
    'remote': 'phone_detected',  # Remote controls often confused with phones
    'cup': 'drink_detected',
    'backpack': 'materials_detected',
    'handbag': 'materials_detected',
    'suitcase': 'materials_detected',
    'tv': 'screen_detected',
    'bottle': 'drink_detected',
    'scissors': 'materials_detected',
    'pen': 'materials_detected',
    'pencil': 'materials_detected',
}

def base64_to_image(base64_string):
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if 'base64,' in base64_string:
            base64_string = base64_string.split('base64,')[1]
        
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error converting base64 to image: {e}")
        return None

def detect_objects(image):
    """Detect objects using YOLO with very low confidence for maximum phone detection"""
    # Use extremely low confidence for phone and book detection (0.05 = 5%)
    results = yolo_model(image, conf=0.05, verbose=False)
    detections = []
    
    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = yolo_model.names[cls]
            
            detection = {
                'class': class_name,
                'confidence': conf,
                'bbox': box.xyxy[0].tolist()
            }
            detections.append(detection)
            
            # Log phone detections for debugging
            if 'phone' in class_name.lower() or 'cell' in class_name.lower():
                logger.info(f"📱 Phone detected: {class_name} with {conf*100:.1f}% confidence")
    
    return detections

def detect_faces_and_gaze(image):
    """Detect faces and estimate gaze direction using OpenCV with head tilt detection"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    face_data = {
        'num_faces': 0,
        'faces': [],
        'gaze_direction': 'unknown',
        'face_visible': False,
        'head_tilted': False
    }
    
    # Detect faces with multiple scales for better accuracy
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    if len(faces) > 0:
        face_data['num_faces'] = len(faces)
        face_data['face_visible'] = True
        
        # Process the largest face (assume it's the candidate)
        if len(faces) > 0:
            # Sort by area (largest first)
            faces = sorted(faces, key=lambda x: x[2] * x[3], reverse=True)
            x, y, w, h = faces[0]
            
            face_data['faces'].append({
                'confidence': 0.95,
                'bbox': {
                    'x': x / image.shape[1],
                    'y': y / image.shape[0],
                    'width': w / image.shape[1],
                    'height': h / image.shape[0]
                }
            })
            
            # Estimate gaze by checking face position and orientation
            face_center_x = x + w/2
            face_center_y = y + h/2
            frame_center_x = image.shape[1] / 2
            frame_center_y = image.shape[0] / 2
            face_width_ratio = w / image.shape[1]
            
            # Check head tilt using aspect ratio
            # Normal upright face has height > width (ratio typically 1.2-1.4)
            face_aspect_ratio = h / w if w > 0 else 0
            
            # Detect head tilt: if aspect ratio deviates significantly from normal
            # or check pixel distribution in face region
            roi_gray = gray[y:y+h, x:x+w]
            
            # Check if head is tilted by analyzing face orientation
            # Tilted head will have unusual aspect ratio or asymmetric features
            if face_aspect_ratio < 1.0 or face_aspect_ratio > 1.6:
                face_data['head_tilted'] = True
                face_data['gaze_direction'] = 'tilted'
            
            # Face position analysis
            offset_ratio_x = abs(face_center_x - frame_center_x) / image.shape[1]
            offset_ratio_y = abs(face_center_y - frame_center_y) / image.shape[0]
            
            if face_width_ratio < 0.12:
                # Face too small - person might be far or looking away
                face_data['gaze_direction'] = 'away'
            elif offset_ratio_x > 0.30:
                # Face too far from horizontal center
                if face_center_x < frame_center_x:
                    face_data['gaze_direction'] = 'left'
                else:
                    face_data['gaze_direction'] = 'right'
            elif offset_ratio_y > 0.25:
                # Face too far from vertical center (looking up/down)
                face_data['gaze_direction'] = 'away'
            elif not face_data['head_tilted']:
                # Try to detect eyes for more accurate gaze
                eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 3)
                
                if len(eyes) >= 2:
                    # Both eyes detected - check eye positions
                    eye_positions = [(e[0] + e[2]/2, e[1] + e[3]/2) for e in eyes[:2]]
                    # Check if eyes are roughly horizontal (not tilted)
                    eye_y_diff = abs(eye_positions[0][1] - eye_positions[1][1])
                    if eye_y_diff > h * 0.15:  # Eyes not aligned horizontally
                        face_data['head_tilted'] = True
                        face_data['gaze_direction'] = 'tilted'
                    else:
                        face_data['gaze_direction'] = 'center'
                elif len(eyes) == 1:
                    # Only one eye - might be looking sideways or tilted
                    eye_x = eyes[0][0]
                    roi_center = w / 2
                    if abs(eye_x - roi_center) > w * 0.25:
                        face_data['gaze_direction'] = 'left' if eye_x < roi_center else 'right'
                    else:
                        face_data['gaze_direction'] = 'center'
                else:
                    # No eyes detected - might be tilted or looking away
                    face_data['gaze_direction'] = 'away'
    
    return face_data

def analyze_frame(image):
    """Comprehensive frame analysis"""
    violations = []
    analysis_result = {
        'timestamp': datetime.now().isoformat(),
        'violations': [],
        'detections': {},
        'status': 'ok'
    }
    
    # Detect objects
    object_detections = detect_objects(image)
    restricted_found = []
    
    for detection in object_detections:
        class_name = detection['class']
        if class_name in RESTRICTED_OBJECTS:
            violation_type = RESTRICTED_OBJECTS[class_name]
            # Determine severity based on object type
            severity = 'critical' if 'phone' in class_name else 'high'
            if 'book' in class_name or 'materials' in violation_type:
                severity = 'critical'  # Books and materials are critical violations
            violations.append({
                'type': violation_type,
                'severity': severity,
                'confidence': detection['confidence'],
                'description': f"{class_name} detected in frame",
                'bbox': detection['bbox']
            })
            restricted_found.append(class_name)
    
    analysis_result['detections']['restricted_objects'] = restricted_found
    
    # Detect faces and gaze
    face_data = detect_faces_and_gaze(image)
    analysis_result['detections']['faces'] = face_data
    
    # Check face violations
    if not face_data['face_visible']:
        violations.append({
            'type': 'no_face',
            'severity': 'high',
            'confidence': 1.0,
            'description': 'No face detected in frame'
        })
    elif face_data['num_faces'] > 1:
        violations.append({
            'type': 'multiple_faces',
            'severity': 'critical',
            'confidence': 1.0,
            'description': f"{face_data['num_faces']} faces detected"
        })
    
    # Check gaze direction and head tilt - mark as high severity to ensure alerts
    if face_data.get('head_tilted', False) or face_data['gaze_direction'] in ['left', 'right', 'away', 'tilted']:
        gaze_desc = 'head tilted' if face_data.get('head_tilted') else f"looking {face_data['gaze_direction']}"
        violations.append({
            'type': 'looking_away',
            'severity': 'high',
            'confidence': 0.90,
            'description': f"Candidate {gaze_desc} - not focused on screen"
        })
    
    analysis_result['violations'] = violations
    if len(violations) > 0:
        analysis_result['status'] = 'violation_detected'
    
    return analysis_result

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model': 'YOLOv8',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze a single frame for proctoring violations"""
    try:
        data = request.json
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Convert base64 to image
        image = base64_to_image(data['image'])
        
        if image is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Analyze frame
        result = analyze_frame(image)
        
        # Add metadata
        if 'attemptId' in data:
            result['attemptId'] = data['attemptId']
        if 'examId' in data:
            result['examId'] = data['examId']
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error analyzing frame: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    """Analyze multiple frames in batch"""
    try:
        data = request.json
        
        if not data or 'images' not in data:
            return jsonify({'error': 'No images provided'}), 400
        
        results = []
        for img_data in data['images']:
            image = base64_to_image(img_data)
            if image is not None:
                result = analyze_frame(image)
                results.append(result)
        
        return jsonify({
            'results': results,
            'total_frames': len(results),
            'violations_detected': sum(1 for r in results if r['status'] == 'violation_detected')
        })
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting YOLO AI Proctoring Server...")
    logger.info("Loading models...")
    
    # Warm up models
    dummy_image = np.zeros((640, 480, 3), dtype=np.uint8)
    _ = detect_objects(dummy_image)
    _ = detect_faces_and_gaze(dummy_image)
    
    logger.info("Models loaded successfully!")
    logger.info(f"Server ready on http://localhost:{os.environ.get('PORT', 5001)}")
    
    # Use PORT from environment variable for Render deployment
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
