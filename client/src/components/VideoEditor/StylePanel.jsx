import React, { useState } from 'react';
import { Palette, Type, Move, Eye } from 'lucide-react';

const StylePanel = ({ styles = {}, onUpdateStyles }) => {
    const [activeSection, setActiveSection] = useState('text');

    const defaultStyles = {
        fontSize: 40,
        fontFamily: 'Arial Black',
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        fontWeight: 'bold',
        padding: 20,
        borderRadius: 10,
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        highlightWords: false,
        highlightColor: '#FFD700',
        ...styles
    };

    const handleStyleChange = (property, value) => {
        const updatedStyles = {
            ...defaultStyles,
            [property]: value
        };
        onUpdateStyles(updatedStyles);
    };

    const colorOptions = [
        '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
        '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
    ];

    const fontFamilies = [
        'Arial Black',
        'Arial',
        'Helvetica',
        'Georgia',
        'Times New Roman',
        'Courier New',
        'Impact',
        'Comic Sans MS'
    ];

    const sections = [
        { id: 'text', label: 'Text', icon: Type },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'position', label: 'Position', icon: Move },
        { id: 'effects', label: 'Effects', icon: Eye }
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Section Tabs */}
            <div className="flex border-b border-gray-700">
                {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex-1 px-2 py-2 text-xs flex flex-col items-center space-y-1 ${activeSection === section.id
                                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Icon size={16} />
                            <span>{section.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Section Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeSection === 'text' && (
                    <TextStyleSection
                        styles={defaultStyles}
                        onStyleChange={handleStyleChange}
                        fontFamilies={fontFamilies}
                    />
                )}

                {activeSection === 'appearance' && (
                    <AppearanceSection
                        styles={defaultStyles}
                        onStyleChange={handleStyleChange}
                        colorOptions={colorOptions}
                    />
                )}

                {activeSection === 'position' && (
                    <PositionSection
                        styles={defaultStyles}
                        onStyleChange={handleStyleChange}
                    />
                )}

                {activeSection === 'effects' && (
                    <EffectsSection
                        styles={defaultStyles}
                        onStyleChange={handleStyleChange}
                        colorOptions={colorOptions}
                    />
                )}
            </div>
        </div>
    );
};

