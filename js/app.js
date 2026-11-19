(function () {
  const W = 1080;
  const HEIGHTS = { feed: 1350, status: 1920 };
  const PLACEHOLDER = "RSV0000";
  const STORE_KEY = "gerador-cupom-bf-v2";

  const $ = (s) => document.querySelector(s);
  const els = {
    code: $("#code"),
    hint: $("#code-hint"),
    nome: $("#nome"),
    loja: $("#loja"),
    thumbs: $("#thumbs"),
    preview: $("#preview"),
    share: $("#share"),
    download: $("#download"),
    copy: $("#copy"),
    toast: $("#toast"),
    previewBox: $("#preview-box"),
  };

  // ---------- estado ----------
  const defaults = {
    code: "",
    genero: "neutro",
    nome: "",
    loja: "",
    marca: "reserva",
    modelo: "etiqueta",
    formato: "feed",
    linkOn: true,
    linkPage: "",
  };
  const LINHA2 = { vendedora: "DE VENDEDORA:", vendedor: "DE VENDEDOR:", neutro: "EXCLUSIVO:" };
  let state = { ...defaults };
  try {
    state = { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {}
  if (!MARCAS.some((m) => m.id === state.marca)) state.marca = defaults.marca;
  const salvo = TEMPLATES.find((t) => t.id === state.modelo);
  if (!salvo || salvo.marca !== state.marca) state.modelo = TEMPLATES.find((t) => t.marca === state.marca).id;
  if (!LINHA2[state.genero]) state.genero = defaults.genero;
  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  };

  const cleanCode = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const isValid = (c) => /^[A-Z]{2,}\d{2,}$/.test(c) || /^[A-Z0-9]{5,}$/.test(c);

  function data() {
    const code = isValid(state.code) ? state.code : PLACEHOLDER;
    const m = code.match(/^([A-Z]+)(.*)$/);
    return {
      code,
      prefix: m ? m[1] : "",
      digits: m ? m[2] : code,
      linha1: "USE MEU CUPOM",
      linha2: LINHA2[state.genero] || LINHA2.neutro,
      rodape: [state.nome.trim(), state.loja.trim()].filter(Boolean).join("  ·  "),
    };
  }

  const INTRO = {
    reserva: "É Black Friday na Reserva! 🖤",
    mini: "É Black Friday na Reserva Mini! 🎈",
    go: "É Black Friday na Reserva Go! 👟",
  };

  function message() {
    const cupom = { vendedora: "meu cupom de vendedora", vendedor: "meu cupom de vendedor" }[state.genero] || "meu cupom";
    const t = TEMPLATES.find((x) => x.id === state.modelo) || TEMPLATES[0];
    const marca = MARCAS.find((m) => m.id === t.marca) || MARCAS[0];
    const pagina = paginaColada();
    const alvo = pagina || !t.produto ? " nas suas compras" : ` no ${t.produto}`;
    const link = linkFinal();
    const aviso = state.linkOn ? " O cupom já entra aplicado pelo link:" : "";
    return `${INTRO[marca.id]} Use ${cupom} *${state.code}*${alvo}.${aviso}\n${link}`;
  }

  // ---------- link do site com o cupom aplicado (?bl_pr=CUPOM) ----------
  const SITE_HOST = /(^|\.)usereserva\.com$/i;

  /** Página que o vendedor colou, se for do site da Reserva. */
  function paginaColada() {
    const v = state.linkPage.trim();
    if (!v) return null;
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : "https://" + v);
      return SITE_HOST.test(u.hostname) ? u : null;
    } catch {
      return null;
    }
  }

  function linkFinal() {
    const t = TEMPLATES.find((x) => x.id === state.modelo) || TEMPLATES[0];
    const marca = MARCAS.find((m) => m.id === t.marca) || MARCAS[0];
    const u = paginaColada() || new URL(t.link || marca.site);
    u.protocol = "https:";
    if (state.linkOn && isValid(state.code)) u.searchParams.set("bl_pr", state.code);
    else u.searchParams.delete("bl_pr");
    return u.toString();
  }

  function syncLink() {
    const out = $("#link-final");
    const hint = $("#link-hint");
    $("#link-body").hidden = !state.linkOn;
    out.textContent = linkFinal();
    if (state.linkPage.trim() && !paginaColada()) {
      hint.textContent = "Use um link do site usereserva.com. Por enquanto vai o link do modelo.";
      hint.dataset.tone = "warn";
    } else if (!state.linkPage.trim()) {
      hint.textContent = "Sem página colada, vai a página do produto do modelo (ou a home da marca).";
      hint.dataset.tone = "";
    } else {
      hint.textContent = "Link pronto, com o seu cupom.";
      hint.dataset.tone = "ok";
    }
  }

  // ---------- logo ----------
  const logoPath = window.LOGO_RESERVA ? new Path2D(LOGO_RESERVA.d) : null;
  function drawLogo(ctx, tpl, H) {
    if (!logoPath || !tpl.logo) return;
    const { x, y, h, cor, topo } = tpl.logo;
    const [, , vw, vh] = LOGO_RESERVA.viewBox;
    const s = h / vh;
    ctx.save();
    ctx.translate(x - (vw * s) / 2, y + (topo ? 0 : Math.round((H - 1350) / 2)));
    ctx.scale(s, s);
    ctx.fillStyle = cor;
    ctx.fill(logoPath);
    ctx.restore();
  }

  // ---------- imagens ----------
  const assets = {};
  function loadImage(src) {
    return new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }
  /** Hospedado (http/https): fotos direto de assets/. Aberto do disco (file://): carrega
   *  js/assets.js com as fotos embutidas, porque imagem de arquivo local "suja" o canvas. */
  function assetSources() {
    if (location.protocol !== "file:") return Promise.resolve(window.ASSET_FILES || {});
    if (window.ASSET_SRC) return Promise.resolve(window.ASSET_SRC);
    return new Promise((res) => {
      const s = document.createElement("script");
      s.src = "js/assets.js";
      s.onload = () => res(window.ASSET_SRC || {});
      s.onerror = () => res({});
      document.head.append(s);
    });
  }

  async function loadAssets() {
    const src = await assetSources();
    const keys = Object.keys(src);
    const imgs = await Promise.all(keys.map((k) => loadImage(src[k])));
    keys.forEach((k, i) => (assets[k] = imgs[i]));
    // cor do fundo de cada foto, para os modelos emendarem sem costura
    assets.bg = {};
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = c.getContext("2d", { willReadFrequently: true });
    for (const k of keys) {
      if (!assets[k]) continue;
      x.drawImage(assets[k], 20, 20, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
      assets.bg[k] = `rgb(${r},${g},${b})`;
    }
    assets.osakaBg = assets.bg.osakaProduto;
  }

  // ---------- render ----------
  const work = document.createElement("canvas");
  function renderTo(canvas, tpl, formato) {
    const H = HEIGHTS[formato];
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.save();
    tpl.draw(ctx, W, H, data(), assets);
    ctx.restore();
    drawLogo(ctx, tpl, H);
  }

  function buildTabs() {
    const box = $("#marcas");
    box.textContent = "";
    for (const m of MARCAS) {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.marca = m.id;
      b.textContent = m.curto || m.nome;
      b.setAttribute("aria-label", m.nome);
      const n = document.createElement("small");
      n.textContent = TEMPLATES.filter((t) => t.marca === m.id).length;
      b.append(n);
      b.addEventListener("click", () => {
        if (state.marca === m.id) return;
        state.marca = m.id;
        const atual = TEMPLATES.find((t) => t.id === state.modelo);
        if (!atual || atual.marca !== m.id) state.modelo = TEMPLATES.find((t) => t.marca === m.id).id;
        save();
        buildThumbs();
        render();
      });
      box.append(b);
    }
  }

  function buildThumbs() {
    for (const b of document.querySelectorAll("#marcas [role=tab]")) {
      b.setAttribute("aria-selected", b.dataset.marca === state.marca);
    }
    els.thumbs.textContent = "";
    {
      const list = TEMPLATES.filter((t) => t.marca === state.marca);
      const row = document.createElement("div");
      row.className = "thumbs-row";
      for (const t of list) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "thumb";
        b.dataset.id = t.id;
        b.setAttribute("aria-label", "Modelo " + t.nome);
        const c = document.createElement("canvas");
        const label = document.createElement("span");
        label.textContent = t.nome;
        b.append(c, label);
        b.addEventListener("click", () => {
          state.modelo = t.id;
          save();
          render();
          if (window.matchMedia("(max-width: 899px)").matches) {
            els.previewBox.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
        row.append(b);
      }
      els.thumbs.append(row);
    }
  }

  let currentBlob = null;
  let blobToken = 0;

  function render() {
    const tpl = TEMPLATES.find((t) => t.id === state.modelo) || TEMPLATES[0];
    renderTo(els.preview, tpl, state.formato);
    els.preview.style.aspectRatio = `${W} / ${HEIGHTS[state.formato]}`;

    // miniaturas
    for (const b of els.thumbs.querySelectorAll(".thumb")) {
      const t = TEMPLATES.find((x) => x.id === b.dataset.id);
      b.classList.toggle("is-active", t.id === tpl.id);
      b.setAttribute("aria-pressed", t.id === tpl.id);
      renderTo(work, t, state.formato);
      const c = b.querySelector("canvas");
      const tw = 240;
      c.width = tw;
      c.height = Math.round((tw * HEIGHTS[state.formato]) / W);
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(work, 0, 0, c.width, c.height);
    }

    syncLink();

    // estado dos botões e dica
    const ok = isValid(state.code);
    els.share.disabled = els.download.disabled = els.copy.disabled = !ok;
    if (!state.code) {
      els.hint.textContent = "Digite seu cupom para ele aparecer na imagem.";
      els.hint.dataset.tone = "";
    } else if (!ok) {
      els.hint.textContent = "Cupom curto demais. Ex.: RSV1481";
      els.hint.dataset.tone = "warn";
    } else if (!/^RSV\d+$/.test(state.code)) {
      els.hint.textContent = "Confira: o cupom de vendedor costuma ser RSV + números.";
      els.hint.dataset.tone = "warn";
    } else {
      els.hint.textContent = "Pronto! Agora escolha o modelo.";
      els.hint.dataset.tone = "ok";
    }

    // prepara o arquivo já agora: o Safari só deixa compartilhar dentro do clique
    currentBlob = null;
    const token = ++blobToken;
    if (ok) {
      els.preview.toBlob(
        (b) => {
          if (token === blobToken) currentBlob = b;
        },
        "image/jpeg",
        0.93
      );
    }
  }

  let t;
  const renderSoon = () => {
    clearTimeout(t);
    t = setTimeout(render, 120);
  };

  // ---------- ações ----------
  const fileName = () => `black-friday-${state.code}-${state.modelo}.jpg`;

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => els.toast.classList.remove("show"), 3800);
  }

  async function getBlob() {
    if (currentBlob) return currentBlob;
    return new Promise((res) => els.preview.toBlob(res, "image/jpeg", 0.93));
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  els.share.addEventListener("click", async () => {
    const blob = await getBlob();
    if (!blob) return toast("Não consegui gerar a imagem. Tente de novo.");
    const file = new File([blob], fileName(), { type: "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: message() });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    // computador / navegador sem compartilhamento de arquivo
    downloadBlob(blob);
    window.open("https://wa.me/?text=" + encodeURIComponent(message()), "_blank", "noopener");
    toast("Imagem baixada. No WhatsApp, anexe a imagem junto com a mensagem.");
  });

  els.download.addEventListener("click", async () => {
    const blob = await getBlob();
    if (!blob) return toast("Não consegui gerar a imagem. Tente de novo.");
    downloadBlob(blob);
    toast("Imagem salva.");
  });

  els.copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(message());
      toast("Mensagem copiada.");
    } catch {
      toast(message());
    }
  });

  // ---------- formulário ----------
  els.code.value = state.code;
  els.nome.value = state.nome;
  els.loja.value = state.loja;
  if (state.nome || state.loja) $("#mais").open = true;

  els.code.addEventListener("input", () => {
    const pos = els.code.selectionStart;
    const v = cleanCode(els.code.value);
    if (v !== els.code.value) {
      els.code.value = v;
      try {
        els.code.setSelectionRange(pos, pos);
      } catch {}
    }
    state.code = v;
    save();
    renderSoon();
  });
  els.code.addEventListener("focus", () => {
    if (!els.code.value) {
      els.code.value = "RSV";
      state.code = "RSV";
    }
  });
  for (const k of ["nome", "loja"]) {
    els[k].addEventListener("input", () => {
      state[k] = els[k].value.slice(0, 40);
      save();
      renderSoon();
    });
  }

  function bindSeg(name) {
    const btns = document.querySelectorAll(`[data-${name}]`);
    const sync = () => btns.forEach((b) => b.setAttribute("aria-checked", b.dataset[name] === state[name]));
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        state[name] = b.dataset[name];
        save();
        sync();
        render();
      })
    );
    sync();
  }
  bindSeg("genero");
  bindSeg("formato");

  // link com cupom
  const linkChk = $("#link-on");
  const linkPage = $("#link-page");
  linkChk.checked = state.linkOn;
  linkPage.value = state.linkPage;
  delete state.logo; // opção antiga: a logo agora sai sempre
  linkChk.addEventListener("change", () => {
    state.linkOn = linkChk.checked;
    save();
    syncLink();
  });
  linkPage.addEventListener("input", () => {
    state.linkPage = linkPage.value.slice(0, 500);
    save();
    syncLink();
  });
  $("#link-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(linkFinal());
      toast("Link copiado.");
    } catch {
      toast(linkFinal());
    }
  });

  // ---------- início ----------
  async function start() {
    // pássaro da Reserva no topo da página
    const top = document.getElementById("top-logo");
    if (top && window.LOGO_RESERVA) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", LOGO_RESERVA.d);
      top.append(p);
    }
    buildTabs();
    buildThumbs();
    const fonts = (window.TEMPLATE_FONTS || []).map((f) => document.fonts.load(f).catch(() => null));
    await Promise.race([Promise.all([...fonts, loadAssets()]), new Promise((r) => setTimeout(r, 6000))]);
    if (!assets.etiqueta) await loadAssets();
    document.body.classList.add("ready");
    render();
  }
  start();
})();
