# Firebase de desenvolvimento — Pulsar

## Configurado

- Projeto Firebase ativo: `pulsar-codex`.
- App Web criado com nome `Pulsar`.
- App ID público: `1:235186883294:web:42467ced12b2f5c6bc504f`.
- Hosting site reservado: `pulsar-codex`.
- Firestore padrão Standard criado em `southamerica-east1`; projeto no plano Blaze com faturamento associado.
- `.firebaserc`, configuração pública do SDK e conta de serviço ficam no repositório separado `../pulsar-codex`.
- Configuração pública armazenada somente no `.env` local ignorado.
- Conta de serviço local e `.env` com permissão de arquivo `600` e ignorados pelo Git.

## Configuração externa confirmada

Em 25/10/2026, o responsável confirmou que a preparação do Firebase está concluída, inclusive:

- Authentication com Anonymous, Google, E-mail/Senha e link mágico, além de domínios e templates.
- Plano Blaze, conta de faturamento, alertas e quotas.
- Cloud Functions v2, Cloud Scheduler, FCM/VAPID e App Check.

Testes de conversão de conta, regras de acesso, Functions, Scheduler, push e App Check continuam como trabalho de implementação e validação da aplicação.

## Segurança

A conta de serviço não possui permissão para Service Usage ou Cloud Billing. Não ampliar essas permissões apenas para automatizar a preparação. Nunca versionar a chave JSON nem copiar seu conteúdo para prompts, logs ou código cliente.
