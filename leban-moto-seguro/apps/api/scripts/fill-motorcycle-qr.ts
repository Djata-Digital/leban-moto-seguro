import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateNationalCode(sequence: number): string {
  return `GB-MOTO-${String(sequence).padStart(9, '0')}`;
}

async function main(): Promise<void> {
  console.log('Iniciando atualização das motos antigas...');

  const motorcycles = await prisma.motorcycle.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (motorcycles.length === 0) {
    console.log('Nenhuma mota encontrada.');
    return;
  }

  const motorcyclesWithCode = motorcycles
    .map((motorcycle) => motorcycle.nationalCode)
    .filter((code): code is string => Boolean(code));

  let highestSequence = 0;

  for (const code of motorcyclesWithCode) {
    const numericPart = code.replace('GB-MOTO-', '');
    const sequence = Number.parseInt(numericPart, 10);

    if (!Number.isNaN(sequence) && sequence > highestSequence) {
      highestSequence = sequence;
    }
  }

  let nextSequence = highestSequence + 1;

  for (const motorcycle of motorcycles) {
    const nationalCode =
      motorcycle.nationalCode ?? generateNationalCode(nextSequence);

    const qrToken = motorcycle.qrToken ?? randomUUID();

    if (!motorcycle.nationalCode) {
      nextSequence += 1;
    }

    await prisma.motorcycle.update({
      where: {
        id: motorcycle.id,
      },
      data: {
        nationalCode,
        qrToken,
      },
    });

    console.log(
      `Atualizada: ${motorcycle.plateNumber} | ${nationalCode} | ${qrToken}`,
    );
  }

  console.log('Todas as motos foram atualizadas com sucesso.');
}

main()
  .catch((error: unknown) => {
    console.error('Erro ao atualizar motos:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });