# Perfis da Polícia

A separação foi configurada desta forma:

- Cadastro de Usuários + papel `POLICIA`: `PATROL` → `/police-mobile`.
- Gestão da Polícia: `OPERATIONS` → `/police-operations`.
- As rotas impedem que um policial acesse a área do outro perfil.
- Administradores e operadores continuam podendo acessar as telas administrativas permitidas.

## Atualizar policiais antigos

Na pasta `apps/api`, execute uma única vez:

```powershell
npx prisma db execute --file prisma/backfill-police-access-types.sql --schema prisma/schema.prisma
```

Depois gere o cliente e compile:

```powershell
npx prisma generate
pnpm run build
```
