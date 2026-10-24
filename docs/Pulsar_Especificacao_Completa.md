# Pulsar — Especificação funcional completa

**Versão:** 1.1 (decisões fechadas em 24/10/2026)  
**Status:** escopo funcional V1 aprovado; decisões de aparência ficam sujeitas à validação humana do design  
**Produto:** Pulsar — aplicativo web de acompanhamento pessoal de fatores e resultados

> **Princípio central:** registrar informações em poucos toques e descobrir relações úteis entre *o que a pessoa faz* e *como ela se sente*. Correlação não significa causalidade.

## 1. Visão geral

O **Pulsar** é um web app responsivo, com prioridade para uso em celular e suporte a desktop, que permite que qualquer pessoa crie uma conta e acompanhe indicadores personalizados de saúde, bem-estar, hábitos, produtividade e desempenho.

Em vez de uma lista fixa de indicadores, cada pessoa configura o que deseja acompanhar. O aplicativo organiza esses itens em dois grupos:

- **Fatores:** hábitos, atividades, exposições, consumos, rotinas e outras circunstâncias potencialmente relacionadas ao bem-estar. Exemplos: tomou Q10, quantidade de café, prática de exercício, horas de sono, ingestão de óleo de coco.
- **Resultados:** condições ou desempenhos que a pessoa deseja observar. Exemplos: energia, concentração, disposição, humor, ansiedade e dor.

A cada registro, o Pulsar atualiza a análise dos dados disponíveis e oferece um dashboard com comparações, tendências e possíveis associações, usando estatística e, quando fizer sentido, IA generativa para formular explicações claras.

O aplicativo foi pensado inicialmente para uso pessoal e de amigos, não como produto comercial. **Cadastro aberto**; cada conta tem dados privados.

### 1.1 Objetivos

1. Registrar fatores e resultados de forma extremamente rápida, especialmente no celular.
2. Permitir indicadores totalmente personalizados, sem exigir uma lista pré-configurada.
3. Exibir descobertas úteis desde os primeiros dias, respeitando a quantidade de dados disponível.
4. Cruzar fatores e resultados para mostrar *possíveis associações*, sem alegar efeitos clínicos ou causais.
5. Permitir que a pessoa guarde insights interessantes e dispense os irrelevantes.
6. Oferecer discrição visual ao mostrar siglas em vez dos nomes dos indicadores.
7. Manter a implementação enxuta: frontend web + Firebase; funções agendadas apenas onde necessárias.

### 1.2 Fora do escopo inicial

- Aplicativo Android/iOS nativo e integração com Health Connect/Samsung Health; integração automática com relógios, balanças e outros serviços.
- Recursos sociais, monetização, rankings ou perfis públicos.
- Criar registros com data passada; editar valores de dias anteriores (exclusão retroativa **é permitida**).
- Recomendações médicas, de suplementos ou dosagens; conclusões causais; análises de efeito defasado e de 3+ variáveis combinadas.
- Lembretes inteligentes, horário configurável, notificações por indicador ou mais de um lembrete diário.
- Sincronização offline e suporte a navegadores além de Chrome e Safari como prioridade de testes.
- Várias línguas: o aplicativo é somente **pt-BR**.
- Plataforma burocrática de gestão de conformidade LGPD; preservar apenas controles reais de privacidade e segurança.

## 2. Conceitos e nomenclatura

| Termo | Significado |
|---|---|
| **Indicador** | Nome genérico de um item acompanhável; tecnicamente pode ser Fator ou Resultado. |
| **Fator** | Algo que a pessoa faz, consome, vivencia ou registra como possível influência, sem pressupor que seja bom ou ruim. |
| **Resultado** | Algo que a pessoa percebe ou mede e quer acompanhar ou otimizar. |
| **Registro** | Resposta enviada a um indicador em um momento específico, com data/hora e observação opcional. |
| **Insight** | Informação derivada de dados: comparação, tendência, associação ou síntese. |
| **Conclusão salva** | Insight que recebeu curtida e passou a integrar a timeline pessoal. |
| **Insight dispensado** | Insight que recebeu dislike e saiu da exibição atual, mas pode reaparecer com evidências novas. |
| **Sigla** | Identificação curta escolhida pela pessoa ou abreviação automática, usada por padrão no app. |

**Regra de linguagem:** na interface, preferir **Fatores** e **Resultados**; evitar “inputs”, “outputs” e jargão estatístico desnecessário.

## 3. Público, acesso e contas

O cadastro é aberto, porém o primeiro acesso **não exige criar uma conta permanente**.

1. Na primeira visita, o app cria uma conta via **Firebase Anonymous Authentication** e preserva o UID para os registros do usuário.
2. O usuário pode começar imediatamente: tutorial, sugestões de indicadores, preenchimento e dashboard.
3. Depois de começar a usar, o app convida discretamente a **salvar a conta** por **Google** ou **link mágico por e-mail**. Não oferecer senha ou telefone na V1.
4. A conversão vincula a credencial ao **mesmo usuário anônimo**; não executar login separado que crie novo UID por engano.
5. Se a credencial pertencer a outra conta existente, apresentar conflito e opções claras; **nunca mesclar, substituir ou apagar dados automaticamente**.
6. Enquanto a conta for anônima, explicar que perder a sessão/navegador ou trocar de aparelho pode significar perder o acesso aos dados.
7. Antes do **convite do próprio Pulsar para instalar a PWA**, exigir que a pessoa converta sua conta para Google ou e-mail. A instalação pelo menu do navegador não pode ser impedida.
8. A pessoa pode sair, excluir registros específicos, excluir sua conta e apagar os dados pessoais associados.

Os dados são privados por UID. Não há funcionalidade de compartilhamento público.

### 3.1 Primeiro acesso — tutorial e configuração

Tutorial em **três telas**: (1) observe sua rotina/Fatores; (2) acompanhe seus Resultados; (3) descubra possíveis relações. Ter Próximo, Voltar e Pular; registrar conclusão do onboarding.

Na conta nova, apresentar dashboard vazio com **3–4 sugestões** de criação rápida (por exemplo, Energia e Concentração como Resultados; Exercício e Café como Fatores), mais a ação **Criar meu próprio indicador**. **Nenhum indicador é criado automaticamente**.

O convite para salvar a conta deve aparecer depois de alguma interação útil, não bloquear o uso inicial. O convite para **instalar a PWA** deve aparecer depois de alguns usos, com linguagem como “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”; não prometer melhora clínica ou dos resultados medidos.

## 4. Indicadores: cadastro, edição e organização

### 4.1 Campos de um indicador

| Campo | Obrigatório? | Regra |
|---|---|---|
| ID | Automático | ID único e imutável. |
| Grupo | Sim | Fator ou Resultado. |
| Nome | Sim | Nome completo, exibido com o olho aberto. |
| Sigla | Não | Se vazia, usar as 3 primeiras letras + `...`; duplicatas são permitidas. |
| Emoji | Não | Opcional e oculto com o olho fechado. |
| Tipo de resposta | Sim | Booleano, escala, ordinal ou número com unidade. |
| Frequência | Sim | Uma resposta por dia ou várias. |
| Agregação diária | Se múltiplos | Sugestão **determinística**, ajustável pelo usuário antes do primeiro registro. |
| Unidade | Conforme tipo | Inclui unidade personalizada/sem unidade. |
| Direção | Apenas Resultado | Maior, menor, faixa ideal ou sem preferência (padrão). |
| Faixa ideal | Opcional | Valor mínimo e máximo configurados pelo usuário. |
| Ordem/status | Automático/editável | Reordenar, arquivar e restaurar. |
| Datas técnicas | Automático | Criação e atualização em UTC. |

**Bloqueio após o primeiro registro:** grupo, tipo de resposta, unidade, configuração da escala/opções, frequência e agregação diária não podem mais ser modificados na V1. Permanecem editáveis: nome, sigla, emoji, ordem, status e direção/faixa ideal do Resultado. Não há rotina de migração de dados na V1.

### 4.1.1 Agregação quando há múltiplos registros

Não usar IA nem interpretação do **nome** do indicador. A agregação sugerida depende somente da configuração estruturada:

| Configuração | Padrão sugerido |
|---|---|
| Fator numérico | Soma |
| Resultado numérico | Último valor |
| Escala 0–10 | Média |
| Booleano | Presença de qualquer `Sim` |
| Opções categóricas | Último valor |

Em **configurações avançadas**, oferecer apenas agregações válidas para o tipo: **Soma**, **Média**, **Último** e **Presença**. Ex.: número/escala aceita soma, média e último; booleano aceita presença e último; ordinal aceita último. Mostrar um exemplo do efeito da escolha. Para registro único diário, não mostrar agregação: usar o valor do dia. Nunca converter falta de resposta em `Não` ou zero. A agregação fica bloqueada quando existir histórico.

