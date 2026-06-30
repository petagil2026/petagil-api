---
project_name: 'PetÁgil'
user_name: 'Igor'
date: '2026-06-25'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
optimized_for_llm: true
existing_patterns_found: 18
product_brief: 'petagil-app/docs/product-brief-PetAgil-2026-06-24.md'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

> ## ⚠️ OBS — Manutenção deste arquivo (REGRA PERMANENTE)
>
> Este `project-context.md` **DEVE sempre ser commitado** e mantido versionado junto ao código.
>
> **Sempre que algo for modificado/adicionado/removido no código** (padrões, estrutura de pastas, libs, regras, convenções, contratos), este arquivo **DEVE ser atualizado na MESMA branch/PR** para refletir a mudança.
>
> Assim, **independentemente de quais branches forem criadas ou alteradas**, os agentes de IA mantêm este documento sempre atualizado e confiável como **fonte de verdade**. Nunca deixar o código divergir deste arquivo: se a mudança torna alguma regra aqui obsoleta, corrija-a no mesmo commit.

---

## Product Context

**PetÁgil** é um marketplace **multi-lados** (estilo Doctoralia) que conecta **tutores de pets** ↔ **prestadores de serviços recorrentes**: **clínicas veterinárias** (consulta padrão; rotina vacina/vermífugo/check-up como motor de recorrência) e **passeadores** (dog walking). Estratégia: cidades pequenas + nicho de **clínicas que atendem silvestres/exóticos**. Monetização: assinatura dos prestadores (clínica e passeador) com 1 mês grátis (sem comissão); tutor sempre grátis.

> **Decisão de mercado (2026-06-29):** o lado veterinário é a **clínica** (cadastro por CNPJ + CRMV do **responsável técnico**), não o vet autônomo — o agendamento no Brasil se dá direto com a clínica. ⚠️ **Gap código↔produto:** o onboarding já implementado (`feature vet/`, "cadastro do veterinário", CRMV número+UF) ainda reflete o modelo de **vet individual**; migrar para clínica (CNPJ + responsável técnico) e introduzir a **consulta padrão** como serviço agendável são mudanças **PENDENTES** — não assumir que já estão prontas.

- **Papéis** (`Role` = `tutor` | `vet` | `passeador`) definem toda a navegação e features. O papel `vet` representa a **clínica veterinária** (nome do papel no código mantido como `vet`).
- **Tutor:** cadastra pet(s), busca clínicas/passeadores por proximidade/especialidade/serviço, agenda (consulta padrão ou passeio), recebe lembretes.
- **Clínica (`vet`):** cadastro com verificação de CRMV semi-automática do responsável técnico (alvo: CNPJ + CRMV; admin valida), perfil público, **consulta padrão** como serviço agendável base, agenda (confirma/recusa/remarca), avaliações.
- **Passeador:** lado de oferta como a clínica (assinatura, 1 mês grátis) — perfil público, agenda/disponibilidade, recebe/confirma/recusa solicitações de passeio, avaliações. Entra direto no app após o cadastro (sem etapa de verificação profissional no MVP).
- **Fora do MVP:** pagamento in-app, telemedicina, prontuário completo, CRMV/CNPJ 100% automatizado, ranking pago, menu de tipos de consulta/serviço, gestão de clínica multiusuário (vários vets/unidades/recepcionista).
- Estado atual do código: **fundação + fluxo de onboarding implementado** (Login → "Crie sua conta" → seleção de papel → cadastro do veterinário **— ainda no modelo vet individual; pivô p/ clínica pendente**). Auth real contra a API (register/login). Demais features ainda em placeholder/stub; specs futuras preenchem o resto.
- Brief completo: `petagil-app/docs/product-brief-PetAgil-2026-06-24.md` (atualizado 2026-06-29: passeador + clínica).

## Technology Stack & Versions

