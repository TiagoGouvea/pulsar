export function getErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';
}

export function accountErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'Esta credencial já pertence a outra conta. Sua sessão e seus dados foram mantidos, sem mesclar, substituir ou apagar nada. Use outro Google/e-mail ou cancele para continuar nesta conta.';
    case 'account/link-session-missing':
    case 'account/no-session':
      return 'Não encontramos a sessão que solicitou este link. Abra o link no mesmo navegador e perfil em que o pediu, com a sessão original ativa. Nenhuma conta foi vinculada e nenhum dado foi transferido.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'O link é inválido, expirou ou já foi usado. Cancele e solicite um novo link no navegador original. Seus dados não foram alterados.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'A janela foi fechada. Sua conta continua como estava; você pode tentar novamente.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.';
    case 'auth/network-request-failed':
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return 'Não foi possível confirmar a operação. Verifique sua conexão e tente novamente. Não apresentaremos uma operação pendente como concluída.';
    case 'auth/requires-recent-login':
    case 'functions/failed-precondition':
      return 'Por segurança, confirme sua identidade novamente antes de continuar.';
    case 'auth/user-mismatch':
    case 'account/wrong-email':
      return 'Confirme a identidade com o mesmo Google ou e-mail desta conta. Nenhuma conta foi trocada.';
    case 'account/uid-mismatch':
      return 'O identificador retornado é diferente do original. A operação foi interrompida; nenhum dado será migrado automaticamente.';
    case 'account/session-exists':
      return 'Já existe uma sessão ativa. Para proteger os dados, não entraremos em outra conta por cima dela.';
    case 'account/pending-link':
      return 'Conclua ou cancele o link mágico antes de começar outra sessão.';
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
    case 'functions/not-found':
      return 'Este serviço ainda não está disponível neste ambiente. Tente novamente mais tarde.';
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    default:
      return 'Não foi possível concluir a operação. Nenhuma conclusão foi confirmada. Tente novamente.';
  }
}
