# Modelos e orçamento do desenvolvimento

O teto total do harness para desenvolver o Pulsar é **USD 60**. Custos do Firebase, Hosting, Functions e da IA usada pelo aplicativo não entram nesse valor.

| Parcela | Teto | Entrega |
|---|---:|---|
| Etapa 0 — Setup (`0-setup`) | USD 8 | Inicialização com modelo top, scaffold, design system e decisões |
| Etapa 1 — Base (`1-base`) | USD 10 | Autenticação, isolamento e Security Rules com modelos caros |
| Etapa 2 — Registro (`2-registro`) | USD 9 | Indicadores e registro diário |
| Etapa 3 — Insights (`3-insights`) | USD 12 | Estatística e dashboard com modelos caros |
| Etapa 4 — Curadoria (`4-curadoria`) | USD 5 | Conclusões salvas e feedback |
| Etapa 5 — PWA e push (`5-pwa-push`) | USD 6 | Instalação e lembrete das 20:00 |
| Etapa 6 — IA generativa (`6-ia-generativa`) | USD 4 | Textos via Firebase, consentimento, cota e fallback |
| Etapa 7 — Polimento (`7-polimento`) | USD 6 | Ajustes finais, verificação e qualidade |

Os tetos das oito etapas somam exatamente USD 60. Não há reserva percentual separada no ledger; a verificação final está incluída em `7-polimento`. O limite externo atual de USD 20 da credencial OpenRouter é uma proteção adicional: se não for ampliado, o provedor poderá interromper chamadas antes do teto total do projeto.

## Distribuição dos modelos

| Papel | Pool em ordem de preferência |
|---|---|
| Planejamento | Gemini, GPT Sol, GPT-OSS local |
| Testes | Gemini, Qwen Coder online, GPT Sol em itens críticos |
| Implementação comum | DeepSeek, Qwen Coder online, Qwen local, GLM |
| Implementação difícil | GPT Sol, Gemini, Qwen Coder local, DeepSeek |
| Revisão funcional | Gemini, GPT Luna, GPT-OSS local |
| Revisão visual | Gemini, GLM |
| Segurança | GPT Sol, Gemini, GPT-OSS local |
| Diagnóstico | GPT Luna, GLM, DeepSeek, Qwen local |
| Retrospectiva | Gemini, GPT-OSS local |

O roteador varia os candidatos do pool entre tarefas e tentativas. A revisão independente exclui a família usada na implementação sempre que houver alternativa. Firestore, Auth, privacidade, exclusão, estatística e insights entram no pool difícil. Não há torneio automático.

Antes de cada uso local, o harness descarrega todos os modelos do LM Studio, carrega somente o candidato necessário e o descarrega ao terminar. Os três modelos locais permanecem cadastrados; falha de um candidato provoca rotação na tentativa seguinte.

O preflight bloqueia um modelo OpenRouter ausente ou cujo preço atual ultrapasse o valor aprovado na configuração. Aumento de preço exige revisão explícita do catálogo.
