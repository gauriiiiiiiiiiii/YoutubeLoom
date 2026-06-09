'use client';

interface WebcamPreviewProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  onPositionChange?: (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  onSizeChange?: (size: number) => void;
}

const positions: Array<{
  value: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  label: string;
}> = [
  { value: 'top-left',     label: 'Top Left'     },
  { value: 'top-right',    label: 'Top Right'    },
  { value: 'bottom-left',  label: 'Bottom Left'  },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export default function WebcamPreview({ position, size, onPositionChange, onSizeChange }: WebcamPreviewProps) {
  return (
    <div className="space-y-4 w-full">

      {/* Position picker */}
      <div>
        <p className="text-xs font-medium text-neutral-400 mb-2">Position</p>

        {/* Visual screen mockup with corner dots */}
        <div className="relative w-full aspect-video max-w-[180px] mx-auto bg-white/5 rounded-lg border border-white/10 mb-3">
          {positions.map((pos) => {
            const isActive = position === pos.value;
            const [vert, horiz] = pos.value.split('-');
            return (
              <button
                key={pos.value}
                onClick={() => onPositionChange?.(pos.value)}
                title={pos.label}
                className={`absolute w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-500 border-blue-400 scale-110'
                    : 'bg-white/10 border-white/20 hover:bg-white/20'
                } ${vert === 'top' ? 'top-2' : 'bottom-2'} ${horiz === 'left' ? 'left-2' : 'right-2'}`}
              />
            );
          })}
          {/* Screen icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 9h12l1 3H3l1-3z" />
            </svg>
          </div>
        </div>

        {/* Position label */}
        <p className="text-center text-xs text-neutral-500">
          {positions.find((p) => p.value === position)?.label}
        </p>
      </div>

      {/* Size slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-neutral-400">Webcam size</p>
          <span className="text-xs font-mono text-neutral-400">{size}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="40"
          value={size}
          onChange={(e) => onSizeChange?.(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-neutral-600">Small</span>
          <span className="text-xs text-neutral-600">Large</span>
        </div>
      </div>
    </div>
  );
}
