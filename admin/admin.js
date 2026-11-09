/* ==========================================================
   PAINEL DA LUANA
   A primeira coisa é conferir a sessão. Sem sessão, vai para o login.
   Cada aba carrega sozinha: se faltar uma tabela ou um campo no banco,
   aparece um aviso no topo e o resto do painel continua funcionando.
   ========================================================== */
(async function conferirSessao() {
  if (!window.banco) {
    document.body.classList.remove("trancado");
    document.body.innerHTML = '<p style="padding:24px;font:14px Open Sans,sans-serif">Não consegui conectar ao banco agora. Confira a internet e recarregue a página.</p>';
    return;
  }
  const { data } = await window.banco.auth.getSession();
  if (!data || !data.session) { location.replace("../login/"); return; }
  document.body.classList.remove("trancado");
  iniciar(data.session);
})();

const db = window.banco;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// textos da biblioteca têm só <b> e <em>: deixa só essas marcações passarem
const htmlSeguro = (t) => esc(t).replace(/&lt;(\/?)(b|em|strong|i)&gt;/g, "<$1$2>");
const moeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const doisD = (n) => String(n).padStart(2, "0");
const isoDia = (d) => `${d.getFullYear()}-${doisD(d.getMonth() + 1)}-${doisD(d.getDate())}`;
const hojeISO = () => isoDia(new Date());
const paraData = (iso) => { const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number); return new Date(a, m - 1, d); };
const diasAte = (iso) => Math.round((paraData(iso) - paraData(hojeISO())) / 86400000);
const dataBR = (iso) => iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "";
const icone = (d) => `<svg class="ic" viewBox="0 0 24 24">${d}</svg>`;
const IC = {
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  apagar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/>',
  alca: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  estrela: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  whats: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z"/>'
};

const NICHOS_SITE = [
  ["acessorios", "Acessórios"], ["skincare", "Skincare"], ["haircare", "Haircare"], ["tech", "Tech & App"],
  ["moda", "Moda"], ["saude", "Saúde & bem-estar"], ["pet", "Pet"], ["collab", "Collab"]
];
const nomeNicho = (id) => (NICHOS_SITE.find((n) => n[0] === id) || [id, id])[1] || "";
const SITUACOES = [["lead", "Lead"], ["conversando", "Conversando"], ["cliente", "Cliente"], ["parada", "Parada"]];
const STATUS = ["Briefing", "Roteiro", "Aprovação Roteiro", "Gravação", "Edição", "Aprovado", "Entregue"];
const TIPOS_CAL = [["gravar", "Gravar"], ["editar", "Editar"], ["postar", "Postar"]];

const dados = { videos: [], marcas: [], calendario: [], campanhas: [], marcados: {}, visitas: [] };

/* ---------- avisos e consultas seguras ---------- */
const avisados = new Set();
function avisar(texto, erro) {
  if (avisados.has(texto)) return;
  avisados.add(texto);
  $("#avisos").insertAdjacentHTML("beforeend", `<div class="aviso${erro ? " erro" : ""}">${esc(texto)}</div>`);
}
// tabelas que faltam viram UM aviso só, com o passo a passo, em vez de um por tabela
const faltando = new Set();
const NOMES_TABELA = { videos: "vídeos", marcas: "marcas", calendario: "calendário", campanhas: "campanhas", marcados: "checklist", visitas: "visitas" };
function avisarFaltando(tabela) {
  faltando.add(tabela);
  let caixa = $("#aviso-faltando");
  if (!caixa) {
    $("#avisos").insertAdjacentHTML("afterbegin", '<div class="aviso erro" id="aviso-faltando"></div>');
    caixa = $("#aviso-faltando");
  }
  const lista = [...faltando].map((t) => NOMES_TABELA[t] || t).join(", ");
  const todas = faltando.size >= 4;
  caixa.innerHTML = (todas
    ? "<b>O seu banco ainda não foi criado.</b> "
    : `<b>Falta criar no banco: ${esc(lista)}.</b> `) +
    "No Supabase, abra <b>SQL Editor</b>, clique em <b>New query</b>, cole todo o arquivo <b>banco.sql</b> e clique em <b>Run</b>. Depois recarregue esta página. Até lá, o painel abre normalmente, só fica vazio.";
}
function tabelaFaltando(erro) {
  const cod = erro && (erro.code || "");
  const msg = (erro && erro.message) || "";
  return cod === "PGRST205" || cod === "42P01" || /does not exist|could not find the table/i.test(msg);
}
function explicarErro(tabela, erro) {
  const cod = erro && (erro.code || "");
  const msg = (erro && erro.message) || "";
  if (cod === "42703" || cod === "PGRST204" || /column/i.test(msg))
    return `Falta um campo na tabela "${tabela}". Rode o banco.sql de novo no Supabase para completar. O resto do painel continua funcionando.`;
  if (cod === "42501" || /permission|row-level security/i.test(msg))
    return `O banco não deixou mexer em "${tabela}". Rode o banco.sql de novo no Supabase (com o seu usuário já criado em Authentication) e recarregue a página.`;
  return `Não consegui falar com a tabela "${tabela}" agora (${msg || "erro desconhecido"}).`;
}
function tratarErro(tabela, erro) {
  if (tabelaFaltando(erro)) avisarFaltando(tabela);
  else avisar(explicarErro(tabela, erro), true);
}
async function ler(tabela, montar) {
  try {
    const { data, error } = await montar(db.from(tabela));
    if (error) { tratarErro(tabela, error); return null; }
    return data || [];
  } catch (e) { tratarErro(tabela, e); return null; }
}
async function gravar(tabela, acao) {
  try {
    const { error } = await acao(db.from(tabela));
    if (error) { tratarErro(tabela, error); torrada("Não deu para salvar"); return false; }
    return true;
  } catch (e) { tratarErro(tabela, e); torrada("Não deu para salvar"); return false; }
}
let tempoTorrada;
function torrada(texto) {
  const t = $("#torrada"); t.textContent = texto; t.classList.add("visivel");
  clearTimeout(tempoTorrada); tempoTorrada = setTimeout(() => t.classList.remove("visivel"), 2200);
}
// roda uma parte do painel sem deixar um erro derrubar as outras
function seguro(nome, fn) {
  try { fn(); } catch (e) { console.error(e); avisar(`Uma parte do painel (${nome}) teve um problema e foi pulada. O resto continua funcionando.`, true); }
}

/* ---------- início, menu e abas ---------- */
const TITULOS = { portfolio: "Portfólio", marcas: "Marcas", calendario: "Calendário", campanhas: "Campanhas", checklist: "Checklist do portfólio" };
function iniciar(sessao) {
  $("#menu-email").textContent = (sessao.user && sessao.user.email) || "";
  $$(".menu-item").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));
  $("#sair").addEventListener("click", async () => { await db.auth.signOut(); location.replace("../login/"); });
  $("#sanduiche").addEventListener("click", () => document.body.classList.toggle("menu-aberto"));
  $("#cortina").addEventListener("click", () => document.body.classList.remove("menu-aberto"));
  $("#janela-fundo").addEventListener("click", (e) => { if (e.target.id === "janela-fundo") fecharJanela(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharJanela(); });
  db.auth.onAuthStateChange((evento) => { if (evento === "SIGNED_OUT") location.replace("../login/"); });

  ligarPortfolio(); ligarMarcas(); ligarCalendario(); ligarCampanhas(); ligarChecklist();
  let aba = "portfolio";
  try { aba = localStorage.getItem("painelAba") || aba; } catch (_) {}
  abrirAba(TITULOS[aba] ? aba : "portfolio");
  carregarTudo();
}
function abrirAba(aba) {
  $$(".menu-item").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
  $$(".aba").forEach((s) => s.classList.toggle("ativa", s.id === "aba-" + aba));
  $("#titulo-aba").textContent = TITULOS[aba];
  document.body.classList.remove("menu-aberto");
  try { localStorage.setItem("painelAba", aba); } catch (_) {}
}
async function carregarTudo() {
  const desde = new Date(); desde.setHours(0, 0, 0, 0); desde.setDate(desde.getDate() - 13);
  const [videos, marcas, cal, camp, marc, vis] = await Promise.all([
    ler("videos", (t) => t.select("*").order("ordem", { ascending: true }).order("id", { ascending: true })),
    ler("marcas", (t) => t.select("*").order("criado_em", { ascending: false })),
    ler("calendario", (t) => t.select("*").order("data", { ascending: true })),
    ler("campanhas", (t) => t.select("*").order("criado_em", { ascending: false })),
    ler("marcados", (t) => t.select("chave, marcado")),
    ler("visitas", (t) => t.select("data, pagina, origem").gte("data", desde.toISOString()).limit(20000))
  ]);
  dados.videos = videos || []; dados.marcas = marcas || []; dados.calendario = cal || []; dados.campanhas = camp || [];
  dados.visitas = vis || [];
  dados.marcados = {}; (marc || []).forEach((m) => { if (m.marcado) dados.marcados[m.chave] = true; });
  seguro("Portfólio", desenharPortfolio);
  seguro("Marcas", desenharMarcas);
  seguro("Calendário", desenharCalendario);
  seguro("Campanhas", desenharCampanhas);
  seguro("Checklist", desenharChecklist);
}

