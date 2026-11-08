Você é um worker de um harness autônomo. Contexto limpo: tudo que importa está nos arquivos citados.
Regras:
- Trabalhe SOMENTE no diretório atual (worktree). Não acesse .env nem fora do projeto.
- Não edite arquivos listados como protegidos. Não use .skip/.only. Não enfraqueça asserts.
- Siga app/AGENTS.md, DECISOES.md e o design system (design/pulsar_bio_analytics/DESIGN.md → app/src/design/).
- Design em `design/`: uma pasta por tela com `screen.png` (mockup) e `code.html` (HTML/Tailwind de referência: copie estrutura, classes e textos, mas reescreva em React com os componentes do design system); `pulsar_mapeamento_de_telas_x_especifica_o_funcional_v1.1.md` liga cada tela às seções da spec. Em conflito, a spec (docs/) vence: o app é somente mobile, ignore breakpoints/layouts de desktop do design.
- Código, nomes e comentários em inglês; textos de interface somente em pt-BR. Gerenciador de pacotes: yarn.
- Não faça git commit/push/checkout: o orquestrador cuida do git.
- Nunca altere `node_modules` nem dependências de terceiros (nem por script/patch/postinstall) para fazer algo passar; não mude `scripts` do package.json, lockfiles ou configs de infraestrutura sem que a feature peça. Se a infraestrutura impede a tarefa, registre em .harness/inbox/questions.jsonl e pare.
- Se faltar informação: escolha o default mais conservador e registre uma linha JSON em
  .harness/inbox/questions.jsonl: {"featureId","pergunta","escolhido","alternativas","impacto"}.
- Se identificar um risco futuro: registre em .harness/inbox/risks.jsonl:
  {"featureId","risco","probabilidade","impacto","sugestao"}.
