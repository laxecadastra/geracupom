// Gera a lista de imagens dos modelos:
//   js/asset-files.js  caminhos em assets/ (usado quando a página está hospedada, http/https)
//   js/assets.js       as mesmas imagens como data URI (usado só ao abrir o index.html direto
//                      do disco, file://, onde o canvas ficaria "tainted" com imagens externas)
// Rode depois de trocar ou adicionar uma foto:
//   node scripts/embed-assets.mjs
import { readFileSync, writeFileSync } from "node:fs";

const files = {
  etiqueta: "assets/modelo-etiqueta.webp",
  // Reserva Go (calçados)
  osakaProduto: "assets/osaka-produto.jpg",
  osakaCampanha: "assets/osaka-campanha.jpg",
  neoBege: "assets/go-neo-bege.jpg",
  neoVerde: "assets/go-neo-verde.jpg",
  neoPreto: "assets/go-neo-preto.jpg",
  chineloAzul: "assets/chinelo-azul.jpg",
  chineloCoral: "assets/chinelo-coral.jpg",
  chineloLaranja: "assets/chinelo-laranja.jpg",
  // Reserva
  acaiCamisa: "assets/acai-camisa.jpg",
  // Reserva Mini
  miniRaiox: "assets/mini-raiox.jpg",
  miniAndyart: "assets/mini-andyart.jpg",
  miniIrmao: "assets/mini-irmao.jpg",
  miniAcai: "assets/mini-acai.jpg",
  miniListra: "assets/mini-listra.jpg",
  miniFc: "assets/mini-reservafc.jpg",
  bbFc: "assets/bb-reservafc.jpg",
  bbPrimeiroGol: "assets/bb-primeiro-gol.jpg",
  bbMelhorFilho: "assets/bb-melhor-filho.jpg",
  goMiniTyper: "assets/gomini-typer.jpg",
  goMiniAstral: "assets/gomini-astral.jpg",
  goMiniCanvas: "assets/gomini-canvas.jpg",
};
const mime = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const root = new URL("../", import.meta.url);

let out = "// Gerado por scripts/embed-assets.mjs — não editar à mão.\nwindow.ASSET_SRC = {\n";
for (const [key, path] of Object.entries(files)) {
  const buf = readFileSync(new URL(path, root));
  out += `  ${key}: "data:${mime[path.split(".").pop()]};base64,${buf.toString("base64")}",\n`;
}
out += "};\n";
writeFileSync(new URL("js/assets.js", root), out);
writeFileSync(
  new URL("js/asset-files.js", root),
  "// Gerado por scripts/embed-assets.mjs — não editar à mão.\nwindow.ASSET_FILES = " + JSON.stringify(files, null, 2) + ";\n"
);
console.log("js/assets.js e js/asset-files.js gerados");