/* ---------- janela de formulário ---------- */
function fecharJanela() { $("#janela-fundo").classList.remove("aberta"); $("#janela").classList.remove("larga"); }
function abrirJanela(html, larga) {
  const j = $("#janela"); j.innerHTML = html; j.classList.toggle("larga", !!larga);
  $("#janela-fundo").classList.add("aberta");
  const f = j.querySelector("input, select, textarea"); if (f) setTimeout(() => f.focus(), 30);
  const x = j.querySelector("[data-fechar]"); if (x) x.addEventListener("click", fecharJanela);
}
// campos: [{n: nome, r: rótulo, t: tipo, o: opções [[valor, texto]], inteiro, dica}]
function formulario(titulo, campos, valores, aoSalvar, aoApagar) {
  const v = valores || {};
  const html = campos.map((c) => {
    const val = v[c.n] ?? c.padrao ?? "";
    let entrada;
    if (c.t === "select") entrada = `<select name="${c.n}">${c.o.map(([ov, ot]) => `<option value="${esc(ov)}"${String(ov) === String(val) ? " selected" : ""}>${esc(ot)}</option>`).join("")}</select>`;
    else if (c.t === "textarea") entrada = `<textarea name="${c.n}">${esc(val)}</textarea>`;
    else if (c.t === "checkbox") return `<div class="marca-caixa${c.inteiro ? " inteiro" : ""}"><input type="checkbox" name="${c.n}" id="c-${c.n}"${val ? " checked" : ""}><label for="c-${c.n}" style="margin:0">${esc(c.r)}</label></div>`;
    else entrada = `<input name="${c.n}" type="${c.t || "text"}" value="${esc(val)}"${c.t === "number" ? ' step="any" min="0"' : ""}${c.lista ? ` list="${c.lista}"` : ""}>`;
    return `<div class="${c.inteiro ? "inteiro" : ""}"><label>${esc(c.r)}</label>${entrada}${c.dica ? `<div class="dica">${esc(c.dica)}</div>` : ""}</div>`;
  }).join("");
  abrirJanela(`<div class="janela-topo"><h2>${esc(titulo)}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
    <form id="form-janela" novalidate><div class="campos">${html}</div>
    <div class="janela-acoes">${aoApagar ? `<button type="button" class="botao perigo" id="apagar-janela">${icone(IC.apagar)}Apagar</button>` : ""}<span class="espaco"></span>
    <button type="button" class="botao" data-fechar2>Cancelar</button><button type="submit" class="botao principal">Salvar</button></div></form>`);
  $("[data-fechar2]").addEventListener("click", fecharJanela);
  $("#form-janela").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, saida = {};
    campos.forEach((c) => {
      const el = f.elements[c.n];
      if (c.t === "checkbox") saida[c.n] = el.checked;
      else if (c.t === "number") saida[c.n] = el.value === "" ? 0 : Number(String(el.value).replace(",", "."));
      else if (c.t === "date") saida[c.n] = el.value || null;
      else saida[c.n] = el.value.trim();
    });
    const botao = f.querySelector('[type="submit"]'); botao.disabled = true;
    const ok = await aoSalvar(saida);
    botao.disabled = false;
    if (ok !== false) fecharJanela();
  });
  if (aoApagar) $("#apagar-janela").addEventListener("click", async () => {
    if (!confirm("Apagar de vez? Isso não tem como desfazer.")) return;
    if (await aoApagar() !== false) fecharJanela();
  });
}
function baixarCSV(nome, cabecalho, linhas) {
  const celula = (v) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  // o ﻿ no começo faz o Excel abrir com acento certinho
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const exemploTag = (x) => x.exemplo ? '<span class="pilula p-exemplo">exemplo</span>' : "";

/* ==========================================================
   1. PORTFÓLIO
   ========================================================== */
function ligarPortfolio() {
  $("#novo-video").addEventListener("click", () => editarVideo(null));
}
function contar(lista, chave) {
  const c = {}; lista.forEach((x) => { const k = (x[chave] || "").trim(); if (k) c[k] = (c[k] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function desenharPortfolio() {
  const hoje = hojeISO();
  const visitas = dados.visitas;
  const deHoje = visitas.filter((v) => isoDia(new Date(v.data)) === hoje).length;
  const noAr = dados.videos.filter((v) => v.visivel && !v.exemplo);
  const nicho = contar(noAr, "nicho")[0];
  const origem = contar(visitas, "origem")[0];
  $("#portfolio-numeros").innerHTML = [
    ["Visitas em 14 dias", visitas.length],
    ["Visitas hoje", deHoje],
    ["Vídeos no ar", noAr.length],
    ["Nicho mais forte", nicho ? `${nomeNicho(nicho[0])}` : "Ainda sem vídeos", nicho ? `${nicho[1]} vídeo${nicho[1] > 1 ? "s" : ""}` : ""],
    ["De onde mais vêm", origem ? origem[0] : "Ainda sem visitas", origem ? `${origem[1]} visita${origem[1] > 1 ? "s" : ""}` : ""]
  ].map(([r, v, s]) => `<div class="numero"><small>${esc(r)}</small><strong title="${esc(v)}">${esc(v)}</strong>${s ? `<em>${esc(s)}</em>` : ""}</div>`).join("");

  // gráfico dos últimos 14 dias
  const dias = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.push(isoDia(d)); }
  const porDia = {}; visitas.forEach((v) => { const k = isoDia(new Date(v.data)); porDia[k] = (porDia[k] || 0) + 1; });
  const maior = Math.max(0, ...dias.map((d) => porDia[d] || 0));
  $("#grafico").innerHTML = maior === 0
    ? '<p class="vazio">Quando as pessoas começarem a visitar o seu portfólio, aqui aparece uma barra por dia com o número de visitas dos últimos 14 dias.</p>'
    : `<div class="grafico">${dias.map((d) => { const n = porDia[d] || 0; const [, m, dd] = d.split("-");
        return `<div class="barra${d === hoje ? " hoje" : ""}" title="${n} visita${n === 1 ? "" : "s"} em ${dataBR(d)}"><b>${n || ""}</b><i style="height:${Math.round((n / maior) * 100)}%"></i><span>${dd}/${m}</span></div>`; }).join("")}</div>`;

  const origens = contar(visitas, "origem");
  const total = visitas.length;
  $("#origens").innerHTML = total === 0
    ? '<p class="vazio">Aqui vai aparecer de onde as pessoas chegam no seu portfólio: Instagram, Google, WhatsApp, link direto e outros.</p>'
    : `<ul class="origens">${origens.map(([o, n]) => `<li><span>${esc(o)}</span><b>${n}</b><span class="trilho"><i style="width:${Math.round((n / total) * 100)}%"></i></span></li>`).join("")}</ul>`;

  desenharVideos();
}
function desenharVideos() {
  const caixa = $("#tabela-videos");
  if (!dados.videos.length) { caixa.innerHTML = '<p class="vazio">Nenhum vídeo ainda. Clique em "Adicionar vídeo" para colocar o primeiro.</p>'; return; }
  caixa.innerHTML = `<table><thead><tr><th style="width:34px"></th><th>Título</th><th>Nicho</th><th>Formato</th><th>Marca</th><th>Destaque</th><th style="width:110px"></th></tr></thead><tbody>
    ${dados.videos.map((v) => `<tr data-id="${v.id}" class="${v.visivel ? "" : "escondido"}">
      <td><span class="icone-botao alca" title="Arraste para mudar a ordem">${icone(IC.alca)}</span></td>
      <td class="curto">${v.link ? `<a href="${esc(v.link)}" target="_blank" rel="noopener">${esc(v.titulo || "Sem título")}</a>` : esc(v.titulo || "Sem título")}${exemploTag(v)}</td>
      <td>${esc(nomeNicho(v.nicho))}</td><td class="curto">${esc(v.formato)}</td><td>${esc(v.marca)}</td><td>${esc(v.destaque)}</td>
      <td style="white-space:nowrap">
        <button class="icone-botao${v.visivel ? " ligado" : ""}" data-acao="olho" title="${v.visivel ? "Aparece no site (clique para esconder)" : "Escondido do site (clique para mostrar)"}">${icone(v.visivel ? IC.olho : IC.olhoFechado)}</button>
        <button class="icone-botao" data-acao="editar" title="Editar">${icone(IC.editar)}</button>
        <button class="icone-botao" data-acao="apagar" title="Apagar">${icone(IC.apagar)}</button>
      </td></tr>`).join("")}</tbody></table>`;

  caixa.querySelectorAll("button[data-acao]").forEach((b) => b.addEventListener("click", async () => {
    const id = Number(b.closest("tr").dataset.id), v = dados.videos.find((x) => x.id === id);
    if (b.dataset.acao === "editar") editarVideo(v);
    if (b.dataset.acao === "apagar") {
      if (!confirm(`Apagar o vídeo "${v.titulo || "sem título"}"? Isso não tem como desfazer.`)) return;
      if (await gravar("videos", (t) => t.delete().eq("id", id))) { dados.videos = dados.videos.filter((x) => x.id !== id); desenharPortfolio(); torrada("Vídeo apagado"); }
    }
    if (b.dataset.acao === "olho") {
      if (await gravar("videos", (t) => t.update({ visivel: !v.visivel }).eq("id", id))) { v.visivel = !v.visivel; desenharPortfolio(); torrada(v.visivel ? "Agora aparece no site" : "Escondido do site"); }
    }
  }));
  ligarArrastar(caixa.querySelector("tbody"));
}
// arrastar pela alcinha para mudar a ordem
function ligarArrastar(tbody) {
  let arrastada = null;
  tbody.querySelectorAll(".alca").forEach((a) => {
    a.addEventListener("pointerdown", () => { a.closest("tr").draggable = true; });
  });
  tbody.addEventListener("dragstart", (e) => { arrastada = e.target.closest("tr"); arrastada.classList.add("arrastando"); e.dataTransfer.effectAllowed = "move"; });
  tbody.addEventListener("dragover", (e) => {
    e.preventDefault(); const alvo = e.target.closest("tr");
    tbody.querySelectorAll(".alvo").forEach((t) => t.classList.remove("alvo"));
    if (alvo && alvo !== arrastada) alvo.classList.add("alvo");
  });
  tbody.addEventListener("drop", async (e) => {
    e.preventDefault(); const alvo = e.target.closest("tr");
    if (!arrastada || !alvo || alvo === arrastada) return;
    const ids = dados.videos.map((v) => v.id);
    const de = ids.indexOf(Number(arrastada.dataset.id)), para = ids.indexOf(Number(alvo.dataset.id));
    const [movido] = dados.videos.splice(de, 1); dados.videos.splice(para, 0, movido);
    const mudou = dados.videos.map((v, i) => ({ v, i })).filter(({ v, i }) => v.ordem !== i);
    mudou.forEach(({ v, i }) => { v.ordem = i; });
    desenharVideos();
    const resultados = await Promise.all(mudou.map(({ v, i }) => gravar("videos", (t) => t.update({ ordem: i }).eq("id", v.id))));
    torrada(resultados.every(Boolean) ? "Ordem salva" : "Parte da ordem não foi salva");
  });
  tbody.addEventListener("dragend", () => {
    tbody.querySelectorAll("tr").forEach((t) => { t.classList.remove("arrastando", "alvo"); t.draggable = false; });
    arrastada = null;
  });
}
function editarVideo(v) {
  formulario(v ? "Editar vídeo" : "Novo vídeo", [
    { n: "titulo", r: "Título", inteiro: true },
    { n: "link", r: "Link do vídeo (YouTube)", inteiro: true, dica: "Ex: https://youtube.com/shorts/... O site usa esse link para mostrar o vídeo." },
    { n: "nicho", r: "Nicho", t: "select", o: [["", "Escolha"], ...NICHOS_SITE] },
    { n: "marca", r: "Marca" },
    { n: "formato", r: "Formato", dica: "Ex: Storytelling + Product Demo. Preenchido, o vídeo entra no carrossel de destaque." },
    { n: "destaque", r: "Destaque", dica: "Ex: 2,4M views. Aparece como número no card do carrossel." },
    { n: "visivel", r: "Aparece no site", t: "checkbox", padrao: true, inteiro: true }
  ], v || { visivel: true }, async (s) => {
    if (v) {
      if (!await gravar("videos", (t) => t.update(s).eq("id", v.id))) return false;
      Object.assign(v, s);
    } else {
      s.ordem = dados.videos.length;
      let novo = null;
      try { const r = await db.from("videos").insert(s).select().single(); if (r.error) throw r.error; novo = r.data; }
      catch (e) { tratarErro("videos", e); torrada("Não deu para salvar"); return false; }
      dados.videos.push(novo);
    }
    desenharPortfolio(); torrada("Vídeo salvo");
  }, v ? async () => {
    if (!await gravar("videos", (t) => t.delete().eq("id", v.id))) return false;
    dados.videos = dados.videos.filter((x) => x.id !== v.id); desenharPortfolio(); torrada("Vídeo apagado");
  } : null);
}

/* ==========================================================
   2. MARCAS
   ========================================================== */
function ligarMarcas() {
  $("#busca-marcas").addEventListener("input", desenharMarcas);
  $("#filtro-situacao").addEventListener("change", desenharMarcas);
  $("#nova-marca").addEventListener("click", () => editarMarca(null));
  $("#baixar-marcas").addEventListener("click", () => {
    baixarCSV("marcas.csv", ["Marca", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato", "Origem"],
      marcasFiltradas().map((m) => [m.nome, m.instagram, m.email, m.telefone, nomeSituacao(m.situacao), m.obs, dataBR(m.ultimo_contato), m.origem === "site" ? "Site" : "Painel"]));
  });
}
const nomeSituacao = (s) => (SITUACOES.find((x) => x[0] === s) || [s, s])[1];
function marcasFiltradas() {
  const q = $("#busca-marcas").value.trim().toLowerCase().replace(/^@/, "");
  const f = $("#filtro-situacao").value;
  return dados.marcas.filter((m) => (!f || m.situacao === f) &&
    (!q || [m.nome, m.instagram, m.email].some((x) => String(x || "").toLowerCase().replace(/^@/, "").includes(q))));
}
const soDigitos = (t) => String(t || "").replace(/\D/g, "");
function linkWhats(tel) {
  let d = soDigitos(tel); if (!d) return "";
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}
const linkInsta = (arroba) => `https://instagram.com/${String(arroba).trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")}`;
function desenharMarcas() {
  const lista = marcasFiltradas(), caixa = $("#tabela-marcas");
  if (!dados.marcas.length) { caixa.innerHTML = '<p class="vazio">Sua base está vazia. Clique em "Adicionar marca" ou espere chegar o primeiro contato pelo formulário do site.</p>'; return; }
  if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca encontrada com essa busca.</p>'; return; }
  caixa.innerHTML = `<table><thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead><tbody>
    ${lista.map((m) => `<tr class="clicavel" data-id="${m.id}">
      <td><strong>${esc(m.nome || "Sem nome")}</strong>${exemploTag(m)}${m.origem === "site" ? ' <span class="pilula" style="font-size:10.5px;padding:1px 7px">site</span>' : ""}</td>
      <td>${m.instagram ? `<a href="${esc(linkInsta(m.instagram))}" target="_blank" rel="noopener">${esc(m.instagram.startsWith("@") ? m.instagram : "@" + m.instagram)}</a>` : ""}</td>
      <td class="curto">${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}</td>
      <td style="white-space:nowrap">${esc(m.telefone)}${m.telefone && linkWhats(m.telefone) ? `<a class="whats" href="${esc(linkWhats(m.telefone))}" target="_blank" rel="noopener">${icone(IC.whats)}WhatsApp</a>` : ""}</td>
      <td><span class="pilula p-${esc(m.situacao)}">${esc(nomeSituacao(m.situacao))}</span></td>
      <td class="curto" title="${esc(m.obs)}">${esc(m.obs)}</td>
      <td style="white-space:nowrap">${esc(dataBR(m.ultimo_contato))}</td></tr>`).join("")}</tbody></table>`;
  caixa.querySelectorAll("tr.clicavel").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    editarMarca(dados.marcas.find((m) => m.id === Number(tr.dataset.id)));
  }));
}
function editarMarca(m) {
  formulario(m ? "Editar marca" : "Nova marca", [
    { n: "nome", r: "Marca", inteiro: true },
    { n: "instagram", r: "Instagram", dica: "Ex: @nomedamarca" },
    { n: "email", r: "E-mail", t: "email" },
    { n: "telefone", r: "Telefone / WhatsApp", dica: "Com DDD. Ex: 11 91234-5678" },
    { n: "situacao", r: "Situação", t: "select", o: SITUACOES },
    { n: "ultimo_contato", r: "Último contato", t: "date" },
    { n: "obs", r: "Observação", t: "textarea", inteiro: true }
  ], m || { situacao: "lead", ultimo_contato: hojeISO() }, async (s) => {
    if (m) { if (!await gravar("marcas", (t) => t.update(s).eq("id", m.id))) return false; Object.assign(m, s); }
    else {
      try { const r = await db.from("marcas").insert(s).select().single(); if (r.error) throw r.error; dados.marcas.unshift(r.data); }
      catch (e) { tratarErro("marcas", e); torrada("Não deu para salvar"); return false; }
    }
    desenharMarcas(); torrada("Marca salva");
  }, m ? async () => {
    if (!await gravar("marcas", (t) => t.delete().eq("id", m.id))) return false;
    dados.marcas = dados.marcas.filter((x) => x.id !== m.id); desenharMarcas(); torrada("Marca apagada");
  } : null);
}

/* ==========================================================
   3. CALENDÁRIO
   ========================================================== */
let mesVisto = new Date(); mesVisto.setDate(1);
let filtroTipo = "";
function ligarCalendario() {
  $("#mes-anterior").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() - 1); desenharCalendario(); });
  $("#mes-seguinte").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() + 1); desenharCalendario(); });
  $("#este-mes").addEventListener("click", () => { mesVisto = new Date(); mesVisto.setDate(1); desenharCalendario(); });
  $$("#filtro-tipo button").forEach((b) => b.addEventListener("click", () => {
    filtroTipo = b.dataset.tipo; $$("#filtro-tipo button").forEach((x) => x.classList.toggle("ativo", x === b)); desenharCalendario();
  }));
  $("#novo-item").addEventListener("click", () => editarItem(null, hojeISO()));
}
// junta os itens do calendário com os prazos das campanhas (que entram sozinhos)
function itensDoDia(iso) {
  const itens = dados.calendario.filter((c) => String(c.data).slice(0, 10) === iso && (!filtroTipo || c.tipo === filtroTipo))
    .map((c) => ({ tipo: c.tipo, texto: c.titulo + (c.marca ? ` · ${c.marca}` : ""), feito: c.status === "feito", ref: c, origem: "cal" }));
  if (!filtroTipo) dados.campanhas.filter((c) => c.prazo && String(c.prazo).slice(0, 10) === iso)
    .forEach((c) => itens.push({ tipo: "prazo", texto: `Prazo: ${c.campanha}`, feito: c.status === "Entregue", ref: c, origem: "camp" }));
  return itens;
}
function botaoItem(it) {
  return `<button class="item t-${it.tipo}${it.feito ? " feito" : ""}" data-origem="${it.origem}" data-id="${it.ref.id}" title="${esc(it.texto)}">${esc(it.texto)}</button>`;
}
function desenharCalendario() {
  const nomeMes = mesVisto.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("#mes-nome").textContent = nomeMes;
  const primeiro = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1);
  const inicio = new Date(primeiro); inicio.setDate(1 - ((primeiro.getDay() + 6) % 7)); // volta até a segunda-feira
  const ultimo = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0);
  const fim = new Date(ultimo); fim.setDate(ultimo.getDate() + (7 - ((ultimo.getDay() + 6) % 7) - 1)); // vai até o domingo
  const hoje = hojeISO();
  let html = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => `<div class="dia-semana">${d}</div>`).join("");
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const iso = isoDia(d), itens = itensDoDia(iso);
    const fora = d.getMonth() !== mesVisto.getMonth();
    html += `<div class="dia${fora ? " fora" : ""}${iso === hoje ? " hoje" : ""}" data-dia="${iso}">
      <span class="num-dia">${d.getDate()}</span><button class="mais-dia" data-novo="${iso}" title="Adicionar neste dia" aria-label="Adicionar em ${dataBR(iso)}">+</button>
      ${itens.slice(0, 3).map(botaoItem).join("")}
      ${itens.length > 3 ? `<button class="ver-mais" data-ver="${iso}">+${itens.length - 3} mais</button>` : ""}</div>`;
  }
  const grade = $("#grade"); grade.innerHTML = html;
  grade.onclick = (e) => {
    const item = e.target.closest(".item"), mais = e.target.closest("[data-ver]"), novo = e.target.closest("[data-novo]"), dia = e.target.closest(".dia");
    if (item) abrirItem(item.dataset.origem, Number(item.dataset.id));
    else if (mais) abrirDia(mais.dataset.ver);
    else if (novo) editarItem(null, novo.dataset.novo);
    else if (dia) editarItem(null, dia.dataset.dia);
  };

  const atrasados = dados.calendario.filter((c) => c.status !== "feito" && diasAte(c.data) < 0).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  $("#atrasados").innerHTML = atrasados.length
    ? `<ul class="atrasados">${atrasados.map((c) => { const n = -diasAte(c.data);
        return `<li><span class="pilula t-${esc(c.tipo)}">${esc((TIPOS_CAL.find((t) => t[0] === c.tipo) || [0, c.tipo])[1])}</span><strong>${esc(c.titulo)}</strong>${c.marca ? `<span style="color:var(--suave)">${esc(c.marca)}</span>` : ""}${exemploTag(c)}
        <span class="etiqueta e-atraso">há ${n} dia${n > 1 ? "s" : ""}</span><span class="espaco" style="flex:1"></span>
        <button class="botao" data-feito="${c.id}">Marcar como feito</button><button class="icone-botao" data-editar="${c.id}" title="Editar">${icone(IC.editar)}</button></li>`; }).join("")}</ul>`
    : '<p class="vazio">Nada ficou pra trás. Tudo em dia!</p>';
  $("#atrasados").onclick = async (e) => {
    const f = e.target.closest("[data-feito]"), ed = e.target.closest("[data-editar]");
    if (f) { const c = dados.calendario.find((x) => x.id === Number(f.dataset.feito));
      if (await gravar("calendario", (t) => t.update({ status: "feito" }).eq("id", c.id))) { c.status = "feito"; desenharCalendario(); torrada("Marcado como feito"); } }
    if (ed) abrirItem("cal", Number(ed.dataset.editar));
  };
}
function abrirItem(origem, id) {
  if (origem === "camp") { const c = dados.campanhas.find((x) => x.id === id); if (c) editarCampanha(c); return; }
  const c = dados.calendario.find((x) => x.id === id); if (c) editarItem(c);
}
function abrirDia(iso) {
  const itens = itensDoDia(iso);
  abrirJanela(`<div class="janela-topo"><h2>${esc(dataBR(iso))}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
    <ul class="lista-dia">${itens.map((it) => `<li>${botaoItem(it)}</li>`).join("")}</ul>
    <button class="botao principal" id="novo-no-dia">${icone('<path d="M12 5v14M5 12h14"/>')}Adicionar neste dia</button>`);
  $("#janela").querySelectorAll(".item").forEach((b) => b.addEventListener("click", () => abrirItem(b.dataset.origem, Number(b.dataset.id))));
  $("#novo-no-dia").addEventListener("click", () => editarItem(null, iso));
}
function editarItem(c, iso) {
  formulario(c ? "Editar no calendário" : "Novo no calendário", [
    { n: "titulo", r: "O que é", inteiro: true },
    { n: "marca", r: "Marca" },
    { n: "tipo", r: "Tipo", t: "select", o: TIPOS_CAL },
    { n: "data", r: "Data", t: "date" },
    { n: "status", r: "Status", t: "select", o: [["a fazer", "A fazer"], ["feito", "Feito"]] }
  ], c || { data: iso, tipo: filtroTipo || "gravar", status: "a fazer" }, async (s) => {
    if (!s.data) { alert("Escolha a data."); return false; }
    if (c) { if (!await gravar("calendario", (t) => t.update(s).eq("id", c.id))) return false; Object.assign(c, s); }
    else {
      try { const r = await db.from("calendario").insert(s).select().single(); if (r.error) throw r.error; dados.calendario.push(r.data); }
      catch (e) { tratarErro("calendario", e); torrada("Não deu para salvar"); return false; }
    }
    desenharCalendario(); torrada("Salvo no calendário");
  }, c ? async () => {
    if (!await gravar("calendario", (t) => t.delete().eq("id", c.id))) return false;
    dados.calendario = dados.calendario.filter((x) => x.id !== c.id); desenharCalendario(); torrada("Apagado");
  } : null);
}

