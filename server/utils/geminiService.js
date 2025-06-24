const axios = require('axios');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
  }

  // Analyze video and suggest clips based on duration and content
  async analyzeVideo(videoInfo, workspaceInfo = {}) {
    try {
      const prompt = `
        You are an expert video editor and marketing specialist. Analyze a video for creating advertising clips.

        Video Information:
        - Duration: ${videoInfo.duration || 'unknown'} seconds
        - Format: ${videoInfo.format || 'unknown'}
        - Resolution: ${videoInfo.resolution || 'unknown'}
        - Original Name: ${videoInfo.originalName || 'unknown'}

        ${workspaceInfo.product_category ? `Product Category: ${workspaceInfo.product_category}` : ''}
        ${workspaceInfo.target_market ? `Target Market: ${workspaceInfo.target_market}` : ''}
        ${workspaceInfo.description ? `Product Description: ${workspaceInfo.description}` : ''}

        Task: Suggest meaningful timestamps to cut this video into advertising clips. Each clip should be:
        1. Between 3-15 seconds long
        2. Categorized as 'hook' (attention-grabbing opener), 'body' (product showcase), or 'cat' (call to action)
        3. Given a descriptive name that would help in video editing

        Please respond with ONLY a valid JSON array in this exact format:
        [
          {
            "name": "Product Reveal",
            "category": "hook",
            "startTime": 0.0,
            "endTime": 5.0,
            "description": "Opening shot showcasing the product"
          },
          {
            "name": "Feature Demonstration",
            "category": "body", 
            "startTime": 5.0,
            "endTime": 12.0,
            "description": "Detailed view of product features"
          }
        ]

        Generate 4-8 clips that would work well for video advertising. Ensure timestamps don't exceed the video duration.
      `;

      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('No response from Gemini API');
      }

      const content = response.data.candidates[0].content.parts[0].text;

      // Extract JSON from response - look for array pattern
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const suggestedClips = JSON.parse(jsonMatch[0]);

        // Validate and sanitize the clips
        const validatedClips = this.validateClips(suggestedClips, videoInfo.duration);

        console.log('✅ Gemini AI suggested clips:', validatedClips.length);
        return validatedClips;
      } else {
        throw new Error('Could not extract JSON from Gemini response');
      }

    } catch (error) {
      console.error('❌ Gemini video analysis error:', error.message);

      // Fallback: Generate basic clips if AI fails
      return this.generateFallbackClips(videoInfo);
    }
  }

  // Validate and sanitize AI-generated clips
  validateClips(clips, videoDuration) {
    const maxDuration = videoDuration || 60;

    return clips
      .filter(clip => {
        // Basic validation
        return clip.name &&
          clip.category &&
          typeof clip.startTime === 'number' &&
          typeof clip.endTime === 'number' &&
          clip.startTime >= 0 &&
          clip.endTime <= maxDuration &&
          clip.endTime > clip.startTime &&
          ['hook', 'body', 'cat'].includes(clip.category.toLowerCase());
      })
      .map(clip => ({
        name: clip.name.substring(0, 100), // Limit name length
        category: clip.category.toLowerCase(),
        startTime: Math.max(0, Math.round(clip.startTime * 10) / 10), // Round to 1 decimal
        endTime: Math.min(maxDuration, Math.round(clip.endTime * 10) / 10),
        description: clip.description ? clip.description.substring(0, 200) : ''
      }))
      .slice(0, 10); // Limit to 10 clips max
  }

  // Fallback clip generation if AI fails
  generateFallbackClips(videoInfo) {
    const duration = videoInfo.duration || 30;
    const clips = [];

    // Generate basic clips based on video duration
    if (duration >= 15) {
      clips.push({
        name: "Opening Hook",
        category: "hook",
        startTime: 0,
        endTime: Math.min(5, duration * 0.2),
        description: "Attention-grabbing opening segment"
      });
    }

    if (duration >= 10) {
      const bodyStart = Math.min(5, duration * 0.2);
      const bodyEnd = Math.min(duration - 3, duration * 0.8);

      clips.push({
        name: "Main Content",
        category: "body",
        startTime: bodyStart,
        endTime: bodyEnd,
        description: "Main product showcase"
      });
    }

    if (duration >= 8) {
      clips.push({
        name: "Call to Action",
        category: "cat",
        startTime: Math.max(0, duration - 5),
        endTime: duration,
        description: "Closing call to action"
      });
    }

    console.log('⚠️ Using fallback clips due to AI analysis failure');
    return clips;
  }

  // Generate script for workspace
  async generateScript(workspaceInfo, userPrompt = '') {
    try {
      const prompt = `
        You are an expert copywriter creating a voiceover script for text-to-speech synthesis. 

        Product Information:
        - Product Name: ${workspaceInfo.name || 'Product'}
        - Category: ${workspaceInfo.product_category || 'General'}
        - Target Market: ${workspaceInfo.target_market || 'General audience'}
        - Description: ${workspaceInfo.description || 'No description provided'}

        ${userPrompt ? `Additional Requirements: ${userPrompt}` : ''}

        IMPORTANT: Create a script that is ONLY spoken words for text-to-speech. 
        
        STRICT Rules for TTS compatibility:
        - NO stage directions, scene descriptions, or visual cues
        - NO brackets [ ], parentheses ( ), or special formatting
        - NO website URLs or complex technical terms
        - NO words like "scene", "pause", "music", "fade", "cut", "intro", "outro"
        - Use simple, natural language that flows when spoken
        - Replace URLs with phrases like "visit our website" or "search for [product name]"
        - Use periods and commas for natural pauses, not stage directions
        - Write as if you're having a conversation with a friend
        - Keep sentences short and punchy for better TTS delivery
        - Target 60-100 words for a 30-45 second read

        Example of what NOT to include:
        ❌ "[SCENE START]", "(dramatic pause)", "[Music fades]", "(excited tone)"
        
        Example of what TO include:
        ✅ "Are you tired of struggling with expensive solutions that don't work? Introducing our revolutionary product that changes everything. Get yours today and see the difference."

        Please respond with ONLY a valid JSON object in this exact format:
        {
          "title": "Script Title",
          "content": "The clean voiceover script with only spoken words...",
          "style": "conversational",
          "tone": "engaging"
        }
      `;

      const response = await axios.post(
        `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('No response from Gemini API');
      }

      const content = response.data.candidates[0].content.parts[0].text;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const scriptData = JSON.parse(jsonMatch[0]);

        // Clean up content for TTS compatibility
        let cleanContent = scriptData.content || content;

        // Remove any remaining formatting issues
        cleanContent = cleanContent
          .replace(/[\[\]()]/g, '') // Remove brackets and parentheses
          .replace(/\b(scene|pause|music|fade|cut|intro|outro)\b/gi, '') // Remove stage direction words
          .replace(/\.(com|net|org|io)\b/gi, ' dot $1') // Make URLs more pronounceable
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/^\s+|\s+$/g, '') // Trim
          .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Ensure proper spacing after punctuation
          .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase words

        console.log('✅ Gemini AI generated script:', scriptData.title);
        return {
          title: scriptData.title || `${workspaceInfo.name} Script`,
          content: cleanContent,
          style: scriptData.style || 'conversational',
          tone: scriptData.tone || 'engaging',
          target_audience: workspaceInfo.target_market || 'general',
          prompt: userPrompt || 'AI-generated marketing script'
        };
      } else {
        // Fallback: use the raw content but clean it up
        let cleanContent = content
          .replace(/[\[\]()]/g, '')
          .replace(/\b(scene|pause|music|fade|cut|intro|outro)\b/gi, '')
          .replace(/\.(com|net|org|io)\b/gi, ' dot $1')
          .replace(/\s+/g, ' ')
          .replace(/^\s+|\s+$/g, '');

        return {
          title: `${workspaceInfo.name} Script`,
          content: cleanContent,
          style: 'conversational',
          tone: 'engaging',
          target_audience: workspaceInfo.target_market || 'general',
          prompt: userPrompt || 'AI-generated marketing script'
        };
      }

    } catch (error) {
      console.error('❌ Gemini script generation error:', error.message);

      // Fallback script
      return this.generateFallbackScript(workspaceInfo, userPrompt);
    }
  }

  // Fallback script generation
  generateFallbackScript(workspaceInfo, userPrompt) {
    const productName = workspaceInfo.name || 'our amazing product';
    const category = workspaceInfo.product_category || 'product';

    const content = `Are you tired of struggling with ${category} solutions that don't deliver? Introducing ${productName}, the game-changing solution that's transforming how people experience ${category}. With its innovative features and proven results, ${productName} delivers exactly what you need, when you need it. Don't wait, discover the difference ${productName} can make. Get yours today!`;

    console.log('⚠️ Using fallback script due to AI generation failure');

    return {
      title: `${productName} Marketing Script`,
      content: content,
      style: 'conversational',
      tone: 'engaging',
      target_audience: workspaceInfo.target_market || 'general',
      prompt: userPrompt || 'Fallback marketing script'
    };
  }

  // Generate default clips when AI analysis fails
  generateDefaultClips(duration) {
    const clips = [];
    const segmentDuration = duration / 4;

    clips.push({
      name: "Opening Hook",
      category: "hook",
      startTime: 0,
      endTime: Math.min(segmentDuration, 8),
      description: "Strong opening to grab attention"
    });

    if (duration > 15) {
      clips.push({
        name: "Product Showcase",
        category: "body",
        startTime: segmentDuration,
        endTime: segmentDuration * 2,
        description: "Main product demonstration"
      });

      clips.push({
        name: "Benefits Highlight",
        category: "body",
        startTime: segmentDuration * 2,
        endTime: segmentDuration * 3,
        description: "Key benefits and features"
      });
    }

    clips.push({
      name: "Call to Action",
      category: "cat",
      startTime: Math.max(0, duration - 8),
      endTime: duration,
      description: "Strong call to action"
    });

    return clips;
  }
}

module.exports = new GeminiService();
