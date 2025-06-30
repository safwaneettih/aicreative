import React from 'react';
import {
    AbsoluteFill,
    OffthreadVideo,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
    spring,
    interpolate
} from 'remotion';

const MinimalRemotionComposition = ({
    videoSrc,
    captionTracks = [],
    styles = {},
    animations = {}
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Get primary caption track
    const primaryTrack = captionTracks.find(track => track.is_primary) || captionTracks[0];
    const captions = primaryTrack?.caption_data || [];

    // Build video URL with validation
    const buildVideoUrl = (src) => {
        if (!src || typeof src !== 'string') return null;
        if (src.includes('undefined') || src.includes('null')) return null;
        if (src.startsWith('http')) return src;
        return `http://localhost:5000/${src}`;
    };

    const videoUrl = buildVideoUrl(videoSrc);

    // Don't render anything if video URL is invalid
    if (!videoUrl) {
        return (
            <AbsoluteFill style={{ backgroundColor: '#000000' }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '24px',
                    fontFamily: 'Arial'
                }}>
                    No video source
                </div>
            </AbsoluteFill>
        );
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#000000' }}>
            {/* Use OffthreadVideo with better error handling */}
            <AbsoluteFill>
                <OffthreadVideo
                    src={videoUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                    onError={() => {
                        // Silent error handling
                    }}
                    // Disable all audio features to prevent crashes
                    muted={true}
                    volume={0}
                    startFrom={0}
                    endAt={999999}
                    // Unique key to force re-render on video change
                    key={`video-${videoUrl}`}
                />
            </AbsoluteFill>

            {/* Caption Overlay using Sequences with animations */}
            {captions.map((caption, index) => {
                const startFrame = Math.floor(caption.start * fps);
                const endFrame = Math.floor(caption.end * fps);
                const durationInFrames = endFrame - startFrame;

                if (durationInFrames <= 0) return null;

                return (
                    <Sequence
                        key={`caption-${index}-${caption.start}`}
                        from={startFrame}
                        durationInFrames={durationInFrames}
                    >
                        <CaptionRenderer
                            caption={caption}
                            styles={styles}
                            durationInFrames={durationInFrames}
                        />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

// Separate component for caption rendering with animations
const CaptionRenderer = ({ caption, styles, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Entry animation (similar to remotion-tiktok-template)
    const enterProgress = spring({
        frame,
        fps,
        config: {
            damping: 200,
        },
        durationInFrames: Math.min(8, durationInFrames / 3),
    });

    // Exit animation for the last part of the caption
    const exitStartFrame = Math.max(0, durationInFrames - 8);
    const exitProgress = frame >= exitStartFrame ?
        spring({
            frame: frame - exitStartFrame,
            fps,
            config: {
                damping: 100,
            },
            durationInFrames: 8,
            reverse: true
        }) : 1;

    // Scale and opacity based on animations
    const scale = interpolate(
        enterProgress,
        [0, 1],
        [0.8, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    const opacity = Math.min(enterProgress, exitProgress);

    // Enhanced styling with TikTok-like appearance
    const captionStyle = {
        position: 'absolute',
        left: `${(caption.position?.x || 0.5) * 100}%`,
        top: `${(caption.position?.y || 0.85) * 100}%`,
        transform: `translateX(-50%) translateY(-50%) scale(${scale})`,
        fontSize: styles.fontSize || 48,
        fontFamily: styles.fontFamily || '"Inter", "Arial Black", Arial, sans-serif',
        color: styles.color || '#FFFFFF',
        backgroundColor: styles.backgroundColor || 'rgba(0, 0, 0, 0.8)',
        textAlign: styles.textAlign || 'center',
        fontWeight: styles.fontWeight || '900',
        padding: `${styles.padding || 16}px ${styles.padding || 24}px`,
        borderRadius: `${styles.borderRadius || 12}px`,
        textShadow: styles.textShadow || '0 4px 8px rgba(0, 0, 0, 0.9)',
        maxWidth: '85%',
        lineHeight: 1.3,
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        opacity,
        letterSpacing: '0.5px',
        // Add subtle border for better visibility
        border: styles.border || '2px solid rgba(255, 255, 255, 0.2)',
        // Add backdrop blur for modern look
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        // Better text rendering
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
    };

    return (
        <AbsoluteFill>
            <div style={captionStyle}>
                {caption.text}
            </div>
        </AbsoluteFill>
    );
};

export default MinimalRemotionComposition;
