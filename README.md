# PetÁgil API

Backend **NestJS 11** do PetÁgil — autenticação por **email/senha + JWT** (access + refresh),
**Prisma + PostgreSQL (Supabase)**, contrato alinhado ao app React Native (`petagil-app/`).

> Escopo atual: **só autenticação** (registro/login/refresh/logout/me). O app continua mockado;
> a integração RN↔API é uma entrega futura.

---

## Stack

- NestJS 11 (Express 5) · TypeScript strict · Node ≥ 20
- Prisma ORM 6 · PostgreSQL (Supabase)
- Passport JWT (`@nestjs/jwt` + `passport-jwt`) · senha com **argon2**
- `class-validator` / `ValidationPipe` · Swagger · Jest + supertest

---

## Pré-requisitos

- **Node 20+** (`nvm use 20`) e npm
- Uma instância **PostgreSQL no Supabase** com as connection strings em mãos
  (Supabase → Project Settings → Database → Connection string)

---

## Setup

```bash
# 1. instalar dependências
npm install

# 2. configurar ambiente
cp .env.example .env          # Windows: copy .env.example .env
#   -> preencha DATABASE_URL (pooled :6543, ?pgbouncer=true)
#   -> preencha DIRECT_URL  (direta :5432)
#   -> defina JWT_ACCESS_SECRET e JWT_REFRESH_SECRET (fortes e distintos)

# 3. aplicar o schema no banco + gerar o client
npm run prisma:migrate        # cria a tabela User no Supabase (usa DIRECT_URL)
npm run prisma:generate       # (rodado automaticamente pelo migrate)

# 4. (opcional) popular usuários de teste
npm run prisma:seed

# 5. subir em modo dev
npm run start:dev
```

A API sobe em **http://localhost:3000** com prefixo global **`/api`**
(ex.: `http://localhost:3000/api/health`). Isso casa com o app, que aponta
`EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` (→ `API_BASE_URL = .../api`).

- **Swagger:** http://localhost:3000/api/docs
- **Health:** http://localhost:3000/api/health

---

## Variáveis de ambiente

| Variável             | Obrigatória | Default  | Descrição                                              |
| -------------------- | ----------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL`       | ✅          | —        | Conexão **pooled** (pgBouncer :6543, `?pgbouncer=true`) |
| `DIRECT_URL`         | ✅          | —        | Conexão **direta** (:5432), usada por `prisma migrate`  |
| `JWT_ACCESS_SECRET`  | ✅          | —        | Segredo do access token (≥ 16 chars)                    |
| `JWT_REFRESH_SECRET` | ✅          | —        | Segredo do refresh token (≥ 16 chars)                   |
| `JWT_ACCESS_TTL`     | —           | `900s`   | TTL do access token (15 min)                            |
| `JWT_REFRESH_TTL`    | —           | `30d`    | TTL do refresh token                                    |
| `PORT`               | —           | `3000`   | Porta HTTP                                              |
| `CORS_ORIGIN`        | —           | `*`      | Origem(ns) permitida(s) no CORS                         |

> A validação de ambiente (`src/config/env.validation.ts`) **falha o boot** se faltar uma
> obrigatória ou se um segredo for curto demais.

> ⚠️ **Supabase + Prisma:** use a string **pooled** no `DATABASE_URL` e a **direta** no
> `DIRECT_URL`. **Não** inclua `connection_limit=1` (receita serverless) — num servidor
> persistente isso serializaria as queries.

---

## Endpoints (todos sob `/api`)

| Método | Rota             | Auth   | Descrição                                   |
| ------ | ---------------- | ------ | ------------------------------------------- |
| POST   | `/auth/register` | —      | Cria usuário (`tutor`/`vet`/`passeador`) e devolve tokens |
| POST   | `/auth/login`    | —      | Login por email/senha → tokens + user       |
| POST   | `/auth/refresh`  | —      | Troca `refresh_token` por novos tokens      |
| POST   | `/auth/logout`   | —      | Logout stateless (`{ ok: true }`)           |
| GET    | `/auth/me`       | Bearer | Usuário autenticado                         |
| GET    | `/health`        | —      | Healthcheck + ping no banco                 |

### Onboarding / CRUDs (Bearer)

Modelo **multi-perfil**: um usuário pode ter mais de um perfil (tutor + vet + passeador). Cada perfil é 1:1 com o usuário; os recursos são escopados ao dono autenticado.

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| GET | `/profiles/me` | Agrega meus perfis + `roles` ativos |
| POST·GET·PATCH·DELETE | `/profiles/tutor` · `/profiles/tutor/me` | Perfil de tutor (whatsapp, cidade) |
| POST·GET·PATCH·DELETE | `/profiles/vet` · `/profiles/vet/me` | Perfil de vet (CRMV, UF, especialidades[], clínica, bio, `verification`=PENDING) |
| POST·GET·PATCH·DELETE | `/profiles/walker` · `/profiles/walker/me` | Perfil de passeador (cidade, região, `petTypes[]`, `pricePerWalk` em centavos) |
| POST·GET·GET·PATCH·DELETE | `/pets` · `/pets/:id` | Pets do tutor (`species`: `dog`/`cat`/`bird`/`reptile`) |
| POST·GET·PATCH·DELETE | `/pets/:petId/vaccinations` · `.../:id` | Carteira de vacinação do pet |

> Notas: `verification` do vet é **server-controlled** (não dá pra se auto-aprovar). `pricePerWalk` é **inteiro em centavos**. Fotos são `*Url` (upload pro Storage é etapa futura). Acessar recurso de outro dono retorna **404**.

**Contrato de resposta** (compatível com o `httpClient` do app):

- Sucesso → `{ "success": true, "data": <payload> }`
- Erro → `{ "success": false, "detail": "<mensagem>" }` (sempre string)
- Tokens → `{ access_token, id_token, refresh_token, expires_in }` (`expires_in` em **segundos**)
- `role`/`species` expostos sempre em **minúsculo** (`tutor`/`vet`/`passeador`, `dog`/`cat`/…)
- Rotas com **barra final** (`/auth/me/`, `/auth/refresh/`) funcionam (normalização no `main.ts`)

---

## Credenciais de teste (após `npm run prisma:seed`)

| Email               | Papel | Senha        |
| ------------------- | ----- | ------------ |
| `tutor@petagil.app` | tutor | `Petagil123` |
| `vet@petagil.app`   | vet   | `Petagil123` |

Exemplo rápido:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tutor@petagil.app","password":"Petagil123"}'
```

