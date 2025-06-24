# AI Creative Builder

An AI-powered web application for media buyers to create engaging video ad creatives by integrating video processing, script generation, and voiceover capabilities.

## Features

- **Product Workspace Management**: Create, manage, and organize creative projects
- **Video Processing**: Upload raw videos and automatically split them into categorized clips using AI
- **Script Generation**: Generate multiple scripts using AI based on workspace context
- **Voiceover Creation**: Create realistic voiceovers using AI voices
- **Video Composition**: Combine clips and voiceovers into final ad videos

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- React Hot Toast for notifications

### Backend
- Node.js with Express
- PostgreSQL database
- JWT authentication
- Multer for file uploads
- FFmpeg for video processing
- Gemini API for AI analysis and script generation
- ElevenLabs API for voice generation

## Getting Started

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- FFmpeg installed on system

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-creative-builder
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   **Server** (copy `server/.env.example` to `server/.env`):
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/ai_creative_builder
   JWT_SECRET=your_super_secure_jwt_secret_key
   GEMINI_API_KEY=your_gemini_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ```

   **Client** (already configured in `client/.env`):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb ai_creative_builder
   
   # Run migrations
   npm run server:install
   cd server && npm run db:migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts both the backend server (port 5000) and frontend development server (port 3000).

### API Keys Setup

1. **Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file as `GEMINI_API_KEY`

2. **ElevenLabs API Key**
   - Sign up at [ElevenLabs](https://elevenlabs.io)
   - Go to Profile → API Keys
   - Create a new API key
   - Add it to your `.env` file as `ELEVENLABS_API_KEY`

## Usage

1. **Register/Login**: Create an account or sign in
2. **Create Workspace**: Set up a new project with product details
3. **Upload Video**: Add raw footage to your workspace
4. **Process Video**: AI analyzes and splits video into categorized clips
5. **Generate Scripts**: Create multiple scripts using AI
6. **Create Voiceovers**: Generate voices for your scripts
7. **Compose Videos**: Combine clips and voiceovers into final creatives

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
├── server/                 # Node.js backend
│   ├── config/            # Database config
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── scripts/           # Database scripts
│   └── utils/             # Utility functions
└── uploads/               # File storage
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Workspaces
- `GET /api/workspaces` - Get all workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Videos
- `POST /api/videos/upload` - Upload raw video
- `POST /api/videos/:id/process` - Process video with AI
- `GET /api/videos/workspace/:id` - Get workspace videos
- `GET /api/videos/:id/clips` - Get video clips

### Scripts
- `POST /api/scripts/generate` - Generate script with AI
- `GET /api/scripts/workspace/:id` - Get workspace scripts
- `PUT /api/scripts/:id` - Update script

### Voices
- `GET /api/voices/available` - Get available voices
- `POST /api/voices/generate` - Generate voiceover
- `GET /api/voices/workspace/:id` - Get workspace voiceovers

## Development

### Running Tests
```bash
# Frontend tests
cd client && npm test

# Backend tests (when implemented)
cd server && npm test
```

### Building for Production
```bash
npm run build
```

### Deployment
The application can be deployed to platforms like:
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render, Heroku
- **Database**: Railway PostgreSQL, Supabase

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@example.com or create an issue in the repository.
