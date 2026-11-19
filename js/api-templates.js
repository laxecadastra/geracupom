/* Modelos cadastrados no painel da Central STV (GET <STV_API_URL>/public/templates).
 *
 * Mesma regra de desenho da prévia do painel (central-stv/web/lib/render.ts) — se mudar lá,
 * mude aqui:
 * - a arte ocupa a largura toda (1080) e fica centralizada na vertical; sobra = background;
 * - x é a âncora conforme align; y é o centro vertical do texto; o texto encolhe até caber
 *   em maxWidth; a caixa tem tamanho fixo (maxWidth + 2·padX por size + 2·padY);
 * - status sem layout próprio usa o do feed, deslocado (1920 - 1350) / 2 para baixo.
 *
 * O gerador mostra só estes modelos. Se a API não responder, ele mostra o aviso com "tentar de novo".
 */
(function () {
  const FEED_H = 1350;
  const TIMEOUT_MS = 5000;

  const fontString = (s, size) => `${s.italic ? "italic " : ""}${s.weight} ${size}px "${s.font}"`;

  function textWidth(ctx, text, sp) {
    if (!sp) return ctx.measureText(text).width;
    let w = 0;
    for (const ch of text) w += ctx.measureText(ch).width + sp;
    return Math.max(0, w - sp);
  }

  function drawRun(ctx, text, x, y, sp) {
    if (!sp) return ctx.fillText(text, x, y);
    let cx = x;
    for (const ch of text) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + sp;
    }
  }

  function drawBox(ctx, l) {
    const { padX, padY } = l.box;
    const w = l.maxWidth + padX * 2;
    const h = l.size + padY * 2;
    const x = l.align === "center" ? l.x - l.maxWidth / 2 - padX : l.align === "right" ? l.x - l.maxWidth - padX : l.x - padX;
    const y = l.y - l.size / 2 - padY;
    ctx.save();
    ctx.fillStyle = l.box.color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(l.box.radius, h / 2, w / 2));
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.restore();
  }

  function drawText(ctx, l, parts) {
    const full = parts.map((p) => p.text).join("");
    if (!full) return;
    if (l.box && l.box.enabled) drawBox(ctx, l);
    const sp = l.letterSpacing || 0;
    let size = l.size;
    ctx.font = fontString(l, size);
    while (size > 8 && textWidth(ctx, full, sp) > l.maxWidth) {
      size -= 2;
      ctx.font = fontString(l, size);
    }
    const capH = ctx.measureText(full).actualBoundingBoxAscent || size * 0.72;
    const y = l.y + capH / 2;
    const total = textWidth(ctx, full, sp);
    let x = l.align === "center" ? l.x - total / 2 : l.align === "right" ? l.x - total : l.x;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    parts.forEach((p, i) => {
      if (!p.text) return;
      ctx.fillStyle = p.color;
      drawRun(ctx, p.text, x, y, sp);
      x += textWidth(ctx, p.text, sp) + (sp && i < parts.length - 1 ? sp : 0);
    });
  }

  let logoPath = null;
  function drawLogo(ctx, logo) {
    if (!window.LOGO_RESERVA) return;
    logoPath = logoPath || new Path2D(LOGO_RESERVA.d);
    const [, , vw, vh] = LOGO_RESERVA.viewBox;
    const s = logo.h / vh;
    ctx.save();
    ctx.translate(logo.x - (vw * s) / 2, logo.y);
    ctx.scale(s, s);
    ctx.fillStyle = logo.color;
    ctx.fill(logoPath);
    ctx.restore();
  }

  function loadImage(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const i = new Image();
      i.crossOrigin = "anonymous"; // sem isso o canvas "suja" e não exporta a imagem
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  /** Modelo no "tamanho da arte": largura 1080 e altura proporcional à arte do feed (até 1:4). */
  function alturaDaArte(img, W) {
    if (!img || !img.width) return FEED_H;
    return Math.min(W * 4, Math.max(200, Math.round((W * img.height) / img.width)));
  }

  function render(ctx, W, H, d, t, images) {
    const artSize = t.sizeMode === "art";
    const own = !artSize && H > FEED_H && t.status;
    const layout = own ? t.status : t.feed;
    const img = own ? images.status : images.feed;
    ctx.fillStyle = t.background || "#000";
    ctx.fillRect(0, 0, W, H);
    if (img) {
      const ih = img.height * (W / img.width);
      ctx.drawImage(img, 0, (H - ih) / 2, W, ih);
    }
    if (!own && !artSize) ctx.translate(0, Math.round((H - FEED_H) / 2));

    if (layout.subtitle.enabled) drawText(ctx, layout.subtitle, [{ text: d.linha2, color: layout.subtitle.color }]);
    drawText(ctx, layout.coupon, [
      { text: d.prefix, color: layout.coupon.color },
      { text: d.digits, color: layout.coupon.colorDigits },
    ]);
    if (layout.footer.enabled && d.rodape) drawText(ctx, layout.footer, [{ text: d.rodape, color: layout.footer.color }]);
    if (layout.logo.enabled) drawLogo(ctx, layout.logo);
  }

  function toTemplate(t, images) {
    return {
      id: "api-" + t.id,
      nome: t.name,
      marca: t.brand,
      produto: t.product || undefined,
      link: t.link || undefined,
      mensagem: t.message || undefined, // texto do WhatsApp com {codigo}, {link}…; vazio = padrão
      // tamanho da arte: a imagem sai do tamanho da arte e o vendedor não escolhe formato
      tamanhoDaArte: t.sizeMode === "art",
      altura(formato, W, HEIGHTS) {
        return t.sizeMode === "art" ? alturaDaArte(images.feed, W) : HEIGHTS[formato];
      },
      origem: "api",
      // camadas que o modelo usa: sem elas, o gerador esconde a opção correspondente
      campos: {
        linha2: [t.feed, t.status].some((l) => l && l.subtitle.enabled),
        rodape: [t.feed, t.status].some((l) => l && l.footer.enabled),
      },
      draw(ctx, W, H, d) {
        render(ctx, W, H, d, t, images);
      },
    };
  }

  /** Busca os modelos publicados e troca a lista do gerador por eles. Lança erro se a API falhar. */
  window.loadApiTemplates = async function () {
    const base = (window.STV_API_URL || "").replace(/\/+$/, "");
    if (!base) throw new Error("STV_API_URL não configurada (js/config.js)");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(base + "/public/templates", { signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const list = await res.json();
      const marcas = new Set((window.MARCAS || []).map((m) => m.id));
      const valid = list.filter((t) => marcas.has(t.brand) && t.feed && t.feed.imageUrl);

      const fonts = new Set();
      for (const t of valid) {
        for (const l of [t.feed, t.status].filter(Boolean)) {
          for (const s of [l.coupon, l.subtitle, l.footer]) fonts.add(fontString(s, 100));
        }
      }
      const [built] = await Promise.all([
        Promise.all(
          valid.map(async (t) => {
            const [feed, status] = await Promise.all([loadImage(t.feed.imageUrl), loadImage(t.status && t.status.imageUrl)]);
            return feed ? toTemplate(t, { feed, status }) : null;
          })
        ),
        Promise.all([...fonts].map((f) => document.fonts.load(f).catch(() => null))),
      ]);
      window.TEMPLATES = built.filter(Boolean);
      return window.TEMPLATES.length;
    } catch (e) {
      console.warn("Central STV indisponível.", e);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
})();
