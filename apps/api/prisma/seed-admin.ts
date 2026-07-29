import {
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@leban.com';
  const initialPassword =
    process.env.INITIAL_ADMIN_PASSWORD || '123456';

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingAdmin) {
    console.log(
      `Administrador ${email} já existe. Nenhuma senha foi alterada.`,
    );

    if (
      existingAdmin.role !== UserRole.ADMIN ||
      existingAdmin.status !== UserStatus.ACTIVE
    ) {
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      console.log(
        'Função e situação do administrador foram corrigidas.',
      );
    }

    return;
  }

  const passwordHash = await bcrypt.hash(
    initialPassword,
    10,
  );

  const admin = await prisma.user.create({
    data: {
      fullName: 'Administrador Leban',
      email,
      phone: null,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log('Administrador inicial criado com sucesso:');
  console.log(admin);
}

main()
  .catch((error) => {
    console.error(
      'Erro ao executar o seed do administrador:',
      error,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });