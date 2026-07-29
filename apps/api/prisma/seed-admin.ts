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
    process.env.INITIAL_ADMIN_PASSWORD;

  if (!initialPassword) {
    throw new Error(
      'A variável INITIAL_ADMIN_PASSWORD não foi configurada.',
    );
  }

  const passwordHash = await bcrypt.hash(
    initialPassword,
    10,
  );

  const admin = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      fullName: 'Administrador Leban',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
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

  console.log('Administrador criado ou atualizado com sucesso:');
  console.log(admin);
}

main()
  .catch((error) => {
    console.error(
      'Erro ao criar ou atualizar administrador:',
      error,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });