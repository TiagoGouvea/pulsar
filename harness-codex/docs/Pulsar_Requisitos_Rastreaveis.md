# Pulsar — requisitos rastreáveis da V1

**Escopo visual:** o produto é projetado e validado para celular. Em computador, reutiliza exatamente a mesma arquitetura e os mesmos componentes, limitando-se a esticar áreas fluidas, empilhar ou desempilhar blocos e impedir overflow; não há navegação, fluxo ou interação exclusiva para desktop.

## REQ-0-001 [required] Scaffold, design system e base mobile-only

Preparar React, TypeScript, Vite, Firebase e a estrutura de testes; registrar decisões técnicas e implementar os fundamentos visuais a partir do design oficial. A interface em pt-BR é projetada para celular, com alvos principais de 390 px e 430 px. Telas largas não recebem desenho próprio.

Critérios:

- Todos os fluxos são completos, legíveis e operáveis por toque em 390 px e 430 px, sem rolagem horizontal.
- Em computador, o conteúdo apenas usa largura fluida ou máxima e empilha/desempilha blocos conforme o espaço, sem recurso ou navegação exclusiva.
- A abertura em 1440 px não causa overflow, sobreposição nem perda de conteúdo.
- Tokens, tipografia, cores e componentes-base reutilizáveis refletem as referências em `../design`.
- O projeto instala, executa, testa e gera build pelos comandos declarados no harness, sem credenciais versionadas.

## REQ-1-001 [required] Entrada anônima e conversão de conta

Criar usuário por Firebase Anonymous Authentication e permitir vincular Google ou link mágico sem mudar o UID.

Dependências:

- REQ-0-001

Critérios:

- O primeiro acesso não exige cadastro permanente e informa o risco de perda da sessão anônima.
- A conversão preserva UID e dados; conflito com credencial existente nunca mescla, substitui ou apaga dados automaticamente.
- Sair e excluir integralmente a conta estão disponíveis com reautenticação quando necessária.

## REQ-1-002 [required] Onboarding e estado inicial

Entregar tutorial de três telas, sugestões opcionais e convite contextual para salvar a conta.

Dependências:

- REQ-1-001

Critérios:

- Próximo, Voltar e Pular funcionam e a conclusão é persistida.
- Nenhum indicador é criado automaticamente; existem 3–4 sugestões e a ação para criar um indicador próprio.
- O convite para salvar a conta aparece após interação útil e não bloqueia o uso.

## REQ-1-003 [required] Isolamento, regras e exclusão segura

Proteger dados por UID, campos internos e exclusão integral com regras e testes de emulador.

Dependências:

- REQ-1-001

Critérios:

- Um UID nunca lê nem escreve dados de outro e o cliente não altera quotas, billing, push ou idempotência internos.
- Regras-base validam ownership, campos internos e limites; regras específicas de indicadores e registros são ampliadas junto aos respectivos recursos.
- A exclusão remove subcoleções, registros, indicadores, insights, feedback, tokens e finalmente o usuário do Auth, sem órfãos.

## REQ-2-001 [required] Cadastro e gestão de indicadores

Permitir criar, editar, ordenar, arquivar e restaurar Fatores e Resultados com os quatro tipos de resposta previstos.

Dependências:

- REQ-1-001

Critérios:

- Booleano, escala, ordinal e número com unidade respeitam validações, frequência e agregações compatíveis.
- Após o primeiro registro, campos estruturais ficam congelados; nome, sigla, emoji, ordem, status e direção/faixa permitida continuam editáveis.
- Indicadores arquivados somem do registro cotidiano sem apagar o histórico.

## REQ-2-002 [required] Registro diário e privacidade visual

Registrar qualquer subconjunto de indicadores, com observação opcional, e alternar globalmente entre siglas e nomes.

Dependências:

- REQ-2-001

Critérios:

- Registro único substitui o valor somente no dia atual; frequência múltipla cria eventos e aplica a agregação escolhida.
- Ausência, zero e `Não` permanecem valores distintos; não há lançamento retroativo, mas qualquer registro pode ser excluído.
- O modo inicia em siglas, oculta emojis e nomes em textos/legendas sem ocultar valores dos gráficos.
- Persistência confirmada gera feedback; erro ou pendência nunca é apresentado como sucesso.

## REQ-3-001 [required] Motor estatístico determinístico

