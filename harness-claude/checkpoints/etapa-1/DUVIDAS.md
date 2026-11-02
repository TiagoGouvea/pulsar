# Dúvidas — etapa 1

Responda na linha `Resposta:` com a letra da opção (ex.: `B`) ou com texto livre. Itens sem resposta mantêm a opção A (padrão).

## F-1.08

### Q-25
**Pergunta:** O arquivo de testes indicado também está protegido; qual caminho deve ser usado pelo escritor de testes?
**Impacto:** O orquestrador pode precisar ajustar o caminho de testes protegidos para preservar a suíte.
A) Criar app/tests/rules/users.acceptance.test.ts sem alterar app/tests/rules/users.test.ts (padrão)
B) Autorizar a criação no caminho protegido
C) Alterar o caminho indicado na feature
Resposta: 

## F-1.03

### Q-26
**Pergunta:** Para onde / redireciona quem já concluiu o onboarding, se /dashboard ainda não existe?
**Impacto:** Usuário com onboardingCompleted=true cai em 404 até o dashboard existir; nenhum teste cobre esse caminho
A) Redirecionar para /dashboard (rota ainda não criada; o router mostra 404 até a feature do dashboard) (padrão)
B) Criar placeholder em /dashboard agora
C) Redirecionar para /onboarding enquanto não houver dashboard
Resposta: 

### Q-27
**Pergunta:** Quem grava users/{uid}.onboardingCompleted=true ao concluir ou pular o tutorial?
**Impacto:** Sem essa escrita o redirecionamento de / nunca leva ao dashboard
A) Não implementado nesta feature; fica com a feature do tutorial de onboarding (padrão)
B) Adicionar updateDoc no userRepository agora
Resposta: 

### Q-28
**Pergunta:** Como oferecer nova tentativa após erro de conexão no bootstrap de sessão?
**Impacto:** Recarrega a página inteira e perde o estado em memória da tela
A) Botão Tentar novamente com window.location.reload() (padrão)
B) Re-disparar onAuthStateChanged via contador de tentativa no AuthProvider
Resposta: 

### Q-31
**Pergunta:** O teste protegido app/e2e/anonymous-start.spec.ts está quebrado independentemente da implementação: (1) `import { emulators } from '../firebase.json'` falha no Playwright (package type=module): exige `with { type: 'json' }` e JSON ESM só tem export default; (2) `yarn typecheck` falha em `createTime` (linhas 71), ausente do tipo de retorno de fetchUserDoc. Pode o test_writer corrigir?
**Impacto:** Alto: sem a correção, `yarn typecheck` e o spec F-1.03 falham mesmo com a feature correta
A) Não editar o teste protegido; validei a implementação com uma cópia temporária idêntica, mudando só o import para `import firebaseConfig from '../firebase.json' with { type: 'json' }; const { emulators } = firebaseConfig;` e tipando createTime: 4/4 cenários passaram em mobile e desktop (padrão)
B) Corrigir o import e o tipo no spec protegido (2 linhas)
C) Excluir e2e do tsconfig (enfraquece o typecheck, rejeitado)
Resposta: 

### Q-32
**Pergunta:** A feature F-1.03 (Acesso anônimo automático e documento do usuário) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-35
**Pergunta:** A rota /dashboard deve mostrar o EyeToggle para revelar nomes ocultos?
**Impacto:** baixo
A) sim (padrão)
B) sim/não
Resposta: 

### Q-36
**Pergunta:** A feature F-1.03 (Acesso anônimo automático e documento do usuário) foi bloqueada: teto de custo da feature atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

## F-1.10

### Q-29
**Pergunta:** Como o healthcheck interno deve ser acessado no emulador?
**Impacto:** O teste de região usa a resposta HTTP do emulador sem depender do nome ou corpo da resposta.
A) Uma função HTTP ou callable exportada, acessível pela URL regional do emulador, sem exigir resposta pública específica. (padrão)
B) Função acionada exclusivamente por evento
C) Healthcheck não exportado
Resposta: 

### Q-30
**Pergunta:** Como o test:functions garante que functions/lib esteja compilado e que functions/node_modules exista para o emulador?
**Impacto:** Sem instalação prévia, o emulador não sobe; a verificação não foi executada nesta sessão (Bash negado)
A) test:functions compila functions (yarn --cwd functions build) antes de emulators:exec --only functions; a instalação de dependências fica a cargo do setup (padrão)
B) adicionar yarn --cwd functions install ao script
C) usar workspace yarn no app/package.json
Resposta: 

### Q-33
**Pergunta:** Qual é o contrato do healthcheck interno?
**Impacto:** O teste de aceite verifica o endpoint efetivamente carregado e sua região.
A) Função HTTP healthcheck que responde com sucesso a GET no emulador. (padrão)
B) Função callable
C) Outro nome ou método HTTP
Resposta: 

## F-1.11

### Q-34
**Pergunta:** Qual formato do erro de login recente?
**Impacto:** O teste só verifica que o corpo do erro contém 'requires-recent-login' e status >= 400.
A) Resposta de erro do callable contendo a string 'requires-recent-login' (ex.: HttpsError('failed-precondition','requires-recent-login')) (padrão)
B) code HttpsError dedicado (inválido no Firebase)
C) permission-denied
Resposta: 

### Q-37
**Pergunta:** Como impedir que um ID token ainda válido recrie dados durante/após a exclusão?
**Impacto:** +1 exists() por escrita de cliente sob users/{uid}
A) Tombstone server-only deletedAccounts/{uid} (deletedAt, expireAt +24h, TTL) gravado antes da limpeza e verificado pelas regras em toda escrita sob users/{uid} (padrão)
B) Tombstone em internal/ (violaria o aceite de não restar nada em internal/ para o UID); revokeRefreshTokens (não invalida ID tokens nas regras)
Resposta: 

### Q-38
**Pergunta:** Onde ficam os dados internos (somente servidor) por usuário? A arquitetura sugeria internal/userQuotas/{uid}, que colide com um UID 'userQuotas' na exclusão recursiva de internal/{uid}.
**Impacto:** Features futuras de quota/push/idempotência devem gravar dados por usuário sob internal/{uid}; dados globais do servidor vão para outra coleção raiz.
A) Somente internal/{uid}/** (quota em internal/{uid}/quota/{dia}, push/admin em internal/{uid} ou subcoleções); internal/ não guarda documentos compartilhados. Arquitetura §3 atualizada. (padrão)
B) internal/userQuotas/{uid} + lista de caminhos na exclusão
C) prefixo/collection dedicada por tipo (userQuotas/{uid}, userAdmin/{uid})
Resposta: 

### Q-39
**Pergunta:** A feature F-1.11 (Function deleteAccount: exclusão integral) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-40
**Pergunta:** Which callable error represents requires-recent-login? HttpsError codes are a fixed set.
**Impacto:** Client must map the message, not the code, to trigger reauthentication
A) HttpsError('failed-precondition', 'requires-recent-login'); the test asserts status >= 400 and error.message === 'requires-recent-login' (padrão)
B) unauthenticated with the same message
C) permission-denied with the same message
Resposta: 
