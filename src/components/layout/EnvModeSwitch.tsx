import { useEnvMode } from '@/hooks/useEnvMode';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Radio } from 'lucide-react';

export default function EnvModeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, isSandbox, setMode } = useEnvMode();

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isSandbox ? 'secondary' : 'default'}
        className="gap-1 whitespace-nowrap"
      >
        {isSandbox ? <FlaskConical className="h-3 w-3" /> : <Radio className="h-3 w-3" />}
        {isSandbox ? 'Sandbox' : 'Production'}
      </Badge>
      {!compact && (
        <span className="text-xs text-muted-foreground hidden xl:inline">
          {isSandbox ? 'Mode testing' : 'Mode asli'}
        </span>
      )}
      <Switch
        checked={!isSandbox}
        onCheckedChange={(checked) => setMode(checked ? 'live' : 'sandbox')}
        aria-label="Ganti mode Sandbox / Production"
      />
    </div>
  );
}
