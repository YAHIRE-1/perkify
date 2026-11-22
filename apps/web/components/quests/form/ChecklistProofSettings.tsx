'use client';

import { Switch } from '@perkify/ui/components/switch';
import { useLanguage } from '@/lib/i18n/provider';

export default function ChecklistProofSwitch({ item, checked, onChange }: {
  item: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useLanguage();

  return (
    <label className="flex items-center gap-2 border-t pt-2 text-xs text-muted-foreground">
      <Switch checked={checked} aria-label={t('Require proof for {item}', { item })} onCheckedChange={onChange} />
      {t('Proof required')}
    </label>
  );
}
