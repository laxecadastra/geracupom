# Gerador de imagem com o código do vendedor

Página estática para o vendedor Reserva digitar o cupom (`RSVxxxx`), escolher um modelo e
compartilhar a imagem no WhatsApp ou salvar no celular. Não tem backend nem build.

## Rodar local

```bash
node serve.mjs
```

Abra http://localhost:5173. Também funciona abrindo o `index.html` direto, mas o botão
de compartilhar do celular (Web Share) só aparece em **HTTPS** ou `localhost`.

## Publicar

Suba a pasta inteira em qualquer hospedagem estática com HTTPS (Azure Static Web Apps,
Vercel, Netlify, GitHub Pages…). Os arquivos necessários são `index.html`, `css/` e `js/`.
Antes de publicar, troque `STV_API_URL` em `js/config.js` pela URL pública da API da Central STV:
sem ela, a página não tem modelos.

## Como funciona

- **Modelos**: vêm todos da Central STV, o painel onde o time de marketing cadastra as artes.
  `js/api-templates.js` busca `GET <STV_API_URL>/public/templates` (URL em `js/config.js`) e a página
  mostra só esses modelos. Marca sem modelo publicado não ganha aba (marcas em `js/marcas.js`).
  Enquanto carrega, a área dos modelos avisa. Se a API não responder, aparece o aviso com
  **Tentar de novo**, e compartilhar/baixar ficam desligados. A regra de desenho é a mesma da prévia
  do painel (`central-stv/web/lib/render.ts`): mudou lá, mude aqui.
- O gerador só pergunta o que o modelo escreve: sem a camada "de vendedor(a)" no modelo, o seletor
  "Na imagem, escrever" some; sem o rodapé, some o "Colocar meu nome e loja" (`campos` em `js/api-templates.js`).
- Os antigos modelos desenhados em código (`js/templates.js`, com fotos em `assets/`,
  `js/asset-files.js` e `js/assets.js`) não são mais carregados pela página. Ficam no repositório só
  como referência para recriar as artes na Central.
- `js/app.js`: formulário, miniaturas, prévia, compartilhar/baixar. O cupom, nome e loja
  ficam salvos no próprio navegador do vendedor.
- Logo: o pássaro da Reserva (`js/logo.js`, extraído de `assets/logo-reserva.svg`) é desenhado como vetor quando o modelo da Central liga a camada de logo.
- Link com cupom: a mensagem leva a página do produto do modelo (ou a home da marca, ou uma página do usereserva.com que o vendedor colar) com `?bl_pr=<CUPOM>`, que aplica o cupom no site. Pode desligar.
- Compartilhar: no celular abre a folha de compartilhamento com a imagem (WhatsApp, salvar
  na galeria etc.). No computador baixa a imagem e abre o WhatsApp Web com a mensagem.

## Trocar ou adicionar imagens

1. Coloque o arquivo em `assets/` e registre no `files` de `scripts/embed-assets.mjs`.
2. Rode `node scripts/embed-assets.mjs` (gera `js/asset-files.js` e `js/assets.js`).
3. Use em um modelo via `assets.<chave>` dentro de `draw(ctx, W, H, d, assets)`.

Novo modelo = um objeto `{ id, nome, marca, produto?, link?, draw }` adicionado em
`window.TEMPLATES`. `marca` é `reserva`, `mini` ou `go` (lista em `window.MARCAS`).
`produto` e `link` entram na mensagem do WhatsApp; sem eles vai o site da marca.

## Prévia do link (WhatsApp) e ícones

- `index.html` tem título, descrição e tags Open Graph/Twitter. A imagem da prévia é
  `og-image.jpg` (1200×630) e **precisa de URL absoluta**: hoje aponta para
  `https://geracupom.vercel.app/`. Se o domínio for outro, troque nas tags `og:url`,
  `og:image`, `og:image:secure_url`, `twitter:image` e `canonical`.
- O WhatsApp guarda a prévia de cada link por um tempo. Para testar uma mudança, mande o
  link com um parâmetro novo (ex.: `?v=2`).
- Ícones: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`,
  `icon-512.png` e `site.webmanifest` (para "adicionar à tela inicial").
