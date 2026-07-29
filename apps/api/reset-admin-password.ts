import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@leban.com';
  const password = '123456';

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    console.log('Usuário não encontrado.');
    return;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    passwordMatches,
    databaseUrl: process.env.DATABASE_URL,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });