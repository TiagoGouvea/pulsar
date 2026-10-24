# Firebase de desenvolvimento — Pulsar

## Configurado

- Projeto Firebase ativo: `pulsar-codex`.
- App Web criado com nome `Pulsar`.
- App ID público: `1:235186883294:web:42467ced12b2f5c6bc504f`.
- Hosting site reservado: `pulsar-codex`.
- `.firebaserc` vinculado exclusivamente a `pulsar-codex`.
- Configuração pública do SDK armazenada somente no `.env` local ignorado.
- Conta de serviço local e `.env` com permissão de arquivo `600` e ignorados pelo Git.

## Bloqueios manuais no Console

1. Habilitar a [Cloud Firestore API para `pulsar-codex`](https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=pulsar-codex).
2. Depois da propagação, criar o banco padrão Standard em `southamerica-east1`:

   ```bash
   firebase firestore:databases:create '(default)' \
     --location southamerica-east1 \
     --edition standard \
     --delete-protection DISABLED \
     --point-in-time-recovery DISABLED \
     --project pulsar-codex
   ```

3. No Firebase Authentication, habilitar Anonymous, Google e E-mail/Senha. Para link mágico, habilitar também E-mail por link e configurar domínios/templates.
4. Confirmar plano Blaze, conta de faturamento, alertas e quotas antes de Functions v2 e Cloud Scheduler.
5. Gerar a chave pública VAPID do Cloud Messaging quando a implementação de push começar.
6. Decidir e configurar App Check depois que os ambientes local e Hosting estiverem funcionando.

## Segurança

A conta de serviço não possui permissão para Service Usage ou Cloud Billing. Não ampliar essas permissões apenas para automatizar a preparação. Nunca versionar a chave JSON nem copiar seu conteúdo para prompts, logs ou código cliente.