- Rode os testes relevantes antes de terminar. Termine com o bloco ```json final pedido no seu papel
  (padrão: {"summary","filesChanged","testsRun","confidence":"low|med|high","notes"}).
LIÇÕES RELEVANTES:
(nenhuma)


# Papel: leitor da aprovação humana

Converta o que o humano escreveu em JSON. Não invente ajustes nem respostas; não edite arquivos.

## APROVACAO.md
# Aprovação — etapa 2 (Registro)

Status: aprovado


## DUVIDAS.md
# Dúvidas — etapa 2

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

## F-1.fix-1

### Q-43
**Pergunta:** O blocker 1 (App Shell + rotas /onboarding, /dashboard, /register, /indicators, /settings) é escopo de F-1.04, F-1.07, F-1.12 e de etapas seguintes, que o prompt manda NÃO implementar. Implemento aqui?
**Impacto:** A revisão visual da etapa vai reprovar de novo até F-1.04/F-1.07/F-1.12 serem entregues; reavaliar a UI só depois delas
A) Não implementado nesta fix; corrigidos só o overflow do Slider e o badge do IndicatorLabel (padrão)
B) Implementar AppShell e as telas aqui (conflita com F-1.04/F-1.07/F-1.12)
C) Criar placeholders das rotas
Resposta: 

## F-1.04

### Q-44
**Pergunta:** A rota /onboarding (placeholder do tutorial,feature F-1.07) deve ficar dentro do AppShell?
**Impacto:** Baixo. F-1.07 substitui o placeholder pelo tutorial do design e pode remover o shell se preferir.
A) Sim: o app abre com sessão anônima automática (F-1.03), logo a tela é autenticada e deve ter o olho global, o cabeçalho e a navegação inferior (critério de aceite). (padrão)
B) Não: manter /onboarding sem shell e deixar a navegação só a partir de /dashboard
Resposta: 

## F-1.06

### Q-45
**Pergunta:** O guard e2e privacy-mode.spec.ts exige /indicators com nomes de indicadores e /dashboard com observação aberta, mas essas telas pertencem às features de indicadores e registros. Implementar aqui violaria o escopo; mantive os placeholders.
**Impacto:** Os testes 'open eye: names', 'observation note' e 'closed eye: seeded indicators' falham até essas features existirem.
A) Manter placeholders em /dashboard e /indicators; F-1.06 fica dependente das features de indicadores e dashboard para passar. (padrão)
B) Implementar as telas de indicadores e dashboard nesta feature (escopo estourado, review reprovou)
C) Alterar o teste protegido (proibido)
Resposta: 

### Q-47
**Pergunta:** A feature F-1.06 (Guarda e2e do modo privado (sentinelas)) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-112
**Pergunta:** Como executar os testes E2E com o Firebase CLI sem acesso de escrita ao diretório de configuração externo ao projeto?
**Impacto:** O servidor E2E não iniciou: firebase-tools 15.34.1 falhou com EPERM ao gravar seu configstore; os testes de aceite não puderam ser validados nem tiveram falha da feature confirmada.
A) Interromper a execução e preservar o teste sem alterar dependências ou configurações de infraestrutura. (padrão)
B) Executar o harness em ambiente com a configuração e os emuladores disponíveis
C) Autorizar uma configuração de ambiente compatível com o sandbox
Resposta: 

### Q-113
**Pergunta:** F-1.06 entregou só a guarda e2e do modo privado (o app já obeyecia a spec 4.4 com F-1.04/F-1.05/F-2.05/F-2.08/F-2.09). Posso corrigir as 4 falhas e2e pré-existentes de outras features (account-delete, account-link, empty-dashboard-regressions) ou elas devem ficar com as features donas?
**Impacto:** Se o gate rodar a suíte e2e completa, F-1.06 pode reprovar por falhas que já existiam antes do meu diff.
A) Deixar como estão (fora do escopo de F-1.06) e registrar em risks.jsonl (padrão)
B) Corrigir agora as falhas pré-existentes (risco de mexer em código de features já entregues)
C) Ignorar silenciosamente
Resposta: 

## F-1.07

### Q-46
**Pergunta:** O tutorial de onboarding também deve alternar entre siglas e nomes completos conforme o olho global?
**Impacto:** Evita expor nomes de indicadores no tutorial privado e permite revisar os dois modos em cada passo.
A) Sim; o tutorial respeita o modo global e oferece o botão compacto do olho no cabeçalho. (padrão)
B) Manter siglas fixas durante toda a introdução
Resposta: 

## F-1.09

### Q-48
**Pergunta:** O teste protegido de cancelamento exige users/{existingUid}, mas o fixture cria somente users/{existingUid}/indicators/e2e-existing; como esse documento pai deve existir sem autenticar ou escrever na outra conta?
**Impacto:** O fluxo de cancelamento preserva os dados, mas a asserção adicional do documento pai retorna 404.
A) Não trocar de UID nem criar dados na conta conflitante; manter o cancelamento estritamente sem efeitos. (padrão)
B) Corrigir o fixture para criar o documento pai; provisionar o perfil por um fluxo de servidor explicitamente aprovado.
Resposta: 

### Q-49
**Pergunta:** O teste protegido percorre todas as rotas usando waitForLoadState(networkidle), enquanto o perfil usa onSnapshot com conexão longa; qual verificação de prontidão deve substituí-lo?
**Impacto:** O teste de ausência dos métodos proibidos atinge timeout antes de concluir a varredura, embora a UI não contenha esses campos ou termos.
A) Manter o listener entregue em F-1.03 e não alterar o teste protegido. (padrão)
B) Usar locator.waitFor em um elemento da rota, conforme L-039; substituir o listener por polling, com custo e mudança fora do escopo.
Resposta: 

### Q-50
**Pergunta:** O E2E protegido exige users/{existingUid} após Cancelar, mas a fixture cria apenas o usuário no Auth e uma subcoleção; como esse documento deve existir sem login ou escrita no UID alheio?
**Impacto:** O cenário de Cancelar continua falhando somente na checagem do documento-pai inexistente; registros e UID permanecem intactos.
A) Manter Cancelar sem trocar de usuário e sem escrever na conta existente, conforme a spec e as Security Rules; o documento é criado somente se a pessoa confirmar a entrada. (padrão)
B) Criar o documento na fixture ao criar a conta existente; ou remover da asserção comum a exigência do documento-pai nesse cenário.
Resposta: 

### Q-51
**Pergunta:** A feature F-1.09 (Conversão da conta: Google e link mágico preservando UID) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-52
**Pergunta:** A lição L-041 manda restringir watchUserProfile apenas a !profile.onboardingCompleted, mas o gate G5 (freshUserPage anônimo, onboarding incompleto) espera waitForLoadState('networkidle') e um listener aberto para o anônimo bloquearia o silêncio de rede (timeout de 30s). Restringir também contas anônimas?
**Impacto:** medium: propagação ao vivo do profile só para contas convertidas com onboarding pendente; anônimas atualizam via completeOnboarding local e releitura no reload
A) Sim: listener só para contas convertidas (isAnonymous !== true) com onboarding incompleto, com auto-stop ao concluir (versão da tentativa 1 do ciclo anterior); validado empiricamente: 94 e2e passando, G5 em 5,2s e G6 em 0,7s (padrão)
B) só !onboardingCompleted (quebraria G5)
C) remover o listener por completo (versão da tentativa 5)
Resposta: 

### Q-54
**Pergunta:** A revisão pede remover a pré-checagem fetchSignInMethodsForEmail e detectar o conflito só pelo erro do link, mas o teste protegido app/e2e/account-link.spec.ts (caso 'entering the existing account') exige que o conflito seja detectado SEM consumir o oobCode: verifiquei no código e empiricamente que, no Auth Emulator, um linkWithCredential que falha com EMAIL_EXISTS consome o código de uso único (operations.js chama state.deleteOobCode antes do assert EMAIL_EXISTS), e o signInWithCredential posterior falha com auth/invalid-action-code (reproduzi: 13/14 passando com a pré-checagem removida, o caso do 'Confirmar' falhando com 'Este link já foi usado ou expirou'). Manter a pré-checagem?
**Impacto:** Teste protegido continua passando; em produção com proteção de enumeração o fluxo 'entrar na conta existente' agora funciona via reenvio de link; a revisão pode rejeitar a manutenção da pré-checagem — decisão do orquestrador necessária
A) Mantive a pré-checagem como fast path NÃO-consumidor (nunca é tratada como ausência de conflito; a detecção autoritativa continua sendo o erro auth/email-already-in-use/auth/credential-already-in-use do linkWithCredential) e tratei o caso apontado pela revisão: quando o código foi consumido pela detecção (produção com email enumeration protection, em que a pré-checagem devolve lista vazia), signInToExistingAccount reenvia um link de acesso (enterExisting=1) que o app completa como sign-in explícito na conta existente, em vez de falhar com erro genérico (padrão)
B) remover a pré-checagem literalmente e deixar o teste protegido falhar (verificado: quebra o gate)
C) alterar o teste protegido (proibído)
D) remover a pré-checagem e entrar na conta existente por função Cloud com Admin SDK (Admin não valida oobCode; criaria vetor de enumeração de e-mails)
Resposta: 

## F-1.12

### Q-55
**Pergunta:** Como deve funcionar a confirmação de exclusão e em que momento solicitar a reautenticação?
**Impacto:** Define a interação e os testes de confirmação sem alterar a exclusão definitiva.
A) Diálogo acessível; apenas EXCLUIR exatamente habilita a exclusão; para conta vinculada, solicitar reautenticação após essa confirmação e antes de apagar. (padrão)
B) Reautenticar antes da digitação
C) Aceitar variações de caixa ou espaços na confirmação
Resposta: 

### Q-56
**Pergunta:** app/e2e/account-delete.spec.ts (protegido) não pode passar com o emulador atual: authUserIds() faz GET em /emulator/v1/projects/{p}/accounts, mas firebase-tools 15.34.1 só implementa DELETE nessa rota (retorna 404). Os testes 'deletion removes the old account...' falham antes de chegar à exclusão. Corrigir exige alterar o teste protegido.
**Impacto:** Dois testes protegidos (linha 177 e 200) ficam vermelhos neste ambiente independentemente da implementação. Precisa de decisão do orquestrador/usuário sobre o spec.
A) Não alterei o teste protegido. Validei o fluxo com um spec temporário (app/e2e/tmp-verify-delete.spec.ts) que só troca essas duas chamadas; ele passa em mobile e desktop. (padrão)
B) Trocar authUserIds por checagem via Firestore/Admin no spec protegido
C) Usar DELETE em vez de GET (apenas limpa contas, não lista)
D) Pular o teste (proibido)
Resposta: 

### Q-57
**Pergunta:** app/e2e/account-delete.spec.ts (protegido): linkEmail() monta o e-mail com o UID em caixa mista (delete-${uid}@example.com), mas o Auth emulator normaliza e-mails para minúsculas (auth/utils.js), então o filtro de oobCodes nunca encontra o link e o teste dá timeout em latestEmailLink.
**Impacto:** Teste 'a linked account must reauthenticate before it can be deleted' falha no mobile neste ambiente. Sugestão: corrigir o spec protegido em nova rodada.
A) Não alterei o teste protegido. Com e-mail em minúsculas o fluxo de reautenticação passa (verificado com o spec temporário). (padrão)
B) Lowercase do UID no spec protegido
C) Lowercase do e-mail no filtro de latestEmailLink
Resposta: 

### Q-58
**Pergunta:** A revisão pede para estender o teste da conta vinculada (abrir o link de reautenticação e concluir a exclusão), mas app/e2e/account-delete.spec.ts é um teste protegido que não pode ser alterado. Como cobrir o fluxo completo?
**Impacto:** O fluxo completo de exclusão com reautenticação por e-mail passa a ter cobertura e2e; o teste protegido permanece intacto.
A) Criado o arquivo complementar app/e2e/account-delete-reauth.spec.ts com o mesmo fluxo, sem tocar no teste protegido. (padrão)
B) editar o teste protegido (proibido)
C) deixar o fluxo sem cobertura adicional
Resposta: 

## F-2.01

### Q-59
**Pergunta:** Como disponibilizar as dependências do app e os emuladores para executar e validar os testes de aceite?
**Impacto:** Vitest não está disponível (yarn test:unit termina com código 127); não é possível confirmar que os testes falham apenas pela feature ausente.
A) Parar sem instalar nem alterar node_modules, conforme as instruções de infraestrutura. (padrão)
B) O orquestrador provisionar as dependências e executar novamente o worker
Resposta: 

### Q-60
**Pergunta:** Como disponibilizar as dependências do aplicativo e o emulador para executar e validar os testes de aceite?
**Impacto:** app/node_modules está ausente e yarn test:unit falha com vitest: command not found; não é possível confirmar falhas devidas apenas à feature ausente.
A) Parar sem alterar node_modules ou escrever testes que não possam ser validados. (padrão)
B) O orquestrador provisiona as dependências e o emulador antes de retomar a tarefa.
Resposta: 

### Q-61
**Pergunta:** A feature F-2.01 (Repositório e regras de indicadores) foi bloqueada: test_writer não produziu testes de aceite. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-62
**Pergunta:** Como executar os testes obrigatórios no Firebase Emulator se o sandbox bloqueia a abertura das portas locais?
**Impacto:** yarn test:rules falha antes dos testes com listen EPERM nas portas do Firestore, hub, logging e websocket; não é possível verificar que as falhas vêm apenas da feature ausente.
A) Interromper sem alterar a infraestrutura ou produzir testes que não podem ser validados. (padrão)
B) Executar o worker em ambiente com permissão para abrir portas locais
Resposta: 

### Q-63
**Pergunta:** Qual é a interface pública do repositório e do hook de indicadores, ainda inexistentes?
**Impacto:** Os testes do repositório pressupõem esse contrato; os testes de Security Rules independem dele.
A) Exportar de src/data/indicators.ts createIndicator(uid, input), updateIndicator(uid, id, patch), archiveIndicator(uid, id), restoreIndicator(uid, id), reorderIndicators(uid, group, ids) e useIndicators(uid), com create retornando o ID e o hook retornando indicators e activeIndicators; omitir dailyAggregation solicita a sugestão. (padrão)
B) Outros nomes, assinaturas ou local do hook
C) Exigir agregação explícita do chamador
Resposta: 

### Q-64
**Pergunta:** Como executar a validação obrigatória das Security Rules se o sandbox bloqueia a abertura de portas locais pelo Firebase Emulator?
**Impacto:** Não foi possível confirmar que os testes de regras falham somente pela feature ausente nem validar seus helpers antes da proteção.
A) Interromper sem alterar infraestrutura; solicitar execução do yarn test:rules em ambiente que permita bind em localhost. (padrão)
B) Executar o worker com acesso às portas locais dos emuladores
C) Disponibilizar um emulador Firestore acessível ao worker
Resposta: 

### Q-65
**Pergunta:** Como resolver o erro de lint no teste protegido app/tests/rules/indicators.test.ts:106 (_name não utilizado) sem violar a proteção do arquivo?
**Impacto:** yarn typecheck, yarn format:check, testes unitários e testes de regras passam; yarn lint global falha somente nesse parâmetro do teste protegido.
A) Manter o teste protegido inalterado, validar src/data/indicators.ts com ESLint isoladamente e registrar que yarn lint global permanece bloqueado por esse erro. (padrão)
B) Renomear/remover o parâmetro no teste protegido (não permitido)
C) Alterar a configuração global de ESLint (fora do escopo e mudança de infraestrutura)
Resposta: 

### Q-66
**Pergunta:** O diagnóstico anterior pede editar o teste protegido app/tests/rules/indicators.test.ts para corrigir o lint. Como tratar o conflito?
**Impacto:** yarn lint falha na variável _name do teste protegido; a correção exige intervenção do orquestrador.
A) Manter o teste protegido intacto e registrar a falha do lint. (padrão)
B) Alterar o teste protegido
C) Alterar a configuração do lint
Resposta: 

### Q-67
**Pergunta:** Como executar testes de regras e e2e quando o sandbox proíbe abrir portas locais?
**Impacto:** O emulador Firestore não inicia: listen EPERM nas portas 4400, 4500, 8282 e 9150; testes de regras e e2e não podem ser validados aqui.
A) Registrar o bloqueio e não alterar infraestrutura nem dependências. (padrão)
B) Executar os gates em ambiente que permita portas locais
Resposta: 

### Q-68
**Pergunta:** Como executar a suíte unitária com o Node 26 deste ambiente, que deixa window.localStorage indefinido?
**Impacto:** yarn test:unit sem a opção falha em 21 testes preexistentes de linkAccount; com a opção os 142 testes passam.
A) Executar adicionalmente com NODE_OPTIONS=--no-experimental-webstorage, sem alterar configurações ou dependências. (padrão)
B) Usar uma versão do Node compatível no gate
Resposta: 

### Q-69
**Pergunta:** A feature F-2.01 (Repositório e regras de indicadores) foi bloqueada: sem progresso: kimi-pro e codex-mid falharam igual (gates G2); provável problema no teste, na spec ou no ambiente. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-70
**Pergunta:** Como executar os testes de regras e e2e em um ambiente que permita portas locais e a suíte unitária com Node compatível?
**Impacto:** yarn test:rules falha com EPERM ao abrir portas locais; e2e depende do mesmo servidor. yarn test:unit sem a opção falha nos testes de localStorage sob Node 26.
A) Parar sem alterar configurações ou dependências; unitários executados com NODE_OPTIONS=--no-experimental-webstorage. (padrão)
B) Liberar portas locais do emulador e executar os testes nesse ambiente
C) Usar uma versão de Node compatível com o ambiente de testes
Resposta: 

## F-2.06

### Q-71
**Pergunta:** Qual é a assinatura pública do repositório de registros?
**Impacto:** Define o contrato dos testes e evita aceitar uma data fornecida pelo chamador.
A) saveEntry(uid, { indicatorId, value, note? }) e deleteEntry(uid, entryId); a data é calculada internamente. (padrão)
B) Receber o indicador completo em vez de seu ID
C) Usar argumentos posicionais
Resposta: 

### Q-72
**Pergunta:** Como executar os testes de regras quando o sandbox bloqueia a abertura das portas locais do emulador Firebase?
**Impacto:** Não foi possível verificar os testes de regras no emulador; o lint também apontou variável não utilizada no novo teste.
A) Interromper e registrar o bloqueio, sem alterar configurações ou dependências. (padrão)
B) Executar em ambiente com permissão para escutar nas portas do emulador
Resposta: 

### Q-73
**Pergunta:** Qual assinatura pública deve ter o repositório de registros?
**Impacto:** Os testes de unidade estabelecem esse contrato para a implementação e os consumidores.
A) saveEntry(uid, { indicatorId, value, note? }) e deleteEntry(uid, entryId); o repositório obtém a configuração do indicador e calcula a data local. (padrão)
B) Receber o indicador completo
C) Usar parâmetros posicionais para o valor
Resposta: 

### Q-74
**Pergunta:** Como executar o emulador Firestore neste ambiente que nega abertura das portas locais com EPERM?
**Impacto:** Não foi possível confirmar a execução dos testes de regras nem verificar seus helpers; a suíte unitária também encontrou falhas preexistentes de localStorage neste ambiente.
A) Interromper e não alterar infraestrutura nem dependências. (padrão)
B) Executar em ambiente que permita bind nas portas do Firebase Emulator
Resposta: 

### Q-75
**Pergunta:** Como executar os testes de Security Rules e e2e quando o sandbox bloqueia a abertura das portas locais do emulador com EPERM?
**Impacto:** As regras e o e2e não puderam ser validados neste ambiente.
A) Interromper a execução e registrar o bloqueio, sem alterar a infraestrutura. (padrão)
B) Executar em ambiente que permita escutar em localhost
Resposta: 

### Q-76
**Pergunta:** Como executar a suíte unitária completa neste ambiente Node, onde window.localStorage está indefinido?
**Impacto:** Os 21 testes de linkAccount falharam na preparação; os seis testes unitários de entries passaram.
A) Registrar a falha de infraestrutura sem alterar dependências, configurações ou testes protegidos. (padrão)
B) Executar em ambiente Node compatível com a suíte
Resposta: 

## F-2.10

### Q-77
**Pergunta:** O teste protegido app/e2e/empty-dashboard.spec.ts não existia no worktree; ele deveria ter sido produzido pelo test_writer antes desta tentativa?
**Impacto:** Sem o spec não havia verificação de aceite; se o orquestrador tiver uma versão canônica, ela deve substituir a criada aqui.
A) Criei o spec de aceite com um caso e2e determinístico por critério e passei a tratá-lo como protegido. (padrão)
B) Bloquear a feature aguardando o test_writer
C) Implementar sem teste e2e de aceite
Resposta: 

### Q-78
**Pergunta:** O badge '#PLS-xxxx | Dia 1' do cabeçalho e o cartão 'Seus dados estão protegidos localmente' do mockup pertencem a esta feature?
**Impacto:** baixo, apenas visual
A) Não implementados: a spec 3.1/5.4 não define código de usuário PLS nem contagem de dias; o cartão de proteção/backup pertence ao convite de salvar conta (F-2.11) (padrão)
B) Exibir código derivado do UID e o dia desde a criação da conta
Resposta: 

### Q-79
**Pergunta:** A revisão solicita alterar o teste e2e protegido para cobrir as quatro sugestões. Como validar sem violar a proteção?
**Impacto:** As quatro configurações persistidas são verificadas sem modificar o teste protegido.
A) Preservar o teste protegido e acrescentar cobertura e2e em arquivo separado. (padrão)
B) Alterar o teste protegido
Resposta: 

### Q-80
**Pergunta:** Como reconhecer o primeiro preenchimento quando vários registros são criados antes de retornar ao dashboard?
**Impacto:** O agradecimento inclui vários indicadores do primeiro dia sem adicionar estado ou sobrescrever dados entre dispositivos.
A) Agradecer enquanto todos os registros da conta pertencem ao mesmo primeiro dia local e houver registro de indicador ativo. (padrão)
B) Agradecer apenas quando existe exatamente um registro
C) Adicionar um marcador persistente de interação
Resposta: 

### Q-81
**Pergunta:** Como executar os e2e quando o sandbox impede a abertura das portas locais dos emuladores?
**Impacto:** Os e2e móveis solicitados não puderam iniciar: Firebase Emulator recebeu listen EPERM nas portas 4400, 4500, 9299, 8282 e 9150.
A) Registrar o impedimento e encerrar sem alterar infraestrutura ou dependências. (padrão)
B) Executar os e2e em ambiente que permita bind em localhost
Resposta: 

### Q-82
**Pergunta:** A feature F-2.10 (Dashboard vazio com sugestões) foi bloqueada: teto de custo da feature atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-106
**Pergunta:** Como disponibilizar as dependências necessárias para executar as verificações nesta worktree?
**Impacto:** Lint, typecheck, format:check, testes unitários, builds e E2E falharam porque os executáveis não foram encontrados.
A) Não modificar node_modules nem acessar destinos fora do projeto; interromper após registrar o bloqueio. (padrão)
B) O orquestrador disponibiliza as dependências no ambiente permitido e repete as verificações.
Resposta: 

### Q-107
**Pergunta:** Quem marca o conflito de merge como resolvido no índice Git?
**Impacto:** O índice Git permanece em estado UU porque o acesso de escrita a .git não está autorizado.
A) O arquivo foi resolvido no conteúdo; o orquestrador deve atualizar o índice. (padrão)
B) O orquestrador executa git add no arquivo resolvido.
Resposta: 

### Q-108
**Pergunta:** Como disponibilizar as dependências do app e das functions neste worktree para executar os builds e testes obrigatórios?
**Impacto:** Lint, typecheck, formatação, testes unitários, builds e E2E não podem ser validados: eslint, tsc, vitest, prettier e vite não foram encontrados.
A) Parar sem instalar nem alterar node_modules, conforme a restrição da tarefa. (padrão)
B) O orquestrador provisiona as dependências e executa as verificações.
Resposta: 

### Q-109
**Pergunta:** A feature F-2.10 (Dashboard vazio com sugestões) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

## F-2.08

### Q-83
**Pergunta:** Como disponibilizar as dependências e o emulador dentro do worktree para executar os testes sem acessar diretórios externos?
**Impacto:** Não é possível escrever e validar os testes de aceite no emulador; app/node_modules é um link para fora do projeto e sua resolução falha com excesso de links simbólicos.
A) Interromper conforme a regra de bloqueio de infraestrutura. (padrão)
B) Corrigir o ambiente do worktree pelo orquestrador
C) Disponibilizar dependências e emuladores acessíveis dentro do projeto
Resposta: 

### Q-86
**Pergunta:** Como a Observação opcional (spec 5.3, única caixa no design) se liga ao registro salvo?
**Impacto:** Contrato do teste unitário QuickEntry.test.tsx (saveEntry recebe note); implementador deve seguir este vínculo ou propor ajuste.
A) O texto atual do campo Observação é anexado (nota) a cada entrada salva pela tela enquanto estiver preenchido; sem nota, o campo é ignorado (nenhum campo obrigatório). (padrão)
B) Nota salva apenas por um botão próprio de salvar nota
C) Nota por indicador em vez de uma por dia
Resposta: 

### Q-87
**Pergunta:** Como se confirma um novo evento em indicadores múltiplos por dia com entrada numérica (design mostra stepper + 'Digitar valor exato')?
**Impacto:** Contrato do e2e quick-entry.spec.ts (teste 'multiple-per-day indicators'); a UI do implementador precisa desse botão para múltiplos numéricos.
A) Botão 'Adicionar' no cartão do indicador múltiplo comete o valor digitado como NOVO evento; não há commit automático no blur (evita duplo evento). (padrão)
B) Commit no blur igual aos indicadores únicos
C) Botão + adiciona evento com valor do passo
Resposta: 

### Q-88
**Pergunta:** Estado inicial do app após o e2e: worktrees tinham node_modules/ e functions/node_modules como symlinks rastreados quebrados (auto-referência no repositório principal), impedindo qualquer comando yarn.
**Impacto:** git status do app mostra ' D node_modules' e ' D functions/node_modules' (deleção dos symlinks rastreados); o orquestrador deve consolidar como fez no histórico de F-2.05.
A) Removi os dois symlinks quebrados no worktree e instalei node_modules reais via yarn install --frozen-lockfile (sem alterar dependências), como já feito no worktree F-2.05. (padrão)
B) Restaurar symlinks quebrados (nada executa)
C) Instalar fora do worktree
Resposta: 

### Q-89
**Pergunta:** A feature F-2.08 (Preenchimento rápido) foi bloqueada: teto de custo da feature atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-92
**Pergunta:** O teste QuickEntry exige que o texto da página não contenha obrigat e, na linha seguinte, exige a frase Nenhum campo é obrigatório. Qual expectativa deve prevalecer?
**Impacto:** O teste unitário permanece impossível de satisfazer sem alterar o teste ou introduzir comportamento artificial.
A) Manter a mensagem do design e não alterar os testes ou enfraquecer asserções. (padrão)
B) Corrigir a asserção negativa para verificar somente alertas de completude
C) Remover a expectativa da frase
Resposta: 

### Q-93
**Pergunta:** Como executar os testes e2e quando o ambiente impede que os emuladores abram portas locais?
**Impacto:** O Playwright não iniciou porque os emuladores receberam EPERM ao abrir portas locais.
A) Não alterar infraestrutura nem dependências; interromper e registrar o bloqueio. (padrão)
B) Executar os testes em ambiente que permita bind nas portas dos emuladores
Resposta: 

### Q-95
**Pergunta:** O teste E2E protegido pode aguardar a tela e os indicadores carregarem antes de desligar a rede?
**Impacto:** O teste protegido pode expirar antes de o cartão existir; exibir dados não confirmados contrariaria as regras de inicialização e sincronização.
A) Manter o teste protegido intacto e validar o cenário offline em teste separado após o carregamento. (padrão)
B) Alterar o teste protegido para aguardar o cartão antes de setOffline(true)
C) Alterar a inicialização para exibir dados sem confirmação do servidor
Resposta: 

### Q-96
**Pergunta:** Como executar os E2E quando o ambiente bloqueia a abertura das portas locais dos emuladores?
**Impacto:** yarn test:e2e não iniciou: Firebase relatou listen EPERM para as portas locais dos emuladores; os testes E2E continuam sem validação nesta tentativa.
A) Interromper a execução e registrar a falha de infraestrutura, sem alterar configurações ou dependências. (padrão)
B) Executar em ambiente com permissão para abrir as portas locais
Resposta: 

### Q-98
**Pergunta:** Como executar os E2E se o sandbox impede os emuladores de abrir portas locais?
**Impacto:** yarn test:e2e não inicia: Firebase relata listen EPERM para as portas do hub, logging e Firestore; nenhum teste E2E foi executado.
A) Registrar o bloqueio e não alterar infraestrutura ou dependências. (padrão)
B) Executar os testes em ambiente que permita escutar em localhost
Resposta: 

### Q-99
**Pergunta:** O teste protegido offline pode aguardar a resposta aparecer antes de desativar a rede?
**Impacto:** O teste desativa a rede imediatamente após page.goto, antes das consultas assíncronas confirmadas carregarem; o clique pode aguardar até o timeout sem que a funcionalidade de salvamento tenha sido exercitada.
A) Não alterar o teste protegido nem simular dados em produção. (padrão)
B) Aguardar o botão Sim estar visível antes de setOffline(true)
Resposta: 

### Q-100
**Pergunta:** Como liberar as portas 4792, 8282 e 9299 para executar o preview e os testes E2E isoladamente?
**Impacto:** Os builds passaram, mas a ocupação das portas impede verificar os testes E2E e a inicialização isolada do preview.
A) Não reutilizar nem encerrar processos preexistentes de origem desconhecida. (padrão)
B) O orquestrador libera as portas e executa os testes novamente.
Resposta: 

### Q-101
**Pergunta:** O teste offline protegido pode aguardar a renderização do indicador antes de desconectar?
**Impacto:** O indicador é criado após a sessão inicial; sem esperar sua leitura pelo Firestore, desconectar imediatamente após a navegação pode impedir seu carregamento.
A) Manter o teste protegido intacto e não criar tratamento específico para o teste. (padrão)
B) Aguardar o botão Sim ficar visível antes de setOffline(true) no teste protegido.
Resposta: 

### Q-104
**Pergunta:** Como executar os testes e2e quando o sandbox impede conexões e escuta em localhost?
**Impacto:** O Playwright não inicia o preview nem os emuladores: connect/listen EPERM nas portas 4792, 8282 e 9299; os testes e2e não foram executados.
A) Interromper a validação e registrar o bloqueio; não alterar infraestrutura nem testes protegidos. (padrão)
B) Executar yarn test:e2e em ambiente com acesso às portas locais
Resposta: 

### Q-105
**Pergunta:** A feature F-2.08 (Preenchimento rápido) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

## F-2.05

### Q-84
**Pergunta:** O design de meus_indicadores não define ganchos de teste para escopar cartões/listas; como os testes de aceite localizam os cartões de Fatores/Resultados/Arquivados?
**Impacto:** A implementação de F-2.05 precisa adicionar esses quatro data-testids; sem eles os testes não localizam os cartões
A) Contrato de DOM exigido pelos testes: data-testid="factor-list", "result-list", "archived-list" em cada lista e data-testid="indicator-card" em cada cartão (com o [data-indicator-label] já existente), padrão já usado no app (eye-toggle, aggregation-control) (padrão)
B) heurísticas de innerText/ordem de texto (frágeis a tabs e seções colapsáveis)
C) queries por role/heading (dependem de marcação que o design não fixa)
Resposta: 

### Q-85
**Pergunta:** Que rótulos usar nos chips de tipo/agregação e nos botões de reordenar/arquivar/restaurar do cartão?
**Impacto:** Baixo: implementador pode usar qualquer texto que case com os regexes, inclusive os do design ou do editor
A) Textos do design com regex flexível nos testes: /booleano|sim\/não/i, /escala/i, 'Média', /soma/i; mover com botões /subir|cima/i e /descer|baixo/i; ações editar/arquivar/restaurar diretas no cartão ou via sheet 'Opções ...' (role=dialog) (padrão)
B) só os rótulos literais do design (mais frágeis)
C) só os rótulos do editor F-2.03 (Soma/Média/Último, Sim / Não)
Resposta: 

### Q-90
**Pergunta:** A feature F-2.05 (Tela Meus indicadores) foi bloqueada: teto de custo da feature atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

### Q-94
**Pergunta:** Como executar os testes e2e neste ambiente com portas locais indisponíveis?
**Impacto:** Os builds passaram, mas o Firebase Emulator recebeu EPERM ao escutar localhost; há processos existentes nas portas 4792, 8282 e 9299. Os testes e2e e os gates de acessibilidade e layout não foram executados.
A) Registrar bloqueio e preservar os processos existentes; não alterar infraestrutura. (padrão)
B) Executar os testes em ambiente com permissão de rede local e portas livres
Resposta: 

### Q-97
**Pergunta:** Como executar os testes E2E em um ambiente com acesso a localhost e aos emuladores?
**Impacto:** O build passou, mas o sandbox retornou EPERM ao conectar à porta 4792 e ao abrir portas locais dos emuladores; os testes E2E e o gate de layout não puderam ser executados.
A) Não alterar a infraestrutura; registrar o bloqueio e manter a correção de 44 px. (padrão)
B) Executar yarn test:e2e fora da restrição de rede, sob a trava compartilhada de portas
Resposta: 

## F-2.11

### Q-91
**Pergunta:** O design (design/dashboard_dia_2_compara_es_iniciais/code.html) mostra o convite de salvar conta com dois botões dentro do banner ("Salvar com Google" e "Enviar Link Mágico") e sem botão de dispensa; a feature pede banner dispensável que leva à conversão (F-1.09, que vive em Configurações > Conta). Qual variant seguir?
**Impacto:** Diferença visual em relação ao mockup do design (um botão em vez de dois) e um toque a mais até a tela de conta; a conversão continua disponível em Configurações > Conta e o banner nunca bloqueia o uso.
A) Banner com uma ação primária "Salvar minha conta" que navega para /settings (onde ficam a vinculação por Google e o link mágico, já entregues em F-1.09) mais um botão de dispensa "Agora não"; estrutura, cores e ícones seguem o design (Card rounded-lg, ícone cloud_sync em círculo secondary-fixed). (padrão)
B) (a) replicar os dois botões do design dentro do banner, implementando a vinculação Google e o link mágico também no dashboard; (b) banner apenas com texto, sem CTA, apontando para Configurações.
Resposta: 

## F-2.09

### Q-102
**Pergunta:** Como deve ser apresentada a navegação e a confirmação do histórico, sem mockup específico para essa tela?
**Impacto:** Os testes aceitam tela ou diálogo e exigem apenas ações acessíveis.
A) Ação acessível de histórico no indicador, direta ou no menu, e confirmação acessível antes da exclusão. (padrão)
B) Tela própria
C) Painel ou diálogo
Resposta: 

### Q-103
**Pergunta:** Como executar os testes de aceite se o ambiente impede o Firebase Emulator de abrir portas locais?
**Impacto:** Não foi possível confirmar o funcionamento dos helpers nem que as falhas sejam apenas da feature ausente; o Playwright não iniciou os testes.
A) Interromper a validação e preservar os testes sem alterar infraestrutura. (padrão)
B) Executar em ambiente que permita bind em localhost
Resposta: 

## F-2.fix-1

### Q-114
**Pergunta:** Como disponibilizar as dependências necessárias aos gates neste worktree?
**Impacto:** yarn test:e2e falhou porque playwright não está disponível; lint, typecheck, testes unitários e gates não podem ser executados.
A) Parar sem modificar node_modules ou a infraestrutura. (padrão)
B) O orquestrador provisionar as dependências e retomar a feature
Resposta: 

### Q-115
**Pergunta:** Como executar os gates que dependem dos emuladores Firebase se o ambiente bloqueia a abertura de portas locais?
**Impacto:** Os testes e2e, visuais e de regras não iniciam; os gates da etapa não podem ser validados.
A) Interromper a implementação e registrar o bloqueio, sem alterar a infraestrutura. (padrão)
B) Executar em ambiente que permita bind em localhost
Resposta: 

### Q-116
**Pergunta:** Como executar os gates de navegador quando o sandbox nega a abertura das portas locais dos emuladores?
**Impacto:** Os e2e e os gates obrigatórios não podem ser reproduzidos ou validados aqui; Firebase retorna EPERM nas portas 4400, 4500, 9299 e 8282.
A) Interromper sem alterar infraestrutura nem dependências. (padrão)
B) Executar os gates em ambiente que permita bind em localhost.
Resposta: 

### Q-117
**Pergunta:** Como reconciliar o timeout do teste visual de cancelamento com o comportamento do Firebase Auth?
**Impacto:** O Firebase aguarda 8 segundos após detectar o fechamento para permitir o término da autenticação; o teste espera apenas 5 segundos, portanto o alerta pode não aparecer a tempo.
A) Preservar o teste e o SDK, sem reportar cancelamento prematuramente. (padrão)
B) Permitir timeout superior ao atraso do SDK no teste visual.
C) Atualizar o SDK mediante mudança autorizada de dependência.
Resposta: 

### Q-118
**Pergunta:** Como executar os gates E2E com os emuladores Firebase quando o sandbox proíbe abrir portas locais?
**Impacto:** Não é possível reproduzir ou validar G6/G11; o servidor E2E falha com listen EPERM nas portas 4400, 4500, 9299, 8282 e 9150.
A) Interromper sem alterar a infraestrutura nem os testes. (padrão)
B) Executar em ambiente que permita bind nas portas locais dos emuladores
Resposta: 

### Q-119
**Pergunta:** Como executar os gates e2e e visual quando o sandbox bloqueia a abertura das portas locais dos emuladores Firebase?
**Impacto:** Os testes e2e não iniciam: listen EPERM em 4400, 4500, 9299, 8282 e 9150; não é possível verificar as regressões nem concluir os gates.
A) Interromper sem modificar código ou infraestrutura; registrar o bloqueio. (padrão)
B) Executar em ambiente que permita abrir as portas locais dos emuladores
Resposta: 

### Q-120
**Pergunta:** A feature F-2.fix-1 (Suíte completa da etapa falhou nos gates G6, G11) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

## F-2.fix-2

### Q-121
**Pergunta:** Como disponibilizar as dependências ausentes nesta worktree sem alterar node_modules, conforme a regra da tarefa?
**Impacto:** Lint, typecheck, format:check, testes unitários e e2e não executam; os gates não podem ser verificados.
A) Interromper e registrar o bloqueio de infraestrutura. (padrão)
B) O orquestrador disponibilizar as dependências antes de retomar a tarefa.
Resposta: 

### Q-122
**Pergunta:** Como executar os gates com o ambiente bloqueando a abertura de portas locais dos emuladores Firebase (listen EPERM nas portas 4400, 4500, 9299, 8282 e 9150)?
**Impacto:** Os testes e2e e visuais não iniciam; não é possível reproduzir nem validar os gates G6 e G11.
A) Interromper a implementação sem alterar infraestrutura ou dependências. (padrão)
B) Executar o harness em ambiente que permita portas locais
Resposta: 

### Q-123
**Pergunta:** Como conciliar a espera de 5 segundos do teste visual protegido com o Firebase Auth, que aguarda 8 segundos após detectar o fechamento do popup antes de sinalizar cancelamento?
**Impacto:** O gate G11 pode falhar mesmo quando a mensagem de cancelamento é exibida após o prazo do teste.
A) Não alterar o teste nem antecipar artificialmente o cancelamento do Firebase. (padrão)
B) Revisar o tempo de espera do teste protegido
Resposta: 

### Q-124
**Pergunta:** Como executar os gates E2E neste ambiente que bloqueia a abertura de portas locais pelos emuladores Firebase?
**Impacto:** Não é possível reproduzir nem validar os gates G6 e G11; nenhum código de produção ou teste foi alterado.
A) Interromper a implementação e registrar o bloqueio de infraestrutura. (padrão)
B) Executar a tarefa em ambiente que permita escutar nas portas locais dos emuladores
Resposta: 

### Q-125
**Pergunta:** Como executar os gates com os emuladores Firebase quando o sandbox bloqueia a abertura de portas locais?
**Impacto:** Os testes E2E e os gates que dependem dos emuladores não podem iniciar; não é possível validar ou concluir a correção.
A) Interromper sem alterar infraestrutura ou dependências. (padrão)
B) Executar em ambiente que permita portas localhost
Resposta: 

### Q-126
**Pergunta:** Como executar os gates e2e quando o ambiente bloqueia a abertura de portas locais pelos emuladores Firebase?
**Impacto:** Os emuladores retornam listen EPERM nas portas locais 4400, 4500, 9299, 8282 e 9150; os testes e2e e visuais não iniciam.
A) Interromper a implementação e registrar o bloqueio, sem alterar infraestrutura ou dependências. (padrão)
B) Executar o worker em ambiente que permita abrir portas locais para os emuladores
Resposta: 

### Q-127
**Pergunta:** A feature F-2.fix-2 (Suíte completa da etapa falhou nos gates G6, G11) foi bloqueada: limite de 5 tentativas atingido. Como devemos seguir?
**Impacto:** a feature não está no preview
A) seguir com as demais features (padrão)
B) ajustar a spec/critérios
C) simplificar a feature
D) aceitar sem ela nesta etapa
Resposta: 

## F-2.fix-3

### Q-128
**Pergunta:** Como disponibilizar as dependências da aplicação e das Functions para executar os gates sem alterar node_modules neste worktree?
**Impacto:** yarn lint falha com eslint: command not found; as suítes obrigatórias não podem ser executadas nem as regressões verificadas.
A) Interromper sem instalar ou modificar dependências. (padrão)
B) O orquestrador preparar as dependências antes de retomar a tarefa
Resposta: 

### Q-129
**Pergunta:** Como executar os gates e2e quando o ambiente nega abertura de portas locais aos emuladores Firebase?
**Impacto:** G6 e G11 não puderam ser validados; o servidor de testes falhou com listen EPERM nas portas dos emuladores.
A) Interromper e registrar o bloqueio de infraestrutura. (padrão)
B) Executar as suítes em ambiente que permita escuta em localhost
Resposta: 


## Features entregues nesta etapa (id, título, arquivos)
- F-1.06 Guarda e2e do modo privado (sentinelas) (arquivos: DECISOES.md, app/AGENTS.md, app/e2e/privacy-mode.spec.ts, app/e2e/support.ts, app/eslint.config.js, app/src/indicators/EntryHistorySheet.tsx, app/src/indicators/IndicatorEditor.tsx, app/src/indicators/__tests__/EntryHistorySheet.test.tsx, app/src/pages/DesignPage.tsx, app/src/privacy/__tests__/allow.test.ts, app/src/privacy/allow.ts)
- F-2.01 Repositório e regras de indicadores (arquivos: app/firestore.rules, app/scripts/seed.ts, app/src/data/__tests__/indicators.test.ts, app/src/data/indicators.ts, app/tests/rules/indicator-lock-transition.test.ts, app/tests/rules/indicators.test.ts)
- F-2.03 Editor de indicador (arquivos: app/e2e/indicator-create.spec.ts, app/e2e/indicator-edit-lock.spec.ts, app/e2e/routes.json, app/functions/node_modules, app/node_modules, app/src/App.tsx, app/src/data/indicators.ts, app/src/indicators/AggregationControl.tsx, app/src/indicators/IndicatorEditor.tsx, app/src/indicators/__tests__/AggregationControl.test.tsx, app/src/indicators/__tests__/IndicatorEditor.test.tsx, app/src/indicators/aggregation.ts, app/src/indicators/catalog.ts, app/src/indicators/draft.ts, app/src/pages/IndicatorEditorPage.tsx)
- F-2.05 Tela Meus indicadores (arquivos: app/e2e/indicators-list.spec.ts, app/scripts/icons.ts, app/src/App.tsx, app/src/data/__tests__/indicators.test.ts, app/src/data/firestoreRest.ts, app/src/data/indicators.ts, app/src/design/icons.ts, app/src/indicators/IndicatorCard.tsx, app/src/indicators/__tests__/IndicatorCard.test.tsx, app/src/indicators/__tests__/summary.test.ts, app/src/indicators/summary.ts, app/src/pages/IndicatorsPage.tsx)
- F-2.06 Repositório e regras de registros (arquivos: app/firestore.rules, app/src/data/__tests__/entries.test.ts, app/src/data/entries.ts, app/tests/rules/entries.test.ts, app/tests/rules/entry-validation-extra.test.ts)
- F-2.09 Histórico de registros e exclusão retroativa (arquivos: app/e2e/entry-history.spec.ts, app/scripts/icons.ts, app/src/data/entryHistory.ts, app/src/design/icons.ts, app/src/indicators/EntryHistorySheet.tsx, app/src/indicators/entryValue.ts, app/src/lib/time.ts, app/src/pages/IndicatorsPage.tsx)
- F-2.11 Convite discreto para salvar a conta (arquivos: app/e2e/save-account-banner.spec.ts, app/functions/node_modules, app/node_modules, app/scripts/icons.ts, app/src/App.tsx, app/src/account/SaveAccountInviteBanner.tsx, app/src/account/__tests__/invite.test.ts, app/src/account/invite.ts, app/src/account/inviteRepository.ts, app/src/design/icons.ts, app/src/pages/DashboardPage.tsx)
- F-2.fix-3 Suíte completa da etapa falhou nos gates G6, G11 (arquivos: app/e2e/account-link-visual.spec.ts)

Responda SOMENTE com o bloco ```json:
{"aprovado": true|false,
 "ajustes": [{"titulo": "…", "descricao": "…", "criterios": ["critério verificável"], "tags": ["ui"], "features": ["F-1.04"]}],
 "respostasDuvidas": [{"id": "Q-3", "pergunta": "…", "resposta": "…"}]}

Em cada ajuste, `features` lista as features entregues que o ajuste corrige (pela tela, fluxo ou arquivos citados); use [] se for algo novo ou se não der para saber.
`aprovado: true` somente se o Status indicar aprovado e não houver ajustes. Inclua só dúvidas com `Resposta:` preenchida.
