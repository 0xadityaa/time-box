import { prisma } from '@time-box/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { updateSystemSettings } from '../actions/settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'global' },
  });

  const capturePayloads = settings?.capturePayloads ?? false;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage global system configurations and privacy controls.</p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>
              Configure data retention and payload capture policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSystemSettings}>
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div className="flex flex-col gap-1 pr-6">
                  <span className="font-medium text-sm">Capture Generative AI Payloads</span>
                  <span className="text-sm text-muted-foreground">
                    If enabled, `time-box` will store full request/response bodies (prompts, completions, tool calls) in MinIO. 
                    Warning: These payloads may contain Personally Identifiable Information (PII) or sensitive intellectual property. 
                    Disable this for strictly telemetry-only observability.
                  </span>
                </div>
                <div className="flex items-center">
                  <Switch 
                    name="capturePayloads" 
                    defaultChecked={capturePayloads} 
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  type="submit" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
