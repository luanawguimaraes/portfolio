/* ==========================================================
   PORTFÓLIO LIGADO AO PAINEL
   1. Busca os vídeos visíveis na tabela "videos" (o site espera no
      máximo alguns segundos; se o banco não responder, usa a lista fixa).
   2. Manda os formulários do site para a tabela "marcas", como Lead.
   3. Registra a visita na tabela "visitas" (data, página e de onde veio),
      sem serviço de fora e sem pedir nada para quem visita.
   ========================================================== */
(function () {
  const db = window.banco;
  const responder = window.__resolverVideosDoBanco || function () {};

  // 1. vídeos
  if (!db) { responder(null); }
  else {
    db.from("videos")
      .select("titulo, link, nicho, formato, marca, destaque, ordem")
      .eq("visivel", true).eq("exemplo", false)
      .order("ordem", { ascending: true }).order("id", { ascending: true })
      .then(({ data, error }) => responder(error ? null : data))
      .catch(() => responder(null));
  }

  // 2. formulários: vira uma linha em "marcas" com situação Lead
  window.enviarLeadAoBanco = async function (lead) {
    if (!db) return false;
    const corta = (t, n) => String(t || "").trim().slice(0, n);
    const linha = {
      nome: corta(lead.marca || lead.nome || "Sem nome", 200),
      email: corta(lead.email, 200),
      telefone: corta(lead.telefone, 40),
      obs: corta(lead.obs, 3900),
      situacao: "lead",
      origem: "site",
      ultimo_contato: new Date().toISOString().slice(0, 10)
    };
    try { const { error } = await db.from("marcas").insert(linha); return !error; }
    catch (_) { return false; }
  };

  // 3. visita (uma por página a cada visita; não conta testes no computador nem quando a Luana está logada)
  try {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const logada = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
    const chave = "visitaContada:" + location.pathname;
    if (db && !local && !logada && !sessionStorage.getItem(chave)) {
      sessionStorage.setItem(chave, "1");
      db.from("visitas").insert({ pagina: location.pathname.slice(0, 300), origem: deOndeVeio() }).then(() => {}, () => {});
    }
  } catch (_) { /* navegador sem armazenamento: não registra, e o site segue normal */ }

  function deOndeVeio() {
    const p = new URLSearchParams(location.search);
    const utm = (p.get("utm_source") || p.get("ref") || "").toLowerCase();
    let ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch (_) {}
    const fonte = utm || ref;
    if (!fonte || ref === location.hostname) return utm ? limpar(utm) : "Direto";
    const nomes = [
      [/instagram|^ig$/, "Instagram"], [/tiktok/, "TikTok"], [/whatsapp|wa\.me/, "WhatsApp"], [/facebook|fb\./, "Facebook"],
      [/google/, "Google"], [/bing/, "Bing"], [/linkedin|lnkd/, "LinkedIn"], [/youtube|youtu\.be/, "YouTube"],
      [/pinterest/, "Pinterest"], [/t\.co|twitter|x\.com/, "X (Twitter)"], [/linktr\.ee|linktree/, "Linktree"],
      [/mail|outlook/, "E-mail"]
    ];
    const achou = nomes.find(([r]) => r.test(fonte));
    return achou ? achou[1] : limpar(fonte);
  }
  function limpar(t) { return String(t).replace(/^www\./, "").slice(0, 60); }
})();