const TextStyleSection = ({ styles, onStyleChange, fontFamilies }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-gray-400 text-sm mb-2">Font Family</label>
            <select
                value={styles.fontFamily}
                onChange={(e) => onStyleChange('fontFamily', e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
            >
                {fontFamilies.map((font) => (
                    <option key={font} value={font}>{font}</option>
                ))}
            </select>
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">
                Font Size: {styles.fontSize}px
            </label>
            <input
                type="range"
                min="12"
                max="100"
                value={styles.fontSize}
                onChange={(e) => onStyleChange('fontSize', parseInt(e.target.value))}
                className="w-full"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">Font Weight</label>
            <select
                value={styles.fontWeight}
                onChange={(e) => onStyleChange('fontWeight', e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
            >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="bolder">Bolder</option>
            </select>
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">Text Alignment</label>
            <div className="grid grid-cols-3 gap-2">
                {['left', 'center', 'right'].map((align) => (
                    <button
                        key={align}
                        onClick={() => onStyleChange('textAlign', align)}
                        className={`p-2 rounded text-sm capitalize ${styles.textAlign === align
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {align}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const AppearanceSection = ({ styles, onStyleChange, colorOptions }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-gray-400 text-sm mb-2">Text Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {colorOptions.map((color) => (
                    <button
                        key={color}
                        onClick={() => onStyleChange('color', color)}
                        className={`w-8 h-8 rounded border-2 ${styles.color === color ? 'border-white' : 'border-gray-600'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
            <input
                type="color"
                value={styles.color}
                onChange={(e) => onStyleChange('color', e.target.value)}
                className="w-full h-8 rounded"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">Background</label>
            <input
                type="color"
                value={styles.backgroundColor?.replace(/rgba?\([^)]+\)/, '#000000')}
                onChange={(e) => onStyleChange('backgroundColor', e.target.value)}
                className="w-full h-8 rounded mb-2"
            />
            <label className="block text-gray-400 text-sm mb-2">
                Background Opacity: {Math.round((parseFloat(styles.backgroundColor?.match(/[\d.]+(?=\))/)?.[0] || 1) * 100))}%
            </label>
            <input
                type="range"
                min="0"
                max="100"
                value={Math.round((parseFloat(styles.backgroundColor?.match(/[\d.]+(?=\))/)?.[0] || 1) * 100))}
                onChange={(e) => {
                    const opacity = parseInt(e.target.value) / 100;
                    const color = styles.backgroundColor?.replace(/rgba?\([^)]+\)/, '') || '#000000';
                    onStyleChange('backgroundColor', `rgba(0, 0, 0, ${opacity})`);
                }}
                className="w-full"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">
                Border Radius: {styles.borderRadius}px
            </label>
            <input
                type="range"
                min="0"
                max="50"
                value={styles.borderRadius}
                onChange={(e) => onStyleChange('borderRadius', parseInt(e.target.value))}
                className="w-full"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">
                Padding: {styles.padding}px
            </label>
            <input
                type="range"
                min="0"
                max="50"
                value={styles.padding}
                onChange={(e) => onStyleChange('padding', parseInt(e.target.value))}
                className="w-full"
            />
        </div>
    </div>
);

const PositionSection = ({ styles, onStyleChange }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-gray-400 text-sm mb-2">Position Presets</label>
            <div className="grid grid-cols-3 gap-2">
                {[
                    { name: 'Top', value: { x: 0.5, y: 0.1 } },
                    { name: 'Center', value: { x: 0.5, y: 0.5 } },
                    { name: 'Bottom', value: { x: 0.5, y: 0.8 } }
                ].map((preset) => (
                    <button
                        key={preset.name}
                        onClick={() => onStyleChange('position', preset.value)}
                        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded text-sm"
                    >
                        {preset.name}
                    </button>
                ))}
            </div>
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">
                Horizontal Position: {Math.round((styles.position?.x || 0.5) * 100)}%
            </label>
            <input
                type="range"
                min="0"
                max="100"
                value={(styles.position?.x || 0.5) * 100}
                onChange={(e) => onStyleChange('position', {
                    ...styles.position,
                    x: parseInt(e.target.value) / 100
                })}
                className="w-full"
            />
        </div>

        <div>
            <label className="block text-gray-400 text-sm mb-2">
                Vertical Position: {Math.round((styles.position?.y || 0.8) * 100)}%
            </label>
            <input
                type="range"
                min="0"
                max="100"
                value={(styles.position?.y || 0.8) * 100}
                onChange={(e) => onStyleChange('position', {
                    ...styles.position,
                    y: parseInt(e.target.value) / 100
                })}
                className="w-full"
            />
        </div>
    </div>
);

const EffectsSection = ({ styles, onStyleChange, colorOptions }) => (
    <div className="space-y-4">
        <div>
            <label className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={styles.highlightWords}
                    onChange={(e) => onStyleChange('highlightWords', e.target.checked)}
                    className="rounded"
                />
                <span className="text-gray-400 text-sm">Word Highlighting</span>
            </label>
        </div>

        {styles.highlightWords && (
            <div>
                <label className="block text-gray-400 text-sm mb-2">Highlight Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {colorOptions.map((color) => (
                        <button
                            key={color}
                            onClick={() => onStyleChange('highlightColor', color)}
                            className={`w-8 h-8 rounded border-2 ${styles.highlightColor === color ? 'border-white' : 'border-gray-600'
                                }`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>
        )}

        <div>
            <label className="block text-gray-400 text-sm mb-2">Text Shadow</label>
            <select
                value={styles.textShadow || '2px 2px 4px rgba(0, 0, 0, 0.8)'}
                onChange={(e) => onStyleChange('textShadow', e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
            >
                <option value="none">None</option>
                <option value="1px 1px 2px rgba(0, 0, 0, 0.8)">Light</option>
                <option value="2px 2px 4px rgba(0, 0, 0, 0.8)">Medium</option>
                <option value="3px 3px 6px rgba(0, 0, 0, 0.8)">Heavy</option>
            </select>
        </div>
    </div>
);

export default StylePanel;
