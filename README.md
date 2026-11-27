# Pixabay Media Finder

Aplicação web simples para pesquisar imagens e vídeos no Pixabay. A chave da API fica no servidor, nunca no navegador.

## Configurar localmente

1. Instale Node.js 18 ou superior.
2. Copie `.env.example` para `.env`.
3. Abra `.env` e substitua `COLOQUE_SUA_CHAVE_AQUI` pela sua chave Pixabay.
4. Inicie o servidor:

```bash
npm start
```

5. Abra http://localhost:3000

O projeto carrega automaticamente o arquivo `.env` usando `dotenv`. Também é possível configurar `PIXABAY_API_KEY` diretamente no ambiente antes de executar.

## Publicar no Render

1. Envie estes arquivos para um repositório GitHub.
2. No Render, escolha **New + → Blueprint** e conecte o repositório.
3. O Render vai detectar `render.yaml`.
4. Nas configurações do serviço, adicione a variável `PIXABAY_API_KEY` com sua chave.
5. Faça o deploy. A chave deve ser cadastrada somente em Environment Variables no Render, nunca em arquivos do GitHub.

## Segurança

- Não coloque sua chave em `public/`, no HTML, no JavaScript do navegador ou em commits.
- Não envie sua chave por mensagens ou issues.
- Se a chave for exposta, gere outra no painel do Pixabay.
- O plano gratuito do serviço de hospedagem pode ter limites, suspensão por inatividade ou mudanças de disponibilidade; confira as condições atuais do provedor.

## Licença e uso

A aplicação consulta a API oficial do Pixabay. Respeite os termos da API e a licença aplicável a cada conteúdo.

## Integração opcional com Meta Pages API

O servidor também oferece um endpoint de leitura de insights de uma Página do Facebook que você administra:

```text
GET /api/meta/page-insights
GET /api/meta/page-insights?metric=page_impressions_unique,page_engaged_users&period=day
```

Métricas iniciais suportadas:
- `page_impressions_unique`: número de pessoas únicas que viram conteúdo da Página.
- `page_engaged_users`: número de pessoas que interagiram com a Página.

### Configuração segura

Cadastre estas variáveis no painel de hospedagem (Render → serviço → Environment), nunca no GitHub:
- `META_PAGE_ID`: ID da Página do Facebook.
- `META_PAGE_ACCESS_TOKEN`: token de acesso da Página.
- `META_API_VERSION`: versão da Graph API (opcional; padrão `v27.0`).

Para obter o ID e o token, use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/). A documentação da Meta orienta consultar `me/accounts?fields=name,id,access_token,tasks` e conceder `pages_show_list`, `pages_read_engagement` e `read_insights`. A pessoa autenticada precisa ter a tarefa `ANALYZE` na Página.

**Importante:** o token é um segredo. Não o coloque em arquivos, commits, issues ou mensagens. A disponibilidade dos insights depende das permissões concedidas, do tipo de Página e das regras de acesso/revisão da Meta.


## Integração com Instagram (Meta Graph API)

A API oferece duas rotas adicionais:

- `GET /api/meta/instagram-account`: verifica se a Página configurada tem uma conta profissional do Instagram vinculada e retorna o ID e o nome de usuário.
- `GET /api/meta/instagram-insights`: consulta métricas da conta profissional vinculada.

Exemplo de consulta:

```text
/api/meta/instagram-insights?metric=reach,profile_views,accounts_engaged,total_interactions&period=day
```

A integração usa `META_PAGE_ID` e `META_PAGE_ACCESS_TOKEN` já configurados no ambiente privado do servidor. A Página precisa estar vinculada a uma conta profissional do Instagram (Business ou Creator), e o token precisa ter as permissões exigidas pela Meta, incluindo `instagram_basic`, `instagram_manage_insights` e `pages_read_engagement`, além do acesso/tarefa apropriados à Página.

Para testar primeiro a vinculação, abra `/api/meta/instagram-account` no domínio publicado. Se retornar que não há conta vinculada, conecte a conta profissional do Instagram à Página no Meta Business Suite. Se retornar erro de permissão, revise as permissões concedidas ao token no app da Meta.

**Segurança:** nunca coloque tokens reais em arquivos do GitHub, no navegador ou em mensagens. Cadastre-os somente nas variáveis privadas do serviço de hospedagem.


## Integração com Buffer API

O servidor pode consultar as organizações e os canais conectados ao Buffer e criar publicações na fila ou em um horário específico.

Configure no Render, em **Environment**:
- `BUFFER_API_KEY`: chave pessoal criada em Buffer → Settings → API.
- `BUFFER_PUBLISH_SECRET`: segredo próprio e longo para proteger a rota que cria publicações. Gere um valor aleatório e não o publique no GitHub.

Rotas:
- `GET /api/buffer/connection-check`: verifica a chave e lista organizações/canais conectados.
- `POST /api/buffer/posts`: cria uma publicação. Exige o cabeçalho `x-publish-secret` com o valor de `BUFFER_PUBLISH_SECRET` e um JSON com `channelId` e `text`. Opcionalmente aceita `mode` (`addToQueue` ou `customScheduled`), `schedulingType` (`automatic` ou `notification`) e `dueAt` (data ISO quando `mode` for `customScheduled`).

**Atenção:** o tipo de agendamento precisa ser compatível com o canal (por exemplo, perfis pessoais do Instagram exigem publicação por notificação). A API key e o segredo de publicação nunca devem ser enviados ao navegador nem incluídos em commits.
