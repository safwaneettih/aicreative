# TikTok Caption Integration

## Overview
This document describes the TikTok-style caption feature integration that provides professional, animated word-by-word captions using AI transcription and Remotion rendering.

## Features

### 1. **AI-Powered Transcription**
- Uses Whisper.cpp for automatic speech-to-text transcription
- Provides word-level timing accuracy
- Supports multiple languages
- No manual caption creation required

### 2. **Professional Caption Styles**
- **Modern**: Clean design with subtle animations
- **Bold**: High contrast with vibrant gradients
- **Neon**: Glowing text with sci-fi aesthetic
- **Minimal**: Simple and clean design
- **Pop**: Colorful and playful design

### 3. **TikTok-Style Animations**
- Word-by-word highlighting
- Smooth entry animations
- Professional timing synchronization
- Customizable appearance

## Technical Implementation

### Backend Components

#### 1. **TikTok Caption Service** (`utils/tiktokCaptionService.js`)
```javascript
const tiktokCaptionService = require('../utils/tiktokCaptionService');

// Generate TikTok-style captions
const captionVideoPath = await tiktokCaptionService.generateCaptionVideo(
    videoPath, 
    'modern' // style
);
```

#### 2. **Database Schema**
```sql
-- New fields in video_compositions table
ALTER TABLE video_compositions 
ADD COLUMN tiktok_captions_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN tiktok_caption_style VARCHAR(50) DEFAULT 'modern';

-- Caption styles lookup table
CREATE TABLE caption_styles (
    id SERIAL PRIMARY KEY,
    style_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT
);
```

#### 3. **API Endpoints**
```javascript
// Get available caption styles
GET /api/compositions/caption-styles

// Create composition with TikTok captions
POST /api/compositions/workspace/:workspaceId
{
    "combinations": [{
        "tiktok_captions_enabled": true,
        "tiktok_caption_style": "modern"
    }]
}
```

### Frontend Components

#### 1. **Caption Type Selection**
```tsx
const [captionType, setCaptionType] = useState<'none' | 'basic' | 'tiktok'>('none');
const [tiktokCaptionStyle, setTiktokCaptionStyle] = useState<string>('modern');
```

#### 2. **UI Integration**
- Caption type selector (None, Basic, TikTok Style)
- Style picker for TikTok captions
- Real-time preview capabilities
- Professional styling with gradients

## Processing Workflow

### 1. **Video Generation**
```
User Request → Background Video + Voiceover → Base Video
```

### 2. **TikTok Caption Processing**
```
Base Video → Audio Extraction → Whisper Transcription → Caption JSON → Remotion Rendering → Caption Video
```

### 3. **Final Composition**
```
Base Video + Caption Video → FFmpeg Overlay → Final Output
```

## Usage Instructions

### For Users

1. **Select Caption Type**
   - Choose "TikTok Style" from caption options
   - Select desired style (Modern, Bold, Neon, etc.)

2. **Generate Composition**
   - Create composition as normal
   - System automatically transcribes audio
   - Captions are generated and overlaid

3. **Preview & Download**
   - Preview video with animated captions
   - Download final composition

### For Developers

1. **Initialize Service**
```javascript
const tiktokCaptionService = require('../utils/tiktokCaptionService');
await tiktokCaptionService.initialize();
```

2. **Generate Captions**
```javascript
const captionVideo = await tiktokCaptionService.generateCaptionVideo(
    videoPath,
    'modern', // style
    { 
        // additional options
    }
);
```

3. **Overlay Captions**
```javascript
await overlayTikTokCaptions(videoPath, captionVideo, outputPath);
```

## Performance Considerations

### 1. **Processing Time**
- Whisper transcription: ~10-30 seconds per minute of audio
- Remotion rendering: ~5-15 seconds per minute
- FFmpeg overlay: ~2-5 seconds per minute

### 2. **Resource Usage**
- CPU-intensive transcription process
- Memory requirements for Remotion rendering
- Temporary file storage for processing

### 3. **Optimizations**
- Background processing with job queue
- Semaphore limiting for concurrent operations
- Automatic cleanup of temporary files

## Error Handling

### 1. **Transcription Errors**
- Fallback to basic captions if Whisper fails
- Error logging and user notification
- Retry mechanisms for transient failures

### 2. **Rendering Errors**
- Graceful degradation to basic captions
- Detailed error reporting
- System health monitoring

## Future Enhancements

### 1. **Additional Styles**
- Custom style creation
- Brand-specific templates
- User-uploadable fonts

### 2. **Advanced Features**
- Multi-language support
- Custom animation timing
- Interactive caption editing

### 3. **Performance Improvements**
- GPU acceleration for rendering
- Caching for repeated styles
- Parallel processing optimization

## Testing

### 1. **Unit Tests**
```bash
cd server
node test/test-tiktok-service.js
```

### 2. **Integration Tests**
```bash
cd server
node test/test-tiktok-integration.js
```

### 3. **End-to-End Tests**
- Create composition with TikTok captions
- Verify caption timing and appearance
- Test all available styles

## Dependencies

### Backend
- `@remotion/captions` - Caption processing
- `@remotion/install-whisper-cpp` - AI transcription
- `@remotion/animation-utils` - Animation helpers
- `@remotion/layout-utils` - Layout utilities

### Frontend
- Updated TypeScript interfaces
- Enhanced UI components
- API integration

## Deployment Notes

### 1. **Environment Setup**
- Ensure sufficient disk space for Whisper models
- Configure memory limits for rendering processes
- Set up proper error monitoring

### 2. **Production Considerations**
- Monitor processing queue lengths
- Set up alerts for failed transcriptions
- Regular cleanup of temporary files

---

*This integration provides professional TikTok-style captions with minimal user effort, leveraging the latest AI transcription and animation technologies.*