Calcular retratos, tendências e associações de um Fator com um Resultado na janela móvel de 30 dias.

Dependências:

- REQ-2-002

Critérios:

- Todos os limiares fechados da especificação possuem testes abaixo, igual e acima do limite.
- Lacunas não viram zero nem `Não`; séries constantes e amostras insuficientes não geram cálculos inválidos ou correlação.
- Inclusão ou exclusão recalcula imediatamente o estado atual sem reescrever snapshots curtidos.
- No máximo cinco insights atuais são exibidos e correlação nunca é descrita como causalidade.

## REQ-3-002 [required] Dashboard de insights

Entregar dashboard mobile com registro rápido, resumo atual, cartões e explicações verificáveis.

Dependências:

- REQ-3-001
- REQ-0-001

Critérios:

- O dashboard prioriza insights e mantém “Registrar agora” acessível em poucos toques.
- Cada cartão informa categoria, período, tamanho da amostra e números relevantes quando aplicável.
- Estados sem dados, carregando e erro são explícitos e não fabricam certeza.

## REQ-4-001 [required] Feedback e timeline de conclusões

Permitir curtir, dispensar e consultar snapshots privados de insights.

Dependências:

- REQ-3-002

Critérios:

- Like salva snapshot imutável com texto estruturado, métricas, amostra, janela e data.
- Dislike remove a versão e só permite reaparecimento quando existir evidência material nova.
- Insight sem reação pode ser substituído sem criar caixa de pendências.

## REQ-5-001 [required] PWA instalável sem modo offline

Entregar manifest, ícones e service worker apenas para instalação e push.

Dependências:

- REQ-1-001
- REQ-0-001

Critérios:

- O convite interno de instalação só aparece após alguns usos e depois da conversão da conta.
- Android orienta instalação compatível e iPhone orienta Adicionar à Tela de Início e novo login definitivo quando necessário.
- Falta de instalação, suporte ou conexão não cria promessa de operação offline.

## REQ-5-002 [required] Lembrete diário por push

Enviar lembrete genérico às 20:00 em America/Sao_Paulo somente após opt-in.

Dependências:

- REQ-5-001
- REQ-1-003

Critérios:

- Há no máximo um envio por UID e data de Brasília, com idempotência resistente à repetição do job.
- Usuário que já registrou no dia não recebe; somente o token ativo mais recente é usado.
- Opt-out funciona, a permissão nunca é pedida automaticamente e a mensagem não contém dados do usuário.
- Sem suporte ou permissão de push, todo o restante do aplicativo continua funcional.

## REQ-6-001 [required] Consentimento revogável para IA

Exigir autorização explícita antes de enviar agregados para geração de texto e manter fallback determinístico.

Dependências:

- REQ-3-001

Critérios:

- Recusa ou revogação impede novas chamadas e não desativa estatísticas nem templates locais.
- O serviço recebe somente agregados mínimos e IDs simbólicos; observações e histórico bruto nunca são enviados.
- O texto deixa claro que são padrões possíveis, sem recomendação médica ou afirmação causal.

## REQ-6-002 [required] Geração de narrativas com cota e cache

Gerar até três narrativas por uma função segura, limitada a uma chamada por UID e dia de Brasília.

Dependências:

- REQ-6-001
- REQ-1-003

Critérios:

- Quota transacional bloqueia concorrência e duplicidade; chave usa UID, data de análise, hipótese e versão da evidência.
- Tokens, timeout e tamanhos de entrada/saída têm limites no servidor e segredos nunca chegam ao frontend.
- Falha, ausência de candidatos ou cota consumida usa texto determinístico sem repetição paga automática.

## REQ-7-001 [required] Polimento e qualidade final

Consolidar a V1 com ajustes visuais, acessibilidade, robustez e verificação integrada de todos os fluxos entregues.

Dependências:

- REQ-4-001
- REQ-5-002
- REQ-6-002

Critérios:

- Os fluxos críticos passam por testes unitários, de integração e ponta a ponta sem regressões conhecidas.
- Estados vazios, carregamento, erro, foco, contraste, semântica e navegação por teclado são revisados.
- A interface é validada contra o design em 390 px e 430 px; 1440 px recebe somente reflow simples e conferência de overflow.
- Build de produção, Firebase Hosting de preview e roteiro de aceite final ficam verificáveis sem publicar em produção automaticamente.
