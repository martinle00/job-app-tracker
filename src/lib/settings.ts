import { prisma } from './db';
import { ACCENT_CHOICES } from './chart-colors';

const ACCENT_KEY = 'accent';
export const DEFAULT_ACCENT = ACCENT_CHOICES[0].value;

/** Only offered values can be stored, so a bad row cannot poison the CSS. */
export function isAccent(value: string): boolean {
  return ACCENT_CHOICES.some((choice) => choice.value === value);
}

export async function getAccent(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: ACCENT_KEY } });
  return row && isAccent(row.value) ? row.value : DEFAULT_ACCENT;
}

export async function setAccent(value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: ACCENT_KEY },
    update: { value },
    create: { key: ACCENT_KEY, value },
  });
}
