import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  // Dashboard
  { key: 'dashboard.view', name: 'Ver dashboard', module: 'dashboard' },
  { key: 'dashboard.export', name: 'Exportar dashboard', module: 'dashboard' },

  // Usuários
  { key: 'users.view', name: 'Ver usuários', module: 'users' },
  { key: 'users.create', name: 'Criar usuários', module: 'users' },
  { key: 'users.update', name: 'Editar usuários', module: 'users' },
  { key: 'users.delete', name: 'Excluir usuários', module: 'users' },

  // Proprietários
  { key: 'owners.view', name: 'Ver proprietários', module: 'owners' },
  { key: 'owners.create', name: 'Criar proprietários', module: 'owners' },
  { key: 'owners.update', name: 'Editar proprietários', module: 'owners' },
  { key: 'owners.delete', name: 'Excluir proprietários', module: 'owners' },

  // Motoristas
  { key: 'drivers.view', name: 'Ver motoristas', module: 'drivers' },
  { key: 'drivers.create', name: 'Criar motoristas', module: 'drivers' },
  { key: 'drivers.update', name: 'Editar motoristas', module: 'drivers' },
  { key: 'drivers.delete', name: 'Excluir motoristas', module: 'drivers' },

  // Motas
  { key: 'motorcycles.view', name: 'Ver motas', module: 'motorcycles' },
  { key: 'motorcycles.create', name: 'Criar motas', module: 'motorcycles' },
  { key: 'motorcycles.update', name: 'Editar motas', module: 'motorcycles' },
  { key: 'motorcycles.delete', name: 'Excluir motas', module: 'motorcycles' },
  { key: 'motorcycles.block', name: 'Bloquear motas', module: 'motorcycles' },

  // Rotas
  { key: 'routes.view', name: 'Ver rotas', module: 'routes' },
  { key: 'routes.create', name: 'Criar rotas', module: 'routes' },
  { key: 'routes.update', name: 'Editar rotas', module: 'routes' },
  { key: 'routes.delete', name: 'Excluir rotas', module: 'routes' },

  // Autorizações
  { key: 'authorizations.view', name: 'Ver autorizações', module: 'authorizations' },
  { key: 'authorizations.create', name: 'Criar autorizações', module: 'authorizations' },
  { key: 'authorizations.approve', name: 'Aprovar autorizações', module: 'authorizations' },
  { key: 'authorizations.reject', name: 'Recusar autorizações', module: 'authorizations' },

  // Polícia
  { key: 'police.view', name: 'Ver polícia', module: 'police' },
  { key: 'police.create', name: 'Criar polícia', module: 'police' },
  { key: 'police.inspect', name: 'Fiscalizar motas', module: 'police' },
  { key: 'police.checks.create', name: 'Registrar abordagem', module: 'police' },

  // Ocorrências
  { key: 'theftReports.view', name: 'Ver ocorrências', module: 'theftReports' },
  { key: 'theftReports.create', name: 'Criar ocorrência', module: 'theftReports' },
  { key: 'theftReports.update', name: 'Editar ocorrência', module: 'theftReports' },
  { key: 'theftReports.recover', name: 'Marcar mota recuperada', module: 'theftReports' },

  // GPS
  { key: 'gps.view', name: 'Ver GPS', module: 'gps' },
  { key: 'gps.create', name: 'Criar rastreador', module: 'gps' },
  { key: 'gps.location.create', name: 'Registrar localização GPS', module: 'gps' },
  { key: 'gps.track', name: 'Rastrear mota', module: 'gps' },

  // Alertas
  { key: 'alerts.view', name: 'Ver alertas', module: 'alerts' },
  { key: 'alerts.create', name: 'Criar alerta', module: 'alerts' },
  { key: 'alerts.acknowledge', name: 'Reconhecer alerta', module: 'alerts' },
  { key: 'alerts.resolve', name: 'Resolver alerta', module: 'alerts' },
  { key: 'alerts.dismiss', name: 'Descartar alerta', module: 'alerts' },

  // Uploads
  { key: 'uploads.create', name: 'Enviar arquivos', module: 'uploads' },
  { key: 'uploads.view', name: 'Ver arquivos', module: 'uploads' },

  // Auditoria
  { key: 'audit.view', name: 'Ver auditoria', module: 'audit' },

  // Relatórios
  { key: 'reports.view', name: 'Ver relatórios', module: 'reports' },
  { key: 'reports.export', name: 'Exportar relatórios', module: 'reports' },

  // Sistema
  { key: 'settings.manage', name: 'Gerenciar configurações', module: 'settings' },
];

async function main() {
  console.log('Criando permissões...');

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();

  console.log('Associando permissões ao ADMIN...');

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.ADMIN,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.ADMIN,
        permissionId: permission.id,
      },
    });
  }

  const operatorPermissions = allPermissions.filter((permission) =>
    [
      'dashboard.view',
      'owners.view',
      'drivers.view',
      'motorcycles.view',
      'routes.view',
      'authorizations.view',
      'police.view',
      'theftReports.view',
      'gps.view',
      'gps.track',
      'alerts.view',
      'alerts.acknowledge',
      'alerts.resolve',
      'uploads.create',
      'uploads.view',
      'reports.view',
    ].includes(permission.key),
  );

  console.log('Associando permissões ao OPERADOR...');

  for (const permission of operatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.OPERADOR,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.OPERADOR,
        permissionId: permission.id,
      },
    });
  }

  const policePermissions = allPermissions.filter((permission) =>
    [
      'dashboard.view',
      'motorcycles.view',
      'police.inspect',
      'police.checks.create',
      'theftReports.view',
      'gps.view',
      'gps.track',
      'alerts.view',
    ].includes(permission.key),
  );

  console.log('Associando permissões à POLÍCIA...');

  for (const permission of policePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: UserRole.POLICIA,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: UserRole.POLICIA,
        permissionId: permission.id,
      },
    });
  }

  console.log('Permissões criadas com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });