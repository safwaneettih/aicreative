// Test TTS generation with the clean script
// Set environment variables manually for testing
process.env.GEMINI_API_KEY = 'AIzaSyACSPZ5B6ZVYI-Km4OcvXpWTlzVMzJTpo4';
process.env.ELEVENLABS_API_KEY = 'sk_2f3ae479b03b5e01290fca484a33424a6d51f6196ec5b76e';

const geminiService = require('./server/utils/geminiService');
const elevenLabsService = require('./server/utils/elevenLabsService');
const fs = require('fs');
const path = require('path');

async function testFullTTSWorkflow() {
  console.log('🎙️ Testing Full Script-to-Voice Workflow...\n');

  try {
    // 1. Generate TTS-ready script
    console.log('1. Generating TTS-ready script...');
    const workspace = {
      name: 'EcoClean Pro',
      product_category: 'Home & Garden',
      target_market: '35-44',
      description: 'Eco-friendly cleaning solution that works better than chemicals'
    };

    const script = await geminiService.generateScript(workspace, 'Focus on environmental benefits and family safety');
    console.log('✅ Script generated:', script.title);
    console.log('📝 Content:', script.content);
    console.log('📊 Length:', script.content.length, 'characters');

    // 2. Check TTS compatibility
    const hasBrackets = /[\[\]()]/.test(script.content);
    const hasStageDirections = /\b(scene|pause|music|fade|cut|intro|outro|start|end)\b/i.test(script.content);
    const hasUrls = /\.(com|net|org|io)\b/i.test(script.content);

    console.log('\n🔍 TTS Compatibility:');
    console.log('  - Clean for TTS:', !hasBrackets && !hasStageDirections && !hasUrls ? '✅' : '❌');

    // 3. Generate voiceover with ElevenLabs
    console.log('\n2. Generating AI voiceover...');
    const outputDir = path.join(__dirname, 'uploads', 'test-voiceovers');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const voiceId = 'ErXwobaYiN019PkySvjV'; // Antoni - professional voice
    const outputPath = path.join(outputDir, `test-script-${Date.now()}.mp3`);

    const audioResult = await elevenLabsService.generateSpeech(script.content, voiceId, outputPath);
    console.log('✅ Voiceover generated successfully!');
    console.log('🎵 Audio file:', audioResult.filePath);
    console.log('📏 Duration:', audioResult.duration, 'seconds');
    console.log('💾 File size:', (audioResult.fileSize / 1024).toFixed(1), 'KB');

    console.log('\n🎉 Full workflow completed successfully!');
    console.log('📁 Generated files:');
    console.log('  - Script content: TTS-optimized and ready');
    console.log('  - Audio file:', path.basename(audioResult.filePath));

  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
  }
}

// Run the test
testFullTTSWorkflow().catch(console.error);
