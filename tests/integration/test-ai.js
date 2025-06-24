// Set environment variables manually for testing
// Environment variables should be set before running tests
// Example: GEMINI_API_KEY=your_key ELEVENLABS_API_KEY=your_key node test-ai.js

const geminiService = require('./server/utils/geminiService');
const elevenLabsService = require('./server/utils/elevenLabsService');

async function testAIServices() {
  console.log('🧪 Testing AI Services...\n');

  // Test Gemini Service - TTS-Ready Script Generation
  console.log('1. Testing Gemini TTS-Ready Script Generation...');
  try {
    const workspace = {
      name: 'SmartFit Pro',
      product_category: 'Fitness',
      target_market: '25-34',
      description: 'AI-powered fitness tracker with personalized coaching'
    };

    const script = await geminiService.generateScript(workspace, 'Focus on health benefits and convenience for busy professionals');
    console.log('✅ Gemini script generated successfully!');
    console.log('Title:', script.title);
    console.log('Content (TTS-ready):');
    console.log('"' + script.content + '"');
    console.log('Style:', script.style);
    console.log('Tone:', script.tone);

    // Check for TTS issues
    const hasBrackets = /[\[\]()]/.test(script.content);
    const hasStageDirections = /\b(scene|pause|music|fade|cut|intro|outro|start|end)\b/i.test(script.content);
    const hasUrls = /\.(com|net|org|io)\b/i.test(script.content);
    const hasComplexFormatting = /[{}|\\\/]/.test(script.content);

    console.log('🔍 TTS Compatibility Check:');
    console.log('  - No brackets/parentheses:', !hasBrackets ? '✅' : '❌');
    console.log('  - No stage directions:', !hasStageDirections ? '✅' : '❌');
    console.log('  - No raw URLs:', !hasUrls ? '✅' : '❌');
    console.log('  - No complex formatting:', !hasComplexFormatting ? '✅' : '❌');
    console.log('  - Word count:', script.content.split(' ').length, 'words');
    console.log('  - Character count:', script.content.length, 'characters');

    const isTTSReady = !hasBrackets && !hasStageDirections && !hasUrls && !hasComplexFormatting;
    console.log('🎙️ Overall TTS Ready:', isTTSReady ? '✅ PERFECT' : '❌ NEEDS CLEANUP');

  } catch (error) {
    console.error('❌ Gemini script generation failed:', error.message);
  }

  console.log('\n2. Testing Gemini Video Analysis...');
  try {
    const videoInfo = {
      duration: 30,
      format: 'mp4',
      resolution: '1920x1080',
      originalName: 'test-video.mp4'
    };

    const workspace = {
      product_category: 'Tech',
      target_market: '25-34',
      description: 'Tech product showcase'
    };

    const clips = await geminiService.analyzeVideo(videoInfo, workspace);
    console.log('✅ Gemini video analysis completed!');
    console.log(`Generated ${clips.length} suggested clips:`);
    clips.forEach((clip, index) => {
      console.log(`  ${index + 1}. ${clip.name} (${clip.category}) - ${clip.startTime}s to ${clip.endTime}s`);
    });
  } catch (error) {
    console.error('❌ Gemini video analysis failed:', error.message);
  }

  // Test ElevenLabs Service
  console.log('\n3. Testing ElevenLabs Voice Service...');
  try {
    const voices = elevenLabsService.getVoices();
    console.log('✅ ElevenLabs voices loaded successfully!');
    console.log(`Available voices: ${voices.length}`);
    voices.slice(0, 3).forEach(voice => {
      console.log(`  - ${voice.name} (${voice.gender}, ${voice.style})`);
    });

    // Test quota check
    const quota = await elevenLabsService.checkQuota();
    console.log('✅ ElevenLabs quota check completed');
    console.log('Can generate:', quota.canGenerate);
    if (quota.charactersUsed !== undefined) {
      console.log(`Characters used: ${quota.charactersUsed}/${quota.charactersLimit}`);
    }
  } catch (error) {
    console.error('❌ ElevenLabs service test failed:', error.message);
  }

  console.log('\n🎉 AI Services test completed!');
}

// Run the test
testAIServices().catch(console.error);
