require('dotenv').config();
const db = require('../config/database');

const createTables = async () => {
  try {
    console.log('Creating database tables...');

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Workspaces table
    await db.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        product_category VARCHAR(100),
        target_market VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Raw videos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS raw_videos (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        duration FLOAT,
        format VARCHAR(50),
        resolution VARCHAR(20),
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Video clips table
    await db.query(`
      CREATE TABLE IF NOT EXISTS video_clips (
        id SERIAL PRIMARY KEY,
        raw_video_id INTEGER REFERENCES raw_videos(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(20) CHECK (category IN ('hook', 'body', 'cat')) NOT NULL,
        start_time FLOAT NOT NULL,
        end_time FLOAT NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        duration FLOAT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scripts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        style VARCHAR(100),
        tone VARCHAR(100),
        target_audience VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Voiceovers table
    await db.query(`
      CREATE TABLE IF NOT EXISTS voiceovers (
        id SERIAL PRIMARY KEY,
        script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE,
        voice_name VARCHAR(100) NOT NULL,
        voice_id VARCHAR(100) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        duration FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Composition jobs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS composition_jobs (
        id VARCHAR(36) PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Video compositions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS video_compositions (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        job_id VARCHAR(36) REFERENCES composition_jobs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        hook_clip_id INTEGER REFERENCES video_clips(id) ON DELETE SET NULL,
        body_clip_ids TEXT, -- JSON array of clip IDs
        cat_clip_id INTEGER REFERENCES video_clips(id) ON DELETE SET NULL,
        voiceover_id INTEGER REFERENCES voiceovers(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        file_path VARCHAR(500),
        duration FLOAT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Deprecated: keeping for backwards compatibility but not used in new workflow
    // Final videos table
    await db.query(`
      CREATE TABLE IF NOT EXISTS final_videos (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        duration FLOAT,
        clips_used TEXT, -- JSON array of clip IDs
        voiceover_id INTEGER REFERENCES voiceovers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
};

createTables();
