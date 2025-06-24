# Project Structure

## Overview
```
aiads/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts for state management
│   │   ├── pages/          # Page components and routing
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── build/              # Production build output
├── server/                 # Node.js backend application
│   ├── routes/             # API route handlers
│   ├── middleware/         # Express middleware
│   ├── config/             # Configuration files
│   ├── utils/              # Utility services
│   └── scripts/            # Database migrations and scripts
├── tests/                  # Test files organized by type
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── development/        # Development guides and progress
│   └── user-guide/         # User documentation
├── uploads/                # File upload storage
│   ├── videos/             # Uploaded video files
│   ├── voiceovers/         # Generated voiceover files
│   ├── compositions/       # Generated video compositions
│   ├── logos/              # Uploaded logo files
│   └── clips/              # Processed video clips
└── migrations/             # Database migration files
```

## Key Files
- `package.json` - Root package configuration and scripts
- `.gitignore` - Git ignore patterns
- `setup.sh` - Project setup script
- `README.md` - Main project documentation

## Architecture

### Frontend (React)
- **Component-based**: Modular UI components
- **Context API**: State management
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling

### Backend (Node.js)
- **Express.js**: Web framework
- **PostgreSQL**: Primary database
- **JWT**: Authentication
- **Multer**: File upload handling
- **FFmpeg**: Video processing

### File Processing
- **Video Upload**: Multer with file validation
- **Video Processing**: FFmpeg for concatenation and effects
- **Audio Generation**: ElevenLabs API integration
- **Content Generation**: Google Gemini API

### Database Schema
- **Users**: User accounts and authentication
- **Workspaces**: Project organization
- **Scripts**: Text content for voiceovers
- **Voiceovers**: Generated audio files
- **Video Clips**: Uploaded video content
- **Compositions**: Generated video combinations
- **Jobs**: Background processing tracking

## Development Workflow

1. **Setup**: Run `npm run install:all` to install dependencies
2. **Development**: Use `npm run dev` for concurrent client/server development
3. **Testing**: Run tests with `npm test` or specific test suites
4. **Building**: Use `npm run build` for production builds
5. **Deployment**: Use `npm start` for production server

## Data Flow

1. **User uploads videos** → Stored in `uploads/videos/`
2. **User creates scripts** → Stored in database
3. **Scripts generate voiceovers** → ElevenLabs API → `uploads/voiceovers/`
4. **User creates compositions** → Background job processing
5. **FFmpeg processes videos** → Combines clips, adds audio, effects
6. **Final videos** → Stored in `uploads/compositions/`

## Security Considerations

- **Authentication**: JWT tokens for API access
- **File Upload**: Validation and size limits
- **Database**: Parameterized queries to prevent SQL injection
- **CORS**: Proper cross-origin resource sharing setup
- **Environment Variables**: Sensitive data in `.env` files
