import { SettingsView } from '@/components/SettingsView';
import { getPeople } from '@/lib/queries';
import { getAccent } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [people, accent] = await Promise.all([getPeople(), getAccent()]);
  return <SettingsView people={people} accent={accent} />;
}
