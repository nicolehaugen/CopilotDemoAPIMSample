import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ModelDef } from '../../types';

const MODELS: ModelDef[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', color: '#3b82f6', tier: 'premium' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', color: '#22c55e', tier: 'standard' },
  { id: 'phi-4', name: 'Phi-4', color: '#a855f7', tier: 'standard' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini Flash', color: '#f97316', tier: 'standard' },
];

interface RequestBarProps {
  onSend: (model: string, prompt: string) => void;
  onRaceAll: (prompt: string) => void;
  isLoading: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  chipRow: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    minWidth: '200px',
    resize: 'none' as const,
    padding:'8px 12px',
    background: '#0f172a',
    color: '#f1f5f9',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '1.4',
    outline: 'none',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  sendButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    background: '#3b82f6',
    color: '#fff',
    whiteSpace: 'nowrap' as const,
  },
  raceButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #f97316',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    background: 'transparent',
    color: '#f97316',
    whiteSpace: 'nowrap' as const,
  },
  disabledButton: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};

function chipStyle(model: ModelDef, isSelected: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: `1.5px solid ${isSelected ? model.color : '#475569'}`,
    background: isSelected ? model.color + '22' : 'transparent',
    color: isSelected ? model.color : '#94a3b8',
    fontWeight: isSelected ? 600 : 400,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

function dotStyle(color: string): CSSProperties {
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  };
}

export function RequestBar({ onSend, onRaceAll, isLoading }: RequestBarProps) {
  const [selectedModel, setSelectedModel] = useState('gpt-4.1-mini');
  const [prompt, setPrompt] = useState('');

  const canSubmit = !isLoading && prompt.trim().length > 0;

  const handleSend = () => {
    if (canSubmit) onSend(selectedModel, prompt.trim());
  };

  const handleRace = () => {
    if (canSubmit) onRaceAll(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chipRow}>
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            style={chipStyle(m, selectedModel === m.id)}
            onClick={() => setSelectedModel(m.id)}
          >
            <span style={dotStyle(m.color)} />
            {m.name}
          </button>
        ))}
      </div>

      <textarea
        style={styles.textarea}
        rows={2}
        placeholder="Ask the AI anything..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div style={styles.buttonGroup}>
        <button
          type="button"
          style={{ ...styles.sendButton, ...(canSubmit ? {} : styles.disabledButton) }}
          disabled={!canSubmit}
          onClick={handleSend}
        >
          Send ▶
        </button>
        <button
          type="button"
          style={{ ...styles.raceButton, ...(canSubmit ? {} : styles.disabledButton) }}
          disabled={!canSubmit}
          onClick={handleRace}
        >
          🏁 Race All
        </button>
      </div>
    </div>
  );
}
