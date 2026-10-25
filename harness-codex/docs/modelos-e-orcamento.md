# Modelos e orçamento do desenvolvimento

O teto total do harness para desenvolver o Pulsar é **USD 60**. Custos do Firebase, Hosting, Functions e da IA usada pelo aplicativo não entram nesse valor.

| Parcela | Teto | Entrega |
|---|---:|---|
| Etapa A — Registro | USD 16 | Base mobile, conta, indicadores, registros e segurança |
| Etapa B — Insights | USD 13 | Estatística, dashboard e timeline |
| Etapa C — IA | USD 11 | Consentimento, função, cota e fallback |
| Etapa D — PWA | USD 8 | Instalação e lembrete diário |
| Reserva final | USD 12 | Correções críticas, segurança e verificação final |

Os tetos das etapas somam USD 48. Os 20% restantes ficam protegidos pelo ledger como reserva final. O limite externo atual de USD 20 da credencial OpenRouter é uma proteção adicional: se não for ampliado, o provedor poderá interromper chamadas antes do teto total do projeto.

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
