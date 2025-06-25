-- Add TikTok caption support to video_compositions table
ALTER TABLE video_compositions 
ADD COLUMN tiktok_captions_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN tiktok_caption_style VARCHAR(50) DEFAULT 'modern',
ADD COLUMN caption_transcription_file VARCHAR(255),
ADD COLUMN caption_video_file VARCHAR(255);

-- Create index for performance
CREATE INDEX idx_video_compositions_tiktok_captions ON video_compositions(tiktok_captions_enabled);

-- Add caption styles lookup table
CREATE TABLE caption_styles (
    id SERIAL PRIMARY KEY,
    style_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    preview_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default caption styles
INSERT INTO caption_styles (style_id, name, description) VALUES
('modern', 'Modern', 'Clean design with subtle animations and professional look'),
('bold', 'Bold', 'High contrast with vibrant gradients and strong visual impact'),
('neon', 'Neon', 'Glowing text with sci-fi aesthetic and electric colors'),
('minimal', 'Minimal', 'Simple and clean design with minimal distractions'),
('pop', 'Pop', 'Colorful and playful design with gradient backgrounds');
