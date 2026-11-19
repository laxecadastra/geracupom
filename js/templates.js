/* Modelos de imagem. Cada modelo desenha num canvas de 1080 de largura.
 * Altura: 1350 (feed 4:5) ou 1920 (status 9:16). O conteúdo de cada modelo é
 * pensado para 1350 e fica centralizado na vertical quando a altura é maior.
 *
 * d = { code, prefix, digits, linha1, linha2, rodape }
 */
(function () {
  const BASE_H = 1350;
  const RED = "#ff1a1a";
  const RED_DEEP = "#e10600";

  // ---------- helpers ----------
  const font = (weight, size, family, italic) => `${italic ? "italic " : ""}${weight} ${size}px ${family}`;

  function fit(ctx, text, maxW, start, build) {
    let s = start;
    ctx.font = build(s);
    while (s > 8 && ctx.measureText(text).width > maxW) {
      s -= 2;
      ctx.font = build(s);
    }
    return s;
  }

  function spacedWidth(ctx, text, sp) {
    let w = 0;
    for (const ch of text) w += ctx.measureText(ch).width + sp;
    return w - sp;
  }

  function fitSpaced(ctx, text, maxW, start, sp, build) {
    let s = start;
    ctx.font = build(s);
    while (s > 8 && spacedWidth(ctx, text, sp) > maxW) {
      s -= 2;
      ctx.font = build(s);
    }
    return s;
  }

  function drawSpaced(ctx, text, x, y, sp, align = "center", stroke = false) {
    const w = spacedWidth(ctx, text, sp);
    let cx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const prev = ctx.textAlign;
    ctx.textAlign = "left";
    for (const ch of text) {
      stroke ? ctx.strokeText(ch, cx, y) : ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + sp;
    }
    ctx.textAlign = prev;
    return w;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Cupom em duas cores (letras / números), centralizado em cx, com baseline
   *  calculada para ficar centrado verticalmente em cy. */
  function twoTone(ctx, d, cx, cy, maxW, start, build, colorA, colorB, opts = {}) {
    const sp = opts.spacing || 0;
    const full = d.prefix + d.digits;
    const size = sp ? fitSpaced(ctx, full, maxW, start, sp, build) : fit(ctx, full, maxW, start, build);
    ctx.font = build(size);
    const m = ctx.measureText(full);
    const capH = m.actualBoundingBoxAscent || size * 0.72;
    const y = cy + capH / 2;
    const wA = d.prefix ? (sp ? spacedWidth(ctx, d.prefix, sp) + sp : ctx.measureText(d.prefix).width) : 0;
    const wB = d.digits ? (sp ? spacedWidth(ctx, d.digits, sp) : ctx.measureText(d.digits).width) : 0;
    let x = cx - (wA + wB) / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if (opts.before) opts.before(ctx);
    if (d.prefix) {
      ctx.fillStyle = colorA;
      sp ? drawSpaced(ctx, d.prefix, x, y, sp, "left") : ctx.fillText(d.prefix, x, y);
    }
    if (d.digits) {
      ctx.fillStyle = colorB;
      sp ? drawSpaced(ctx, d.digits, x + wA, y, sp, "left") : ctx.fillText(d.digits, x + wA, y);
    }
    return { size, y, capH };
  }

  function centered(ctx, H, fn) {
    ctx.save();
    ctx.translate(0, Math.round((H - BASE_H) / 2));
    fn();
    ctx.restore();
  }

  function shadowed(ctx, color, blur, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    fn();
    ctx.restore();
  }

  function neonPath(ctx, path, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    path();
    ctx.shadowBlur = 45;
    ctx.stroke();
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.lineWidth = Math.max(2, width * 0.35);
    ctx.strokeStyle = "#ffd9d9";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  function footer(ctx, d, x, y, color, align = "center", size = 34) {
    if (!d.rodape) return;
    ctx.font = font(700, size, "Montserrat");
    ctx.fillStyle = color;
    ctx.textAlign = align;
    fit(ctx, d.rodape, 860, size, (s) => font(700, s, "Montserrat"));
    ctx.fillText(d.rodape, x, y);
  }

  // ---------- modelos ----------

  /** 1. A arte original (tag 3D), com o cupom e a linha "de vendedor(a)" redesenhados. */
  const etiqueta = {
    id: "etiqueta",
    logo: { x: 540, y: 1262, h: 62, cor: "#EA0029" },
    nome: "Etiqueta 3D",
    marca: "reserva",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      const img = assets.etiqueta;
      if (!img) return;
      const s = W / img.width;
      const ih = img.height * s;
      const off = (H - ih) / 2;
      ctx.drawImage(img, 0, off, W, ih);
      if (off > 1) {
        // emenda suave com o preto acima/abaixo no formato status
        const fade = 140;
        let g = ctx.createLinearGradient(0, off, 0, off + fade);
        g.addColorStop(0, "#000");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, off - 1, W, fade);
        g = ctx.createLinearGradient(0, off + ih - fade, 0, off + ih);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, "#000");
        ctx.fillStyle = g;
        ctx.fillRect(0, off + ih - fade, W, fade + 1);
      }

      ctx.save();
      ctx.translate(0, off);
      ctx.scale(s, s); // daqui em diante: coordenadas da imagem original (1122 x 1402)

      // "USE MEU CUPOM / DE VENDEDORA:" — redesenha só quando o texto muda
      if (d.linha2 !== "DE VENDEDORA:") {
        ctx.fillStyle = "#000";
        ctx.fillRect(250, 648, 650, 152);
        const b = (sz) => font(900, sz, "Montserrat", true);
        const sz = fit(ctx, "USE MEU CUPOM", 610, 84, b);
        ctx.font = b(sz);
        ctx.textAlign = "left";
        const w1 = ctx.measureText("USE MEU ").width;
        const w2 = ctx.measureText("CUPOM").width;
        const x1 = 572 - (w1 + w2) / 2;
        ctx.fillStyle = "#fff";
        ctx.fillText("USE MEU ", x1, 728);
        ctx.fillStyle = RED;
        ctx.fillText("CUPOM", x1 + w1, 728);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = b(fit(ctx, d.linha2, 600, sz, b));
        ctx.fillText(d.linha2, 572, 792);
      }

      // interior da caixa do cupom
      ctx.save();
      ctx.fillStyle = "#040303";
      ctx.shadowColor = "#040303";
      ctx.shadowBlur = 14;
      rr(ctx, 100, 848, 948, 224, 34);
      ctx.fill();
      ctx.restore();

      twoTone(ctx, d, 572, 962, 860, 236, (sz) => font(900, sz, "Montserrat"), "#fff", RED);

      if (d.rodape) {
        ctx.font = font(800, 34, "Montserrat");
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.textAlign = "center";
        fit(ctx, d.rodape, 520, 34, (z) => font(800, z, "Montserrat"));
        ctx.fillText(d.rodape, 600, 1215);
      }
      ctx.restore();
    },
  };

  /** 2. Neon vermelho. */
  const neon = {
    id: "neon",
    logo: { x: 540, y: 78, h: 66, cor: "#EA0029" },
    nome: "Neon",
    marca: "reserva",
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);
      let g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W);
      g.addColorStop(0, "rgba(190,0,0,.38)");
      g.addColorStop(0.55, "rgba(90,0,0,.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // linhas de varredura bem sutis
      ctx.fillStyle = "rgba(255,255,255,.025)";
      for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);

      neonPath(ctx, () => rr(ctx, 48, 48, W - 96, H - 96, 40), RED, 6);

      centered(ctx, H, () => {
        ctx.textAlign = "center";
        ctx.font = font(800, 30, "Montserrat");
        ctx.fillStyle = "#ff6b6b";
        drawSpaced(ctx, "ESPECIAL PRA VOCÊ", W / 2, 190, 10);

        // BLACK (contorno) / FRIDAY (preenchido)
        const b = (sz) => font(400, sz, "Anton");
        const sz = fit(ctx, "FRIDAY", 860, 300, b);
        ctx.font = b(sz);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#fff";
        shadowed(ctx, RED, 30, () => ctx.strokeText("BLACK", W / 2, 500));
        ctx.fillStyle = RED;
        shadowed(ctx, RED, 50, () => ctx.fillText("FRIDAY", W / 2, 790));
        ctx.fillStyle = "#ff4040";
        ctx.fillText("FRIDAY", W / 2, 790);

        ctx.font = font(900, 54, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1, W / 2, 888);
        ctx.fillText(d.linha2, W / 2, 950);

        neonPath(ctx, () => rr(ctx, 110, 995, W - 220, 200, 28), RED, 5);
        twoTone(ctx, d, W / 2, 1095, 760, 170, (s) => font(400, s, "Archivo Black"), "#fff", "#ff3b3b", {
          before: (c) => {
            c.shadowColor = "rgba(255,40,40,.9)";
            c.shadowBlur = 24;
          },
        });
        ctx.shadowBlur = 0;
        footer(ctx, d, W / 2, 1260, "rgba(255,255,255,.85)");
      });
    },
  };

  /** 3. Ticket destacável em fundo vermelho. */
  function ticketPath(ctx, x, y, w, h, r, ny, nr) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, ny - nr);
    ctx.arc(x + w, ny, nr, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, ny + nr);
    ctx.arc(x, ny, nr, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  const ticket = {
    id: "ticket",
    logo: { x: 540, y: 36, h: 80, cor: "#ffffff" },
    nome: "Ticket",
    marca: "reserva",
    draw(ctx, W, H, d) {
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#f01212");
      g.addColorStop(1, "#a80000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // retícula de pontos que some em direção ao centro
      ctx.fillStyle = "rgba(0,0,0,.16)";
      const step = 36;
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          const dx = (x - W / 2) / (W / 2);
          const dy = (y - H / 2) / (H / 2);
          const r = Math.max(0, Math.hypot(dx, dy) - 0.45) * 13;
          if (r > 0.6) {
            ctx.beginPath();
            ctx.arc(x, y, Math.min(r, 15), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      centered(ctx, H, () => {
        ctx.textAlign = "center";
        const b = (sz) => font(400, sz, "Anton");
        ctx.font = b(fit(ctx, "BLACK FRIDAY", 940, 200, b));
        ctx.fillStyle = "#0a0a0a";
        ctx.fillText("BLACK FRIDAY", W / 2, 300);
        ctx.font = font(900, 46, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2.replace(/:$/, ""), W / 2, 395);

        // ticket inclinado
        ctx.save();
        ctx.translate(W / 2, 760);
        ctx.rotate((-3 * Math.PI) / 180);
        const tw = 880, th = 500, tx = -tw / 2, ty = -th / 2, ny = ty + 150;
        shadowed(ctx, "rgba(0,0,0,.45)", 40, () => {
          ctx.fillStyle = "#fff";
          ticketPath(ctx, tx, ty, tw, th, 28, ny, 34);
          ctx.fill();
        });
        // picote
        ctx.strokeStyle = "#cfcfcf";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 14]);
        ctx.beginPath();
        ctx.moveTo(tx + 50, ny);
        ctx.lineTo(tx + tw - 50, ny);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.font = font(800, 34, "Montserrat");
        ctx.fillStyle = "#111";
        drawSpaced(ctx, "SEU DESCONTO ESTÁ AQUI", 0, ty + 92, 6);

        twoTone(ctx, d, 0, ny + 150, 740, 190, (s) => font(400, s, "Archivo Black"), "#0a0a0a", RED_DEEP);
        ctx.font = font(700, 28, "Montserrat");
        ctx.fillStyle = "#777";
        ctx.textAlign = "center";
        drawSpaced(ctx, "DIGITE NO CAMPO DE CUPOM", 0, ty + th - 52, 5);
        ctx.restore();

        // selo %
        ctx.save();
        ctx.translate(150, 1010);
        ctx.rotate((-12 * Math.PI) / 180);
        shadowed(ctx, "rgba(0,0,0,.4)", 20, () => {
          ctx.fillStyle = "#0a0a0a";
          ctx.beginPath();
          ctx.arc(0, 0, 92, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = font(400, 112, "Anton");
        ctx.fillText("%", 0, 40);
        ctx.restore();

        footer(ctx, d, W / 2, 1150, "#fff");
      });
    },
  };

  /** 4. Fitas cruzadas "BLACK FRIDAY". */
  function tape(ctx, W, cy, deg, bg, fg) {
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate((deg * Math.PI) / 180);
    shadowed(ctx, "rgba(0,0,0,.55)", 30, () => {
      ctx.fillStyle = bg;
      ctx.fillRect(-W, -62, W * 2, 124);
    });
    ctx.fillStyle = fg;
    ctx.font = font(400, 74, "Anton");
    ctx.textAlign = "left";
    const unit = "BLACK FRIDAY  ✦  ";
    const uw = ctx.measureText(unit).width;
    for (let x = -W - (deg * 37) % uw; x < W; x += uw) ctx.fillText(unit, x, 27);
    ctx.restore();
  }

  const fita = {
    id: "fita",
    logo: { x: 540, y: 300, h: 80, cor: "#EA0029" },
    nome: "Fita",
    marca: "reserva",
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#0b0b0b";
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, W);
      g.addColorStop(0, "rgba(255,255,255,.06)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      tape(ctx, W, H * 0.12, 7, "#f2f2f2", "#0b0b0b");
      tape(ctx, W, H * 0.105, -6, RED_DEEP, "#fff");
      tape(ctx, W, H * 0.885, -7, "#f2f2f2", "#0b0b0b");
      tape(ctx, W, H * 0.9, 5, RED_DEEP, "#fff");

      centered(ctx, H, () => {
        ctx.textAlign = "center";
        ctx.font = font(900, 76, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1, W / 2, 470);
        ctx.fillStyle = "#ff3030";
        ctx.fillText(d.linha2, W / 2, 555);

        shadowed(ctx, "rgba(255,26,26,.55)", 50, () => {
          ctx.fillStyle = "#fff";
          rr(ctx, 90, 610, W - 180, 250, 26);
          ctx.fill();
        });
        twoTone(ctx, d, W / 2, 735, 800, 200, (s) => font(400, s, "Archivo Black"), "#0b0b0b", RED_DEEP);

        footer(ctx, d, W / 2, 950, "rgba(255,255,255,.85)");
      });
    },
  };

  /** 5. Editorial, minimalista. */
  const editorial = {
    id: "editorial",
    logo: { x: 540, y: 78, h: 70, cor: "#EA0029" },
    nome: "Editorial",
    marca: "reserva",
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, W, H);
      // "BF" gigante em contorno no fundo
      ctx.save();
      ctx.font = font(400, 1250, "Anton");
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,.07)";
      ctx.strokeText("BF", W / 2 + 40, H / 2 + 440);
      ctx.restore();

      centered(ctx, H, () => {
        const year = String(new Date().getFullYear());
        ctx.textAlign = "center";
        ctx.font = font(700, 28, "Montserrat");
        ctx.fillStyle = "rgba(255,255,255,.75)";
        drawSpaced(ctx, "BLACK FRIDAY  ·  " + year, W / 2, 200, 12);
        ctx.fillStyle = "rgba(255,255,255,.28)";
        ctx.fillRect(140, 238, W - 280, 2);

        const b = (sz) => font(400, sz, '"Bebas Neue"');
        ctx.font = b(340);
        ctx.fillStyle = "#fff";
        drawSpaced(ctx, "BLACK", W / 2, 560, 14);
        ctx.fillStyle = RED;
        drawSpaced(ctx, "FRIDAY", W / 2, 840, 14);

        ctx.fillStyle = "rgba(255,255,255,.28)";
        ctx.fillRect(140, 905, W - 280, 2);
        ctx.font = font(600, 30, "Montserrat");
        ctx.fillStyle = "rgba(255,255,255,.8)";
        drawSpaced(ctx, ("MEU CUPOM " + d.linha2.replace(/:$/, "")).toUpperCase(), W / 2, 975, 9);

        twoTone(ctx, d, W / 2, 1110, 860, 240, b, "#fff", RED, { spacing: 12 });
        footer(ctx, d, W / 2, 1275, "rgba(255,255,255,.6)", "center", 30);
      });
    },
  };

  /** 6. Vermelho com % gigante. */
  const porcentagem = {
    id: "porcentagem",
    logo: { x: 125, y: 82, h: 80, cor: "#ffffff" },
    nome: "Porcentagem",
    marca: "reserva",
    draw(ctx, W, H, d) {
      const g = ctx.createRadialGradient(W * 0.2, H * 0.15, 50, W * 0.4, H * 0.5, H);
      g.addColorStop(0, "#ff2b2b");
      g.addColorStop(1, "#8a0000");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.font = font(400, 1150, "Archivo Black");
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,.17)";
      ctx.fillText("%", W * 0.8, H * 0.5 + 420);
      ctx.restore();

      centered(ctx, H, () => {
        const L = 90;
        ctx.textAlign = "left";
        const b = (sz) => font(400, sz, "Archivo Black");
        ctx.font = b(fit(ctx, "FRIDAY", W - 2 * L, 230, b));
        ctx.fillStyle = "#fff";
        ctx.fillText("BLACK", L - 6, 430);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillText("FRIDAY", L - 6, 640);

        ctx.font = font(900, 62, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1, L, 760);
        ctx.fillText(d.linha2, L, 830);

        shadowed(ctx, "rgba(0,0,0,.45)", 40, () => {
          ctx.fillStyle = "#0a0a0a";
          rr(ctx, L, 880, W - 2 * L, 230, 115);
          ctx.fill();
        });
        twoTone(ctx, d, W / 2, 995, 740, 170, b, "#fff", "#ff3030");
        footer(ctx, d, L, 1200, "#fff", "left");

        // selo
        ctx.save();
        ctx.translate(890, 150);
        ctx.rotate((12 * Math.PI) / 180);
        shadowed(ctx, "rgba(0,0,0,.35)", 24, () => {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(0, 0, 100, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = "#0a0a0a";
        ctx.textAlign = "center";
        ctx.font = font(900, 30, "Montserrat");
        ctx.fillText("ESPECIAL", 0, -6);
        ctx.font = font(900, 26, "Montserrat");
        ctx.fillStyle = RED_DEEP;
        ctx.fillText("PRA VOCÊ", 0, 30);
        ctx.restore();
      });
    },
  };

  // ---------- lançamento: tênis R Osaka Clássico ----------

  /** Desenha a imagem cobrindo o retângulo, com ponto de foco (fx, fy em 0..1). */
  function cover(ctx, img, dx, dy, dw, dh, fx = 0.5, fy = 0.5) {
    const s = Math.max(dw / img.width, dh / img.height);
    const sw = dw / s, sh = dh / s;
    const sx = Math.min(Math.max(img.width * fx - sw / 2, 0), img.width - sw);
    const sy = Math.min(Math.max(img.height * fy - sh / 2, 0), img.height - sh);
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  function pill(ctx, x, y, text, bg, fg, size = 28, align = "left") {
    ctx.font = font(900, size, "Montserrat");
    const w = spacedWidth(ctx, text, 4) + size * 1.4;
    const h = size * 1.9;
    const px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.fillStyle = bg;
    rr(ctx, px, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = fg;
    drawSpaced(ctx, text, px + w / 2, y + h / 2 + size * 0.36, 4);
    return w;
  }

  /** 7. Foto de produto (par em 3/4) no bege da própria foto. */
  const osakaProduto = {
    id: "osaka-produto",
    logo: { x: 540, y: 74, h: 64, cor: "#EA0029" },
    nome: "R Osaka",
    marca: "go",
    link: "https://www.usereserva.com/tenis-rsv-r-osaka-classico-0104110-020-636969/p",
    produto: "Tênis R Osaka Clássico",
    draw(ctx, W, H, d, assets) {
      const bg = assets.osakaBg || "#ddd6cc";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const img = assets.osakaProduto;

      centered(ctx, H, () => {
        // foto: recorte da faixa do par (o fundo da foto é chapado, emenda sozinho)
        if (img) {
          const s = W / img.width;
          const sy = 500, sh = 640;
          ctx.drawImage(img, 0, sy, img.width, sh, 0, 400, W, sh * s);
        }

        pill(ctx, 70, 84, "LANÇAMENTO", RED_DEEP, "#fff", 26);
        ctx.font = font(800, 26, "Montserrat");
        ctx.fillStyle = "#1a1a1a";
        drawSpaced(ctx, "BLACK FRIDAY", W - 70, 124, 8, "right");

        ctx.textAlign = "left";
        ctx.fillStyle = "#121212";
        const b = (sz) => font(400, sz, "Anton");
        ctx.font = b(fit(ctx, "R OSAKA", W - 140, 250, b));
        ctx.fillText("R OSAKA", 64, 380);
        ctx.font = font(800, 34, "Montserrat");
        ctx.fillStyle = "#3a3a3a";
        drawSpaced(ctx, "CLÁSSICO", 70, 440, 22, "left");

        ctx.textAlign = "center";
        ctx.font = font(900, 42, "Montserrat", true);
        ctx.fillStyle = "#121212";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1075);
        ctx.fillStyle = "#0e0e0e";
        rr(ctx, 90, 1105, W - 180, 170, 22);
        ctx.fill();
        twoTone(ctx, d, W / 2, 1190, 760, 130, (s) => font(400, s, "Archivo Black"), "#fff", "#ff3030");
        footer(ctx, d, W / 2, 1320, "#3a3a3a", "center", 28);
      });
    },
  };

  /** 8. Foto da campanha à esquerda, lançamento + cupom à direita. */
  const osakaCampanha = {
    id: "osaka-campanha",
    logo: { x: 636, y: 120, h: 72, cor: "#EA0029" },
    nome: "R Osaka campanha",
    marca: "go",
    link: "https://www.usereserva.com/tenis-rsv-r-osaka-classico-0104110-020-636969/p",
    produto: "Tênis R Osaka Clássico",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, W, H);
      const PW = 560;
      if (assets.osakaCampanha) cover(ctx, assets.osakaCampanha, 0, 0, PW, H, 0.5, 0.5);
      const g = ctx.createLinearGradient(PW - 120, 0, PW, 0);
      g.addColorStop(0, "rgba(12,12,12,0)");
      g.addColorStop(1, "rgba(12,12,12,.85)");
      ctx.fillStyle = g;
      ctx.fillRect(PW - 120, 0, 120, H);

      const X = PW + 40, CW = W - X - 44, CX = X + CW / 2;
      centered(ctx, H, () => {
        ctx.translate(0, 110); // bloco de texto mais perto do meio
        pill(ctx, X, 120, "LANÇAMENTO", RED_DEEP, "#fff", 22);

        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        const b = (sz) => font(400, sz, "Anton");
        ctx.font = b(fit(ctx, "OSAKA", CW, 200, b));
        const big = parseInt(ctx.font.match(/(\d+)px/)[1], 10);
        ctx.font = b(big * 0.62);
        ctx.fillText("TÊNIS R", X - 2, 300);
        ctx.font = b(big);
        ctx.fillText("OSAKA", X - 4, 300 + big * 0.95);
        ctx.font = font(800, 28, "Montserrat");
        ctx.fillStyle = "rgba(255,255,255,.7)";
        drawSpaced(ctx, "CLÁSSICO", X, 300 + big * 0.95 + 56, 16, "left");

        const y0 = 300 + big * 0.95 + 120;
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.fillRect(X, y0, CW, 2);
        ctx.font = font(400, 64, "Anton");
        ctx.fillStyle = RED;
        ctx.fillText("BLACK FRIDAY", X - 2, y0 + 95);
        ctx.font = font(900, 34, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1, X, y0 + 160);
        ctx.fillText(d.linha2, X, y0 + 202);

        ctx.fillStyle = "#fff";
        rr(ctx, X, y0 + 240, CW, 150, 18);
        ctx.fill();
        twoTone(ctx, d, CX, y0 + 315, CW - 50, 110, (s) => font(400, s, "Archivo Black"), "#0b0b0b", RED_DEEP);

        if (d.rodape) {
          ctx.font = font(700, 26, "Montserrat");
          ctx.fillStyle = "rgba(255,255,255,.75)";
          ctx.textAlign = "left";
          fit(ctx, d.rodape, CW, 26, (s) => font(700, s, "Montserrat"));
          ctx.fillText(d.rodape, X, y0 + 450);
        }
      });
    },
  };

  // ---------- Reserva: campanha da home (desconto progressivo, outlet) e novidade ----------
  const CREAM = "#eadfce";
  const serif = (w, s, it) => font(w, s, "Fraunces", it); // a serifa da Reserva
  const PROGRESSIVO = [
    ["+20%", "2 peças"],
    ["+25%", "3 peças"],
    ["+30%", "4 ou + peças"],
  ];

  function creamPill(ctx, d, W, y, h, fill, colorA, colorB) {
    ctx.fillStyle = fill;
    rr(ctx, 140, y, W - 280, h, h / 2);
    ctx.fill();
    twoTone(ctx, d, W / 2, y + h / 2, W - 440, 112, (s) => font(400, s, "Archivo Black"), colorA, colorB);
  }

  /** 9. Desconto progressivo, no tom escuro/creme do banner da home. */
  const leveMais = {
    id: "leve-mais",
    logo: { x: 540, y: 34, h: 66, cor: "#EA0029" },
    nome: "Leve mais",
    marca: "reserva",
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#0e0d0c";
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(W * 0.8, H * 0.1, 0, W * 0.8, H * 0.1, W);
      g.addColorStop(0, "rgba(234,223,206,.10)");
      g.addColorStop(1, "rgba(234,223,206,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      centered(ctx, H, () => {
        ctx.textAlign = "center";
        ctx.font = font(700, 26, "Montserrat");
        ctx.fillStyle = "rgba(234,223,206,.75)";
        drawSpaced(ctx, "BLACK FRIDAY RESERVA", W / 2, 140, 12);
        ctx.fillStyle = CREAM;
        ctx.font = serif(300, 92, true);
        ctx.fillText("Quanto mais,", W / 2, 270);
        ctx.font = serif(400, fit(ctx, "mais desconto", 920, 132, (s) => serif(400, s)), false);
        ctx.fillText("mais desconto", W / 2, 385);

        PROGRESSIVO.forEach(([pct, qtd], i) => {
          const y = 440 + i * 160;
          ctx.fillStyle = "rgba(234,223,206,.22)";
          ctx.fillRect(110, y, W - 220, 2);
          const last = i === PROGRESSIVO.length - 1;
          ctx.textAlign = "left";
          ctx.font = serif(400, 116);
          ctx.fillStyle = last ? "#ff3b30" : CREAM;
          ctx.fillText(pct, 120, y + 120);
          const pw = ctx.measureText(pct).width;
          ctx.font = font(800, 30, "Montserrat");
          drawSpaced(ctx, "OFF", 140 + pw, y + 112, 8, "left");
          ctx.textAlign = "right";
          ctx.font = font(700, 40, "Montserrat");
          ctx.fillStyle = CREAM;
          ctx.fillText(qtd, W - 120, y + 108);
        });
        ctx.fillStyle = "rgba(234,223,206,.22)";
        ctx.fillRect(110, 920, W - 220, 2);

        ctx.textAlign = "center";
        ctx.font = font(900, 40, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1010);
        creamPill(ctx, d, W, 1040, 160, CREAM, "#0e0d0c", RED_DEEP);
        ctx.font = font(500, 24, "Montserrat");
        ctx.fillStyle = "rgba(234,223,206,.6)";
        ctx.textAlign = "center";
        ctx.fillText("*Confira as regras no site.", W / 2, 1250);
        footer(ctx, d, W / 2, 1300, "rgba(234,223,206,.85)", "center", 28);
      });
    },
  };

  /** 10. Outlet até 70%. */
  const outlet = {
    id: "outlet-70",
    logo: { x: 540, y: 70, h: 80, cor: "#EA0029" },
    nome: "Outlet 70%",
    marca: "reserva",
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#0e0d0c";
      ctx.fillRect(0, 0, W, H);
      centered(ctx, H, () => {
        ctx.textAlign = "center";
        ctx.font = font(600, 34, "Montserrat");
        ctx.fillStyle = CREAM;
        drawSpaced(ctx, "OUTLET ATÉ", W / 2, 220, 18);

        ctx.font = serif(300, 520);
        const w70 = ctx.measureText("70").width;
        ctx.font = serif(300, 260);
        const wp = ctx.measureText("%").width;
        const x0 = W / 2 - (w70 + wp) / 2;
        ctx.textAlign = "left";
        ctx.font = serif(300, 520);
        ctx.fillText("70", x0, 690);
        ctx.font = serif(300, 260);
        ctx.fillText("%", x0 + w70, 680);

        ctx.textAlign = "center";
        ctx.font = serif(300, 86);
        ctx.fillText("Black Friday Reserva", W / 2, 840);
        ctx.fillStyle = "rgba(234,223,206,.25)";
        ctx.fillRect(140, 910, W - 280, 2);
        ctx.font = font(900, 44, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 990);
        creamPill(ctx, d, W, 1020, 165, RED_DEEP, "#fff", "#111");
        ctx.font = font(500, 24, "Montserrat");
        ctx.fillStyle = "rgba(234,223,206,.6)";
        ctx.fillText("*Confira as regras no site.", W / 2, 1235);
        footer(ctx, d, W / 2, 1290, "rgba(234,223,206,.85)", "center", 28);
      });
    },
  };

  /** 11. Novidade: Camisa Mc Flame Est Açaí (foto com modelo). */
  const acai = {
    id: "acai",
    logo: { x: 1000, y: 48, h: 72, cor: "#EA0029", topo: true },
    nome: "Camisa Açaí",
    marca: "reserva",
    produto: "Camisa Est Açaí",
    link: "https://www.usereserva.com/camisa-mc-flame-est-acai-0104105-040-661472/p",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#c1b29f";
      ctx.fillRect(0, 0, W, H);
      if (assets.acaiCamisa) cover(ctx, assets.acaiCamisa, 0, 0, W, H, 0.5, 0.25);
      const g = ctx.createLinearGradient(0, H - 640, 0, H - 330);
      g.addColorStop(0, "rgba(14,12,10,0)");
      g.addColorStop(1, "rgba(14,12,10,.94)");
      ctx.fillStyle = g;
      ctx.fillRect(0, H - 640, W, 310);
      ctx.fillStyle = "rgba(14,12,10,.94)";
      ctx.fillRect(0, H - 331, W, 331);

      pill(ctx, 64, 60, "BLACK FRIDAY", "#111", "#fff", 24);
      const B = H; // conteúdo ancorado no rodapé
      pill(ctx, 64, B - 500, "NOVIDADE", RED_DEEP, "#fff", 24);
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      const b = (s) => font(400, s, "Anton");
      ctx.font = b(fit(ctx, "CAMISA EST AÇAÍ", W - 128, 130, b));
      ctx.fillText("CAMISA EST AÇAÍ", 62, B - 300);
      ctx.font = font(900, 36, "Montserrat", true);
      ctx.fillText(d.linha1 + " " + d.linha2, 64, B - 238);
      ctx.fillStyle = "#fff";
      rr(ctx, 64, B - 210, W - 128, 140, 20);
      ctx.fill();
      twoTone(ctx, d, W / 2, B - 140, W - 260, 110, (s) => font(400, s, "Archivo Black"), "#111", RED_DEEP);
      footer(ctx, d, 64, B - 28, "rgba(255,255,255,.8)", "left", 26);
    },
  };

  // ---------- Reserva Mini ----------
  const MINI = { y: "#ffd23f", b: "#2b59c3", r: "#ef3e36", g: "#21a366", ink: "#1d1d3a" };
  const baloo = (s) => font(800, s, '"Baloo 2"');

  function confetti(ctx, W, H, colors, seed = 7) {
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = rnd() * H, r = 8 + rnd() * 18;
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.85;
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (i % 3 === 1) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd() * Math.PI);
        ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.6);
        ctx.restore();
      } else {
        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.quadraticCurveTo(x - r / 2, y - r, x, y);
        ctx.quadraticCurveTo(x + r / 2, y + r, x + r, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function popTitle(ctx, text, x, y, size, color, shadow) {
    ctx.font = baloo(size);
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + size * 0.05, y + size * 0.05);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function miniCard(ctx, d, W, y, h, accent) {
    ctx.fillStyle = "#fff";
    rr(ctx, 140, y, W - 280, h, h / 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = MINI.ink;
    ctx.stroke();
    twoTone(ctx, d, W / 2, y + h / 2, W - 440, 112, (s) => font(400, s, "Archivo Black"), MINI.ink, accent);
  }

  /** 12. Mini: foto da criança num quadro, fundo amarelo. */
  const miniFoto = {
    id: "mini-foto",
    logo: { x: 90, y: 38, h: 72, cor: "#EA0029" },
    nome: "Pica-Pau",
    marca: "mini",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = MINI.y;
      ctx.fillRect(0, 0, W, H);
      confetti(ctx, W, H, [MINI.b, MINI.r, MINI.g, "#fff"], 11);
      centered(ctx, H, () => {
        pill(ctx, W / 2, 50, "RESERVA MINI", MINI.ink, "#fff", 26, "center");
        ctx.save();
        ctx.translate(W / 2, 545);
        ctx.rotate((-2.5 * Math.PI) / 180);
        shadowed(ctx, "rgba(0,0,0,.25)", 30, () => {
          ctx.fillStyle = "#fff";
          rr(ctx, -400, -400, 800, 790, 44);
          ctx.fill();
        });
        ctx.save();
        rr(ctx, -382, -382, 764, 754, 32);
        ctx.clip();
        if (assets.miniAndyart) cover(ctx, assets.miniAndyart, -382, -382, 764, 754, 0.5, 0.3);
        ctx.restore();
        ctx.restore();

        ctx.textAlign = "center";
        popTitle(ctx, "BLACK FRIDAY", W / 2, 1065, 132, MINI.ink, MINI.r);
        ctx.font = font(900, 36, "Montserrat", true);
        ctx.fillStyle = MINI.ink;
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1115);
        miniCard(ctx, d, W, 1140, 150, MINI.b);
        footer(ctx, d, W / 2, 1330, MINI.ink, "center", 26);
      });
    },
  };

  /** 13. Mini: três camisetas em polaroids, fundo azul. */
  const miniTrio = {
    id: "mini-trio",
    logo: { x: 90, y: 38, h: 72, cor: "#ffffff" },
    nome: "Turma",
    marca: "mini",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = MINI.b;
      ctx.fillRect(0, 0, W, H);
      confetti(ctx, W, H, [MINI.y, MINI.r, MINI.g, "rgba(255,255,255,.9)"], 23);
      centered(ctx, H, () => {
        pill(ctx, W / 2, 50, "RESERVA MINI", MINI.y, MINI.ink, 26, "center");
        ctx.textAlign = "center";
        popTitle(ctx, "BLACK FRIDAY", W / 2, 260, 130, "#fff", MINI.ink);
        ctx.font = font(800, 34, "Montserrat");
        ctx.fillStyle = MINI.y;
        drawSpaced(ctx, "CAMISETAS PRA TODA A TURMA", W / 2, 320, 4);

        const fotos = [
          [assets.miniRaiox, 205, 640, -7],
          [assets.miniIrmao, 875, 650, 6],
          [assets.miniAndyart, 540, 610, 2],
        ];
        for (const [img, cx, cy, deg] of fotos) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((deg * Math.PI) / 180);
          shadowed(ctx, "rgba(0,0,0,.35)", 26, () => {
            ctx.fillStyle = "#fff";
            ctx.fillRect(-165, -215, 330, 440);
          });
          if (img) cover(ctx, img, -148, -198, 296, 350, 0.5, 0.32);
          ctx.restore();
        }

        ctx.font = font(900, 40, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 965);
        miniCard(ctx, d, W, 995, 160, MINI.r);
        footer(ctx, d, W / 2, 1225, "#fff", "center", 28);
      });
    },
  };

  /** 14. Mini: desconto progressivo em blocos coloridos. */
  const miniLeveMais = {
    id: "mini-leve-mais",
    logo: { x: 90, y: 52, h: 72, cor: "#EA0029" },
    nome: "Leve mais",
    marca: "mini",
    draw(ctx, W, H, d) {
      ctx.fillStyle = MINI.y;
      ctx.fillRect(0, 0, W, H);
      confetti(ctx, W, H, [MINI.b, MINI.r, MINI.g, "#fff"], 5);
      centered(ctx, H, () => {
        ctx.translate(0, 40);
        pill(ctx, W / 2, 30, "RESERVA MINI", MINI.ink, "#fff", 26, "center");
        ctx.textAlign = "center";
        popTitle(ctx, "BLACK FRIDAY", W / 2, 235, 130, MINI.ink, MINI.r);
        ctx.font = font(800, 40, "Montserrat");
        ctx.fillStyle = MINI.ink;
        ctx.fillText("Quanto mais peças, mais desconto!", W / 2, 300);
        const cores = [MINI.b, MINI.g, MINI.r];
        PROGRESSIVO.forEach(([pct, qtd], i) => {
          const y = 340 + i * 170;
          shadowed(ctx, "rgba(0,0,0,.18)", 16, () => {
            ctx.fillStyle = cores[i];
            rr(ctx, 90, y, W - 180, 150, 36);
            ctx.fill();
          });
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.font = baloo(120);
          ctx.fillText(pct, 130, y + 118);
          const pw = ctx.measureText(pct).width;
          ctx.font = baloo(50);
          ctx.fillText("OFF", 145 + pw, y + 112);
          ctx.textAlign = "right";
          ctx.font = font(800, 44, "Montserrat");
          ctx.fillText(qtd, W - 130, y + 95);
        });
        ctx.textAlign = "center";
        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillStyle = MINI.ink;
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 900);
        miniCard(ctx, d, W, 925, 150, MINI.r);
        ctx.font = font(600, 24, "Montserrat");
        ctx.fillStyle = "rgba(29,29,58,.7)";
        ctx.fillText("*Confira as regras no site.", W / 2, 1120);
        footer(ctx, d, W / 2, 1170, MINI.ink, "center", 28);
      });
    },
  };

  /** Foto dentro de um quadro branco arredondado e girado. */
  function framed(ctx, img, cx, cy, w, h, deg, opts = {}) {
    const b = opts.border ?? 14, r = opts.radius ?? 28;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((deg * Math.PI) / 180);
    shadowed(ctx, "rgba(0,0,0,.3)", 30, () => {
      ctx.fillStyle = opts.frame || "#fff";
      rr(ctx, -w / 2, -h / 2, w, h, r);
      ctx.fill();
    });
    ctx.save();
    const lh = opts.label ? 64 : 0;
    rr(ctx, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b - lh, Math.max(4, r - b));
    ctx.clip();
    if (img) {
      if (opts.src) ctx.drawImage(img, ...opts.src, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b - lh);
      else cover(ctx, img, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b - lh, opts.fx ?? 0.5, opts.fy ?? 0.32);
    }
    ctx.restore();
    if (opts.label) {
      ctx.fillStyle = opts.labelColor || MINI.ink;
      ctx.textAlign = "center";
      ctx.font = font(400, 44, "Anton");
      ctx.fillText(opts.label, 0, h / 2 - b - 14);
    }
    ctx.restore();
  }

  /** 15. Mini: tal pai, tal filho — Camisa Est Açaí adulto + Mini. */
  const miniPaiFilho = {
    id: "mini-pai-filho",
    nome: "Tal pai, tal filho",
    marca: "mini",
    logo: { x: 90, y: 38, h: 72, cor: "#ffffff" },
    produto: "Camisa Mini Est Açaí",
    link: "https://www.usereserva.com/camisa-mini-mc-tp-flame-est-acai-0104579-040-660389/p",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#123b2c";
      ctx.fillRect(0, 0, W, H);
      // folhas estilizadas no fundo
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.07)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const x = (i * 173) % W, y = ((i * 311) % H) - 40;
        ctx.beginPath();
        ctx.ellipse(x, y, 40, 140, (i * 0.7) % Math.PI, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      centered(ctx, H, () => {
        pill(ctx, W / 2, 50, "RESERVA MINI", MINI.y, MINI.ink, 26, "center");
        ctx.textAlign = "center";
        popTitle(ctx, "TAL PAI, TAL FILHO", W / 2, 230, fit(ctx, "TAL PAI, TAL FILHO", 940, 120, baloo), "#fff", "#000");
        ctx.font = font(800, 30, "Montserrat");
        ctx.fillStyle = MINI.y;
        drawSpaced(ctx, "CAMISA EST AÇAÍ  ·  ADULTO E MINI", W / 2, 290, 6);

        framed(ctx, assets.acaiCamisa, 330, 660, 480, 640, -4, { fy: 0.28, label: "PAI", labelColor: "#123b2c" });
        framed(ctx, assets.miniAcai, 760, 720, 420, 560, 5, { fy: 0.3, label: "FILHO", labelColor: "#123b2c" });

        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1090);
        miniCard(ctx, d, W, 1115, 145, "#1f8a5b");
        footer(ctx, d, W / 2, 1315, "#fff", "center", 26);
      });
    },
  };

  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 40 * s, 0, Math.PI * 2);
    ctx.arc(x + 45 * s, y - 20 * s, 52 * s, 0, Math.PI * 2);
    ctx.arc(x + 100 * s, y, 42 * s, 0, Math.PI * 2);
    ctx.rect(x, y - 10 * s, 100 * s, 50 * s);
    ctx.fill();
  }

  function roundPhoto(ctx, img, cx, cy, r, ring, fy = 0.3) {
    shadowed(ctx, "rgba(0,0,0,.18)", 24, () => {
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (img) cover(ctx, img, cx - r, cy - r, 2 * r, 2 * r, 0.5, fy);
    ctx.restore();
  }

  /** 16. Mini: bebê, tons claros e nuvens. */
  const miniBebe = {
    id: "mini-bebe",
    nome: "Bebê",
    marca: "mini",
    logo: { x: 90, y: 38, h: 72, cor: "#EA0029" },
    link: "https://www.usereserva.com/colecao-mini-ofertas-bebe",
    draw(ctx, W, H, d, assets) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#d7ecf8");
      g.addColorStop(1, "#fbe9d7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      cloud(ctx, 60, H * 0.16, 1.2, "rgba(255,255,255,.9)");
      cloud(ctx, 760, H * 0.1, 1, "rgba(255,255,255,.85)");
      cloud(ctx, 820, H * 0.62, 1.3, "rgba(255,255,255,.7)");
      cloud(ctx, 40, H * 0.86, 1, "rgba(255,255,255,.8)");
      centered(ctx, H, () => {
        pill(ctx, W / 2, 50, "RESERVA MINI BEBÊ", MINI.b, "#fff", 24, "center");
        ctx.textAlign = "center";
        popTitle(ctx, "BLACK FRIDAY", W / 2, 230, 124, MINI.ink, "#f6b8c9");
        ctx.font = font(800, 34, "Montserrat");
        ctx.fillStyle = MINI.b;
        drawSpaced(ctx, "PARA OS PEQUENINOS", W / 2, 292, 6);

        roundPhoto(ctx, assets.bbPrimeiroGol, 330, 590, 230, "#fff", 0.32);
        roundPhoto(ctx, assets.bbMelhorFilho, 770, 700, 200, "#fff", 0.3);
        // coraçõezinhos
        ctx.fillStyle = "#f28aa8";
        for (const [x, y, s] of [[600, 420, 1], [130, 860, 0.8], [960, 470, 0.7]]) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(s, s);
          ctx.beginPath();
          ctx.moveTo(0, 12);
          ctx.bezierCurveTo(-30, -12, -12, -36, 0, -18);
          ctx.bezierCurveTo(12, -36, 30, -12, 0, 12);
          ctx.fill();
          ctx.restore();
        }

        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillStyle = MINI.ink;
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1010);
        miniCard(ctx, d, W, 1035, 150, MINI.b);
        footer(ctx, d, W / 2, 1250, MINI.ink, "center", 26);
      });
    },
  };

  /** 17. Mini: Reserva FC, do bebê ao mini, cartões de figurinha. */
  const miniFc = {
    id: "mini-fc",
    nome: "Reserva FC",
    marca: "mini",
    logo: { x: 90, y: 100, h: 72, cor: "#ffffff" },
    link: "https://www.usereserva.com/polo-mini-piquet-listra-reserva-fc-0104045-037-660427/p",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#16223f";
      ctx.fillRect(0, 0, W, H);
      // listras de camisa de time no topo e no pé
      const listras = ["#ffffff", "#2a9d6f", "#ffffff"];
      listras.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(0, 18 + i * 22, W, 12);
        ctx.fillRect(0, H - 54 - i * 22, W, 12);
      });
      centered(ctx, H, () => {
        pill(ctx, W / 2, 90, "RESERVA MINI", MINI.y, MINI.ink, 24, "center");
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        const b = (s) => font(400, s, "Anton");
        ctx.font = b(fit(ctx, "TIME RESERVA FC", 940, 160, b));
        ctx.fillText("TIME RESERVA FC", W / 2, 320);
        ctx.font = font(800, 30, "Montserrat");
        ctx.fillStyle = MINI.y;
        drawSpaced(ctx, "DO BEBÊ AO MINI, TODO MUNDO NO TIME", W / 2, 375, 4);

        framed(ctx, assets.miniFc, 310, 680, 420, 560, -4, { fy: 0.3, label: "MINI", frame: MINI.y });
        framed(ctx, assets.bbFc, 770, 700, 420, 560, 4, { fy: 0.35, label: "BEBÊ", frame: MINI.y });

        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1060);
        miniCard(ctx, d, W, 1085, 145, "#2a9d6f");
        footer(ctx, d, W / 2, 1275, "#fff", "center", 26);
      });
    },
  };

  /** 18. Mini: verão, sol, mar e foto em arco. */
  const miniVerao = {
    id: "mini-verao",
    nome: "Verão",
    marca: "mini",
    logo: { x: 90, y: 38, h: 72, cor: "#ffffff" },
    link: "https://www.usereserva.com/colecao-mini-verao",
    draw(ctx, W, H, d, assets) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#3fb6e8");
      g.addColorStop(1, "#a8e3f7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      centered(ctx, H, () => {
        // sol
        shadowed(ctx, "rgba(255,210,63,.8)", 60, () => {
          ctx.fillStyle = MINI.y;
          ctx.beginPath();
          ctx.arc(955, 100, 72, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.textAlign = "center";
        popTitle(ctx, "VERÃO MINI", W / 2, 240, 124, "#fff", "#f08a24");
        pill(ctx, W / 2, 270, "BLACK FRIDAY", MINI.ink, "#fff", 26, "center");

        // foto em arco
        const x = 250, y = 350, w = 580, h = 620;
        const arch = () => {
          ctx.beginPath();
          ctx.moveTo(x, y + w / 2);
          ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
        };
        shadowed(ctx, "rgba(0,40,80,.3)", 30, () => {
          ctx.fillStyle = "#fff";
          arch();
          ctx.fill();
        });
        ctx.save();
        arch();
        ctx.clip();
        if (assets.miniListra) cover(ctx, assets.miniListra, x + 14, y + 14, w - 28, h - 14, 0.5, 0.3);
        ctx.restore();
        ctx.lineWidth = 14;
        ctx.strokeStyle = "#fff";
        arch();
        ctx.stroke();

        // ondas
        const waves = [["#5cc8ef", 900], ["#2e9fd6", 945], ["#1b7fb8", 990]];
        for (const [c, wy] of waves) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(0, wy);
          for (let xx = 0; xx <= W; xx += 20) ctx.lineTo(xx, wy + Math.sin(xx / 60 + wy) * 14);
          ctx.lineTo(W, 2000);
          ctx.lineTo(0, 2000);
          ctx.closePath();
          ctx.fill();
        }

        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillStyle = "#fff";
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1075);
        miniCard(ctx, d, W, 1100, 145, "#f08a24");
        footer(ctx, d, W / 2, 1295, "#fff", "center", 26);
      });
    },
  };

  /** 19. Mini: tênis infantis da Go Mini, em cartões alternados. */
  const miniTenis = {
    id: "mini-tenis",
    nome: "Tênis",
    marca: "mini",
    logo: { x: 90, y: 38, h: 72, cor: "#EA0029" },
    link: "https://www.usereserva.com/colecao-go-mini-tenis-a-partir-de",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = "#fff6e3";
      ctx.fillRect(0, 0, W, H);
      confetti(ctx, W, H, [MINI.b, MINI.r, MINI.g, MINI.y], 31);
      centered(ctx, H, () => {
        pill(ctx, W / 2, 50, "RESERVA GO MINI", MINI.ink, "#fff", 24, "center");
        ctx.textAlign = "center";
        popTitle(ctx, "TÊNIS MINI", W / 2, 230, 130, MINI.ink, MINI.y);
        ctx.font = font(800, 30, "Montserrat");
        ctx.fillStyle = MINI.r;
        drawSpaced(ctx, "BLACK FRIDAY DOS PEZINHOS", W / 2, 288, 8);

        const cards = [
          [assets.goMiniTyper, 330, 455, -3, [100, 560, 880, 508], "TYPE R", MINI.b, 840, "left"],
          [assets.goMiniAstral, 750, 690, 3, [40, 470, 1000, 578], "ASTRAL", MINI.r, 240, "right"],
          [assets.goMiniCanvas, 330, 925, -2, [40, 880, 980, 566], "CANVAS", MINI.g, 840, "left"],
        ];
        for (const [img, cx, cy, deg, src, label, color, lx] of cards) {
          framed(ctx, img, cx, cy, 540, 320, deg, { src, radius: 30, border: 10 });
          ctx.save();
          ctx.translate(lx, cy + 20);
          ctx.rotate((deg * -2 * Math.PI) / 180);
          ctx.textAlign = "center";
          ctx.font = baloo(66);
          ctx.fillStyle = color;
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }

        ctx.textAlign = "center";
        ctx.font = font(900, 36, "Montserrat", true);
        ctx.fillStyle = MINI.ink;
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, 1140);
        miniCard(ctx, d, W, 1162, 140, MINI.r);
        footer(ctx, d, W / 2, 1335, MINI.ink, "center", 24);
      });
    },
  };

  /** Confete de festa: papeizinhos, bolinhas e serpentinas, mais denso nas bordas. */
  function partyConfetti(ctx, W, H, seed = 3, zone = null) {
    const inZone = (x, y) => zone && x > zone.x0 && x < zone.x1 && y > zone.y0 && y < zone.y1;
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const cores = [MINI.r, "#f08a24", MINI.y, MINI.g, MINI.b, "#e05bb5", "#33c3d6"];
    ctx.save();
    // serpentinas (nunca passam pela área do texto)
    let feitas = 0;
    for (let tent = 0; tent < 400 && feitas < 16; tent++) {
      const x0 = rnd() * W, y0 = rnd() * H, len = 140 + rnd() * 200, ang = rnd() * Math.PI * 2;
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.04) {
        const d = t * len, wv = Math.sin(t * Math.PI * 4) * 22;
        pts.push([x0 + Math.cos(ang) * d - Math.sin(ang) * wv, y0 + Math.sin(ang) * d + Math.cos(ang) * wv]);
      }
      if (pts.some(([x, y]) => inZone(x, y))) continue;
      ctx.strokeStyle = cores[feitas % cores.length];
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      feitas++;
    }
    // papeizinhos e bolinhas (menos no meio, onde fica o texto)
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (inZone(x, y)) continue; // área do texto fica limpa
      ctx.fillStyle = cores[i % cores.length];
      const k = rnd();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI);
      if (k < 0.55) ctx.fillRect(-7, -14, 14, 28);
      else if (k < 0.85) {
        ctx.beginPath();
        ctx.arc(0, 0, 7 + rnd() * 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(13, 10);
        ctx.lineTo(-13, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** 20. Mini: só texto, confete de festa no fundo e cupom em ticket. */
  const miniConfete = {
    id: "mini-confete",
    nome: "Confete",
    marca: "mini",
    logo: { x: 540, y: 236, h: 96, cor: "#EA0029" },
    draw(ctx, W, H, d) {
      ctx.fillStyle = "#fff6e3";
      ctx.fillRect(0, 0, W, H);
      const off = (H - BASE_H) / 2;
      partyConfetti(ctx, W, H, 19, { x0: 80, y0: off + 190, x1: W - 80, y1: off + 1110 });
      centered(ctx, H, () => {
        ctx.textAlign = "center";
        pill(ctx, W / 2, 360, "RESERVA MINI", MINI.ink, "#fff", 26, "center");
        popTitle(ctx, "BLACK FRIDAY", W / 2, 560, fit(ctx, "BLACK FRIDAY", 960, 150, baloo), MINI.ink, MINI.r);
        ctx.font = font(800, 36, "Montserrat");
        ctx.fillStyle = MINI.b;
        drawSpaced(ctx, "PRA TODA A CRIANÇADA", W / 2, 630, 6);

        // cupom em ticket
        const tx = 110, ty = 690, tw = W - 220, th = 310, ny = ty + 100;
        shadowed(ctx, "rgba(0,0,0,.25)", 24, () => {
          ctx.fillStyle = MINI.b;
          ticketPath(ctx, tx, ty, tw, th, 30, ny, 30);
          ctx.fill();
        });
        ctx.fillStyle = "#fff";
        ctx.font = font(900, 38, "Montserrat", true);
        ctx.fillText(d.linha1 + " " + d.linha2, W / 2, ty + 66);
        ctx.strokeStyle = "rgba(255,255,255,.6)";
        ctx.lineWidth = 4;
        ctx.setLineDash([16, 12]);
        ctx.beginPath();
        ctx.moveTo(tx + 50, ny);
        ctx.lineTo(tx + tw - 50, ny);
        ctx.stroke();
        ctx.setLineDash([]);
        twoTone(ctx, d, W / 2, ny + 105, tw - 160, 150, (s) => font(400, s, "Archivo Black"), "#fff", MINI.y);
        footer(ctx, d, W / 2, 1075, MINI.ink, "center", 28);
      });
    },
  };

  // ---------- Reserva Go (calçados) ----------
  function goHeader(ctx, W, d) {
    pill(ctx, 64, 60, "RESERVA GO", "#111", "#fff", 24);
    ctx.font = font(800, 24, "Montserrat");
    ctx.fillStyle = "#1a1a1a";
    drawSpaced(ctx, "BLACK FRIDAY", W - 64, 100, 8, "right");
  }

  function goCoupon(ctx, d, W, y) {
    ctx.textAlign = "center";
    ctx.font = font(900, 40, "Montserrat", true);
    ctx.fillStyle = "#111";
    ctx.fillText(d.linha1 + " " + d.linha2, W / 2, y);
    ctx.fillStyle = "#111";
    rr(ctx, 90, y + 25, W - 180, 140, 20);
    ctx.fill();
    twoTone(ctx, d, W / 2, y + 95, W - 340, 110, (s) => font(400, s, "Archivo Black"), "#fff", "#ff3030");
  }

  /** 15. Go: Tênis RSV Neo Vision nas três cores, em zigue-zague. */
  const neoTrio = {
    id: "go-neo",
    logo: { x: 540, y: 50, h: 64, cor: "#EA0029" },
    nome: "Neo Vision",
    marca: "go",
    produto: "Tênis RSV Neo Vision",
    link: "https://www.usereserva.com/tenis-rsv-neo-vision-0107341-545-658532/p",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = (assets.bg && assets.bg.neoBege) || "#dbd1c5";
      ctx.fillRect(0, 0, W, H);
      centered(ctx, H, () => {
        goHeader(ctx, W, d);
        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        const b = (s) => font(400, s, "Anton");
        ctx.font = b(fit(ctx, "NEO VISION", W - 128, 170, b));
        ctx.fillText("NEO VISION", 60, 285);
        ctx.font = font(800, 28, "Montserrat");
        ctx.fillStyle = "#444";
        drawSpaced(ctx, "TÊNIS RSV  ·  3 CORES", 64, 335, 10, "left");

        const rows = [
          [assets.neoBege, 40, 360, "BEGE", "left"],
          [assets.neoVerde, 560, 585, "VERDE", "right"],
          [assets.neoPreto, 40, 810, "PRETO", "left"],
        ];
        for (const [img, x, y, label, side] of rows) {
          if (img) ctx.drawImage(img, 60, 570, 960, 510, x, y, 480, 255);
          ctx.font = font(400, 64, '"Bebas Neue"');
          ctx.fillStyle = "#111";
          ctx.textAlign = side === "left" ? "left" : "right";
          const lx = side === "left" ? 580 : 500;
          drawSpaced(ctx, label, lx, y + 150, 6, side === "left" ? "left" : "right");
          ctx.fillStyle = "#111";
          ctx.fillRect(side === "left" ? lx : lx - 60, y + 172, 60, 4);
        }
        goCoupon(ctx, d, W, 1120);
        footer(ctx, d, W / 2, 1325, "#444", "center", 26);
      });
    },
  };

  /** 16. Go: Chinelo RSV Rio, três pares lado a lado. */
  const chineloTrio = {
    id: "go-chinelo",
    logo: { x: 540, y: 158, h: 64, cor: "#EA0029" },
    nome: "Chinelo RSV Rio",
    marca: "go",
    produto: "Chinelo RSV Rio",
    link: "https://www.usereserva.com/chinelo-rsv-rio-0102815-914-659801/p",
    draw(ctx, W, H, d, assets) {
      ctx.fillStyle = (assets.bg && assets.bg.chineloAzul) || "#dbd1c5";
      ctx.fillRect(0, 0, W, H);
      centered(ctx, H, () => {
        ctx.translate(0, 110);
        goHeader(ctx, W, d);
        ctx.textAlign = "left";
        ctx.fillStyle = "#111";
        const b = (s) => font(400, s, "Anton");
        ctx.font = b(fit(ctx, "CHINELO RSV RIO", W - 128, 170, b));
        ctx.fillText("CHINELO RSV RIO", 60, 275);
        ctx.font = font(800, 28, "Montserrat");
        ctx.fillStyle = "#444";
        drawSpaced(ctx, "ESCOLHA A SUA COR", 64, 325, 10, "left");

        const pares = [assets.chineloAzul, assets.chineloCoral, assets.chineloLaranja];
        pares.forEach((img, i) => {
          if (img) ctx.drawImage(img, 60, 640, 960, 1200, 25 + i * 345, 365, 340, 425);
        });
        goCoupon(ctx, d, W, 880);
        footer(ctx, d, W / 2, 1100, "#444", "center", 26);
      });
    },
  };

  window.TEMPLATES = [
    // Reserva
    etiqueta, leveMais, outlet, acai, neon, ticket, fita, editorial, porcentagem,
    // Reserva Mini
    miniFoto, miniTrio, miniLeveMais, miniPaiFilho, miniBebe, miniFc, miniVerao, miniTenis, miniConfete,
    // Reserva Go
    osakaProduto, osakaCampanha, neoTrio, chineloTrio,
  ];
  window.MARCAS = [
    { id: "reserva", nome: "Reserva", curto: "Reserva", site: "https://www.usereserva.com" },
    { id: "mini", nome: "Reserva Mini", curto: "Mini", site: "https://www.usereserva.com/mini" },
    { id: "go", nome: "Reserva Go", curto: "Go", site: "https://www.usereserva.com/calcados" },
  ];
  window.TEMPLATE_FONTS = [
    '900 100px Montserrat',
    'italic 900 100px Montserrat',
    '800 100px Montserrat',
    '700 100px Montserrat',
    '600 100px Montserrat',
    '500 100px Montserrat',
    '400 100px Anton',
    '400 100px "Archivo Black"',
    '400 100px "Bebas Neue"',
    '300 100px Fraunces',
    'italic 300 100px Fraunces',
    '400 100px Fraunces',
    '500 100px Fraunces',
    '800 100px "Baloo 2"',
  ];
})();