/* ==========================================================
   4. CAMPANHAS
   ========================================================== */
let filtroCamp = "todas", ordem = { col: "prazo", dir: 1 };
const COLUNAS = [
  ["favorita", "", (c) => (c.favorita ? 0 : 1)],
  ["campanha", "Campanha", (c) => (c.campanha || "").toLowerCase()],
  ["cliente", "Cliente", (c) => (c.cliente || "").toLowerCase()],
  ["tipo", "Tipo", (c) => c.tipo || ""],
  ["status", "Status", (c) => STATUS.indexOf(c.status)], // segue a ordem do funil, não o alfabeto
  ["qtd", "Qtd", (c) => Number(c.qtd) || 0],
  ["valor", "Valor", (c) => Number(c.valor) || 0],
  ["prazo", "Prazo", (c) => (c.prazo ? String(c.prazo) : "9999-12-31")],
  ["pagamento", "Pagamento", (c) => (c.pagamento === "pago" ? 1 : 0)]
];
function ligarCampanhas() {
  $$("#filtro-campanhas button").forEach((b) => b.addEventListener("click", () => {
    filtroCamp = b.dataset.f; $$("#filtro-campanhas button").forEach((x) => x.classList.toggle("ativo", x === b)); desenharCampanhas();
  }));
  $("#busca-campanhas").addEventListener("input", desenharCampanhas);
  $("#nova-campanha").addEventListener("click", () => editarCampanha(null));
  $("#baixar-campanhas").addEventListener("click", () => {
    baixarCSV("campanhas.csv", ["Favorita", "Campanha", "Cliente", "Tipo", "Status", "Qtd", "Valor", "Prazo", "Pagamento", "Ativa"],
      campanhasFiltradas().map((c) => [c.favorita ? "sim" : "", c.campanha, c.cliente, c.tipo, c.status, c.qtd,
        (Number(c.valor) || 0).toFixed(2).replace(".", ","), dataBR(c.prazo), c.pagamento === "pago" ? "Pago" : "Pendente", c.ativa ? "sim" : "não"]));
  });
}
function campanhasFiltradas() {
  const q = $("#busca-campanhas").value.trim().toLowerCase();
  const lista = dados.campanhas.filter((c) => (filtroCamp === "todas" || (filtroCamp === "ativas" ? c.ativa : !c.ativa)) &&
    (!q || [c.campanha, c.cliente].some((x) => String(x || "").toLowerCase().includes(q))));
  const col = COLUNAS.find((c) => c[0] === ordem.col) || COLUNAS[7];
  return lista.sort((a, b) => { const x = col[2](a), y = col[2](b); return (x < y ? -1 : x > y ? 1 : 0) * ordem.dir; });
}
function avisoPrazo(c) {
  if (!c.prazo || c.status === "Entregue") return "";
  const n = diasAte(c.prazo);
  if (n < 0) return `<span class="etiqueta e-atraso">atrasado ${-n} dia${-n > 1 ? "s" : ""}</span>`;
  if (n <= 3) return `<span class="etiqueta e-perto">${n === 0 ? "vence hoje" : `vence em ${n} dia${n > 1 ? "s" : ""}`}</span>`;
  return "";
}
function desenharCampanhas() {
  const reais = dados.campanhas.filter((c) => !c.exemplo);
  const soma = (l, f) => l.reduce((s, c) => s + (Number(f(c)) || 0), 0);
  const total = soma(reais, (c) => c.valor), videos = soma(reais, (c) => c.qtd);
  const aReceber = soma(reais.filter((c) => c.pagamento !== "pago"), (c) => c.valor);
  const recebido = soma(reais.filter((c) => c.pagamento === "pago"), (c) => c.valor);
  $("#campanhas-numeros").innerHTML = [
    ["Campanhas", reais.length, ""],
    ["Ativas", reais.filter((c) => c.ativa).length, ""],
    ["Valor total", moeda(total), `ticket médio por vídeo: ${moeda(videos > 0 ? total / videos : 0)}`],
    ["A receber", moeda(aReceber), `já recebido: ${moeda(recebido)}`]
  ].map(([r, v, s]) => `<div class="numero"><small>${esc(r)}</small><strong>${esc(v)}</strong>${s ? `<em>${esc(s)}</em>` : ""}</div>`).join("");

  const lista = campanhasFiltradas(), caixa = $("#tabela-campanhas");
  if (!dados.campanhas.length) { caixa.innerHTML = '<p class="vazio">Nenhuma campanha ainda. Clique em "Adicionar campanha".</p>'; return; }
  const cab = COLUNAS.map(([k, r]) => {
    const ativa = ordem.col === k;
    return `<th class="ordena${ativa ? " ativa" : ""}${k === "qtd" || k === "valor" ? " num" : ""}" data-col="${k}">${r || icone(IC.estrela)}<span class="seta">${ativa ? (ordem.dir === 1 ? "▲" : "▼") : "↕"}</span></th>`;
  }).join("");
  caixa.innerHTML = `<table><thead><tr>${cab}</tr></thead><tbody>${lista.length ? lista.map((c) => {
    const si = Math.max(0, STATUS.indexOf(c.status));
    return `<tr class="clicavel${c.favorita ? " favorita" : ""}" data-id="${c.id}">
      <td><button class="icone-botao estrela-botao${c.favorita ? " ligado" : ""}" data-estrela title="${c.favorita ? "Tirar destaque" : "Destacar"}">${icone(IC.estrela)}</button></td>
      <td><strong>${esc(c.campanha || "Sem nome")}</strong>${exemploTag(c)}${c.ativa ? "" : ' <span class="pilula" style="font-size:10.5px;padding:1px 7px">finalizada</span>'}</td>
      <td>${esc(c.cliente)}</td>
      <td><span class="pilula p-${c.tipo === "Publicidade" ? "publicidade" : "conteudo"}">${esc(c.tipo)}</span></td>
      <td><span class="pilula p-s${si}">${esc(c.status)}</span></td>
      <td class="num">${Number(c.qtd) || 0}</td>
      <td class="num">${moeda(c.valor)}</td>
      <td style="white-space:nowrap">${esc(dataBR(c.prazo))}${avisoPrazo(c)}</td>
      <td><span class="pilula p-${c.pagamento === "pago" ? "pago" : "pendente"}">${c.pagamento === "pago" ? "Pago" : "Pendente"}</span></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="vazio">Nenhuma campanha com esse filtro.</td></tr>'}</tbody></table>`;

  caixa.querySelectorAll("th.ordena").forEach((th) => th.addEventListener("click", () => {
    const col = th.dataset.col;
    ordem = ordem.col === col ? { col, dir: -ordem.dir } : { col, dir: 1 };
    desenharCampanhas();
  }));
  caixa.querySelectorAll("tr.clicavel").forEach((tr) => tr.addEventListener("click", async (e) => {
    const c = dados.campanhas.find((x) => x.id === Number(tr.dataset.id));
    if (e.target.closest("[data-estrela]")) {
      if (await gravar("campanhas", (t) => t.update({ favorita: !c.favorita }).eq("id", c.id))) { c.favorita = !c.favorita; desenharCampanhas(); }
      return;
    }
    editarCampanha(c);
  }));
}
function editarCampanha(c) {
  formulario(c ? "Editar campanha" : "Nova campanha", [
    { n: "campanha", r: "Campanha", inteiro: true },
    { n: "cliente", r: "Cliente" },
    { n: "tipo", r: "Tipo", t: "select", o: [["Conteúdo", "Conteúdo"], ["Publicidade", "Publicidade"]] },
    { n: "status", r: "Status", t: "select", o: STATUS.map((s) => [s, s]) },
    { n: "prazo", r: "Prazo", t: "date" },
    { n: "qtd", r: "Quantidade de vídeos", t: "number" },
    { n: "valor", r: "Valor (R$)", t: "number" },
    { n: "pagamento", r: "Pagamento", t: "select", o: [["pendente", "Pendente"], ["pago", "Pago"]] },
    { n: "ativa", r: "Campanha ativa", t: "checkbox", padrao: true },
    { n: "favorita", r: "Destacar com estrela", t: "checkbox" }
  ], c || { tipo: "Conteúdo", status: "Briefing", qtd: 1, valor: 0, pagamento: "pendente", ativa: true }, async (s) => {
    if (c) { if (!await gravar("campanhas", (t) => t.update(s).eq("id", c.id))) return false; Object.assign(c, s); }
    else {
      try { const r = await db.from("campanhas").insert(s).select().single(); if (r.error) throw r.error; dados.campanhas.unshift(r.data); }
      catch (e) { tratarErro("campanhas", e); torrada("Não deu para salvar"); return false; }
    }
    desenharCampanhas(); desenharCalendario(); torrada("Campanha salva");
  }, c ? async () => {
    if (!await gravar("campanhas", (t) => t.delete().eq("id", c.id))) return false;
    dados.campanhas = dados.campanhas.filter((x) => x.id !== c.id); desenharCampanhas(); desenharCalendario(); torrada("Campanha apagada");
  } : null);
}

/* ==========================================================
   5. CHECKLIST (conteúdo exato do arquivo js/biblioteca.js)
   ========================================================== */
const B = window.Biblioteca || null;
function ligarChecklist() {
  $$("#sub-abas button").forEach((b) => b.addEventListener("click", () => {
    $$("#sub-abas button").forEach((x) => x.classList.toggle("ativo", x === b));
    $$(".sub").forEach((s) => s.classList.toggle("ativa", s.id === "sub-" + b.dataset.sub));
  }));
}
function desenharChecklist() {
  if (!B) { avisar("Não encontrei o arquivo js/biblioteca.js, então a aba Checklist ficou vazia. O resto do painel continua funcionando.", true); return; }
  seguro("Checklist do portfólio", desenharItensChecklist);
  seguro("Referências", desenharReferencias);
  seguro("Roteiros", desenharRoteiros);
  seguro("Ideias por nicho", desenharIdeias);
  seguro("Revisar roteiro", desenharRevisao);
}
function desenharItensChecklist() {
  const secoes = B.CHECKLIST || [];
  const chave = (s, i) => `checklist:${s.id}:${i}`;
  const totais = () => { let feitos = 0, todos = 0; secoes.forEach((s) => (s.itens || []).forEach((_, i) => { todos++; if (dados.marcados[chave(s, i)]) feitos++; })); return [feitos, todos]; };
  const caixa = $("#sub-checklist");
  const [f, t] = totais();
  caixa.innerHTML = `<div class="caixa"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>Pronto no geral</strong><span id="geral-conta">${f} de ${t} (${t ? Math.round((f / t) * 100) : 0}%)</span></div>
    <div class="progresso"><i id="geral-barra" style="width:${t ? (f / t) * 100 : 0}%"></i></div></div>
    ${secoes.map((s) => { const itens = s.itens || [], feitos = itens.filter((_, i) => dados.marcados[chave(s, i)]).length;
      return `<details class="bloco" data-secao="${esc(s.id)}"><summary><span class="emoji">${esc(s.emoji)}</span><strong>${esc(s.nome)}</strong>
        <span class="conta">${feitos} de ${itens.length}</span><small>${esc(s.resumo)}</small>
        <span class="progresso"><i style="width:${itens.length ? (feitos / itens.length) * 100 : 0}%"></i></span></summary>
        <div class="bloco-corpo"><div class="porque"><strong>Por que importa:</strong> ${htmlSeguro(s.porque)}</div>
        ${itens.map((it, i) => `<label class="item-check${dados.marcados[chave(s, i)] ? " marcado" : ""}"><input type="checkbox" data-chave="${esc(chave(s, i))}"${dados.marcados[chave(s, i)] ? " checked" : ""}><span>${htmlSeguro(it.t)}</span><small>${htmlSeguro(it.d)}</small></label>`).join("")}
        </div></details>`; }).join("")}`;
  caixa.querySelectorAll("input[data-chave]").forEach((inp) => inp.addEventListener("change", async () => {
    const k = inp.dataset.chave, marcado = inp.checked;
    inp.closest(".item-check").classList.toggle("marcado", marcado);
    if (marcado) dados.marcados[k] = true; else delete dados.marcados[k];
    atualizarProgresso();
    const ok = await gravar("marcados", (t) => t.upsert({ chave: k, marcado, atualizado_em: new Date().toISOString() }));
    if (!ok) { inp.checked = !marcado; if (!marcado) dados.marcados[k] = true; else delete dados.marcados[k]; inp.closest(".item-check").classList.toggle("marcado", !marcado); atualizarProgresso(); }
  }));
  function atualizarProgresso() {
    const [f2, t2] = totais();
    $("#geral-conta").textContent = `${f2} de ${t2} (${t2 ? Math.round((f2 / t2) * 100) : 0}%)`;
    $("#geral-barra").style.width = `${t2 ? (f2 / t2) * 100 : 0}%`;
    caixa.querySelectorAll("details.bloco").forEach((d) => {
      const s = secoes.find((x) => x.id === d.dataset.secao), itens = s.itens || [];
      const feitos = itens.filter((_, i) => dados.marcados[chave(s, i)]).length;
      d.querySelector(".conta").textContent = `${feitos} de ${itens.length}`;
      d.querySelector("summary .progresso i").style.width = `${itens.length ? (feitos / itens.length) * 100 : 0}%`;
    });
  }
}
function blocosTempo(lista) {
  return `<div class="blocos-tempo">${(lista || []).map((b) => `<div class="bloco-tempo"><b class="tempo">${esc(b.t)}</b><div>${htmlSeguro(b.o)}</div></div>`).join("")}</div>`;
}
function desenharReferencias() {
  const refs = B.REFERENCIAS || [], caixa = $("#sub-referencias");
  caixa.innerHTML = `<div class="cartoes">${refs.map((r, i) => `<button class="ref" data-i="${i}"><span class="ref-capa c-${esc(r.cor)}">${esc(r.emoji)}</span>
    <span class="ref-info"><strong>${esc(r.titulo)}</strong><small>${esc(r.estilo)} · ${esc(r.duracao)} · ${esc(r.marca)}</small></span></button>`).join("")}</div>`;
  caixa.querySelectorAll(".ref").forEach((b) => b.addEventListener("click", () => {
    const r = refs[Number(b.dataset.i)];
    abrirJanela(`<div class="janela-topo"><h2>${esc(r.emoji)} ${esc(r.titulo)}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
      <div class="ficha"><p style="color:var(--suave)">${esc(r.estilo)} · ${esc(r.audiencia)} · ${esc(r.duracao)} · ${esc(r.marca)}</p>
      <h3>Gancho</h3><p>${htmlSeguro(r.gancho)}</p>
      <h3>Por que funciona</h3><p>${htmlSeguro(r.porque)}</p>
      <h3>O diferencial</h3><p>${htmlSeguro(r.diferencial)}</p>
      <h3>O erro comum</h3><p>${htmlSeguro(r.erro)}</p>
      <h3>Roteiro em blocos</h3>${blocosTempo(r.roteiro)}
      ${r.youtube ? `<div class="janela-acoes"><span class="espaco"></span><a class="botao principal" href="${esc(r.youtube)}" target="_blank" rel="noopener" style="text-decoration:none">Assistir</a></div>` : ""}</div>`, true);
  }));
}
function desenharRoteiros() {
  $("#sub-roteiros").innerHTML = (B.TIPOS || []).map((t) => `<details class="bloco"><summary><span class="emoji">${esc(t.emoji)}</span><strong>${esc(t.nome)}</strong>
    <span class="conta">${esc(t.duracao)}</span><small>${htmlSeguro(t.porque)}</small></summary>
    <div class="bloco-corpo"><div class="porque"><strong>Quando usar:</strong> ${htmlSeguro(t.porque)}</div>${blocosTempo(t.beats)}
    ${(t.erros || []).length ? `<p style="margin:10px 0 4px;font-weight:600">Erros comuns</p><ul style="margin:0;padding-left:18px;color:var(--suave)">${t.erros.map((e) => `<li>${htmlSeguro(e)}</li>`).join("")}</ul>` : ""}</div></details>`).join("");
}
function desenharIdeias() {
  const como = B.COMO_USAR || [];
  $("#sub-ideias").innerHTML = (como.length ? `<div class="caixa"><h2>Como usar os ganchos</h2><ul style="margin:0;padding-left:18px;color:var(--suave)">${como.map((c) => `<li>${htmlSeguro(c)}</li>`).join("")}</ul></div>` : "") +
    (B.NICHOS || []).map((n) => `<details class="bloco"><summary><span class="emoji">${esc(n.emoji)}</span><strong>${esc(n.nome)}</strong><span class="conta">${(n.ideias || []).length} ideias</span></summary>
    <div class="bloco-corpo">${(n.ideias || []).map((i) => `<div class="ideia"><strong>${htmlSeguro(i.t)}</strong><em>Gancho: ${htmlSeguro(i.gancho)}</em></div>`).join("")}</div></details>`).join("");
}
function desenharRevisao() {
  const caixa = $("#sub-revisar");
  caixa.innerHTML = `<textarea class="area-roteiro" id="roteiro-colado" placeholder="Cole aqui o seu roteiro para conferir item por item."></textarea>
    ${(B.REVISAO || []).map((b, bi) => `<details class="bloco" open><summary><span class="emoji">${esc(b.emoji)}</span><strong>${esc(b.bloco)}</strong><span class="conta" data-conta="${bi}">0 de ${(b.itens || []).length}</span></summary>
      <div class="bloco-corpo">${(b.itens || []).map((it) => `<label class="item-check"><input type="checkbox" data-bloco="${bi}"><span>${htmlSeguro(it.t)}</span><small>${htmlSeguro(it.d)}</small></label>`).join("")}</div></details>`).join("")}
    <button class="botao" id="limpar-revisao">Limpar e revisar outro roteiro</button>`;
  try { $("#roteiro-colado").value = sessionStorage.getItem("roteiroColado") || ""; } catch (_) {}
  $("#roteiro-colado").addEventListener("input", (e) => { try { sessionStorage.setItem("roteiroColado", e.target.value); } catch (_) {} });
  caixa.addEventListener("change", (e) => {
    const inp = e.target.closest("input[data-bloco]"); if (!inp) return;
    inp.closest(".item-check").classList.toggle("marcado", inp.checked);
    const bi = inp.dataset.bloco, todos = caixa.querySelectorAll(`input[data-bloco="${bi}"]`);
    caixa.querySelector(`[data-conta="${bi}"]`).textContent = `${[...todos].filter((x) => x.checked).length} de ${todos.length}`;
  });
  $("#limpar-revisao").addEventListener("click", () => { try { sessionStorage.removeItem("roteiroColado"); } catch (_) {} desenharRevisao(); });
}
/* ==========================================================
   PAINEL DA LUANA
   A primeira coisa é conferir a sessão. Sem sessão, vai para o login.
   Cada aba carrega sozinha: se faltar uma tabela ou um campo no banco,
   aparece um aviso no topo e o resto do painel continua funcionando.
   ========================================================== */