**Plataforma:** App mobile-only (iOS/Android) com **Expo Dev Client** — NÃO roda no Expo Go (usa libs nativas: Reanimated, Gesture Handler, SecureStore, Bottom Sheet). Node 20 (`.nvmrc`). Código vive em `petagil-app/`.

**Core:**
- Expo `~54.0.30` · React Native `0.81.5` · React `19.1.0`
- TypeScript `~5.9.2` (`strict: true`, `isolatedModules: true`, `module: esnext`)

**Bibliotecas-chave (respeitar versões do Expo SDK 54 — não atualizar isoladamente):**
- Navegação: `@react-navigation/*` v7 (native-stack + bottom-tabs)
- Servidor/cache: `@tanstack/react-query` `^5.90`
- i18n: `@lingui/*` `^5.9` (macros via Babel)
- Storage: `expo-secure-store` (sensível) + `@react-native-async-storage/async-storage` `2.2.0` (preferências)
- Mídia: `expo-image-picker` `~17.0` (foto do profissional / anexo do CRMV — **módulo nativo**, exige rebuild do dev client; não funciona só com Metro)
- Erros/monitoring: `@sentry/react-native` `~7.2`
- UI: `react-native-reanimated` `~4.1` · `react-native-gesture-handler` · `@gorhom/bottom-sheet` `^5` · `react-native-svg` `15.12.1`
- Fontes: Rubik (UI) + Montserrat (`@expo-google-fonts/*`)

**Regra de versão:** dependências nativas devem casar com o Expo SDK 54. Ao adicionar/atualizar libs nativas, usar `npx expo install` (não `npm install` direto) para resolver a versão compatível.

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- **TS strict** está ligado. NUNCA usar `any` (ESLint avisa); preferir `unknown` + narrowing. Para args/vars intencionalmente não usados, prefixar com `_` (`argsIgnorePattern: '^_'`).
- **Imports sempre via alias `@/`** (mapeado para `src/*`) — não usar caminhos relativos profundos (`../../..`). Vale em runtime (Babel/Metro), tsconfig e Jest.
- **Barrel exports**: cada pasta expõe um `index.ts`; importar do barrel da feature/módulo, não de arquivos internos.
- **Tipos compartilhados** vivem em `@/types` (ex.: `Role`, `User`, `Tokens`). Reusar — não redefinir tipos de auth/domínio localmente.
- **Logs guardados por `__DEV__`**: todo `console.log/error/warn` deve estar dentro de `if (__DEV__)` (ou usar um `logger` que já faça isso). Nunca logar em produção.
- **Async**: usar `async/await`; disparar promises não-aguardadas com `void fn()` (padrão usado em efeitos/handlers). Operações independentes em paralelo com `Promise.all`; cleanup tolerante a falha com `Promise.allSettled`.
- **`isolatedModules`**: usar `import type { ... }` para imports somente-tipo.

### Framework-Specific Rules (React Native / Expo)

**Arquitetura feature-based (MVVM):**
- Features em `src/features/<feature>/` seguem `model/` (tipos, api, transformers) · `viewModel/` (hooks, queries, mutations) · `view/` (componentes). Os stubs atuais fixam essa convenção — manter ao preencher.
- **Referência preenchida:** `src/features/vet/` — `model/` (`types.ts` espelha o contrato do backend; `api.ts` com `createVetProfile`/`uploadImage`/`updateMyName`) e `viewModel/useVetOnboarding.ts` (mutation React Query que orquestra uploads → cria perfil → atualiza nome). Telas de onboarding ficam em `src/screens/auth/` (consomem a feature).
- Telas em `src/screens/` organizadas por papel: `tutor/`, `vet/`, `auth/`, `role-select/`. Navegação por papel: `RootNavigator` → `AuthNavigator` | `MainNavigator` (tabs do papel).

**Disponibilidade & folgas do vet (feature `vet` + `profiles/vet` no backend):**

- Backend (`petagil-api`): `VetAvailability` (1:1, regra recorrente + `VetAvailabilityPeriod`) e `VetTimeOff` (folgas) atrelados ao `VetProfile`. Endpoints: `GET`/`PUT /profiles/vet/me/availability`, `GET /profiles/vet/me/availability/slots?from&to` (slots gerados **sob demanda**, sem persistir), `GET`/`POST`/`DELETE /profiles/vet/me/timeoff[/:id]`. O cálculo de slots vive num util **neutro/reusável** em `src/common/scheduling/` (puro, sem Prisma/fuso) — a futura disponibilidade do passeador reusa.
- App: `model` (`getMyAvailability`/`saveMyAvailability`/`getSlots`/`listTimeOff`/`createTimeOff`/`deleteTimeOff`), `viewModel` (`useVetAvailability`/`useSaveVetAvailability`/`useVetTimeOff`/`useCreateTimeOff`/`useDeleteTimeOff`). Telas `MeusHorariosScreen`/`FolgasScreen` consomem. `DateInput` (máscara DD/MM/AAAA em `@/components/ui`, sobre o `Input`) + `parseBrDateToISO`/`buildLocalInstantISO` (`@/utils`) para datas — **sem lib nativa** de máscara/date-picker.
- **4 convenções canônicas:** (1) hora `"HH:MM"` **zero-padded** na API ⇄ minutos-do-dia (Int) no banco; (2) `weekdays` `0=Seg…6=Dom` (índice de uma data via `(getUTCDay()+6)%7`, **nunca** `getDay()`); (3) fuso fixo `America/Sao_Paulo` (−180, sem DST) resolvido **só no service** (o util de slots é timezone-free); (4) overlap de folga **aberto-fechado estrito** (`sStart < bEnd && sEnd > bStart`).

**Auth & sessão:**
- `useAuth()` (de `@/app/providers`) é a fonte de verdade de autenticação/papel. NUNCA ler sessão direto do storage em telas — usar o provider.
- Auth é **real** contra a API: `login(email, password)` e `register(input)`. Ao estender, manter a interface `AuthContextType` para não quebrar consumidores.
- **Onboarding em 2 etapas:** `register(input)` cria a conta e guarda só os TOKENS (chamadas seguintes já vão autenticadas), mas **não** marca `isAuthenticated` — assim o `RootNavigator` não troca para o app e a próxima etapa (perfil do vet) sobrevive no `AuthNavigator`. `completeOnboarding(user)` finaliza (persiste o user + autentica). Etapas intermediárias incompletas voltam ao login ao reabrir o app (user só é persistido no fim).
- `selectedRole` SEMPRE acompanha autenticação — não criar estado "autenticado sem papel".

**Fluxo de onboarding (AuthNavigator):**
- `Login → RoleSelect (bifurcação por papel) → Cadastro{Tutor|Vet|Passeador}`. A escolha de papel é a **bifurcação inicial** e o `register` ocorre no **submit de cada cadastro** (o `role` já é conhecido). **Tutor/passeador:** nome/email/telefone/cidade/senha → `register` → `completeOnboarding` (entram no app). **Vet/clínica:** form ÚNICO (dados de acesso + dados da clínica/CRMV/logo) → `register` → `useVetOnboarding` (uploads + `POST /profiles/vet`) → `completeOnboarding`.
- Campos comuns (nome/email/telefone/cidade/senha) são um **bloco de UI reutilizável** (`screens/auth/CommonAccountFields` + hook `useAccountForm`), não uma tela compartilhada. Tutor/passeador montam o scaffold brand-themed `AccountFormScreen`; o vet reusa o `CommonAccountFields` dentro do `VetProfileForm` via props `accountSlot`/`extraValidate` (valida conta + clínica juntas no submit).
- `RoleSelect` distingue **onboarding** × **fallback** (já autenticado sem papel, renderizado no `MainNavigator`) por `isAuthenticated`: autenticado → só `selectRole`; não autenticado → navega para o cadastro do papel. Não há mais `AccountDraft` nem param de navegação (a indireção foi eliminada).

**Tema / Design System (OBRIGATÓRIO):**
- Cores, spacing, tipografia, raios e sombras vêm SEMPRE de `useTheme()`. NUNCA hardcodar cores hex, tamanhos de fonte ou paddings mágicos — usar `theme.colors`, `theme.semantic.*`, `theme.spacing`, `theme.borderRadius`, `theme.textStyles`.
- Suporte claro/escuro é automático via `semantic.*` — não ramificar manualmente por `isDark` para cores.
- Reusar componentes do DS em `@/components/ui` (`Button`, `GradientButton`, `Input`, `BottomSheet`, `Toast`, etc.) antes de criar novos. `GradientButton` é o CTA primário com gradiente da marca (usa `gradients.primaryButton` + `shadows.primaryGlow`).
- Tokens de tema relevantes: `gradients.{header,primaryButton}`, `borderRadius.{input,button,logo,sheet}` (raios específicos de telas de marca), `shadows.primaryGlow`. Ao mapear designs, preferir esses tokens a hex/números soltos.
- **Exceção brand-themed (mode-independent):** telas de marca pré-login (ex.: `LoginScreen`) mantêm SEMPRE o visual claro — usam tokens fixos da paleta (`colors.grey[0]`, `colors.brandBlue[*]`), NÃO `semantic.*` (que invertem no dark). Documentar a exceção no JSDoc da tela.
- `StyleSheet.create` para estilos estáticos; passar cores do tema inline via array de styles. Para superfícies translúcidas, concatenar alpha-hex ao token (ex.: `theme.colors.grey[0] + '38'`), em vez de cravar `rgba(...)`.
- **Medidas do Claude Design (HTML) → escala do DS:** o HTML/mock do Claude Design é referência de **layout, cores, espaçamento e proporção**, mas seus `font-size` em px são de um "telefone" de ~316px de largura e ficam pequenos demais em telas reais (~360–412dp). NÃO copiar os px crus — **adaptar para a escala do design system** (corpo ~14, secundário ~12–13, título de seção ~16, números/nome ~20–23, badges ~11–12, rótulos de tab ~11), preferindo `theme.textStyles`; em telas brand-themed com Baloo 2/Nunito, usar pesos comparáveis nesses tamanhos. (Ex.: `PerfilScreen` do vet foi escalada assim.)

**Camada de rede (React Query + httpClient):**
- Toda chamada HTTP passa pelo `api` (`@/services/api/httpClient`) — get/post/put/patch/delete. Ele já injeta Bearer, `Accept-Language`, timeout (30s) e faz refresh de 401 + retry uma vez.
- NÃO chamar `fetch` direto nas features. NÃO montar URL com base manual — passar só o endpoint relativo (a base `/api` é concatenada).
- **Upload (multipart):** usar `httpClient(endpoint, { method: 'POST', body: formData })` com `FormData` (arquivo no formato RN `{ uri, name, type }`) — **NÃO** setar `Content-Type` (o RN monta o boundary). Ex.: `POST /uploads/image` → `{ url }` (Supabase Storage). O `httpClient` já é seguro p/ `FormData` (não tenta `JSON.parse` no body).
- Erros tipados: tratar `ApiError`/`AuthenticationError`/`NetworkError`/`TimeoutError` (de `@/services/api/errors`).
- Server state via **React Query**: `useQuery`/`useMutation`. Padronizar `queryKey` com factory (ex.: `userProfileKeys`). `QueryClient` é singleton em `App.tsx` (não recriar).

**Performance/RN:**
- `react-native-worklets/plugin` deve ser o ÚLTIMO plugin do Babel — não reordenar.
- Memoizar `value` de Context com `useMemo` e callbacks com `useCallback` (padrão dos providers).
- `useRef(isMounted)` para evitar setState após unmount em efeitos async (ver `AuthProvider`).

### Testing Rules

- **Stack:** Jest + `jest-expo` (preset) + `@testing-library/react-native`. Rodar com `npm test`.
- **Localização:** testes espelham a árvore de `src/` dentro de `src/__tests__/` (ex.: `src/__tests__/app/providers/AuthProvider.test.tsx`). Co-locação em `__tests__/` próximo ao módulo (ex.: `services/api/__tests__/`) também é aceita. Nome: `*.test.ts(x)`.
- **Cobertura mínima 60%** (branches/functions/lines/statements) — `jest.config.cjs`. Excluídos da cobertura: `*.d.ts`, `index.ts` (barrels), `src/app/**`, `src/__tests__/**`.
- **Mocks nativos:** mocks CommonJS ficam em `src/__tests__/__mocks__/*.js`. Já existe mock do `expo/src/winter` (evita erro "import outside scope" do runtime winter ao fechar o contexto Jest) e stub de RN — não remover. O `setup.ts` também mocka `react-native-gesture-handler`, `react-native-reanimated`, `@gorhom/bottom-sheet` e `react-native-keyboard-controller` (necessário para renderizar telas que importam o barrel `@/components/ui`, que puxa esses módulos nativos via `BottomSheet`). O RN mock expõe `useColorScheme` (usado pelo `ThemeProvider`).
- **resetMocks gotcha:** `resetMocks:true` apaga implementações de `jest.fn()`. Mocks que precisam sobreviver entre testes (ex.: `AsyncStorage.getItem` chamado no mount do `ThemeProvider`, `expo-haptics`) usam **funções comuns** no `setup.ts`, não `jest.fn().mockResolvedValue(...)`.
- `clearMocks` e `resetMocks` estão ligados (mocks resetam entre testes automaticamente).
- Alias `@/` funciona nos testes (`moduleNameMapper`).
- Strings hardcoded são permitidas em arquivos de teste (regra Lingui desligada para testes).
- Priorizar testar `viewModel/` (hooks, queries, transformers) e serviços; usar React Native Testing Library para componentes (queries por role/acessibilidade).

### Code Quality & Style Rules

**Lint/format (rodar `npm run validate` = type-check + lint + format:check):**
- ESLint 8 (flat config) + Prettier + plugins react/react-hooks/react-native/lingui. Prettier é a fonte de verdade de formatação — não brigar com ele.
- `@typescript-eslint/no-explicit-any`: warn · `no-unused-vars`: error (prefixo `_` para ignorar) · `react/prop-types`: off (TS cobre).
- Regras de hooks do React são `error` — respeitar deps de `useEffect/useCallback/useMemo`.

**i18n obrigatório (Lingui):**
- Toda string visível ao usuário deve ser traduzível via macro Lingui (`t` / `<Trans>`), não literal. ESLint (`lingui/no-unlocalized-strings`) sinaliza literais.
- `sourceLocale: pt-BR`; locales: `pt-BR` e `es`. Catálogos em `src/locales/{locale}/messages`.
- Após mudar/adicionar strings, rodar `npm run i18n` (extract --clean + compile) antes de buildar. `npm run android/ios` já fazem isso.
- NÃO traduzir: `testID`, `style`, chaves de objeto, valores de enum, `queryKey`, chamadas de storage/console (ver `ignoreNames`/`ignoreFunctions` no eslint).

**Estrutura & nomes:**
- Componentes/telas: `PascalCase.tsx`. Hooks: `useXxx.ts`. Ícones: `IconXxx.tsx` em `assets/icons/` (export via barrel). Funções/vars: `camelCase`.
- Um `index.ts` por pasta reexportando a API pública.
- JSDoc no topo de módulos não triviais (providers, serviços) — comentários em **português**, descrevendo o "porquê", não o óbvio.

### Development Workflow Rules

- **Diretório de trabalho:** todos os comandos npm rodam a partir de `petagil-app/` (não da raiz do repo).
- **Setup:** `npm install` → `cp .env.dev .env` → `npm run i18n`. Vars públicas usam prefixo `EXPO_PUBLIC_*` (ex.: `EXPO_PUBLIC_API_BASE_URL` — SEM trailing slash; o cliente normaliza). Nunca commitar `.env`.
- **Rodar:** `npm run android` / `npm run ios` (build nativo do dev client) ou `npm run dev` (Metro com dev client já instalado). NÃO usar Expo Go.
- **Git hooks:** `core.hooksPath` aponta para `scripts/hooks` (configurado no `prepare`). Não burlar hooks.
- **Antes de abrir PR / concluir tarefa:** rodar `npm run validate` (type-check + lint + format) e `npm test`. Se mexeu em strings, `npm run i18n` também.
- **Builds:** EAS (`eas.json`) para build em nuvem; `apk:docker` para APK local via Docker.
- **Secrets/observabilidade:** Sentry só ativa com DSN configurado (desabilita sozinho sem DSN em dev).

### Critical Don't-Miss Rules (anti-padrões & gotchas)

**Segurança / dados sensíveis:**
- Tokens e dados de usuário SEMPRE via `secureStorage` (`expo-secure-store`) — NUNCA em AsyncStorage. AsyncStorage só para preferências não-sensíveis (tema `petagil-theme`, locale `petagil-locale`).
- **Limite iOS Keychain ~2KB por item** — `secureStorage` valida e lança erro. Não armazenar payloads grandes (ex.: JWT enorme) sem considerar isso.
- Em **web**, SecureStore NÃO é seguro (avisa no console) — o app é mobile-only; não assumir web como alvo.
- Nunca logar tokens/PII (mesmo sob `__DEV__`).

**Auth / rede:**
- Não duplicar lógica de refresh — o `httpClient` já compartilha uma única promise de refresh para 401 concorrentes. Em 401 após refresh falho, ele limpa sessão e emite `notifyAuthFailure()`.
- Backend espera resposta no formato `{ success, data }` (ApiResponse) e erros DRF (`detail`) ou drf-standardized-errors (`errors[]`). Respeitar esse contrato ao tipar respostas.
- `204 No Content` retorna `undefined` — tratar nos callers.

**Navegação / boot:**
- `NavigationContainer` SEMPRE envolve todo o conteúdo (inclusive Splash) para não perder deep links durante loading — não condicionar a montagem dele a `isLoading`.
- Restaurar sessão ANTES de `isLoading` virar `false` (evita flash da tela de seleção de papel).
- Scheme de deep link: `petagil://`.

**Domínio (MVP):**
- Não implementar features fora do MVP (pagamento in-app, telemedicina, prontuário completo, CRMV 100% automatizado, ranking pago) sem spec explícita.
- Verificação de CRMV é semi-automática (admin valida) — não assumir API de terceiros.

**Geral:**
- Antes de criar componente/hook/serviço novo, checar se já existe em `@/components/ui`, `@/hooks`, `@/services`.
- Não atualizar libs nativas isoladamente (quebra o SDK 54) — usar `npx expo install`.

---

## Usage Guidelines

**Para agentes de IA:**

- Ler este arquivo ANTES de implementar qualquer código.
- Seguir TODAS as regras exatamente como documentadas.
- Na dúvida, escolher a opção mais restritiva.
- Atualizar este arquivo se novos padrões surgirem.

**Para humanos:**

- Manter o arquivo enxuto e focado nas necessidades dos agentes.
- Atualizar quando a stack tecnológica mudar (em especial ao subir o Expo SDK).
- Revisar periodicamente e remover regras que se tornarem óbvias.

Last Updated: 2026-06-29 (Product Context atualizado: marketplace multi-lados — clínicas veterinárias + passeadores; consulta padrão; pivô vet→clínica (CNPJ + responsável técnico) marcado como PENDENTE no código)
Anterior: 2026-06-25 (fluxo de onboarding: CreateAccount → RoleSelect → VetProfile; feature `vet/`; upload Supabase; `expo-image-picker`)