### 4.2 Tipos de resposta

#### A. Sim / não (booleano)

Controle em dois estados, com opção de deixar sem resposta.

Exemplos:
- Fator: “Malhei hoje?” → Sim / Não.
- Fator: “Tomei óleo de coco?” → Sim / Não.
- Resultado: “Tive dor de cabeça?” → Sim / Não.
- Resultado: “Tive insônia?” → Sim / Não.

**Importante:** não respondido é diferente de **Não**.

#### B. Escala numérica (por exemplo, 0–10)

Slider ou seleção compacta, com mínimo, máximo e passo configuráveis; sugestão padrão **0 a 10, passo 1**.

Exemplos:
- Resultado: energia, concentração, disposição, ansiedade, dor.
- Fator: intensidade percebida do exercício.

Não presumir que um valor mais alto é sempre melhor: essa orientação é configurada nos **Resultados**.

#### C. Opções categóricas ordenadas

Alternativas personalizáveis, apresentadas como botões/chips com ordem conhecida.

Exemplos:
- “Pouco / Médio / Muito”.
- “Ruim / Regular / Bom”.
- “Leve / Moderado / Intenso”.

Sugestão: de 2 a 7 opções para não perder agilidade no celular. Internamente preservar a ordem para comparação estatística, sem fingir precisão numérica que não existe.

#### D. Número com unidade

Campo numérico com teclado adequado, aceitando inteiros e **decimais**.

Exemplos:
- Fator: Q10 → 200 mg; café → 3 xícaras; sono → 7,5 horas; suplemento → 2 comprimidos.
- Resultado: peso → 78,5 kg; frequência cardíaca → 65 bpm; temperatura → 36,6 °C.

Unidades sugeridas, com possibilidade de **unidade personalizada**:

| Categoria | Unidades iniciais sugeridas |
|---|---|
| Quantidade | unidade(s), comprimido(s), cápsula(s), dose(s), xícara(s), porção(ões) |
| Tempo | minuto(s), hora(s) |
| Massa | mg, g, kg |
| Volume | mL, L |
| Medidas fisiológicas | bpm, °C, %, mmHg |
| Outra | Sem unidade; unidade digitada pelo usuário |

A unidade é metadado do indicador e **não determina um objetivo ideal**. Ex.: tomar Q10 não pressupõe uma dose desejável.

### 4.3 Direção desejável para Resultados

Opções da V1:
- **Sem preferência (padrão):** apresentar tendências/descritivos sem dizer que melhorar significa subir ou descer.
- **Quanto maior, melhor:** energia, concentração.
- **Quanto menor, melhor:** dor, ansiedade.
- **Faixa ideal:** dois números informados pelo usuário para **Resultados numéricos ou de escala**, `minIdeal` e `maxIdeal`, com `minIdeal <= maxIdeal`; dentro ou fora da faixa. Não sugerir alvos clínicos automaticamente.

Fatores não têm direção desejável. O usuário pode alterar a direção/faixa ideal de Resultados com histórico: isso muda a interpretação **atual**, não os valores registrados e nem snapshots de insights salvos.

### 4.4 Siglas e modo privado (“olhinho”)

O app inicia com nomes de indicadores **ocultos**, exibindo siglas. O olho global alterna entre sigla e nome completo em listagem, preenchimento, dashboard, texto de insights e timeline; reabrir o aplicativo reinicia em siglas.

- Sigla definida: mostrar como foi digitada; siglas duplicadas são permitidas.
- Sigla ausente: mostrar as **3 primeiras letras do nome + `...`**, sem tratamento de colisões.
- **Emoji oculto** enquanto os nomes estiverem ocultos, mesmo quando houver emoji cadastrado.
- **Não existe um modo privado especial para gráficos:** exibir normalmente traçados, eixos, valores e dados. Somente os **nomes dos indicadores** eventualmente usados em rótulos/legendas seguem a regra sigla/nome.
- Na edição explícita de indicador, mostrar o nome completo no campo de formulário para permitir a alteração.

Essa é uma função de discrição visual, não substitui autenticação nem regras de segurança.

### 4.5 Arquivamento e reordenação