(async function conferirSessao() {
  if (!window.banco) {
    document.body.classList.remove("trancado");
    document.body.innerHTML = '<p style="padding:24px;font:14px Open Sans,sans-serif">Não consegui conectar ao banco agora. Confira a internet e recarregue a página.</p>';
    return;
  }
  const { data } = await window.banco.auth.getSession();
  if (!data || !data.session) { location.replace("../login/"); return; }
  document.body.classList.remove("trancado");
  iniciar(data.session);
})();

const db = window.banco;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// textos da biblioteca têm só <b> e <em>: deixa só essas marcações passarem
const htmlSeguro = (t) => esc(t).replace(/&lt;(\/?)(b|em|strong|i)&gt;/g, "<$1$2>");
const moeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const doisD = (n) => String(n).padStart(2, "0");
const isoDia = (d) => `${d.getFullYear()}-${doisD(d.getMonth() + 1)}-${doisD(d.getDate())}`;
const hojeISO = () => isoDia(new Date());
const paraData = (iso) => { const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number); return new Date(a, m - 1, d); };
const diasAte = (iso) => Math.round((paraData(iso) - paraData(hojeISO())) / 86400000);
const dataBR = (iso) => iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "";
const icone = (d) => `<svg class="ic" viewBox="0 0 24 24">${d}</svg>`;
const IC = {
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  apagar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/>',
  alca: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  estrela: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  whats: '<path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z"/>'
};

const NICHOS_SITE = [
  ["acessorios", "Acessórios"], ["skincare", "Skincare"], ["haircare", "Haircare"], ["tech", "Tech & App"],
  ["moda", "Moda"], ["saude", "Saúde & bem-estar"], ["pet", "Pet"], ["collab", "Collab"]
];
const nomeNicho = (id) => (NICHOS_SITE.find((n) => n[0] === id) || [id, id])[1] || "";
const SITUACOES = [["lead", "Lead"], ["conversando", "Conversando"], ["cliente", "Cliente"], ["parada", "Parada"]];
const STATUS = ["Briefing", "Roteiro", "Aprovação Roteiro", "Gravação", "Edição", "Aprovado", "Entregue"];
const TIPOS_CAL = [["gravar", "Gravar"], ["editar", "Editar"], ["postar", "Postar"]];

const dados = { videos: [], marcas: [], calendario: [], campanhas: [], marcados: {}, visitas: [] };

/* ---------- avisos e consultas seguras ---------- */
const avisados = new Set();
function avisar(texto, erro) {
  if (avisados.has(texto)) return;
  avisados.add(texto);
  $("#avisos").insertAdjacentHTML("beforeend", `<div class="aviso${erro ? " erro" : ""}">${esc(texto)}</div>`);
}
function explicarErro(tabela, erro) {
  const cod = erro && (erro.code || "");
  const msg = (erro && erro.message) || "";
  if (cod === "PGRST205" || cod === "42P01" || /does not exist|could not find the table/i.test(msg))
    return `A tabela "${tabela}" não existe no banco. Rode o banco.sql no Supabase (SQL Editor). O resto do painel continua funcionando.`;
  if (cod === "42703" || cod === "PGRST204" || /column/i.test(msg))
    return `Falta um campo na tabela "${tabela}". Rode o banco.sql de novo no Supabase para completar. O resto do painel continua funcionando.`;
  if (cod === "42501" || /permission|row-level security/i.test(msg))
    return `O banco não deixou mexer em "${tabela}". Confira se você entrou com o e-mail luanawguimaraes@gmail.com e se rodou o banco.sql.`;
  return `Não consegui falar com a tabela "${tabela}" agora (${msg || "erro desconhecido"}).`;
}
async function ler(tabela, montar) {
  try {
    const { data, error } = await montar(db.from(tabela));
    if (error) { avisar(explicarErro(tabela, error), true); return null; }
    return data || [];
  } catch (e) { avisar(explicarErro(tabela, e), true); return null; }
}
async function gravar(tabela, acao) {
  try {
    const { error } = await acao(db.from(tabela));
    if (error) { avisar(explicarErro(tabela, error), true); torrada("Não deu para salvar"); return false; }
    return true;
  } catch (e) { avisar(explicarErro(tabela, e), true); torrada("Não deu para salvar"); return false; }
}
let tempoTorrada;
function torrada(texto) {
  const t = $("#torrada"); t.textContent = texto; t.classList.add("visivel");
  clearTimeout(tempoTorrada); tempoTorrada = setTimeout(() => t.classList.remove("visivel"), 2200);
}
// roda uma parte do painel sem deixar um erro derrubar as outras
function seguro(nome, fn) {
  try { fn(); } catch (e) { console.error(e); avisar(`Uma parte do painel (${nome}) teve um problema e foi pulada. O resto continua funcionando.`, true); }
}

