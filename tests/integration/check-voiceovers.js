const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'safwane.ettih',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'aiads',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function checkVoiceovers() {
  try {
    console.log('🔍 Checking voiceovers in database...\n');

    const result = await pool.query(`
      SELECT 
        v.id,
        v.script_id,
        v.voice_id,
        v.file_path,
        v.duration,
        v.created_at,
        s.title as script_title,
        vo.name as voice_name
      FROM voiceovers v
      LEFT JOIN scripts s ON v.script_id = s.id
      LEFT JOIN voices vo ON v.voice_id = vo.id
      ORDER BY v.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No voiceovers found in database');
      return;
    }

    console.log(`✅ Found ${result.rows.length} voiceovers:\n`);

    for (const voiceover of result.rows) {
      console.log(`ID: ${voiceover.id}`);
      console.log(`Script: ${voiceover.script_title}`);
      console.log(`Voice: ${voiceover.voice_name}`);
      console.log(`File Path: ${voiceover.file_path}`);
      console.log(`Duration: ${voiceover.duration}s`);
      console.log(`Created: ${new Date(voiceover.created_at).toLocaleString()}`);

      // Check if file exists
      const fs = require('fs');
      const fullPath = path.join(__dirname, voiceover.file_path);
      const exists = fs.existsSync(fullPath);
      console.log(`File exists: ${exists ? '✅' : '❌'} (${fullPath})`);

      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error checking voiceovers:', error.message);
  } finally {
    await pool.end();
  }
}

checkVoiceovers();
