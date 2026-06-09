'use client';

interface WebcamPreviewProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  onPositionChange?: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onSizeChange?: (size: number) => void;
}

export default function WebcamPreview({
  position,
  size,
  onPositionChange,
  onSizeChange,
}: WebcamPreviewProps) {
  const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ];

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4 max-w-md w-full">
      <h3 className="text-sm font-semibold">Webcam Overlay Settings</h3>

      <div>
        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-2">
          Position
        </label>
        <div className="grid grid-cols-2 gap-2">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => onPositionChange?.(pos)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                position === pos
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {pos.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-600 dark:text-gray-400 block mb-2">
          Size: {size}%
        </label>
        <input
          type="range"
          min="10"
          max="40"
          value={size}
          onChange={(e) => onSizeChange?.(parseInt(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Small</span>
          <span>Large</span>
        </div>
      </div>
    </div>
  );
}
