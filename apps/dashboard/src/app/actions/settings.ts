'use server';

import { prisma } from '@time-box/db';
import { revalidatePath } from 'next/cache';

export async function updateSystemSettings(formData: FormData) {
  const capturePayloads = formData.get('capturePayloads') === 'on';

  await prisma.systemSettings.upsert({
    where: { id: 'global' },
    update: { capturePayloads },
    create: { id: 'global', capturePayloads, retentionDays: 30 }
  });

  revalidatePath('/settings');
}
