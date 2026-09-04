import { OUTCOMES, stageLabel } from '@/lib/stages';

const TONE_CLASSES: Record<string, string> = {
  active: 'bg-active-bg text-active-fg',
  positive: 'bg-good-bg text-good-fg',
  negative: 'bg-bad-bg text-bad-fg',
  neutral: 'bg-warn-bg text-warn-fg',
  muted: 'bg-neutral-bg text-neutral-fg',
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const match = OUTCOMES.find((o) => o.id === outcome);
  const tone = match ? TONE_CLASSES[match.tone] : TONE_CLASSES.muted;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${tone}`}>
      {match?.label ?? outcome}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className="inline-block rounded-md bg-neutral-bg px-2 py-0.5 text-xs text-neutral-fg">
      {stageLabel(stage)}
    </span>
  );
}
