import { prisma } from '@time-box/db';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function TracesPage() {
  const traces = await prisma.trace.findMany({
    orderBy: { startTime: 'desc' },
    take: 50,
    include: {
      spans: {
        select: { id: true, name: true, latencyMs: true, status: true, inputTokens: true, outputTokens: true }
      }
    }
  });

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Traces</h1>
        <p className="text-muted-foreground mt-1">Recent execution traces from your agentic workflows.</p>
      </div>

      <div className="rounded-md border border-white/10 bg-black/20 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead>Trace ID</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Spans</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {traces.map((trace) => {
              const totalLatency = trace.spans.reduce((acc, s) => acc + (s.latencyMs || 0), 0);
              const totalTokens = trace.spans.reduce((acc, s) => acc + (s.inputTokens || 0) + (s.outputTokens || 0), 0);
              const hasError = trace.spans.some(s => s.status === 'ERROR');

              return (
                <TableRow key={trace.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-mono text-xs">
                    <Link href={`/traces/${trace.id}`} className="text-blue-400 hover:underline">
                      {trace.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(trace.startTime, { addSuffix: true })}
                  </TableCell>
                  <TableCell>{trace.spans.length}</TableCell>
                  <TableCell>{totalLatency}ms</TableCell>
                  <TableCell>{totalTokens}</TableCell>
                  <TableCell>
                    {hasError ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border-emerald-500/50">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {traces.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No traces found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
