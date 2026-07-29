import {
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@leban.com';
  const password = '123456';

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
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
  console.log(user);
  console.log('');
  console.log('Login: admin@leban.com');
  console.log('Senha: 123456');
}

main()
  .catch((error) => {
    console.error('Erro ao criar administrador:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });