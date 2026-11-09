/* ==========================================================
   LIGAÇÃO COM O SUPABASE (usada pelo site, pelo login e pelo painel)
   Aqui fica só a chave PÚBLICA, que pode aparecer no site sem problema:
   quem protege os dados é a tranca (RLS) configurada no banco.sql.
   Nunca coloque a chave secreta (service_role) neste arquivo.
   ========================================================== */
window.BANCO_CONFIG = {
  url: "https://fvucwbvcrhrtndiybick.supabase.co",
  chave: "sb_publishable_jjeOxqKLjqQBsceNz7iIwg_vDNOm6X0"
};

// Cria a conexão uma vez só. Se a biblioteca do Supabase não carregar
// (internet fora, por exemplo), window.banco fica vazio e cada página segue sem ele.
window.banco = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(window.BANCO_CONFIG.url, window.BANCO_CONFIG.chave)
  : null;
