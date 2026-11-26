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