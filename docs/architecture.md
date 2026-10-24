# Arquitetura

O controlador TypeScript é determinístico. Ele mantém o loop, aplica limites e persiste estado; o modelo nunca decide estados, aprovações ou orçamento.

Fluxo principal:

1. Configuração validada e entradas fotografadas por hash.
2. Requisitos extraídos com origem e convertidos em DAG de tarefas.
3. Reserva de orçamento e contexto seletivo por tentativa.
4. Sessão Pi independente executa a tarefa no workspace alvo.
5. Controlador valida o resultado, executa verificadores e vincula evidências à revisão real.
6. Marco gera revisão humana; somente o humano aprova a revisão exata.

SQLite em WAL é a fonte operacional. JSON e Markdown são projeções/evidências. Eventos são append-only. Uma lease impede dois controladores escritores para a mesma run.

Estados de run e tarefa seguem a seção 11 da especificação. Chamadas externas são reservadas antes do despacho e reconciliadas depois. Falha paga sem uso confirmado mantém reserva incerta.

O executor fake prova propriedades determinísticas sem custo. O executor Pi usa uma sessão em memória por tarefa e uma camada estreita para permitir troca de versão.
