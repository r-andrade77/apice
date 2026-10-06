# Ápice — frontend

Interface web multipágina para acompanhar atletas, sessões e saltos recebidos pela API Spring Boot do projeto.

## Organização

```text
front-end/
├── index.html             # página inicial
├── assets/
│   ├── css/styles.css     # estilos compartilhados
│   └── js/app.js          # integração com a API e interações
└── pages/
    ├── atletas.html       # listagem e CRUD de atletas
    ├── atleta.html        # perfil individual (?id=ID)
    ├── sessoes.html       # listagem e CRUD de sessões
    ├── sessao.html        # dashboard e captações da sessão (?id=ID)
    └── captacoes.html     # captações e indicadores
```

## Executar

1. Inicie a API e o banco de dados conforme as instruções do projeto.
2. Sirva esta pasta por HTTP, por exemplo com a extensão **Live Server** do VS Code ou `python -m http.server 5500`.
3. Abra o endereço apresentado pelo servidor. No primeiro acesso, a interface tenta conectar à API em `http://localhost:8080`.
4. Abra `login.html` e entre com o usuário e a senha fornecidos pelo administrador da API. A conexão é automática com `http://localhost:8080`; a autenticação fica ativa apenas até fechar a aba.

Não é necessário instalar dependências: a interface usa HTML, CSS e JavaScript nativos.

## Integração

O frontend consome as rotas existentes:

- `GET`, `POST`, `PUT` e `DELETE /api/atletas`
- `GET`, `POST`, `PUT` e `DELETE /api/sessoes`
- `GET /api/saltos` e `GET /api/saltos/sessao/{sessaoId}`

O acesso começa em `login.html`, que valida as credenciais HTTP Basic na rota existente de atletas. As sessões e captações seguem as permissões já definidas no backend. O dashboard deriva seus indicadores e gráfico das respostas reais; a listagem de captações é atualizada a cada 15 segundos.

Cada área tem seu próprio arquivo HTML dentro de `pages/`. Cada perfil de atleta abre `pages/atleta.html?id={id}`; os cartões e o botão **Perfil** levam à página do atleta, e o endereço pode ser aberto ou recarregado diretamente. As sessões podem ser abertas pelo perfil do atleta ou pela listagem geral e levam a `pages/sessao.html?id={id}`, com o dashboard e o histórico de captações daquela sessão.

Para treinadores sem experiência técnica, a aplicação conecta automaticamente ao endereço padrão e mostra avisos simples em caso de falha. Em uma instalação para vários treinadores, uma evolução recomendada é substituir a autenticação Basic por contas individuais com recuperação de senha e sessão segura gerenciada pelo backend.

Para que os dados da ESP32 apareçam, crie a sessão na API, configure o firmware com o ID dessa sessão e mantenha a API acessível pela rede usada pelo dispositivo.
