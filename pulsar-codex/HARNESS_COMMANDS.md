# Comandos do Harness Codex - Pulsar

## Contexto

Este documento descreve os comandos utilizados para executar tarefas no projeto Pulsar via o harness Codex.

## Estrutura do Project

O projeto é organizado em:

```
pulsar-codex/          # Aplicação React + Firebase
├── src/
├── tests/
├── docs/
└── ...
```

## Comandos Disponíveis

### 1. Instalação de Dependências

```bash
yarn install
```

Este comando instala todas as dependências listadas no `package.json`. O harness Codex utiliza este comando como base para garantir que todos os pacotes necessários estejam disponíveis.

### 2. Build de Desenvolvimento

```bash
yarn dev
```

Inicia o dev server do Vite na porta 3000 com Hot Module Replacement (HMR) para desenvolvimento. Quando a porta 3000 estiver ocupada por outro processo, use:

```bash
PORT=3001 yarn dev
```

### 3. Build de Produção

```bash
yarn build
```

Este comando executa:
1. `tsc` - Verifica tipos TypeScript e gera declarações
2. `vite build` - Cria build de produção otimizado

O output é gerado em `dist/` com:
- `index.html` (3.81 kB)
- `assets/` com CSS, JS e maps de sourcemap
- JS minificado com Terser
- CSS processado com Tailwind CSS

### 4. Preview do Build

```bash
yarn preview
```

Serve o build de produção localmente na porta 4173 para verificação antes de deploy.

### 5. Testes Unitários

```bash
yarn test
```

Executa todos os testes unitários usando Vitest com configuração:
- Environment: jsdom
- Setup files: `tests/setup.ts`
- Coverage: V8 provider
- Output: text + HTML

```bash
yarn test:watch
```

Modo watch para testes em desenvolvimento.

### 6. Testes E2E

```bash
yarn test:e2e
```

Executa testes Playwright com configuração:
- Chrome, Firefox, WebKit (desktop)
- Mobile Chrome (Pixel 7), Mobile Safari (iPhone 15)
- Screenshot em caso de falha
- Video recording para debugging

O E2E usa a porta isolada `3100`. Para substituí-la, use:

```bash
E2E_PORT=3101 yarn test:e2e
```

Na primeira execução em uma máquina nova, instale os navegadores:

```bash
yarn playwright install firefox webkit
```

### 7. Linting

```bash
yarn lint
```

Executa ESLint com configuração:
- Arquivos: `.ts`, `.tsx`
- Report unused disable directives
- Max warnings: 0

```bash
yarn lint:fix
```

Executa lint com auto-fix automático.

### 8. Verificação de tipos

```bash
yarn typecheck
```

Executa `tsc --noEmit` para validar os tipos sem gerar arquivos.

## Variáveis de Ambiente

O projeto requer as seguintes variáveis para Firebase:

```env
VITE_FIREBASE_PROJECT_ID=pulsar-codex
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

As variáveis são carregadas via `import.meta.env.VITE_*` no código.

## Configuração do Harness

### Configuração Básica

O harness Codex utiliza o seguinte perfil:

```yaml
profile: react-firebase
```

### Comandos Personalizados

Para adicionar novos comandos ao harness, edite `harness.config.yaml`:

```yaml
commands:
  build:
    command: "yarn build"
    description: "Build de produção do Pulsar"
  test:
    command: "yarn test"
    description: "Executar testes unitários"
```

## Troubleshooting

### Erro de Módulos Tailwind

Se receber erro sobre `tailwindcss` não ser encontrado:

```bash
yarn add -D tailwindcss
yarn add -D @tailwindcss/postcss
```

### Erro de Terser

Se receber erro sobre `terser`:

```bash
yarn add -D terser
```

### Erro de Tipos TypeScript

Execute:

```bash
yarn build
```

Para ver todos os erros de tipo antes do build.

## Pipeline de CI/CD

### Fluxo Recomendado

1. `yarn install` - Instalar dependências
2. `yarn typecheck` - Verificar tipos
3. `yarn lint` - Verificar código
4. `yarn test` - Executar testes
5. `yarn build` - Criar build de produção

### Comando de Pipeline Completo

```bash
yarn install && yarn typecheck && yarn lint && yarn test && yarn build
```

## Notas Importantes

- O projeto é **mobile-first** e **mobile-only**
- Em desktop, apenas reflow é aplicado (sem navegação específica)
- Build produz PWA pronto para deploy no Firebase Hosting
- Nenhuma dependência de build é versionada (apenas `yarn.lock`)
