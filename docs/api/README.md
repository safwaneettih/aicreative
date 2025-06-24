# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints Overview

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### Workspaces
- `GET /workspaces` - Get user workspaces
- `POST /workspaces` - Create new workspace
- `PUT /workspaces/:id` - Update workspace
- `DELETE /workspaces/:id` - Delete workspace

### Scripts
- `GET /scripts/workspace/:workspaceId` - Get scripts for workspace
- `POST /scripts/workspace/:workspaceId` - Create new script
- `PUT /scripts/:id` - Update script
- `DELETE /scripts/:id` - Delete script

### Voiceovers
- `GET /voices/workspace/:workspaceId` - Get voiceovers for workspace
- `POST /voices/workspace/:workspaceId` - Create voiceover from script
- `DELETE /voices/:id` - Delete voiceover

### Video Clips
- `GET /videos/workspace/:workspaceId` - Get video clips for workspace
- `POST /videos/upload/:workspaceId` - Upload video clip
- `DELETE /videos/:id` - Delete video clip

### Compositions
- `GET /compositions/workspace/:workspaceId` - Get video compositions
- `POST /compositions/workspace/:workspaceId` - Create video compositions
- `POST /compositions/workspace/:workspaceId/generate-combinations` - Generate combinations
- `POST /compositions/upload-logo/:workspaceId` - Upload logo for compositions
- `GET /compositions/job/:jobId` - Get composition job status
- `DELETE /compositions/:id` - Delete single composition
- `DELETE /compositions/bulk/:workspaceId` - Bulk delete compositions

## Detailed Endpoint Documentation

### Create Video Compositions
`POST /compositions/workspace/:workspaceId`

Creates multiple video compositions from the provided combinations.

**Request Body:**
```json
{
  "name": "Campaign Name",
  "combinations": [
    {
      "hook_clip_id": "uuid",
      "body_clip_ids": ["uuid1", "uuid2"],
      "cat_clip_id": "uuid",
      "voiceover_id": "uuid",
      "logo_overlay_path": "uploads/logos/logo.png",
      "logo_position": "bottom-right",
      "logo_opacity": 0.8,
      "logo_size": "medium",
      "enable_captions": true,
      "caption_style": "default"
    }
  ]
}
```

**Response:**
```json
{
  "id": "job-uuid",
  "status": "pending",
  "total_count": 10,
  "completed_count": 0,
  "failed_count": 0,
  "created_at": "2025-01-24T10:00:00Z",
  "updated_at": "2025-01-24T10:00:00Z"
}
```

### Upload Logo
`POST /compositions/upload-logo/:workspaceId`

Uploads a logo file for use in video compositions.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `logo`
- Supported formats: JPEG, PNG, GIF, SVG
- Max file size: 5MB

**Response:**
```json
{
  "message": "Logo uploaded successfully",
  "logoPath": "uploads/logos/logo_uuid.png",
  "originalName": "company-logo.png",
  "size": 123456
}
```

### Generate Combinations
`POST /compositions/workspace/:workspaceId/generate-combinations`

Automatically generates video combinations based on available clips and voiceovers.

**Request Body:**
```json
{
  "hook_clip_ids": ["uuid1", "uuid2"],
  "body_clip_ids": ["uuid3", "uuid4"],
  "cat_clip_ids": ["uuid5", "uuid6"],
  "voiceover_ids": ["uuid7", "uuid8"],
  "max_combinations": 20
}
```

**Response:**
```json
[
  {
    "hook_clip_id": "uuid1",
    "body_clip_ids": ["uuid3"],
    "cat_clip_id": "uuid5",
    "voiceover_id": "uuid7"
  }
]
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error