- O usuário pode **arquivar** um indicador que não usa mais.
- Indicadores arquivados deixam de aparecer no preenchimento cotidiano.
- O histórico permanece e pode continuar contribuindo para análises históricas, com identificação de que o indicador está arquivado.
- Permitir consultar arquivados e restaurar.
- Reordenação livre dentro de **Fatores** e **Resultados**; preservar a ordem escolhida.
- Não apagar automaticamente registros ao arquivar.

## 5. Registro cotidiano de dados

### 5.1 Fluxo de preenchimento

1. O usuário abre o dashboard.
2. Um botão de ação destacado, como **“Registrar agora”**, abre/expande a área de preenchimento rapidamente.
3. A interface destaca os grupos **Fatores** e **Resultados**, usando rótulos, cor e posicionamento consistentes.
4. O usuário preenche somente os indicadores desejados.
5. Cada mudança confirmada é persistida e dispara atualização dos cálculos; a interface exibe feedback discreto de salvamento.
6. O usuário volta ao dashboard de insights em um toque.

**Regra essencial:** nenhum campo é obrigatório. Uma pessoa pode preencher só um fator, só um resultado ou um subconjunto dos dois.

### 5.2 Um registro ou vários registros no dia

- **Único por dia:** manter um valor por indicador e dia; novo preenchimento **no próprio dia** substitui o valor atual.
- **Múltiplos por dia:** cada resposta gera novo evento com timestamp UTC; a agregação definida no indicador calcula o valor consolidado para aquele dia.
- **Sem lançamento retroativo** e sem editar valores de dias anteriores. O usuário pode **excluir qualquer registro, inclusive passado**.
- Excluir uma entrada invalida os resumos afetados e recalcula o dashboard **com os dados atualmente existentes**, sem reconstruir retrospectivamente os snapshots de insights curtidos.
- Todos os timestamps persistidos são UTC. O frontend apresenta datas/horários no fuso do navegador e define a chave `localDate` no momento de registrar; sem tratamento especial de viagens e **sem validação adicional da data no servidor**.
- Registro vazio não equivale a zero ou resposta `Não`. Falsas presenças/ausências jamais entram nas análises.

### 5.3 Observação opcional

- Em qualquer registro, há um campo opcional **Observação**.
- Não haverá um quinto tipo de resposta “texto livre”.
- A observação complementa um valor estruturado; não o substitui.
- Análise estatística usa os valores estruturados. **Na V1 a IA não recebe observações**; eventual processamento de observações livres fica para uma versão futura.

### 5.4 Estado vazio e feedback

- Nenhum indicador: sugerir 3–4 opções + criar indicador.
- Indicadores existentes, mas sem registros: explicar que insights aparecerão com o preenchimento.
- Primeiro registro: agradecer de forma discreta e incentivar retorno sem exagerar em gamificação.
- Dia parcialmente preenchido: não exibir alertas de “faltando responder” nem exigir completude.
- Falha de conexão: informar erro ou salvamento pendente; não indicar sucesso antes da persistência.

## 6. Dashboard e insights

### 6.1 Objetivos do dashboard

O dashboard é a tela principal, com **insights primeiro** e entrada rápida para o preenchimento. Deve ser útil mesmo com pouco histórico, mas sem fabricar certezas.

Possível composição:

1. Cabeçalho com nome do app, ação de perfil e ícone global do olho.
2. Ação principal **Registrar agora**.
3. Resumo de hoje (indicadores preenchidos e estado atual, sem cobrar os demais).
4. Área de insights atualizados.
5. Mini gráficos e tendências que tenham dados suficientes.
6. Atalho para **Conclusões salvas**.

**A partir do segundo dia:** já pode mostrar comparações descritivas simples, por exemplo, “Sua energia foi 6 ontem e 7 hoje”, desde que ambos tenham registros comparáveis. Isso **não** significa gerar correlação entre fatores e resultados com apenas dois dias.

### 6.2 Tipos de insight

#### Tipo 1: Retrato do dia

Exemplos:
- “Hoje você registrou energia 7/10 e concentração 6/10.”
- “Você registrou exercício em 3 dos últimos 5 dias com preenchimento.”

São resumos factuais; possíveis já com pouquíssimos dados.

#### Tipo 2: Tendência de um resultado

Exemplos:
- “A média de energia nos últimos 7 dias registrados foi maior que na semana anterior.”
- “Sua concentração variou bastante nos últimos registros.”

