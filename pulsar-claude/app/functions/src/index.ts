import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';

// Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
setGlobalOptions({ region: 'southamerica-east1' });

// Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
  response.status(200).send('ok');
});
