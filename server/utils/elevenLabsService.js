const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }

    // Predefined voices for the application
    this.voices = [
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', style: 'professional', description: 'Deep, authoritative voice perfect for corporate content' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', style: 'casual', description: 'Friendly, approachable voice for everyday products' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', style: 'confident', description: 'Strong, confident voice for bold messaging' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male', style: 'friendly', description: 'Warm, trustworthy voice for customer-focused content' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', style: 'professional', description: 'Clear, articulate voice for business presentations' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', style: 'casual', description: 'Young, energetic voice for lifestyle brands' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', style: 'energetic', description: 'Vibrant, enthusiastic voice for exciting products' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', style: 'warm', description: 'Compassionate, caring voice for health and wellness' }
    ];
  }

  // Get available voices
  getVoices() {
    return this.voices;
  }

  // Validate voice ID
  isValidVoice(voiceId) {
    return this.voices.some(voice => voice.id === voiceId);
  }

  // Get voice by ID
  getVoiceById(voiceId) {
    return this.voices.find(voice => voice.id === voiceId);
  }

  // Generate speech from text
  async generateSpeech(text, voiceId, outputPath) {
    try {
      // Validate voice ID
      if (!this.isValidVoice(voiceId)) {
        throw new Error(`Invalid voice ID: ${voiceId}`);
      }

      // Validate text length (ElevenLabs has character limits)
      if (text.length > 5000) {
        throw new Error('Text too long. Maximum 5000 characters allowed.');
      }

      console.log(`🎤 Generating speech with voice: ${this.getVoiceById(voiceId)?.name}`);

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Save audio file
      await fs.writeFile(outputPath, response.data);

      // Get actual audio duration using FFmpeg
      const actualDuration = await this.getAudioDuration(outputPath);

      console.log(`✅ Speech generated successfully: ${path.basename(outputPath)}`);
      console.log(`📊 Actual audio duration: ${actualDuration.toFixed(2)}s`);

      return {
        filePath: outputPath,
        fileSize: response.data.length,
        duration: actualDuration,
        voiceId: voiceId,
        voiceName: this.getVoiceById(voiceId)?.name,
        textLength: text.length
      };

    } catch (error) {
      console.error('❌ ElevenLabs speech generation error:', error.message);

      if (error.response) {
        // API error response
        console.error('API Error Details:', {
          status: error.response.status,
          data: error.response.data
        });

        if (error.response.status === 401) {
          throw new Error('Invalid ElevenLabs API key');
        } else if (error.response.status === 422) {
          throw new Error('Invalid input parameters for speech generation');
        } else if (error.response.status === 429) {
          throw new Error('ElevenLabs API rate limit exceeded');
        }
      }

      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  // Get actual audio duration using FFmpeg
  getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.error('Error getting audio duration:', err);
          // Fallback to text-based estimation if FFprobe fails
          resolve(this.estimateAudioDuration(''));
        } else {
          const duration = metadata.format.duration || 0;
          resolve(Math.round(duration * 10) / 10); // Round to 1 decimal place
        }
      });
    });
  }

  // Estimate audio duration based on text length (fallback only)
  estimateAudioDuration(text) {
    // Average speaking rate: ~150 words per minute, ~5 characters per word
    const charactersPerSecond = (150 * 5) / 60; // ~12.5 characters per second
    const duration = text.length / charactersPerSecond;
    return Math.round(duration * 10) / 10; // Round to 1 decimal place
  }

  // Generate multiple voiceovers for the same script
  async generateMultipleVoiceovers(text, voiceIds, outputDir) {
    const results = [];

    for (const voiceId of voiceIds) {
      try {
        const voice = this.getVoiceById(voiceId);
        const fileName = `voiceover_${voice.name}_${Date.now()}.mp3`;
        const outputPath = path.join(outputDir, fileName);

        const result = await this.generateSpeech(text, voiceId, outputPath);
        results.push({
          ...result,
          voice: voice
        });

        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to generate voiceover with voice ${voiceId}:`, error.message);
        // Continue with other voices even if one fails
      }
    }

    return results;
  }

  // Get voice recommendations based on content type and target audience
  getVoiceRecommendations(contentType, targetAudience, gender = null) {
    let recommendations = [...this.voices];

    // Filter by gender if specified
    if (gender) {
      recommendations = recommendations.filter(voice => voice.gender === gender);
    }

    // Sort by style relevance
    const stylePreferences = {
      'professional': ['professional', 'confident'],
      'casual': ['casual', 'friendly', 'warm'],
      'energetic': ['energetic', 'confident'],
      'corporate': ['professional', 'confident'],
      'lifestyle': ['casual', 'energetic', 'friendly']
    };

    const preferredStyles = stylePreferences[contentType] || ['friendly', 'professional'];

    recommendations.sort((a, b) => {
      const aScore = preferredStyles.includes(a.style) ? 1 : 0;
      const bScore = preferredStyles.includes(b.style) ? 1 : 0;
      return bScore - aScore;
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  // Check API quota/usage (if available)
  async checkQuota() {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return {
        charactersUsed: response.data.subscription?.character_count || 0,
        charactersLimit: response.data.subscription?.character_limit || 0,
        canGenerate: true
      };
    } catch (error) {
      console.error('Failed to check ElevenLabs quota:', error.message);
      return { canGenerate: true }; // Assume we can generate if check fails
    }
  }
}

module.exports = new ElevenLabsService();
