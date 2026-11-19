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
    modelo: "",
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
  if (!LINHA2[state.genero]) state.genero = defaults.genero;
  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  };

  // Modelos: só os publicados na Central STV, que chegam em start() (a lista começa vazia).
  let status = "loading"; // loading | ok | error
  const currentTpl = () => TEMPLATES.find((t) => t.id === state.modelo) || null;
  const currentMarca = () => {
    const t = currentTpl();
    return MARCAS.find((m) => m.id === (t ? t.marca : state.marca)) || MARCAS[0];
  };
  const marcasComModelo = () => MARCAS.filter((m) => TEMPLATES.some((t) => t.marca === m.id));

  /** Mantém o modelo salvo se ele ainda existe; senão, o primeiro da marca (ou o primeiro de todos). */
  function escolherModelo() {
    const atual = currentTpl();
    if (atual) {
      state.marca = atual.marca;
      return;
    }
    const t = TEMPLATES.find((x) => x.marca === state.marca) || TEMPLATES[0];
    if (t) {
      state.modelo = t.id;
      state.marca = t.marca;
    }
  }

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

  // sem campanha fixa: a mensagem serve para qualquer ação do time de marketing
  const INTRO = {
    reserva: "Oi! Tenho um código especial pra você comprar na Reserva. 🖤",
    mini: "Oi! Tenho um código especial pra você comprar na Reserva Mini. 🎈",
    go: "Oi! Tenho um código especial pra você comprar na Reserva Go. 👟",
  };

  /**
   * Mensagem do WhatsApp. MESMA regra de central-stv/web/lib/message.ts (prévia do painel):
   * modelo com mensagem própria troca {codigo}, {link}, {nome}, {loja}, {produto} e {marca};
   * sem {link} no texto, o link vai numa linha no fim. Sem mensagem própria, usa a padrão abaixo.
   */
  function message() {
    const t = currentTpl();
    const texto = t && t.mensagem && t.mensagem.trim();
    if (!texto) return mensagemPadrao();
    const vars = {
      codigo: state.code,
      link: linkFinal(),
      nome: state.nome.trim(),
      loja: state.loja.trim(),
      produto: t.produto || "",
      marca: currentMarca().nome,
    };
    let out = texto.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
    if (!texto.includes("{link}")) out += "\n" + vars.link;
    return out.replace(/[ \t]{2,}/g, " ").trim();
  }

  function mensagemPadrao() {
    const cupom = { vendedora: "meu código de vendedora", vendedor: "meu código de vendedor" }[state.genero] || "meu código";
    const t = currentTpl();
    const marca = currentMarca();
    const pagina = paginaColada();
    const alvo = pagina || !t || !t.produto ? " nas suas compras" : ` no ${t.produto}`;
    const link = linkFinal();
    const aviso = state.linkOn ? " O código já entra aplicado pelo link:" : "";
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
    const t = currentTpl();
    const marca = currentMarca();
    const u = paginaColada() || new URL((t && t.link) || marca.site);
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
      hint.textContent = "Link pronto, com o seu código.";
      hint.dataset.tone = "ok";
    }
  }

  // ---------- render ----------
  const work = document.createElement("canvas");
  /** Altura do canvas: 1350/1920 pelos formatos, ou a da arte quando o modelo está no tamanho da arte. */
  const alturaDe = (tpl, formato) => (tpl && tpl.altura ? tpl.altura(formato, W, HEIGHTS) : HEIGHTS[formato]);

  function renderTo(canvas, tpl, formato) {
    const H = alturaDe(tpl, formato);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.save();
    tpl.draw(ctx, W, H, data());
    ctx.restore();
  }

  function buildTabs() {
    const box = $("#marcas");
    box.textContent = "";
    const marcas = marcasComModelo(); // marca sem modelo publicado não ganha aba
    box.hidden = marcas.length < 1;
    for (const m of marcas) {
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
    if (status !== "ok" || !TEMPLATES.length) {
      const box = document.createElement("div");
      box.className = "thumbs-msg";
      const p = document.createElement("p");
      p.textContent =
        status === "loading"
          ? "Carregando os modelos…"
          : status === "error"
            ? "Não consegui carregar os modelos agora. Confira a internet e tente de novo."
            : "Nenhum modelo publicado ainda. Assim que o time de marketing publicar, ele aparece aqui.";
      box.append(p);
      if (status !== "loading") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn-mini";
        b.textContent = "Tentar de novo";
        b.addEventListener("click", carregar);
        box.append(b);
      }
      els.thumbs.append(box);
    } else {
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
    const tpl = currentTpl();
    // só pergunta o que o modelo escreve: "de vendedor(a)" e nome/loja são camadas opcionais
    const campos = tpl ? tpl.campos || { linha2: true, rodape: true } : { linha2: false, rodape: false };
    $("#campo-genero").hidden = !campos.linha2;
    $("#mais").hidden = !campos.rodape;
    $("#campo-formato").hidden = !!(tpl && tpl.tamanhoDaArte);
    els.preview.style.aspectRatio = `${W} / ${alturaDe(tpl, state.formato)}`;
    if (tpl) {
      renderTo(els.preview, tpl, state.formato);
    } else {
      els.preview.width = W; // limpa a prévia enquanto não há modelo
      els.preview.height = HEIGHTS[state.formato];
    }

    // miniaturas
    for (const b of els.thumbs.querySelectorAll(".thumb")) {
      const t = TEMPLATES.find((x) => x.id === b.dataset.id);
      b.classList.toggle("is-active", t.id === tpl.id);
      b.setAttribute("aria-pressed", t.id === tpl.id);
      renderTo(work, t, state.formato);
      const c = b.querySelector("canvas");
      const tw = 240;
      c.width = tw;
      c.height = Math.round((tw * alturaDe(t, state.formato)) / W);
      const x = c.getContext("2d");
      x.imageSmoothingQuality = "high";
      x.drawImage(work, 0, 0, c.width, c.height);
    }

    syncLink();

    // estado dos botões e dica
    const ok = isValid(state.code) && !!tpl;
    els.share.disabled = els.download.disabled = els.copy.disabled = !ok;
    if (!state.code) {
      els.hint.textContent = "Digite seu código para ele aparecer na imagem.";
      els.hint.dataset.tone = "";
    } else if (!isValid(state.code)) {
      els.hint.textContent = "Código curto demais. Ex.: RSV1481";
      els.hint.dataset.tone = "warn";
    } else if (!tpl) {
      els.hint.textContent = status === "loading" ? "Carregando os modelos…" : "Sem modelo disponível agora.";
      els.hint.dataset.tone = status === "loading" ? "" : "warn";
    } else if (!/^RSV\d+$/.test(state.code)) {
      els.hint.textContent = "Confira: o código de vendedor costuma ser RSV + números.";
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
  const fileName = () => `reserva-${state.code}-${state.modelo}.jpg`;

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
    await carregar();
    document.body.classList.add("ready");
  }

  /** Busca os modelos na Central STV e remonta abas, miniaturas e prévia. */
  async function carregar() {
    status = "loading";
    buildTabs();
    buildThumbs();
    render();
    try {
      await window.loadApiTemplates();
      status = "ok";
    } catch {
      status = "error";
    }
    escolherModelo();
    save();
    buildTabs();
    buildThumbs();
    render();
  }
  start();
})();
