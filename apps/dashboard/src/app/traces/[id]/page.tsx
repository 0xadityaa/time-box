import { prisma } from '@time-box/db';
import { notFound } from 'next/navigation';
import { fetchPayloadFromS3 } from '@/lib/s3';
import { PayloadViewer } from '@/components/payload-viewer';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function TraceDetailPage({ params }: { params: { id: string } }) {
  // Await the params object itself per Next.js 15+ constraints if this was upgraded, but in 14 it's technically sync. Wait, Next.js 16 requires awaiting params.
  const resolvedParams = await params;
  
  const trace = await prisma.trace.findUnique({
    where: { id: resolvedParams.id },
    include: {
      spans: {
        orderBy: { startTime: 'asc' }
      }
    }
  });

  if (!trace) {
    notFound();
  }

  // Pre-fetch payloads for GenAI spans
  const spansWithPayloads = await Promise.all(trace.spans.map(async (span) => {
    let payloadContent = null;
    if (span.payloadUri) {
      payloadContent = await fetchPayloadFromS3(span.payloadUri);
    }
    return { ...span, payloadContent };
  }));

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-mono">{trace.id}</h1>
        <p className="text-muted-foreground mt-1">Trace breakdown and execution waterfall.</p>
      </div>

      <div className="flex flex-col gap-4">
        {spansWithPayloads.map((span) => (
          <div key={span.id} className="p-4 rounded-lg border border-white/10 bg-black/20 backdrop-blur-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{span.name}</span>
                  {span.status === 'ERROR' ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">OK</Badge>
                  )}
                  {span.genAiSystem && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400">{span.genAiSystem}</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1 font-mono">
                  {span.spanId} • {span.latencyMs}ms
                </div>
              </div>
              
              <div className="text-right text-sm text-muted-foreground">
                {(span.inputTokens || span.outputTokens) && (
                  <div>
                    <span className="text-zinc-300">Tokens:</span> {span.inputTokens || 0} in / {span.outputTokens || 0} out
                  </div>
                )}
              </div>
            </div>

            {span.payloadContent && (
              <PayloadViewer payloadStr={span.payloadContent} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
