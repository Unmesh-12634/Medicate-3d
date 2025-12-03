# 🤚 Hand Gesture Control for 3D Lab

## Overview
The 3D Lab now includes **hand gesture recognition** powered by **MediaPipe Hands**, allowing you to control 3D organ models with natural hand movements instead of mouse/keyboard.

## How to Use

### Enabling Gesture Control
1. Navigate to the **3D Lab** page (Simulator)
2. Click the **"Gesture: OFF"** button in the top-right toolbar
3. Allow camera permissions when prompted
4. A webcam preview will appear in the bottom-right corner showing your hand skeleton

### Gesture Controls

| Gesture | Action | How to Perform |
|---------|--------|----------------|
| 🤏 **Pinch** | Zoom in/out | Bring thumb and index finger together/apart |
| 🖐️ **Open Palm** | Rotate model | Move your open hand around (4+ fingers extended) |
| ✋ **Open Hand** | Dissection Mode | Extend all 5 fingers wide |
| ✌️ **Peace Sign** | Pathology Mode | Extend only index and middle fingers |
| ✊ **Fist** | Normal Mode | Close all fingers |

### Tips for Best Results
- **Lighting**: Ensure good lighting on your hand
- **Distance**: Keep hand 30-50cm from camera
- **Background**: Plain backgrounds work best
- **Single Hand**: Use only one hand at a time
- **Smooth Movements**: Move hand slowly for better tracking

## Technical Details

### Components
- **HandGestureController**: Webcam capture, hand detection, gesture recognition
- **Viewer**: Updated to accept gesture controls (rotation, zoom, mode)
- **SimulatorPage**: Toggle button and state management

### Dependencies
```json
{
  "@mediapipe/hands": "^0.4.1646424915",
  "@mediapipe/camera_utils": "^0.3.1620248357",
  "@mediapipe/drawing_utils": "^0.3.1620248257"
}
```

### Performance
- Hand tracking runs at ~30 FPS
- Minimal impact on 3D rendering performance
- Camera stream is stopped when gesture mode is disabled

## Troubleshooting

### Camera Not Working
- Check browser permissions (Settings → Privacy → Camera)
- Ensure no other app is using the camera
- Try refreshing the page

### Poor Tracking
- Improve lighting conditions
- Clean camera lens
- Reduce background clutter
- Try moving closer/farther from camera

### High CPU Usage
- Close other tabs/applications
- Reduce browser window size
- Disable gesture mode when not needed

## Browser Compatibility
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14.1+
- ⚠️ Requires HTTPS or localhost (camera access)

## Future Enhancements
- [ ] Two-hand gestures for advanced controls
- [ ] Custom gesture training
- [ ] Voice commands integration
- [ ] Gesture recording/playback
- [ ] Multi-finger precision controls for dissection

---

**Note**: This feature requires webcam access. Your video is processed locally in the browser and never uploaded to any server.
