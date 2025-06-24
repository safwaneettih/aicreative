const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class VideoProcessor {
  constructor() {
    // Set FFmpeg path if needed (uncomment and adjust path if FFmpeg is not in PATH)
    // ffmpeg.setFfmpegPath('/usr/local/bin/ffmpeg');
  }

  // Get video metadata
  async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          resolve({
            duration: metadata.format.duration,
            format: metadata.format.format_name,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
            size: metadata.format.size
          });
        }
      });
    });
  }

  // Cut video clip
  async cutClip(inputPath, outputPath, startTime, endTime) {
    const duration = endTime - startTime;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  // Combine video clips with voiceover
  async combineClipsWithVoiceover(clipPaths, voiceoverPath, outputPath) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add video clips
      clipPaths.forEach(clipPath => {
        command.input(clipPath);
      });

      // Add voiceover
      if (voiceoverPath) {
        command.input(voiceoverPath);
      }

      // Create filter complex for concatenating videos and mixing audio
      let filterComplex = '';

      // Concatenate video clips
      for (let i = 0; i < clipPaths.length; i++) {
        filterComplex += `[${i}:v]`;
      }
      filterComplex += `concat=n=${clipPaths.length}:v=1:a=1[v][a]`;

      // Mix with voiceover if provided
      if (voiceoverPath) {
        filterComplex += `;[a][${clipPaths.length}:a]amix=inputs=2:duration=first:dropout_transition=3[aout]`;
        command.complexFilter(filterComplex);
        command.outputOptions(['-map', '[v]', '-map', '[aout]']);
      } else {
        command.complexFilter(filterComplex);
        command.outputOptions(['-map', '[v]', '-map', '[a]']);
      }

      command
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset', 'medium', '-crf', '23'])
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  // Generate video thumbnail
  async generateThumbnail(inputPath, outputPath, timeOffset = 1) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timeOffset)
        .frames(1)
        .output(outputPath)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }
}

module.exports = new VideoProcessor();