Preferir mostrar números, período e **quantidade de dias com resposta**, evitando tratar lacunas como zero.

#### Tipo 3: Associação entre um fator e um resultado

Exemplos:
- “Nos dias em que você respondeu ‘Exercício: Sim’, sua energia média foi 7,5; nos dias com ‘Exercício: Não’, foi 5,8.”
- “Dias com exercício coincidiram com níveis mais altos de concentração nesta amostra.”
- “O consumo de café apresentou associação com variações de energia.”

**Cuidado:** ausência de registro de exercício/Q10 **não** comprova que a atividade ou consumo não ocorreram. Comparações “com vs. sem” exigem resposta explícita nos dois grupos.

#### Tipo 4: Exploração combinada (futuro)

Cruzar vários fatores simultaneamente ou analisar efeitos em dias seguintes está **fora da V1**. A V1 cruza no máximo **um Fator e um Resultado** por associação.

### 6.3 Cartões de insight

Cada cartão poderá conter:

- Uma **frase curta** em linguagem natural.
- Uma categoria discreta, como “Comparação”, “Tendência” ou “Associação”.
- Período analisado e tamanho da amostra.
- Mini gráfico ou indicador visual **quando fizer sentido**.
- Ação **“Entender melhor”** com números, filtros, gráfico e ressalva de interpretação.
- Botões de **like** e **dislike**.
- Data/hora da atualização, quando relevante.

Exemplo de cartão:

> **Possível associação**  
> Nos 12 dias em que você registrou exercício, sua energia média foi 7,2/10; nos 10 dias com “não”, foi 5,9/10.  
> **Base:** 22 dias com ambos os registros • **Entenda a análise** • 👍 👎

**Em modo privado**, as referências textuais a “exercício” e “energia” serão substituídas pelas siglas correspondentes, inclusive nas legendas.

### 6.4 Like, dislike e timeline de conclusões

- **Like:** salvar snapshot imutável de texto estruturado, métricas, amostra, janela analisada e data em **Conclusões salvas** (timeline privada).
- **Dislike:** retirar a versão da exibição. Uma hipótese pode reaparecer **somente quando houver evidência nova material**, não apenas porque a frase foi reformulada.
- **Sem like/dislike:** nada entra na timeline nem interfere no cálculo ou na seleção de insights futuros. O cartão aparece **enquanto ainda for relevante** e desaparece quando substituído; **não há caixa de pendências**.
- Mesmo que dados novos mudem uma conclusão, snapshots curtidos mantêm o contexto e a data em que foram salvos.

### 6.5 Atualização dos insights e IA

- Após criar/substituir/excluir um registro, recálculo **estatístico determinístico imediato**, usando o estado atual dos registros.
- Na abertura do app e na primeira abertura de cada novo dia, revisar a janela móvel e recalcular, sem precisar job diário de estatística.
- A IA **não calcula métricas** nem sugere agregações; apenas produz frases/explicações para insights já aprovados pelo motor estatístico.
- **No máximo uma chamada de IA por usuário por dia**, com até **3 textos** na chamada, somente com aceite específico e se houver insights qualificados novos.
- Tentar a geração após o primeiro ciclo de preenchimento do dia que realmente produza insights elegíveis; cachear por dia/insight/versão. Mudanças posteriores atualizam números e texto determinístico sem segunda chamada no dia.
- Em indisponibilidade, falha, recusa do aceite ou quota atingida, mostrar **frases automáticas determinísticas** e manter o uso normal.
- Antes da primeira chamada, mostrar texto curto de aceite e permitir desativar a IA em configurações. Evitar enviar notas e históricos brutos: enviar somente agregados pertinentes, sem dados extras.

### 6.5.1 Critérios estatísticos fixos da V1

A janela padrão é de **30 dias corridos**, com **até 5 cartões de insight** no dashboard: idealmente até 2 associações, até 2 tendências e ao menos um resumo factual (adaptar quando faltar uma categoria). Sempre exibir período e dias válidos usados; limitar volume de hipóteses para reduzir descobertas casuais.

