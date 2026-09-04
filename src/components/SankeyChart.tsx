'use client';

import { ResponsiveSankey } from '@nivo/sankey';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { nodeColor } from '@/lib/chart-colors';
import type { SankeyGraph } from '@/lib/sankey';
import { isStageId } from '@/lib/stages';

interface NivoNode {
  id: string;
  name: string;
  kind: 'stage' | 'outcome';
}

interface Props {
  graph: SankeyGraph;
}

/**
 * The chart is also a filter control: clicking a rung or an outcome writes it
 * into the URL and sends you to the table, which is the question a reader has
 * as soon as they see a wide ribbon — "which ones are those?".
 */
export function SankeyChart({ graph }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map<NivoNode>((node) => ({ id: node.id, name: node.label, kind: node.kind })),
      links: graph.links.map((link) => ({ source: link.source, target: link.target, value: link.value })),
    }),
    [graph],
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-card border border-dashed border-[#ded2c1] bg-surface">
        <p className="text-[13px] text-faint">No applications match the current filters.</p>
      </div>
    );
  }

  const percent = (value: number) => (graph.total > 0 ? `${Math.round((value / graph.total) * 100)}%` : '');

  /** Conversion from the rung before, which is the number a funnel is read for. */
  const conversion = (nodeId: string) => {
    const index = graph.nodes.findIndex((node) => node.id === nodeId);
    const node = graph.nodes[index];
    const previous = graph.nodes[index - 1];
    if (!node || !previous || previous.kind !== 'stage' || node.kind !== 'stage' || previous.value === 0) {
      return null;
    }
    return `${Math.round((node.value / previous.value) * 100)}% of previous`;
  };

  const drillDown = (nodeId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('stage');
    next.delete('outcome');
    if (isStageId(nodeId)) next.append('stage', nodeId);
    else next.append('outcome', nodeId.replace('OUTCOME_', ''));
    router.push(`/applications?${next.toString()}`);
  };

  return (
    <div className="sankey-surface h-[520px] rounded-card border border-line bg-surface p-2">
      <ResponsiveSankey<NivoNode, { source: string; target: string; value: number }>
        data={data}
        margin={{ top: 16, right: 152, bottom: 16, left: 118 }}
        align="justify"
        sort="input"
        colors={(node) => nodeColor(node.id)}
        nodeOpacity={1}
        nodeThickness={13}
        nodeSpacing={22}
        nodeBorderWidth={0}
        nodeBorderRadius={4}
        linkOpacity={0.5}
        linkHoverOpacity={0.75}
        linkHoverOthersOpacity={0.12}
        linkContract={2}
        enableLinkGradient
        labelPosition="outside"
        labelPadding={9}
        label={(node) => `${node.name} · ${node.value} ${percent(node.value)}`}
        labelTextColor="#3d362f"
        onClick={(node) => drillDown((node as NivoNode).id)}
        theme={{
          text: { fontSize: 12.5, fill: '#3d362f', fontFamily: 'var(--font-sans), sans-serif' },
          tooltip: { container: { fontSize: 12 } },
        }}
        nodeTooltip={({ node }) => (
          <Tooltip>
            <strong>{node.name}</strong>
            <span>
              {node.value} {node.value === 1 ? 'application' : 'applications'} ({percent(node.value)} of{' '}
              {graph.total})
            </span>
            {conversion(node.id) && <span className="text-clayDeep">{conversion(node.id)}</span>}
            <span className="text-faint">Click to see them in the table</span>
          </Tooltip>
        )}
        linkTooltip={({ link }) => (
          <Tooltip>
            <strong>
              {link.source.name} → {link.target.name}
            </strong>
            <span>
              {link.value} {link.value === 1 ? 'application' : 'applications'} ({percent(link.value)} of{' '}
              {graph.total})
            </span>
          </Tooltip>
        )}
        role="img"
        ariaLabel={`Application funnel for ${graph.total} applications`}
      />
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm">
      {children}
    </div>
  );
}