/* ---------- início, menu e abas ---------- */
const TITULOS = { portfolio: "Portfólio", marcas: "Marcas", calendario: "Calendário", campanhas: "Campanhas", checklist: "Checklist do portfólio" };
function iniciar(sessao) {
  $("#menu-email").textContent = (sessao.user && sessao.user.email) || "";
  $$(".menu-item").forEach((b) => b.addEventListener("click", () => abrirAba(b.dataset.aba)));
  $("#sair").addEventListener("click", async () => { await db.auth.signOut(); location.replace("../login/"); });
  $("#sanduiche").addEventListener("click", () => document.body.classList.toggle("menu-aberto"));
  $("#cortina").addEventListener("click", () => document.body.classList.remove("menu-aberto"));
  $("#janela-fundo").addEventListener("click", (e) => { if (e.target.id === "janela-fundo") fecharJanela(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharJanela(); });
  db.auth.onAuthStateChange((evento) => { if (evento === "SIGNED_OUT") location.replace("../login/"); });

  ligarPortfolio(); ligarMarcas(); ligarCalendario(); ligarCampanhas(); ligarChecklist();
  let aba = "portfolio";
  try { aba = localStorage.getItem("painelAba") || aba; } catch (_) {}
  abrirAba(TITULOS[aba] ? aba : "portfolio");
  carregarTudo();
}
function abrirAba(aba) {
  $$(".menu-item").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
  $$(".aba").forEach((s) => s.classList.toggle("ativa", s.id === "aba-" + aba));
  $("#titulo-aba").textContent = TITULOS[aba];
  document.body.classList.remove("menu-aberto");
  try { localStorage.setItem("painelAba", aba); } catch (_) {}
}
async function carregarTudo() {
  const desde = new Date(); desde.setHours(0, 0, 0, 0); desde.setDate(desde.getDate() - 13);
  const [videos, marcas, cal, camp, marc, vis] = await Promise.all([
    ler("videos", (t) => t.select("*").order("ordem", { ascending: true }).order("id", { ascending: true })),
    ler("marcas", (t) => t.select("*").order("criado_em", { ascending: false })),
    ler("calendario", (t) => t.select("*").order("data", { ascending: true })),
    ler("campanhas", (t) => t.select("*").order("criado_em", { ascending: false })),
    ler("marcados", (t) => t.select("chave, marcado")),
    ler("visitas", (t) => t.select("data, pagina, origem").gte("data", desde.toISOString()).limit(20000))
  ]);
  dados.videos = videos || []; dados.marcas = marcas || []; dados.calendario = cal || []; dados.campanhas = camp || [];
  dados.visitas = vis || [];
  dados.marcados = {}; (marc || []).forEach((m) => { if (m.marcado) dados.marcados[m.chave] = true; });
  seguro("Portfólio", desenharPortfolio);
  seguro("Marcas", desenharMarcas);
  seguro("Calendário", desenharCalendario);
  seguro("Campanhas", desenharCampanhas);
  seguro("Checklist", desenharChecklist);
}

/* ---------- janela de formulário ---------- */
function fecharJanela() { $("#janela-fundo").classList.remove("aberta"); $("#janela").classList.remove("larga"); }
function abrirJanela(html, larga) {
  const j = $("#janela"); j.innerHTML = html; j.classList.toggle("larga", !!larga);
  $("#janela-fundo").classList.add("aberta");
  const f = j.querySelector("input, select, textarea"); if (f) setTimeout(() => f.focus(), 30);
  const x = j.querySelector("[data-fechar]"); if (x) x.addEventListener("click", fecharJanela);
}
// campos: [{n: nome, r: rótulo, t: tipo, o: opções [[valor, texto]], inteiro, dica}]
function formulario(titulo, campos, valores, aoSalvar, aoApagar) {
  const v = valores || {};
  const html = campos.map((c) => {
    const val = v[c.n] ?? c.padrao ?? "";
    let entrada;
    if (c.t === "select") entrada = `<select name="${c.n}">${c.o.map(([ov, ot]) => `<option value="${esc(ov)}"${String(ov) === String(val) ? " selected" : ""}>${esc(ot)}</option>`).join("")}</select>`;
    else if (c.t === "textarea") entrada = `<textarea name="${c.n}">${esc(val)}</textarea>`;
    else if (c.t === "checkbox") return `<div class="marca-caixa${c.inteiro ? " inteiro" : ""}"><input type="checkbox" name="${c.n}" id="c-${c.n}"${val ? " checked" : ""}><label for="c-${c.n}" style="margin:0">${esc(c.r)}</label></div>`;
    else entrada = `<input name="${c.n}" type="${c.t || "text"}" value="${esc(val)}"${c.t === "number" ? ' step="any" min="0"' : ""}${c.lista ? ` list="${c.lista}"` : ""}>`;
    return `<div class="${c.inteiro ? "inteiro" : ""}"><label>${esc(c.r)}</label>${entrada}${c.dica ? `<div class="dica">${esc(c.dica)}</div>` : ""}</div>`;
  }).join("");
  abrirJanela(`<div class="janela-topo"><h2>${esc(titulo)}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
    <form id="form-janela" novalidate><div class="campos">${html}</div>
    <div class="janela-acoes">${aoApagar ? `<button type="button" class="botao perigo" id="apagar-janela">${icone(IC.apagar)}Apagar</button>` : ""}<span class="espaco"></span>
    <button type="button" class="botao" data-fechar2>Cancelar</button><button type="submit" class="botao principal">Salvar</button></div></form>`);
  $("[data-fechar2]").addEventListener("click", fecharJanela);
  $("#form-janela").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, saida = {};
    campos.forEach((c) => {
      const el = f.elements[c.n];
      if (c.t === "checkbox") saida[c.n] = el.checked;
      else if (c.t === "number") saida[c.n] = el.value === "" ? 0 : Number(String(el.value).replace(",", "."));
      else if (c.t === "date") saida[c.n] = el.value || null;
      else saida[c.n] = el.value.trim();
    });
    const botao = f.querySelector('[type="submit"]'); botao.disabled = true;
    const ok = await aoSalvar(saida);
    botao.disabled = false;
    if (ok !== false) fecharJanela();
  });
  if (aoApagar) $("#apagar-janela").addEventListener("click", async () => {
    if (!confirm("Apagar de vez? Isso não tem como desfazer.")) return;
    if (await aoApagar() !== false) fecharJanela();
  });
}
function baixarCSV(nome, cabecalho, linhas) {
  const celula = (v) => { const s = String(v ?? ""); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const texto = [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  // o ﻿ no começo faz o Excel abrir com acento certinho
  const blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const exemploTag = (x) => x.exemplo ? '<span class="pilula p-exemplo">exemplo</span>' : "";

/* ==========================================================
   1. PORTFÓLIO
   ========================================================== */
function ligarPortfolio() {
  $("#novo-video").addEventListener("click", () => editarVideo(null));
}
function contar(lista, chave) {
  const c = {}; lista.forEach((x) => { const k = (x[chave] || "").trim(); if (k) c[k] = (c[k] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function desenharPortfolio() {
  const hoje = hojeISO();
  const visitas = dados.visitas;
  const deHoje = visitas.filter((v) => isoDia(new Date(v.data)) === hoje).length;
  const noAr = dados.videos.filter((v) => v.visivel && !v.exemplo);
  const nicho = contar(noAr, "nicho")[0];
  const origem = contar(visitas, "origem")[0];
  $("#portfolio-numeros").innerHTML = [
    ["Visitas em 14 dias", visitas.length],
    ["Visitas hoje", deHoje],
    ["Vídeos no ar", noAr.length],
    ["Nicho mais forte", nicho ? `${nomeNicho(nicho[0])}` : "Ainda sem vídeos", nicho ? `${nicho[1]} vídeo${nicho[1] > 1 ? "s" : ""}` : ""],
    ["De onde mais vêm", origem ? origem[0] : "Ainda sem visitas", origem ? `${origem[1]} visita${origem[1] > 1 ? "s" : ""}` : ""]
  ].map(([r, v, s]) => `<div class="numero"><small>${esc(r)}</small><strong title="${esc(v)}">${esc(v)}</strong>${s ? `<em>${esc(s)}</em>` : ""}</div>`).join("");

  // gráfico dos últimos 14 dias
  const dias = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dias.push(isoDia(d)); }
  const porDia = {}; visitas.forEach((v) => { const k = isoDia(new Date(v.data)); porDia[k] = (porDia[k] || 0) + 1; });
  const maior = Math.max(0, ...dias.map((d) => porDia[d] || 0));
  $("#grafico").innerHTML = maior === 0
    ? '<p class="vazio">Quando as pessoas começarem a visitar o seu portfólio, aqui aparece uma barra por dia com o número de visitas dos últimos 14 dias.</p>'
    : `<div class="grafico">${dias.map((d) => { const n = porDia[d] || 0; const [, m, dd] = d.split("-");
        return `<div class="barra${d === hoje ? " hoje" : ""}" title="${n} visita${n === 1 ? "" : "s"} em ${dataBR(d)}"><b>${n || ""}</b><i style="height:${Math.round((n / maior) * 100)}%"></i><span>${dd}/${m}</span></div>`; }).join("")}</div>`;

  const origens = contar(visitas, "origem");
  const total = visitas.length;
  $("#origens").innerHTML = total === 0
    ? '<p class="vazio">Aqui vai aparecer de onde as pessoas chegam no seu portfólio: Instagram, Google, WhatsApp, link direto e outros.</p>'
    : `<ul class="origens">${origens.map(([o, n]) => `<li><span>${esc(o)}</span><b>${n}</b><span class="trilho"><i style="width:${Math.round((n / total) * 100)}%"></i></span></li>`).join("")}</ul>`;

  desenharVideos();
}
function desenharVideos() {
  const caixa = $("#tabela-videos");
  if (!dados.videos.length) { caixa.innerHTML = '<p class="vazio">Nenhum vídeo ainda. Clique em "Adicionar vídeo" para colocar o primeiro.</p>'; return; }
  caixa.innerHTML = `<table><thead><tr><th style="width:34px"></th><th>Título</th><th>Nicho</th><th>Formato</th><th>Marca</th><th>Destaque</th><th style="width:110px"></th></tr></thead><tbody>
    ${dados.videos.map((v) => `<tr data-id="${v.id}" class="${v.visivel ? "" : "escondido"}">
      <td><span class="icone-botao alca" title="Arraste para mudar a ordem">${icone(IC.alca)}</span></td>
      <td class="curto">${v.link ? `<a href="${esc(v.link)}" target="_blank" rel="noopener">${esc(v.titulo || "Sem título")}</a>` : esc(v.titulo || "Sem título")}${exemploTag(v)}</td>
      <td>${esc(nomeNicho(v.nicho))}</td><td class="curto">${esc(v.formato)}</td><td>${esc(v.marca)}</td><td>${esc(v.destaque)}</td>
      <td style="white-space:nowrap">
        <button class="icone-botao${v.visivel ? " ligado" : ""}" data-acao="olho" title="${v.visivel ? "Aparece no site (clique para esconder)" : "Escondido do site (clique para mostrar)"}">${icone(v.visivel ? IC.olho : IC.olhoFechado)}</button>
        <button class="icone-botao" data-acao="editar" title="Editar">${icone(IC.editar)}</button>
        <button class="icone-botao" data-acao="apagar" title="Apagar">${icone(IC.apagar)}</button>
      </td></tr>`).join("")}</tbody></table>`;

  caixa.querySelectorAll("button[data-acao]").forEach((b) => b.addEventListener("click", async () => {
    const id = Number(b.closest("tr").dataset.id), v = dados.videos.find((x) => x.id === id);
    if (b.dataset.acao === "editar") editarVideo(v);
    if (b.dataset.acao === "apagar") {
      if (!confirm(`Apagar o vídeo "${v.titulo || "sem título"}"? Isso não tem como desfazer.`)) return;
      if (await gravar("videos", (t) => t.delete().eq("id", id))) { dados.videos = dados.videos.filter((x) => x.id !== id); desenharPortfolio(); torrada("Vídeo apagado"); }
    }
    if (b.dataset.acao === "olho") {
      if (await gravar("videos", (t) => t.update({ visivel: !v.visivel }).eq("id", id))) { v.visivel = !v.visivel; desenharPortfolio(); torrada(v.visivel ? "Agora aparece no site" : "Escondido do site"); }
    }
  }));
  ligarArrastar(caixa.querySelector("tbody"));
}
// arrastar pela alcinha para mudar a ordem
function ligarArrastar(tbody) {
  let arrastada = null;
  tbody.querySelectorAll(".alca").forEach((a) => {
    a.addEventListener("pointerdown", () => { a.closest("tr").draggable = true; });
  });
  tbody.addEventListener("dragstart", (e) => { arrastada = e.target.closest("tr"); arrastada.classList.add("arrastando"); e.dataTransfer.effectAllowed = "move"; });
  tbody.addEventListener("dragover", (e) => {
    e.preventDefault(); const alvo = e.target.closest("tr");
    tbody.querySelectorAll(".alvo").forEach((t) => t.classList.remove("alvo"));
    if (alvo && alvo !== arrastada) alvo.classList.add("alvo");
  });
  tbody.addEventListener("drop", async (e) => {
    e.preventDefault(); const alvo = e.target.closest("tr");
    if (!arrastada || !alvo || alvo === arrastada) return;
    const ids = dados.videos.map((v) => v.id);
    const de = ids.indexOf(Number(arrastada.dataset.id)), para = ids.indexOf(Number(alvo.dataset.id));
    const [movido] = dados.videos.splice(de, 1); dados.videos.splice(para, 0, movido);
    const mudou = dados.videos.map((v, i) => ({ v, i })).filter(({ v, i }) => v.ordem !== i);
    mudou.forEach(({ v, i }) => { v.ordem = i; });
    desenharVideos();
    const resultados = await Promise.all(mudou.map(({ v, i }) => gravar("videos", (t) => t.update({ ordem: i }).eq("id", v.id))));
    torrada(resultados.every(Boolean) ? "Ordem salva" : "Parte da ordem não foi salva");
  });
  tbody.addEventListener("dragend", () => {
    tbody.querySelectorAll("tr").forEach((t) => { t.classList.remove("arrastando", "alvo"); t.draggable = false; });
    arrastada = null;
  });
}
function editarVideo(v) {
  formulario(v ? "Editar vídeo" : "Novo vídeo", [
    { n: "titulo", r: "Título", inteiro: true },
    { n: "link", r: "Link do vídeo (YouTube)", inteiro: true, dica: "Ex: https://youtube.com/shorts/... O site usa esse link para mostrar o vídeo." },
    { n: "nicho", r: "Nicho", t: "select", o: [["", "Escolha"], ...NICHOS_SITE] },
    { n: "marca", r: "Marca" },
    { n: "formato", r: "Formato", dica: "Ex: Storytelling + Product Demo. Preenchido, o vídeo entra no carrossel de destaque." },
    { n: "destaque", r: "Destaque", dica: "Ex: 2,4M views. Aparece como número no card do carrossel." },
    { n: "visivel", r: "Aparece no site", t: "checkbox", padrao: true, inteiro: true }
  ], v || { visivel: true }, async (s) => {
    if (v) {
      if (!await gravar("videos", (t) => t.update(s).eq("id", v.id))) return false;
      Object.assign(v, s);
    } else {
      s.ordem = dados.videos.length;
      let novo = null;
      try { const r = await db.from("videos").insert(s).select().single(); if (r.error) throw r.error; novo = r.data; }
      catch (e) { avisar(explicarErro("videos", e), true); torrada("Não deu para salvar"); return false; }
      dados.videos.push(novo);
    }
    desenharPortfolio(); torrada("Vídeo salvo");
  }, v ? async () => {
    if (!await gravar("videos", (t) => t.delete().eq("id", v.id))) return false;
    dados.videos = dados.videos.filter((x) => x.id !== v.id); desenharPortfolio(); torrada("Vídeo apagado");
  } : null);
}

/* ==========================================================
   2. MARCAS
   ========================================================== */
function ligarMarcas() {
  $("#busca-marcas").addEventListener("input", desenharMarcas);
  $("#filtro-situacao").addEventListener("change", desenharMarcas);
  $("#nova-marca").addEventListener("click", () => editarMarca(null));
  $("#baixar-marcas").addEventListener("click", () => {
    baixarCSV("marcas.csv", ["Marca", "Instagram", "E-mail", "Telefone", "Situação", "Observação", "Último contato", "Origem"],
      marcasFiltradas().map((m) => [m.nome, m.instagram, m.email, m.telefone, nomeSituacao(m.situacao), m.obs, dataBR(m.ultimo_contato), m.origem === "site" ? "Site" : "Painel"]));
  });
}
const nomeSituacao = (s) => (SITUACOES.find((x) => x[0] === s) || [s, s])[1];
function marcasFiltradas() {
  const q = $("#busca-marcas").value.trim().toLowerCase().replace(/^@/, "");
  const f = $("#filtro-situacao").value;
  return dados.marcas.filter((m) => (!f || m.situacao === f) &&
    (!q || [m.nome, m.instagram, m.email].some((x) => String(x || "").toLowerCase().replace(/^@/, "").includes(q))));
}
const soDigitos = (t) => String(t || "").replace(/\D/g, "");
function linkWhats(tel) {
  let d = soDigitos(tel); if (!d) return "";
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}
const linkInsta = (arroba) => `https://instagram.com/${String(arroba).trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")}`;
function desenharMarcas() {
  const lista = marcasFiltradas(), caixa = $("#tabela-marcas");
  if (!dados.marcas.length) { caixa.innerHTML = '<p class="vazio">Sua base está vazia. Clique em "Adicionar marca" ou espere chegar o primeiro contato pelo formulário do site.</p>'; return; }
  if (!lista.length) { caixa.innerHTML = '<p class="vazio">Nenhuma marca encontrada com essa busca.</p>'; return; }
  caixa.innerHTML = `<table><thead><tr><th>Marca</th><th>Instagram</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th>Observação</th><th>Último contato</th></tr></thead><tbody>
    ${lista.map((m) => `<tr class="clicavel" data-id="${m.id}">
      <td><strong>${esc(m.nome || "Sem nome")}</strong>${exemploTag(m)}${m.origem === "site" ? ' <span class="pilula" style="font-size:10.5px;padding:1px 7px">site</span>' : ""}</td>
      <td>${m.instagram ? `<a href="${esc(linkInsta(m.instagram))}" target="_blank" rel="noopener">${esc(m.instagram.startsWith("@") ? m.instagram : "@" + m.instagram)}</a>` : ""}</td>
      <td class="curto">${m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : ""}</td>
      <td style="white-space:nowrap">${esc(m.telefone)}${m.telefone && linkWhats(m.telefone) ? `<a class="whats" href="${esc(linkWhats(m.telefone))}" target="_blank" rel="noopener">${icone(IC.whats)}WhatsApp</a>` : ""}</td>
      <td><span class="pilula p-${esc(m.situacao)}">${esc(nomeSituacao(m.situacao))}</span></td>
      <td class="curto" title="${esc(m.obs)}">${esc(m.obs)}</td>
      <td style="white-space:nowrap">${esc(dataBR(m.ultimo_contato))}</td></tr>`).join("")}</tbody></table>`;
  caixa.querySelectorAll("tr.clicavel").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    editarMarca(dados.marcas.find((m) => m.id === Number(tr.dataset.id)));
  }));
}
function editarMarca(m) {
  formulario(m ? "Editar marca" : "Nova marca", [
    { n: "nome", r: "Marca", inteiro: true },
    { n: "instagram", r: "Instagram", dica: "Ex: @nomedamarca" },
    { n: "email", r: "E-mail", t: "email" },
    { n: "telefone", r: "Telefone / WhatsApp", dica: "Com DDD. Ex: 11 91234-5678" },
    { n: "situacao", r: "Situação", t: "select", o: SITUACOES },
    { n: "ultimo_contato", r: "Último contato", t: "date" },
    { n: "obs", r: "Observação", t: "textarea", inteiro: true }
  ], m || { situacao: "lead", ultimo_contato: hojeISO() }, async (s) => {
    if (m) { if (!await gravar("marcas", (t) => t.update(s).eq("id", m.id))) return false; Object.assign(m, s); }
    else {
      try { const r = await db.from("marcas").insert(s).select().single(); if (r.error) throw r.error; dados.marcas.unshift(r.data); }
      catch (e) { avisar(explicarErro("marcas", e), true); torrada("Não deu para salvar"); return false; }
    }
    desenharMarcas(); torrada("Marca salva");
  }, m ? async () => {
    if (!await gravar("marcas", (t) => t.delete().eq("id", m.id))) return false;
    dados.marcas = dados.marcas.filter((x) => x.id !== m.id); desenharMarcas(); torrada("Marca apagada");
  } : null);
}

/* ==========================================================
   3. CALENDÁRIO
   ========================================================== */
let mesVisto = new Date(); mesVisto.setDate(1);
let filtroTipo = "";
function ligarCalendario() {
  $("#mes-anterior").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() - 1); desenharCalendario(); });
  $("#mes-seguinte").addEventListener("click", () => { mesVisto.setMonth(mesVisto.getMonth() + 1); desenharCalendario(); });
  $("#este-mes").addEventListener("click", () => { mesVisto = new Date(); mesVisto.setDate(1); desenharCalendario(); });
  $$("#filtro-tipo button").forEach((b) => b.addEventListener("click", () => {
    filtroTipo = b.dataset.tipo; $$("#filtro-tipo button").forEach((x) => x.classList.toggle("ativo", x === b)); desenharCalendario();
  }));
  $("#novo-item").addEventListener("click", () => editarItem(null, hojeISO()));
}
// junta os itens do calendário com os prazos das campanhas (que entram sozinhos)
function itensDoDia(iso) {
  const itens = dados.calendario.filter((c) => String(c.data).slice(0, 10) === iso && (!filtroTipo || c.tipo === filtroTipo))
    .map((c) => ({ tipo: c.tipo, texto: c.titulo + (c.marca ? ` · ${c.marca}` : ""), feito: c.status === "feito", ref: c, origem: "cal" }));
  if (!filtroTipo) dados.campanhas.filter((c) => c.prazo && String(c.prazo).slice(0, 10) === iso)
    .forEach((c) => itens.push({ tipo: "prazo", texto: `Prazo: ${c.campanha}`, feito: c.status === "Entregue", ref: c, origem: "camp" }));
  return itens;
}
function botaoItem(it) {
  return `<button class="item t-${it.tipo}${it.feito ? " feito" : ""}" data-origem="${it.origem}" data-id="${it.ref.id}" title="${esc(it.texto)}">${esc(it.texto)}</button>`;
}
function desenharCalendario() {
  const nomeMes = mesVisto.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  $("#mes-nome").textContent = nomeMes;
  const primeiro = new Date(mesVisto.getFullYear(), mesVisto.getMonth(), 1);
  const inicio = new Date(primeiro); inicio.setDate(1 - ((primeiro.getDay() + 6) % 7)); // volta até a segunda-feira
  const ultimo = new Date(mesVisto.getFullYear(), mesVisto.getMonth() + 1, 0);
  const fim = new Date(ultimo); fim.setDate(ultimo.getDate() + (7 - ((ultimo.getDay() + 6) % 7) - 1)); // vai até o domingo
  const hoje = hojeISO();
  let html = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => `<div class="dia-semana">${d}</div>`).join("");
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    const iso = isoDia(d), itens = itensDoDia(iso);
    const fora = d.getMonth() !== mesVisto.getMonth();
    html += `<div class="dia${fora ? " fora" : ""}${iso === hoje ? " hoje" : ""}" data-dia="${iso}">
      <span class="num-dia">${d.getDate()}</span><button class="mais-dia" data-novo="${iso}" title="Adicionar neste dia" aria-label="Adicionar em ${dataBR(iso)}">+</button>
      ${itens.slice(0, 3).map(botaoItem).join("")}
      ${itens.length > 3 ? `<button class="ver-mais" data-ver="${iso}">+${itens.length - 3} mais</button>` : ""}</div>`;
  }
  const grade = $("#grade"); grade.innerHTML = html;
  grade.onclick = (e) => {
    const item = e.target.closest(".item"), mais = e.target.closest("[data-ver]"), novo = e.target.closest("[data-novo]"), dia = e.target.closest(".dia");
    if (item) abrirItem(item.dataset.origem, Number(item.dataset.id));
    else if (mais) abrirDia(mais.dataset.ver);
    else if (novo) editarItem(null, novo.dataset.novo);
    else if (dia) editarItem(null, dia.dataset.dia);
  };

  const atrasados = dados.calendario.filter((c) => c.status !== "feito" && diasAte(c.data) < 0).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  $("#atrasados").innerHTML = atrasados.length
    ? `<ul class="atrasados">${atrasados.map((c) => { const n = -diasAte(c.data);
        return `<li><span class="pilula t-${esc(c.tipo)}">${esc((TIPOS_CAL.find((t) => t[0] === c.tipo) || [0, c.tipo])[1])}</span><strong>${esc(c.titulo)}</strong>${c.marca ? `<span style="color:var(--suave)">${esc(c.marca)}</span>` : ""}${exemploTag(c)}
        <span class="etiqueta e-atraso">há ${n} dia${n > 1 ? "s" : ""}</span><span class="espaco" style="flex:1"></span>
        <button class="botao" data-feito="${c.id}">Marcar como feito</button><button class="icone-botao" data-editar="${c.id}" title="Editar">${icone(IC.editar)}</button></li>`; }).join("")}</ul>`
    : '<p class="vazio">Nada ficou pra trás. Tudo em dia!</p>';
  $("#atrasados").onclick = async (e) => {
    const f = e.target.closest("[data-feito]"), ed = e.target.closest("[data-editar]");
    if (f) { const c = dados.calendario.find((x) => x.id === Number(f.dataset.feito));
      if (await gravar("calendario", (t) => t.update({ status: "feito" }).eq("id", c.id))) { c.status = "feito"; desenharCalendario(); torrada("Marcado como feito"); } }
    if (ed) abrirItem("cal", Number(ed.dataset.editar));
  };
}
function abrirItem(origem, id) {
  if (origem === "camp") { const c = dados.campanhas.find((x) => x.id === id); if (c) editarCampanha(c); return; }
  const c = dados.calendario.find((x) => x.id === id); if (c) editarItem(c);
}
function abrirDia(iso) {
  const itens = itensDoDia(iso);
  abrirJanela(`<div class="janela-topo"><h2>${esc(dataBR(iso))}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
    <ul class="lista-dia">${itens.map((it) => `<li>${botaoItem(it)}</li>`).join("")}</ul>
    <button class="botao principal" id="novo-no-dia">${icone('<path d="M12 5v14M5 12h14"/>')}Adicionar neste dia</button>`);
  $("#janela").querySelectorAll(".item").forEach((b) => b.addEventListener("click", () => abrirItem(b.dataset.origem, Number(b.dataset.id))));
  $("#novo-no-dia").addEventListener("click", () => editarItem(null, iso));
}
function editarItem(c, iso) {
  formulario(c ? "Editar no calendário" : "Novo no calendário", [
    { n: "titulo", r: "O que é", inteiro: true },
    { n: "marca", r: "Marca" },
    { n: "tipo", r: "Tipo", t: "select", o: TIPOS_CAL },
    { n: "data", r: "Data", t: "date" },
    { n: "status", r: "Status", t: "select", o: [["a fazer", "A fazer"], ["feito", "Feito"]] }
  ], c || { data: iso, tipo: filtroTipo || "gravar", status: "a fazer" }, async (s) => {
    if (!s.data) { alert("Escolha a data."); return false; }
    if (c) { if (!await gravar("calendario", (t) => t.update(s).eq("id", c.id))) return false; Object.assign(c, s); }
    else {
      try { const r = await db.from("calendario").insert(s).select().single(); if (r.error) throw r.error; dados.calendario.push(r.data); }
      catch (e) { avisar(explicarErro("calendario", e), true); torrada("Não deu para salvar"); return false; }
    }
    desenharCalendario(); torrada("Salvo no calendário");
  }, c ? async () => {
    if (!await gravar("calendario", (t) => t.delete().eq("id", c.id))) return false;
    dados.calendario = dados.calendario.filter((x) => x.id !== c.id); desenharCalendario(); torrada("Apagado");
  } : null);
}

