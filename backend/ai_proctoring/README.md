# YOLO AI Proctoring System

Advanced AI-powered exam proctoring using YOLOv8 for object detection and MediaPipe for face/gaze tracking.

## Features

### Detection Capabilities
- ✅ **Phone Detection** - Detects mobile phones in frame
- ✅ **Multiple Faces** - Detects if more than one person is present
- ✅ **Book/Material Detection** - Detects books and study materials
- ✅ **Face Not Visible** - Detects when candidate's face is not in frame
- ✅ **Gaze Tracking** - Detects when candidate is looking away
- ✅ **Object Detection** - Detects laptops, keyboards, mice, etc.

### Browser Activity Monitoring (Handled by Frontend)
- Tab switching detection
- Window focus loss
- Copy-paste detection
- Right-click detection
- Fullscreen exit detection

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip package manager
- Webcam for testing

### Installation

1. **Navigate to the AI proctoring directory**
   ```bash
   cd backend/ai_proctoring
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Download YOLO model (automatic on first run)**
   The YOLOv8 nano model will be downloaded automatically when you first run the server.

### Running the Server

```bash
python yolo_detector.py
```

The server will start on `http://localhost:5001`

### Testing the Server

1. **Health Check**
   ```bash
   curl http://localhost:5001/health
   ```

2. **Test with a sample image**
   ```bash
   curl -X POST http://localhost:5001/analyze \
     -H "Content-Type: application/json" \
     -d '{"image": "base64_encoded_image_here"}'
   ```

## API Endpoints

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "model": "YOLOv8",
  "timestamp": "2024-01-01T12:00:00"
}
```

### POST /analyze
Analyze a single frame for violations

**Request:**
```json
{
  "image": "base64_encoded_image",
  "attemptId": "exam_attempt_id",
  "examId": "exam_id"
}
```

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00",
  "status": "violation_detected",
  "violations": [
    {
      "type": "phone_detected",
      "severity": "critical",
      "confidence": 0.95,
      "description": "cell phone detected in frame"
    }
  ],
  "detections": {
    "restricted_objects": ["cell phone"],
    "faces": {
      "num_faces": 1,
      "face_visible": true,
      "gaze_direction": "center"
    }
  }
}
```

### POST /batch-analyze
Analyze multiple frames in batch

**Request:**
```json
{
  "images": ["base64_image1", "base64_image2", ...]
}
```

## Violation Types

| Type | Severity | Description |
|------|----------|-------------|
| `phone_detected` | critical | Mobile phone detected in frame |
| `multiple_faces` | critical | More than one face detected |
| `no_face` | high | No face visible in frame |
| `book_detected` | high | Book or study material detected |
| `looking_away` | medium | Candidate looking away from screen |
| `laptop_detected` | high | External laptop detected |
| `external_keyboard_detected` | medium | External keyboard detected |

## Performance

- **Speed**: ~30-50ms per frame (YOLOv8 nano on CPU)
- **Accuracy**: 85-95% depending on lighting and camera quality
- **Recommended**: Use GPU for faster processing (5-10ms per frame)

## Model Information

- **YOLO Model**: YOLOv8 nano (fastest, good accuracy)
- **Face Detection**: MediaPipe FaceDetection
- **Face Mesh**: MediaPipe FaceMesh (for gaze tracking)

### Switching Models

For better accuracy, change the model in `yolo_detector.py`:
```python
# Options: yolov8n.pt (nano), yolov8s.pt (small), yolov8m.pt (medium)
yolo_model = YOLO('yolov8m.pt')  # Medium model for better accuracy
```

## Troubleshooting

### Issue: Models not downloading
Solution: Manually download from [Ultralytics](https://github.com/ultralytics/assets/releases)

### Issue: Slow processing
Solution: Use GPU acceleration or switch to nano model

### Issue: False positives
Solution: Adjust confidence threshold in `detect_objects()` function

## Production Deployment

For production:
1. Use GPU-enabled server
2. Implement caching for repeated frames
3. Use load balancer for scaling
4. Monitor server health and performance
5. Implement rate limiting

## License

This AI proctoring system uses:
- Ultralytics YOLOv8 (AGPL-3.0)
- MediaPipe (Apache 2.0)
