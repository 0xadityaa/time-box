import { getDashboardMetrics } from './actions/metrics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Clock, FileDigit, ShieldAlert } from 'lucide-react';
import { AreaChart, BarChart, DonutChart } from '@tremor/react';

export const dynamic = 'force-dynamic';

export default async function DashboardOverview() {
  const { kpis, tokensOverTime, systemLatencies, errorDistribution } = await getDashboardMetrics();

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics for your agentic systems.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
            <FileDigit className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Global P99 Latency</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.globalP99.toLocaleString()}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Peak over last 24h</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Traces</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.totalTraces.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Captured in 24h</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{kpis.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all models</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Token Consumption</CardTitle>
            <CardDescription>Input vs Output tokens over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              className="h-72 mt-4"
              data={tokensOverTime}
              index="date"
              categories={['Input', 'Output']}
              colors={['amber', 'orange']}
              yAxisWidth={60}
              showAnimation={true}
            />
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Error Distribution</CardTitle>
            <CardDescription>Errors grouped by GenAI system</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-72 mt-4">
            {errorDistribution.length > 0 ? (
              <DonutChart
                data={errorDistribution}
                category="value"
                index="name"
                colors={['red', 'rose', 'orange']}
                className="h-52"
                showAnimation={true}
              />
            ) : (
              <div className="text-muted-foreground text-sm flex items-center justify-center h-full">No errors recorded! 🎉</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>System Latency (ms)</CardTitle>
            <CardDescription>P50, P90, and P99 latency comparison by system</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              className="h-72 mt-4"
              data={systemLatencies}
              index="name"
              categories={['P50', 'P90', 'P99']}
              colors={['amber', 'orange', 'rose']}
              yAxisWidth={60}
              showAnimation={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
