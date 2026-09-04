'use client';

import { ResponsiveSankey } from '@nivo/sankey';
import { useMemo } from 'react';
import { nodeColor } from '@/lib/chart-colors';
import type { SankeyGraph } from '@/lib/sankey';

interface NivoNode {
  id: string;
  name: string;
  kind: 'stage' | 'outcome';
}

interface Props {
  graph: SankeyGraph;
}

export function SankeyChart({ graph }: Props) {
  const data = useMemo(
    () => ({
      nodes: graph.nodes.map<NivoNode>((node) => ({
        id: node.id,
        name: node.label,
        kind: node.kind,
      })),
      links: graph.links.map((link) => ({
        source: link.source,
        target: link.target,
        value: link.value,
      })),
    }),
    [graph],
  );

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
        <p className="text-sm text-slate-500">No applications match the current filters.</p>
      </div>
    );
  }

  const percent = (value: number) =>
    graph.total > 0 ? `${Math.round((value / graph.total) * 100)}%` : '';

  return (
    <div className="sankey-surface h-[520px] rounded-lg border border-slate-200 bg-white p-2">
      <ResponsiveSankey<NivoNode, { source: string; target: string; value: number }>
        data={data}
        margin={{ top: 16, right: 150, bottom: 16, left: 110 }}
        align="justify"
        sort="input"
        colors={(node) => nodeColor(node.id)}
        nodeOpacity={1}
        nodeThickness={16}
        nodeSpacing={20}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.4}
        linkHoverOpacity={0.7}
        linkHoverOthersOpacity={0.12}
        linkContract={2}
        enableLinkGradient
        labelPosition="outside"
        labelPadding={10}
        label={(node) => `${node.name} · ${node.value}`}
        labelTextColor="#334155"
        theme={{
          text: { fontSize: 12, fill: '#334155' },
          tooltip: { container: { fontSize: 12 } },
        }}
        nodeTooltip={({ node }) => (
          <Tooltip>
            <strong>{node.name}</strong>
            <span>
              {node.value} {node.value === 1 ? 'application' : 'applications'} ({percent(node.value)}{' '}
              of {graph.total})
            </span>
          </Tooltip>
        )}
        linkTooltip={({ link }) => (
          <Tooltip>
            <strong>
              {link.source.name} → {link.target.name}
            </strong>
            <span>
              {link.value} {link.value === 1 ? 'application' : 'applications'} (
              {percent(link.value)} of {graph.total})
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
    <div className="flex flex-col gap-0.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      {children}
    </div>
  );
}
