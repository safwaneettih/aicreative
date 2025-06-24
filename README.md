# AI Ads Platform

A comprehensive AI-powered platform for creating video advertisements with automated voiceovers, video composition, and branding features.

## 🚀 Features

- **AI Voiceover Generation**: Powered by ElevenLabs API
- **Video Composition**: Automated video combining with FFmpeg
- **Logo Overlays**: Brand integration with customizable positioning
- **Caption Support**: Automatic caption generation with multiple styles
- **Bulk Processing**: Generate multiple video combinations efficiently
- **Real-time Progress**: Monitor video generation jobs
- **Workspace Management**: Organize projects and assets

## 🏗️ Architecture

### Frontend (React + TypeScript)
- Modern React application with TypeScript
- Tailwind CSS for styling
- Context API for state management
- Responsive design

### Backend (Node.js + Express)
- RESTful API with Express.js
- PostgreSQL database
- JWT authentication
- File upload handling with Multer
- Background job processing

### Video Processing
- FFmpeg for video manipulation
- Automated video concatenation
- Logo overlay integration
- Caption generation
- Audio synchronization

## 📁 Project Structure

```
aiads/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── docs/                   # Documentation
│   ├── api/               # API documentation
│   ├── development/       # Development guides
│   └── user-guide/        # User documentation
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── uploads/                # File storage
└── migrations/             # Database migrations
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL
- FFmpeg
- ElevenLabs API key
- Google Gemini API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/safwaneettih/aicreative.git
   cd aicreative
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Setup environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your API keys and database credentials
   ```

4. **Setup database**
   ```bash
   # Create PostgreSQL database
   createdb aiads_development
   
   # Run migrations
   cd server && npm run migrate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` for the frontend and `http://localhost:5000` for the API.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 📚 Documentation

- [API Documentation](./docs/api/README.md)
- [User Guide](./docs/user-guide/README.md)
- [Development Guide](./docs/development/README.md)
- [Architecture Overview](./docs/development/ARCHITECTURE.md)

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Required environment variables for production:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `ELEVENLABS_API_KEY`: ElevenLabs API key
- `GEMINI_API_KEY`: Google Gemini API key
- `NODE_ENV`: Set to 'production'

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Core Features
- `GET /api/workspaces` - List workspaces
- `POST /api/workspaces` - Create workspace
- `POST /api/videos/upload/:workspaceId` - Upload video
- `POST /api/voices/workspace/:workspaceId` - Generate voiceover
- `POST /api/compositions/workspace/:workspaceId` - Create compositions

See [API Documentation](./docs/api/README.md) for complete endpoint details.

## 🔧 Technologies Used

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Context API
- Axios

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT
- Multer
- FFmpeg

### AI Services
- ElevenLabs (Text-to-Speech)
- Google Gemini (Content Generation)

## 📊 Performance

- **Video Processing**: Optimized with semaphore-based concurrency control
- **File Storage**: Efficient upload and storage management
- **Database**: Indexed queries for fast data retrieval
- **Caching**: Strategic caching for improved response times

## 🐛 Troubleshooting

### Common Issues

**Video Processing Fails**
- Ensure FFmpeg is installed and accessible
- Check file permissions in uploads directory
- Verify video file formats are supported

**API Connection Issues**
- Verify environment variables are set correctly
- Check database connection
- Ensure all required services are running

See [User Guide](./docs/user-guide/README.md) for more troubleshooting tips.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Safwane Ettih** - Project Lead & Developer

## 🙏 Acknowledgments

- ElevenLabs for AI voice generation
- Google for Gemini AI services
- FFmpeg community for video processing tools
- Open source community for various libraries and tools

---

For more information, visit our [documentation](./docs/README.md) or create an issue for support.
