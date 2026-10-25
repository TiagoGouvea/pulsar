# Aplicativo de lista de itens

## REQ-001 [required] Cadastrar e listar itens

O usuário consegue informar um título não vazio e o item aparece imediatamente na lista.

Critérios:

- Rejeita título vazio com mensagem acessível.
- Exibe o novo item sem recarregar a página.
- Persiste os itens no armazenamento local de teste.

## REQ-002 [required] Editar um item existente

O usuário altera o título de um item e a alteração permanece após reload.

Dependências:

- REQ-001

Critérios:

- O botão Editar solicita um novo título.
- Título vazio não substitui o valor anterior.

## REQ-003 [required] Filtrar itens por texto

O campo de busca reduz a lista sem apagar dados.

Dependências:

- REQ-001

Critérios:

- Busca ignora diferenças entre maiúsculas e minúsculas.
- Limpar a busca restaura todos os itens.

## REQ-004 [optional] Excluir itens

O usuário pode remover um item individualmente.

Critérios:

- O item removido não retorna após reload.
