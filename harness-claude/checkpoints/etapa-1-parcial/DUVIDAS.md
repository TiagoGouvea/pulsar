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