/* ==========================================================
   4. CAMPANHAS
   ========================================================== */
let filtroCamp = "todas", ordem = { col: "prazo", dir: 1 };
const COLUNAS = [
  ["favorita", "", (c) => (c.favorita ? 0 : 1)],
  ["campanha", "Campanha", (c) => (c.campanha || "").toLowerCase()],
  ["cliente", "Cliente", (c) => (c.cliente || "").toLowerCase()],
  ["tipo", "Tipo", (c) => c.tipo || ""],
  ["status", "Status", (c) => STATUS.indexOf(c.status)], // segue a ordem do funil, não o alfabeto
  ["qtd", "Qtd", (c) => Number(c.qtd) || 0],
  ["valor", "Valor", (c) => Number(c.valor) || 0],
  ["prazo", "Prazo", (c) => (c.prazo ? String(c.prazo) : "9999-12-31")],
  ["pagamento", "Pagamento", (c) => (c.pagamento === "pago" ? 1 : 0)]
];
function ligarCampanhas() {
  $$("#filtro-campanhas button").forEach((b) => b.addEventListener("click", () => {
    filtroCamp = b.dataset.f; $$("#filtro-campanhas button").forEach((x) => x.classList.toggle("ativo", x === b)); desenharCampanhas();
  }));
  $("#busca-campanhas").addEventListener("input", desenharCampanhas);
  $("#nova-campanha").addEventListener("click", () => editarCampanha(null));
  $("#baixar-campanhas").addEventListener("click", () => {
    baixarCSV("campanhas.csv", ["Favorita", "Campanha", "Cliente", "Tipo", "Status", "Qtd", "Valor", "Prazo", "Pagamento", "Ativa"],
      campanhasFiltradas().map((c) => [c.favorita ? "sim" : "", c.campanha, c.cliente, c.tipo, c.status, c.qtd,
        (Number(c.valor) || 0).toFixed(2).replace(".", ","), dataBR(c.prazo), c.pagamento === "pago" ? "Pago" : "Pendente", c.ativa ? "sim" : "não"]));
  });
}
function campanhasFiltradas() {
  const q = $("#busca-campanhas").value.trim().toLowerCase();
  const lista = dados.campanhas.filter((c) => (filtroCamp === "todas" || (filtroCamp === "ativas" ? c.ativa : !c.ativa)) &&
    (!q || [c.campanha, c.cliente].some((x) => String(x || "").toLowerCase().includes(q))));
  const col = COLUNAS.find((c) => c[0] === ordem.col) || COLUNAS[7];
  return lista.sort((a, b) => { const x = col[2](a), y = col[2](b); return (x < y ? -1 : x > y ? 1 : 0) * ordem.dir; });
}
function avisoPrazo(c) {
  if (!c.prazo || c.status === "Entregue") return "";
  const n = diasAte(c.prazo);
  if (n < 0) return `<span class="etiqueta e-atraso">atrasado ${-n} dia${-n > 1 ? "s" : ""}</span>`;
  if (n <= 3) return `<span class="etiqueta e-perto">${n === 0 ? "vence hoje" : `vence em ${n} dia${n > 1 ? "s" : ""}`}</span>`;
  return "";
}
function desenharCampanhas() {
  const reais = dados.campanhas.filter((c) => !c.exemplo);
  const soma = (l, f) => l.reduce((s, c) => s + (Number(f(c)) || 0), 0);
  const total = soma(reais, (c) => c.valor), videos = soma(reais, (c) => c.qtd);
  const aReceber = soma(reais.filter((c) => c.pagamento !== "pago"), (c) => c.valor);
  const recebido = soma(reais.filter((c) => c.pagamento === "pago"), (c) => c.valor);
  $("#campanhas-numeros").innerHTML = [
    ["Campanhas", reais.length, ""],
    ["Ativas", reais.filter((c) => c.ativa).length, ""],
    ["Valor total", moeda(total), `ticket médio por vídeo: ${moeda(videos > 0 ? total / videos : 0)}`],
    ["A receber", moeda(aReceber), `já recebido: ${moeda(recebido)}`]
  ].map(([r, v, s]) => `<div class="numero"><small>${esc(r)}</small><strong>${esc(v)}</strong>${s ? `<em>${esc(s)}</em>` : ""}</div>`).join("");

  const lista = campanhasFiltradas(), caixa = $("#tabela-campanhas");
  if (!dados.campanhas.length) { caixa.innerHTML = '<p class="vazio">Nenhuma campanha ainda. Clique em "Adicionar campanha".</p>'; return; }
  const cab = COLUNAS.map(([k, r]) => {
    const ativa = ordem.col === k;
    return `<th class="ordena${ativa ? " ativa" : ""}${k === "qtd" || k === "valor" ? " num" : ""}" data-col="${k}">${r || icone(IC.estrela)}<span class="seta">${ativa ? (ordem.dir === 1 ? "▲" : "▼") : "↕"}</span></th>`;
  }).join("");
  caixa.innerHTML = `<table><thead><tr>${cab}</tr></thead><tbody>${lista.length ? lista.map((c) => {
    const si = Math.max(0, STATUS.indexOf(c.status));
    return `<tr class="clicavel${c.favorita ? " favorita" : ""}" data-id="${c.id}">
      <td><button class="icone-botao estrela-botao${c.favorita ? " ligado" : ""}" data-estrela title="${c.favorita ? "Tirar destaque" : "Destacar"}">${icone(IC.estrela)}</button></td>
      <td><strong>${esc(c.campanha || "Sem nome")}</strong>${exemploTag(c)}${c.ativa ? "" : ' <span class="pilula" style="font-size:10.5px;padding:1px 7px">finalizada</span>'}</td>
      <td>${esc(c.cliente)}</td>
      <td><span class="pilula p-${c.tipo === "Publicidade" ? "publicidade" : "conteudo"}">${esc(c.tipo)}</span></td>
      <td><span class="pilula p-s${si}">${esc(c.status)}</span></td>
      <td class="num">${Number(c.qtd) || 0}</td>
      <td class="num">${moeda(c.valor)}</td>
      <td style="white-space:nowrap">${esc(dataBR(c.prazo))}${avisoPrazo(c)}</td>
      <td><span class="pilula p-${c.pagamento === "pago" ? "pago" : "pendente"}">${c.pagamento === "pago" ? "Pago" : "Pendente"}</span></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="vazio">Nenhuma campanha com esse filtro.</td></tr>'}</tbody></table>`;

  caixa.querySelectorAll("th.ordena").forEach((th) => th.addEventListener("click", () => {
    const col = th.dataset.col;
    ordem = ordem.col === col ? { col, dir: -ordem.dir } : { col, dir: 1 };
    desenharCampanhas();
  }));
  caixa.querySelectorAll("tr.clicavel").forEach((tr) => tr.addEventListener("click", async (e) => {
    const c = dados.campanhas.find((x) => x.id === Number(tr.dataset.id));
    if (e.target.closest("[data-estrela]")) {
      if (await gravar("campanhas", (t) => t.update({ favorita: !c.favorita }).eq("id", c.id))) { c.favorita = !c.favorita; desenharCampanhas(); }
      return;
    }
    editarCampanha(c);
  }));
}
function editarCampanha(c) {
  formulario(c ? "Editar campanha" : "Nova campanha", [
    { n: "campanha", r: "Campanha", inteiro: true },
    { n: "cliente", r: "Cliente" },
    { n: "tipo", r: "Tipo", t: "select", o: [["Conteúdo", "Conteúdo"], ["Publicidade", "Publicidade"]] },
    { n: "status", r: "Status", t: "select", o: STATUS.map((s) => [s, s]) },
    { n: "prazo", r: "Prazo", t: "date" },
    { n: "qtd", r: "Quantidade de vídeos", t: "number" },
    { n: "valor", r: "Valor (R$)", t: "number" },
    { n: "pagamento", r: "Pagamento", t: "select", o: [["pendente", "Pendente"], ["pago", "Pago"]] },
    { n: "ativa", r: "Campanha ativa", t: "checkbox", padrao: true },
    { n: "favorita", r: "Destacar com estrela", t: "checkbox" }
  ], c || { tipo: "Conteúdo", status: "Briefing", qtd: 1, valor: 0, pagamento: "pendente", ativa: true }, async (s) => {
    if (c) { if (!await gravar("campanhas", (t) => t.update(s).eq("id", c.id))) return false; Object.assign(c, s); }
    else {
      try { const r = await db.from("campanhas").insert(s).select().single(); if (r.error) throw r.error; dados.campanhas.unshift(r.data); }
      catch (e) { avisar(explicarErro("campanhas", e), true); torrada("Não deu para salvar"); return false; }
    }
    desenharCampanhas(); desenharCalendario(); torrada("Campanha salva");
  }, c ? async () => {
    if (!await gravar("campanhas", (t) => t.delete().eq("id", c.id))) return false;
    dados.campanhas = dados.campanhas.filter((x) => x.id !== c.id); desenharCampanhas(); desenharCalendario(); torrada("Campanha apagada");
  } : null);
}

