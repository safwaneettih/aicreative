-- Add logo overlay and captions support to video_compositions table
ALTER TABLE video_compositions 
ADD COLUMN logo_overlay_path VARCHAR(255),
ADD COLUMN logo_position VARCHAR(50) DEFAULT 'bottom-right',
ADD COLUMN logo_opacity DECIMAL(3,2) DEFAULT 0.8,
ADD COLUMN logo_size VARCHAR(20) DEFAULT 'medium',
ADD COLUMN enable_captions BOOLEAN DEFAULT false,
ADD COLUMN caption_style VARCHAR(50) DEFAULT 'default';