---

## Scripts

| Script                  | O que faz                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `npm run start:dev`     | Sobe em watch mode                                           |
| `npm run build`         | Compila para `dist/`                                         |
| `npm run lint`          | ESLint (+ Prettier) com `--fix`                              |
| `npm run type-check`    | `tsc --noEmit` (checagem de tipos completa)                  |
| `npm test`              | **Testes unit (Jest) — herméticos, SEM banco**              |
| `npm run test:e2e`      | **Testes e2e (supertest) — REQUEREM banco**                |
| `npm run prisma:migrate`| `prisma migrate dev` (usa `DIRECT_URL`)                      |
| `npm run prisma:seed`   | Popula usuários de teste                                     |
| `npm run prisma:studio` | Abre o Prisma Studio                                         |

---

## Testes

- **Unit (`npm test`)** — herméticos, **não dependem de banco** (services com mocks). Cobrem
  hash/validação de credenciais, emissão de tokens, achatamento de erros de validação e conversão
  de TTL. Use no gate de CI.
- **E2E (`npm run test:e2e`)** — sobem a app real e exercitam
  `register → login → /me (com e sem barra) → refresh (com e sem barra)` + casos de erro.
  **Requerem um banco de teste** (configure `DATABASE_URL`/`DIRECT_URL` apontando para um
  schema/instância de teste do Supabase antes de rodar).

```bash
npm run lint && npm run build && npm test   # gate hermético (sem banco)
npm run test:e2e                            # valida o fluxo real (com banco)
```

---

## Estrutura

```
src/
├─ main.ts                 # bootstrap: barra final, /api, ValidationPipe, envelope, CORS, Swagger
├─ app.module.ts           # ConfigModule(global) + Prisma + Users + Auth + Health
├─ config/env.validation.ts
├─ common/                 # interceptor (envelope), filter (erro), decorators, utils
├─ prisma/                 # PrismaService + PrismaModule (@Global)
├─ users/                  # UsersService (+ toPublicUser / mapeamento de role)
├─ auth/                   # DTOs, AuthService, AuthController, JwtStrategy, guards
└─ health/                 # GET /api/health
prisma/
├─ schema.prisma           # datasource Supabase (url + directUrl), model User, enum Role
└─ seed.ts                 # tutor@petagil.app + vet@petagil.app
test/auth.e2e-spec.ts
```

---

## Limitações conhecidas (escopo desta entrega)

- **Refresh stateless** (assinado, sem revogação em banco): `logout` é client-side; um refresh
  roubado vale até expirar.
- **Sem** reset de senha, verificação de email, MFA ou OAuth.
- `RolesGuard` + `@Roles()` já existem, mas **não são usados** ainda (prontos para RBAC futuro).
- O app **segue mockado** — religar o `AuthProvider` é a próxima entrega.