| Insight | Condição mínima para exibir |
|---|---|
| Retrato do dia | Pelo menos um registro no dia. |
| Comparação entre dias | 2 dias com registros comparáveis. |
| Tendência de escala 0–10 | Duas janelas de 7 dias consecutivas, pelo menos 4 dias com valores em **cada** janela, e diferença entre médias de ao menos 1 ponto. |
| Tendência de Resultado numérico fora de escala 0–10 | Mesma cobertura; diferença absoluta entre médias >= 0,8 desvio-padrão da série de dias válidos das duas janelas (não exibir se desvio = 0). |
| Fator booleano × Resultado em escala 0–10 | Pelo menos 14 dias pareados, 5 `Sim` e 5 `Não` explícitos; diferença absoluta entre médias >= 1,5 ponto. |
| Fator booleano × Resultado numérico livre | Mesmos 14 dias/5 por grupo; diferença absoluta entre médias >= 0,8 desvio-padrão do Resultado nesses dias (não exibir se desvio = 0). |
| Fator numérico × Resultado numérico | Pelo menos 16 dias pareados, 4 valores distintos por variável, correlação de Spearman `abs(rho) >= 0,55`. |
| Fator booleano × Resultado booleano | Pelo menos 14 dias pareados, 5 `Sim` e 5 `Não` no Fator; diferença absoluta >= 25 pontos percentuais na proporção `Sim` do Resultado entre os grupos. |

Para variáveis ordinais (ex.: humor Ruim/Regular/Bom), a V1 apresenta retratos e distribuições, mas **não cria associação estatística** sem limiar aprovado específico. Escalas numéricas diferentes de 0–10 seguem critérios padronizados de valor numérico quando aplicáveis.

**Não implementar outras associações na V1 por inferência criativa.** Caso não haja elegibilidade, exibir apenas descrições ou indicar que ainda faltam dados. As regras são **limiares heurísticos de exibição**, não validação científica, teste causal ou percentual de confiança. Ausência de registro não é o grupo `Não`.

### 6.6 Comunicação responsável

- Nunca transformar uma correlação em “X causou Y”.
- Nunca recomendar que a pessoa aumente/reduza dosagens com base nesses dados.
- Evitar qualificações como “comprovado” ou “certeza” sem fundamento.
- Mostrar observações como “poucos dados”, “associação preliminar”, “mais registros necessários”, conforme critérios claros.
- Resultados de saúde podem ser influenciados por fatores não registrados.
- Múltiplas comparações aumentam a chance de associações coincidentes; limitar e revisar hipóteses.

## 7. Experiência visual e navegação

### 7.1 Identidade dos grupos

A distinção entre **Fatores** e **Resultados** deve ser percebida imediatamente, mas **não depender só de cor**.

Proposta de direção visual:

| Grupo | Referência | Papel na interface |
|---|---|---|
| **Fatores** | Tom frio (por exemplo, azul), ícone próprio e rótulo | “O que fiz / consumi / vivi” |
| **Resultados** | Outro tom (por exemplo, roxo), ícone próprio e rótulo | “Como fiquei / o que medi” |

Cor específica e símbolos definitivos **não foram escolhidos**; deverão ser validados visualmente.

**Ideia levantada na conversa:** fatores à esquerda e resultados à direita. Aplicar naturalmente em **duas colunas no desktop**. No celular, validar protótipo que preserve a distinção e a leitura rápida sem esmagar controles em colunas muito estreitas — por exemplo, seções verticais com alinhamento/acentos visuais distintos. Isso é uma **direção de UX a validar**, não um layout irrevogável.

### 7.2 Prioridade para celular

- Alvos grandes para toque, teclado numérico nos campos numéricos, ações persistentes quando úteis.
- Pouca digitação para responder indicadores comuns.
- Preferir controles de um toque (Sim/Não, opções curtas) e slider simples.
- Evitar excesso de gráficos e dados simultaneamente.
- Ter transição simples de **dashboard/insights → preenchimento → dashboard**.
- Usar design responsivo no desktop.

### 7.3 Estrutura de telas

1. **Entrada/Autenticação:** entrar, criar conta e sair.
2. **Tutorial:** três telas rápidas.
3. **Dashboard:** insights e ação central de registrar.
4. **Preenchimento rápido:** fatores e resultados, com observação opcional.
5. **Meus indicadores:** criar, editar, ordenar, arquivar, restaurar; opção de visualização de nomes.
6. **Conclusões salvas:** timeline de insights curtidos e detalhes.
7. **Configurações:** conta, privacidade visual, notificações e exclusão de dados.

A tela de preenchimento pode ser **painel expansível ou estado da própria home**, sem exigir navegação demorada para outra rota.

## 8. PWA instalável e lembrete diário (V1)

