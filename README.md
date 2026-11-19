# Gerador de cupom do vendedor (Black Friday)

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
Vercel, Netlify, GitHub Pages…). Os arquivos necessários são `index.html`, `css/` e `js/`
(as fotos carregam de `assets/` quando a página está hospedada; `js/assets.js` só é usado ao abrir o `index.html` direto do disco).

## Como funciona

- `js/templates.js`: os modelos, desenhados em `<canvas>` a 1080 px de largura
  (1350 de altura no feed 4:5, 1920 no status 9:16), separados por marca (abas na página):
  - **Reserva**: Etiqueta 3D (arte original, com cupom e texto redesenhados por cima),
    Leve mais (desconto progressivo +20/25/30%), Outlet 70%, Camisa Açaí (novidade),
    Neon, Ticket, Fita, Editorial, Porcentagem.
  - **Reserva Mini**: Pica-Pau (foto), Turma (3 camisetas), Leve mais, Tal pai tal filho
    (Camisa Est Açaí adulto + Mini), Bebê, Reserva FC (do bebê ao mini), Verão, Tênis
    (Go Mini), Confete (só texto).
  - **Reserva Go** (calçados): R Osaka Produto, R Osaka Campanha, Neo Vision 3 cores,
    Chinelo RSV Rio.
- Os percentuais da campanha (progressivo e outlet) estão fixos em `PROGRESSIVO` e no
  modelo `outlet` de `js/templates.js`. Atualize lá se a regra mudar.
- `js/app.js`: formulário, miniaturas, prévia, compartilhar/baixar. O cupom, nome e loja
  ficam salvos no próprio navegador do vendedor.
- Logo: o pássaro da Reserva (`js/logo.js`, extraído de `assets/logo-reserva.svg`) é desenhado como vetor; cada modelo define posição/cor em `logo: { x, y, h, cor }`. Sai sempre (sem opção de ocultar).
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
