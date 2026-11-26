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
GET /api/meta/page-insights?metric=page_impressions_unique&page_engaged_users&period=day
```

Métricas iniciais suportadas:
- `page_impressions_unique`: alcance único da Página.
- `page_engaged_users`: pessoas que interagiram com a Página.

### Configuração segura

Cadastre estas variáveis no painel de hospedagem (Render → serviço → Environment), nunca no GitHub:
- `META_PAGE_ID`: ID da Página do Facebook.
- `META_PAGE_ACCESS_TOKEN`: token de acesso da Página.
- `META_API_VERSION`: versão da Graph API (opcional; padrão `v27.0`).

Para obter o ID e o token, use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/). A documentação da Meta orienta consultar `me/accounts?fields=name,id,access_token,tasks` e conceder `pages_show_list`, `pages_read_engagement` e `read_insights`. A pessoa autenticada precisa ter a tarefa `ANALYZE` na Página.

**Importante:** o token é um segredo. Não o coloque em arquivos, commits, issues ou mensagens. A disponibilidade dos insights depende das permissões concedidas, do tipo de Página e das regras de acesso/revisão da Meta.