- O Pulsar é **PWA instalável**; não precisa funcionar offline. Priorizar Chrome (Android/desktop) e Safari (iPhone/desktop).
- Após alguns usos, convidar o usuário a instalar: “Instale o Pulsar para acessar mais rápido e receber um lembrete diário”. **Somente apresentar o convite interno depois que a conta anônima tiver sido convertida em Google/e-mail**; se não, oferecer antes a conversão.
- A instalação feita diretamente pelo menu do navegador não pode ser bloqueada. No iPhone, a PWA instalada pode ter sessão separada do Safari; comunicar e tratar entrada na conta permanente.
- O lembrete é **opcional**: perguntar permissão após gesto do usuário e habilitar/desabilitar em configurações.
- **Um lembrete por dia às 20:00, horário de Brasília (`America/Sao_Paulo`)**, compartilhado por todos; sem customizar, aprender hábitos ou ajustar por viagens/fusos.
- Enviar **apenas se ainda não houve nenhum registro naquele dia** (dia definido pela data de Brasília para a regra do lembrete); texto genérico, sem nomes de indicadores.
- Requer Web Push/FCM, service worker e **Cloud Function agendada diariamente** via Cloud Scheduler; idempotência garante no máximo **um envio por usuário/dia**, mesmo em reexecução. Se houver vários dispositivos, preferir um dispositivo/token ativo para não multiplicar lembretes.
- No iPhone, permitir push somente onde suportado por Safari/PWA instalada na Tela de Início; se o dispositivo não suporta ou a pessoa recusa, o restante funciona normalmente.

## 9. Privacidade, segurança e confiança

- Firestore com **Security Rules por UID** e testes de isolamento entre usuários, incluindo contas anônimas.
- Contas anônimas têm dados privados, mas sua recuperabilidade depende da sessão; o app explica isso e oferece conversão.
- Acesso à IA exige consentimento curto e explícito antes de compartilhar agregados; permitir revogar. Não enviar observações livres ou histórico bruto desnecessariamente.
- Excluir conta deve remover usuário do Firebase Auth e seus dados relacionados (subcoleções, feedback, conclusões, preferências e tokens de push), por operação segura no backend.
- HTTPS; chaves de servidor apenas no backend; não gravar nomes/notas sensíveis em logs ou payloads de notificação.
- Não criar um sistema burocrático de conformidade LGPD para a V1; manter essas proteções mínimas mesmo sendo um projeto pessoal.

## 10. Critérios de aceite da primeira versão

### Conta e onboarding
- [ ] Primeiro acesso anônimo funciona sem cadastro; tutorial e sugestões opcionais de 3–4 indicadores.
- [ ] Conversão para Google ou link mágico preserva UID e registros; tratar conflitos sem perda/mescla automática.
- [ ] Não existe autenticação por telefone/senha na UI da V1.
- [ ] Usuários não conseguem acessar dados uns dos outros; exclusão de conta apaga dados relacionados.

### Indicadores e registros
- [ ] Quatro formatos estruturados, observação opcional, frequência única/múltipla por dia.
- [ ] Sugestão **determinística** de agregação por tipo/grupo; usuário ajusta nas configurações avançadas antes do primeiro registro.
- [ ] Nome/sigla/emoji e arquivamento/reordenação; tipo/grupo/unidade/frequência/agregação bloqueados após haver histórico.
- [ ] Resultados aceitam sem preferência (padrão), maior, menor ou faixa ideal configurável.
- [ ] Registrar apenas hoje; substituir registro único de hoje; múltiplos registram eventos independentes.
- [ ] Excluir registro de qualquer dia; não editar valores de dias passados; recalcular o presente com os dados atuais.
- [ ] Persistir UTC; apresentar horário do navegador; sem lógica de viagens nem validação de data no servidor.

### Dashboard, IA e privacidade visual
- [ ] Descrições desde o primeiro dia; comparação desde o segundo; associações seguem limiares fechados da seção 6.5.1.
- [ ] Até 5 cartões; like salva snapshot; dislike oculta versão; sem reação não cria pendência nem influencia análises futuras.
- [ ] Recalcular deterministicamente após inclusão/exclusão e na mudança de dia.
- [ ] Uma chamada de IA por usuário/dia, até 3 textos, com aceite antes da primeira chamada e fallback automático.
- [ ] Olho global alterna somente **nomes ↔ siglas** dos indicadores; emojis ocultos com olho fechado; gráficos não são mascarados.
- [ ] Design mobile/desktop fornecido deve ser validado por humano (metáfora esquerda/direita).

