import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { JourneyStatsData, StageResult, RaceResult } from './types/index.js';
import { useTraceRequest } from './hooks/useTraceRequest.js';
import { RequestBar } from './components/RequestBar/RequestBar.js';
import { ResponsePanel } from './components/ResponsePanel/ResponsePanel.js';
import { JourneyStats } from './components/JourneyStats/JourneyStats.js';
import { SpeedBreakdown } from './components/SpeedBreakdown/SpeedBreakdown.js';
import { PipelineFlow } from './components/PipelineFlow/PipelineFlow.js';
import { ModelRace } from './components/ModelRace/ModelRace.js';
import { RaceResults } from './components/ModelRace/RaceResults.js';

const styles = {
  container: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px 32px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  } satisfies CSSProperties,

  header: {
    marginBottom: 24,
  } satisfies CSSProperties,

  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    color: '#f1f5f9',
  } satisfies CSSProperties,

  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    margin: '4px 0 0',
  } satisfies CSSProperties,

  mainContent: {
    display: 'flex',
    gap: 24,
    marginTop: 24,
  } satisfies CSSProperties,

  leftPanel: {
    flex: '0 0 55%',
    minWidth: 0,
  } satisfies CSSProperties,

  rightPanel: {
    flex: '0 0 calc(45% - 24px)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    minWidth: 0,
  } satisfies CSSProperties,

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#7f1d1d',
    border: '1px solid #991b1b',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
    color: '#fecaca',
  } satisfies CSSProperties,

  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#fecaca',
    cursor: 'pointer',
    fontSize: 18,
    padding: '0 0 0 12px',
    lineHeight: 1,
  } satisfies CSSProperties,

  raceResultsSection: {
    marginTop: 24,
  } satisfies CSSProperties,
};

function getFirstSuccessfulRaceData(raceResults: RaceResult[] | null): {
  content: string | null;
  stats: JourneyStatsData | null;
  stages: StageResult[] | null;
} {
  if (!raceResults) return { content: null, stats: null, stages: null };
  const first = raceResults
    .filter((r) => r.result && !r.error)
    .sort((a, b) => a.finishOrder - b.finishOrder)[0];
  if (!first?.result) return { content: null, stats: null, stages: null };
  return {
    content: first.result.response.content,
    stats: first.result.journeyStats,
    stages: first.result.stages,
  };
}

export default function App() {
  const {
    sendRequest,
    raceModels,
    isLoading,
    result,
    raceResults,
    error,
    isRaceMode,
  } = useTraceRequest();

  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const showError = error && error !== dismissedError;

  const raceData = isRaceMode ? getFirstSuccessfulRaceData(raceResults) : null;

  const content = isRaceMode ? (raceData?.content ?? null) : (result?.response.content ?? null);
  const stats = isRaceMode ? (raceData?.stats ?? null) : (result?.journeyStats ?? null);
  const stages = isRaceMode ? (raceData?.stages ?? null) : (result?.stages ?? null);

  const handleSend = (model: string, prompt: string) => {
    setDismissedError(null);
    sendRequest(model, prompt);
  };

  const handleRaceAll = (prompt: string) => {
    setDismissedError(null);
    raceModels(prompt);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 AI Gateway Pipeline Explorer</h1>
        <p style={styles.subtitle}>
          Watch your request travel through the AI gateway pipeline
        </p>
      </header>

      {showError && (
        <div style={styles.errorBanner} role="alert">
          <span>⚠️ {error}</span>
          <button
            style={styles.dismissButton}
            onClick={() => setDismissedError(error)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <RequestBar
        onSend={handleSend}
        onRaceAll={handleRaceAll}
        isLoading={isLoading}
      />

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          {isRaceMode ? (
            <ModelRace results={raceResults} isLoading={isLoading} />
          ) : (
            <PipelineFlow stages={stages} isLoading={isLoading} />
          )}
        </div>

        <div style={styles.rightPanel}>
          <ResponsePanel content={content} isLoading={isLoading} />
          <JourneyStats stats={stats} />
          <SpeedBreakdown stages={stages} />
        </div>
      </div>

      {isRaceMode && raceResults && !isLoading && (
        <div style={styles.raceResultsSection}>
          <RaceResults results={raceResults} />
        </div>
      )}
    </div>
  );
}
