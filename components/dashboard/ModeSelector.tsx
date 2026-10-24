'use client';

export type ProcessingMode = 'crypto' | 'bank';

interface ModeSelectorProps {
  selectedMode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
}

// A toggle, not navigation: the old cards carried → arrows and read as links.
export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="What are you converting?"
      className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-xl bg-app-raised border border-app-border"
    >
      <ModeButton active={selectedMode === 'crypto'} onClick={() => onModeChange('crypto')}>
        Crypto CSV → tax software
      </ModeButton>
      <ModeButton active={selectedMode === 'bank'} onClick={() => onModeChange('bank')}>
        Bank PDF → CSV
      </ModeButton>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 px-3 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-app-card text-app-text font-semibold shadow-sm border border-app-border'
          : 'text-app-muted font-medium hover:text-app-text'
      }`}
    >
      {children}
    </button>
  );
}