### PWA, lembretes e escopo
- [ ] PWA instalável; convite contextual a partir de uso recorrente, precedido por conversão de conta se anônima.
- [ ] Lembrete opcional único às 20h Brasília somente se não houve registro no dia; testes Chrome/Android e Safari/iPhone.
- [ ] Sem aprendizado de horários, offline, app nativo ou outros idiomas além de pt-BR.
- [ ] Seed de um usuário com 30 dias sintéticos e novos usuários criados em testes, sem seed em produção.

## 11. Priorização de entrega

**Etapa A — Registro:** acesso anônimo, conversão Google/link mágico, tutorial, indicadores, agregação, dados diários e exclusões, privacidade por siglas, Security Rules.

**Etapa B — Insights:** análise determinística com limiares exatos, dashboard, mini gráficos, like/dislike/timeline.

**Etapa C — IA:** consentimento, Cloud Function com quota de 1 chamada/dia/usuário, até 3 textos, fallback e orçamento.

**Etapa D — PWA/lembrete:** instalação, convite pós-conversão, FCM, Cloud Scheduler diário às 20h Brasília, opt-in/opt-out, testes iPhone/Android.

**Futuro opcional:** integrações externas, análises multivariadas/defasadas, exportação, novos idiomas e notificações mais sofisticadas.

## 12. Decisões já fechadas e única validação visual

As decisões de autenticação, agregação, registros, IA, faixa ideal, lembrete, limites estatísticos, privacidade e escopo foram aprovadas para V1. **Não tratá-las como sugestões abertas para o agente.**

A **única decisão de layout dependente de protótipo** é se, no mobile, Fatores/Resultados devem ocupar esquerda/direita ou seções verticais; o usuário fará validação visual com o design que fornecerá antes de iniciar. O agente deve seguir o design entregue sem reinventá-lo.

O arquivo separado `Pulsar_Preparacao_Antes_da_Implementacao.md` detalha os acessos, ferramentas, serviços, seeds, credenciais e assets necessários **antes** do desenvolvimento.

## 13. Exemplos de jornadas

### Jornada 1 — Primeiros dois dias

**Dia 1:** pessoa cria conta, conclui tutorial, aceita “Energia” como Resultado e “Exercício” como Fator. Registra energia 5/10 e exercício = Sim. Dashboard mostra o retrato do dia, não uma conclusão sobre o exercício.

**Dia 2:** registra energia 7/10 e exercício = Não. Dashboard pode comparar 5 e 7 com os respectivos dias, mas **não** afirma que parar de treinar melhora energia com apenas duas observações.

### Jornada 2 — Suplementos e concentração

Pessoa cria:
- Fator `Q10`: número em mg, um registro/dia.
- Resultado `Concentração`: escala 0–10, quanto maior melhor, múltiplos registros/dia.

Após dados suficientes, o app pode comparar concentrações agregadas por dia em grupos com quantidades distintas de Q10 registradas, desde que haja cobertura e contraste suficientes. Exibe amostra, diferença observada e ressalva de que não se pode atribuir causalidade.

### Jornada 3 — Discrição visual

Uma pessoa abre o aplicativo ao lado de terceiros. Ela vê `Con...`, `Q10` e outros códigos, não nomes completos. Ao tocar no olho, revela os nomes para se orientar; ao tocar de novo, oculta. Ao abrir o app novamente, os nomes aparecem ocultos por padrão.

### Jornada 4 — Curtir uma descoberta

O app exibe um insight sobre exercícios e disposição. A pessoa dá like; o cartão entra na timeline com os dados que justificavam a descoberta naquele dia. Semanas depois, a associação perde força; a conclusão antiga permanece no histórico como **registro do que se observou naquele momento**, não como verdade permanente.

### Jornada 5 — Descartar e reencontrar

Um insight preliminar não parece útil e recebe dislike. O app deixa de exibir a mesma versão no dashboard. Um mês depois, novos registros fortalecem essa associação; o app pode apresentar **uma nova versão**, com outra amostra e explicação.

---

**Nota:** este documento registra decisões discutidas e sugestões explicitamente separadas. Ele não constitui orientação médica nem valida, por si só, associações estatísticas como relações de causa e efeito.