/* ==========================================================
   5. CHECKLIST (conteúdo exato do arquivo js/biblioteca.js)
   ========================================================== */
const B = window.Biblioteca || null;
function ligarChecklist() {
  $$("#sub-abas button").forEach((b) => b.addEventListener("click", () => {
    $$("#sub-abas button").forEach((x) => x.classList.toggle("ativo", x === b));
    $$(".sub").forEach((s) => s.classList.toggle("ativa", s.id === "sub-" + b.dataset.sub));
  }));
}
function desenharChecklist() {
  if (!B) { avisar("Não encontrei o arquivo js/biblioteca.js, então a aba Checklist ficou vazia. O resto do painel continua funcionando.", true); return; }
  seguro("Checklist do portfólio", desenharItensChecklist);
  seguro("Referências", desenharReferencias);
  seguro("Roteiros", desenharRoteiros);
  seguro("Ideias por nicho", desenharIdeias);
  seguro("Revisar roteiro", desenharRevisao);
}
function desenharItensChecklist() {
  const secoes = B.CHECKLIST || [];
  const chave = (s, i) => `checklist:${s.id}:${i}`;
  const totais = () => { let feitos = 0, todos = 0; secoes.forEach((s) => (s.itens || []).forEach((_, i) => { todos++; if (dados.marcados[chave(s, i)]) feitos++; })); return [feitos, todos]; };
  const caixa = $("#sub-checklist");
  const [f, t] = totais();
  caixa.innerHTML = `<div class="caixa"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>Pronto no geral</strong><span id="geral-conta">${f} de ${t} (${t ? Math.round((f / t) * 100) : 0}%)</span></div>
    <div class="progresso"><i id="geral-barra" style="width:${t ? (f / t) * 100 : 0}%"></i></div></div>
    ${secoes.map((s) => { const itens = s.itens || [], feitos = itens.filter((_, i) => dados.marcados[chave(s, i)]).length;
      return `<details class="bloco" data-secao="${esc(s.id)}"><summary><span class="emoji">${esc(s.emoji)}</span><strong>${esc(s.nome)}</strong>
        <span class="conta">${feitos} de ${itens.length}</span><small>${esc(s.resumo)}</small>
        <span class="progresso"><i style="width:${itens.length ? (feitos / itens.length) * 100 : 0}%"></i></span></summary>
        <div class="bloco-corpo"><div class="porque"><strong>Por que importa:</strong> ${htmlSeguro(s.porque)}</div>
        ${itens.map((it, i) => `<label class="item-check${dados.marcados[chave(s, i)] ? " marcado" : ""}"><input type="checkbox" data-chave="${esc(chave(s, i))}"${dados.marcados[chave(s, i)] ? " checked" : ""}><span>${htmlSeguro(it.t)}</span><small>${htmlSeguro(it.d)}</small></label>`).join("")}
        </div></details>`; }).join("")}`;
  caixa.querySelectorAll("input[data-chave]").forEach((inp) => inp.addEventListener("change", async () => {
    const k = inp.dataset.chave, marcado = inp.checked;
    inp.closest(".item-check").classList.toggle("marcado", marcado);
    if (marcado) dados.marcados[k] = true; else delete dados.marcados[k];
    atualizarProgresso();
    const ok = await gravar("marcados", (t) => t.upsert({ chave: k, marcado, atualizado_em: new Date().toISOString() }));
    if (!ok) { inp.checked = !marcado; if (!marcado) dados.marcados[k] = true; else delete dados.marcados[k]; inp.closest(".item-check").classList.toggle("marcado", !marcado); atualizarProgresso(); }
  }));
  function atualizarProgresso() {
    const [f2, t2] = totais();
    $("#geral-conta").textContent = `${f2} de ${t2} (${t2 ? Math.round((f2 / t2) * 100) : 0}%)`;
    $("#geral-barra").style.width = `${t2 ? (f2 / t2) * 100 : 0}%`;
    caixa.querySelectorAll("details.bloco").forEach((d) => {
      const s = secoes.find((x) => x.id === d.dataset.secao), itens = s.itens || [];
      const feitos = itens.filter((_, i) => dados.marcados[chave(s, i)]).length;
      d.querySelector(".conta").textContent = `${feitos} de ${itens.length}`;
      d.querySelector("summary .progresso i").style.width = `${itens.length ? (feitos / itens.length) * 100 : 0}%`;
    });
  }
}
function blocosTempo(lista) {
  return `<div class="blocos-tempo">${(lista || []).map((b) => `<div class="bloco-tempo"><b class="tempo">${esc(b.t)}</b><div>${htmlSeguro(b.o)}</div></div>`).join("")}</div>`;
}
function desenharReferencias() {
  const refs = B.REFERENCIAS || [], caixa = $("#sub-referencias");
  caixa.innerHTML = `<div class="cartoes">${refs.map((r, i) => `<button class="ref" data-i="${i}"><span class="ref-capa c-${esc(r.cor)}">${esc(r.emoji)}</span>
    <span class="ref-info"><strong>${esc(r.titulo)}</strong><small>${esc(r.estilo)} · ${esc(r.duracao)} · ${esc(r.marca)}</small></span></button>`).join("")}</div>`;
  caixa.querySelectorAll(".ref").forEach((b) => b.addEventListener("click", () => {
    const r = refs[Number(b.dataset.i)];
    abrirJanela(`<div class="janela-topo"><h2>${esc(r.emoji)} ${esc(r.titulo)}</h2><button class="icone-botao" data-fechar aria-label="Fechar">${icone(IC.fechar)}</button></div>
      <div class="ficha"><p style="color:var(--suave)">${esc(r.estilo)} · ${esc(r.audiencia)} · ${esc(r.duracao)} · ${esc(r.marca)}</p>
      <h3>Gancho</h3><p>${htmlSeguro(r.gancho)}</p>
      <h3>Por que funciona</h3><p>${htmlSeguro(r.porque)}</p>
      <h3>O diferencial</h3><p>${htmlSeguro(r.diferencial)}</p>
      <h3>O erro comum</h3><p>${htmlSeguro(r.erro)}</p>
      <h3>Roteiro em blocos</h3>${blocosTempo(r.roteiro)}
      ${r.youtube ? `<div class="janela-acoes"><span class="espaco"></span><a class="botao principal" href="${esc(r.youtube)}" target="_blank" rel="noopener" style="text-decoration:none">Assistir</a></div>` : ""}</div>`, true);
  }));
}
function desenharRoteiros() {
  $("#sub-roteiros").innerHTML = (B.TIPOS || []).map((t) => `<details class="bloco"><summary><span class="emoji">${esc(t.emoji)}</span><strong>${esc(t.nome)}</strong>
    <span class="conta">${esc(t.duracao)}</span><small>${htmlSeguro(t.porque)}</small></summary>
    <div class="bloco-corpo"><div class="porque"><strong>Quando usar:</strong> ${htmlSeguro(t.porque)}</div>${blocosTempo(t.beats)}
    ${(t.erros || []).length ? `<p style="margin:10px 0 4px;font-weight:600">Erros comuns</p><ul style="margin:0;padding-left:18px;color:var(--suave)">${t.erros.map((e) => `<li>${htmlSeguro(e)}</li>`).join("")}</ul>` : ""}</div></details>`).join("");
}
function desenharIdeias() {
  const como = B.COMO_USAR || [];
  $("#sub-ideias").innerHTML = (como.length ? `<div class="caixa"><h2>Como usar os ganchos</h2><ul style="margin:0;padding-left:18px;color:var(--suave)">${como.map((c) => `<li>${htmlSeguro(c)}</li>`).join("")}</ul></div>` : "") +
    (B.NICHOS || []).map((n) => `<details class="bloco"><summary><span class="emoji">${esc(n.emoji)}</span><strong>${esc(n.nome)}</strong><span class="conta">${(n.ideias || []).length} ideias</span></summary>
    <div class="bloco-corpo">${(n.ideias || []).map((i) => `<div class="ideia"><strong>${htmlSeguro(i.t)}</strong><em>Gancho: ${htmlSeguro(i.gancho)}</em></div>`).join("")}</div></details>`).join("");
}
function desenharRevisao() {
  const caixa = $("#sub-revisar");
  caixa.innerHTML = `<textarea class="area-roteiro" id="roteiro-colado" placeholder="Cole aqui o seu roteiro para conferir item por item."></textarea>
    ${(B.REVISAO || []).map((b, bi) => `<details class="bloco" open><summary><span class="emoji">${esc(b.emoji)}</span><strong>${esc(b.bloco)}</strong><span class="conta" data-conta="${bi}">0 de ${(b.itens || []).length}</span></summary>
      <div class="bloco-corpo">${(b.itens || []).map((it) => `<label class="item-check"><input type="checkbox" data-bloco="${bi}"><span>${htmlSeguro(it.t)}</span><small>${htmlSeguro(it.d)}</small></label>`).join("")}</div></details>`).join("")}
    <button class="botao" id="limpar-revisao">Limpar e revisar outro roteiro</button>`;
  try { $("#roteiro-colado").value = sessionStorage.getItem("roteiroColado") || ""; } catch (_) {}
  $("#roteiro-colado").addEventListener("input", (e) => { try { sessionStorage.setItem("roteiroColado", e.target.value); } catch (_) {} });
  caixa.addEventListener("change", (e) => {
    const inp = e.target.closest("input[data-bloco]"); if (!inp) return;
    inp.closest(".item-check").classList.toggle("marcado", inp.checked);
    const bi = inp.dataset.bloco, todos = caixa.querySelectorAll(`input[data-bloco="${bi}"]`);
    caixa.querySelector(`[data-conta="${bi}"]`).textContent = `${[...todos].filter((x) => x.checked).length} de ${todos.length}`;
  });
  $("#limpar-revisao").addEventListener("click", () => { try { sessionStorage.removeItem("roteiroColado"); } catch (_) {} desenharRevisao(); });
}
