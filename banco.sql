-- =====================================================================
-- BANCO DE DADOS DO PAINEL DA LUANA
-- Onde colar: no Supabase, abra o seu projeto, clique em "SQL Editor"
-- no menu da esquerda, depois em "New query", cole TUDO isto e clique
-- em "Run". Pode rodar de novo quando quiser: nada é apagado e as linhas
-- de exemplo só entram se a tabela estiver vazia.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. QUEM É A DONA
-- ANTES de rodar este arquivo, crie o seu usuário no Supabase
-- (Authentication > Users > Add user). Este arquivo guarda esse usuário
-- como a dona do painel. Assim nenhum e-mail fica escrito aqui.
-- A tabela "dona" também fica trancada: ninguém lê pelo site.
-- Se um dia trocar de usuário: apague a linha da tabela "dona" no
-- Table Editor e rode este arquivo de novo.
-- ---------------------------------------------------------------------
create table if not exists public.dona (
  id         uuid primary key references auth.users (id) on delete cascade,
  criado_em  timestamptz not null default now()
);
alter table public.dona enable row level security;
revoke all on public.dona from anon, authenticated;

-- Guarda o primeiro usuário criado (o seu), só se ainda não tiver dona.
insert into public.dona (id)
select u.id from auth.users u
where not exists (select 1 from public.dona)
order by u.created_at
limit 1;

-- Esta função responde "sim" só quando quem está logada é a dona.
-- Todas as trancas abaixo usam ela.
create or replace function public.eh_dona()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.dona where id = auth.uid());
$$;


-- ---------------------------------------------------------------------
-- 2. AS TABELAS
-- Cada tabela tem um campo "exemplo": a primeira linha vem marcada
-- como exemplo, só pra mostrar o formato. Pode apagar pelo painel.
-- ---------------------------------------------------------------------

-- Vídeos do portfólio. "nicho" diz em qual botão de Trabalhos por nicho o
-- vídeo aparece. Vídeos com "formato" preenchido também entram no carrossel
-- "Conteúdos de destaque". "destaque" é o número do card (ex: 2,4M views).
create table if not exists public.videos (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  titulo     text not null default '',
  link       text not null default '',
  nicho      text not null default '',
  formato    text not null default '',
  marca      text not null default '',
  destaque   text not null default '',
  ordem      integer not null default 0,
  visivel    boolean not null default true,
  exemplo    boolean not null default false
);

-- Base de contatos de empresas. "origem" diz se veio do formulário
-- do site ou se você cadastrou pelo painel.
create table if not exists public.marcas (
  id              bigint generated always as identity primary key,
  criado_em       timestamptz not null default now(),
  nome            text not null default '',
  instagram       text not null default '',
  email           text not null default '',
  telefone        text not null default '',
  situacao        text not null default 'lead'
                  check (situacao in ('lead', 'conversando', 'cliente', 'parada')),
  obs             text not null default '',
  ultimo_contato  date,
  origem          text not null default 'painel',
  exemplo         boolean not null default false
);

-- Calendário de gravações, edições e postagens.
create table if not exists public.calendario (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  titulo     text not null default '',
  marca      text not null default '',
  tipo       text not null default 'gravar'
             check (tipo in ('gravar', 'editar', 'postar')),
  data       date not null default current_date,
  status     text not null default 'a fazer'
             check (status in ('a fazer', 'feito')),
  exemplo    boolean not null default false
);

-- Campanhas. O status segue o funil, nesta ordem:
-- Briefing, Roteiro, Aprovação Roteiro, Gravação, Edição, Aprovado, Entregue.
create table if not exists public.campanhas (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  campanha   text not null default '',
  cliente    text not null default '',
  tipo       text not null default 'Conteúdo'
             check (tipo in ('Conteúdo', 'Publicidade')),
  status     text not null default 'Briefing'
             check (status in ('Briefing', 'Roteiro', 'Aprovação Roteiro', 'Gravação', 'Edição', 'Aprovado', 'Entregue')),
  qtd        integer not null default 1,
  valor      numeric(12, 2) not null default 0,
  prazo      date,
  pagamento  text not null default 'pendente'
             check (pagamento in ('pendente', 'pago')),
  ativa      boolean not null default true,
  favorita   boolean not null default false,
  exemplo    boolean not null default false
);

-- O que você já marcou no checklist. Cada item tem uma chave de texto.
create table if not exists public.marcados (
  chave          text primary key,
  marcado        boolean not null default true,
  atualizado_em  timestamptz not null default now()
);

-- Visitas do portfólio, pras métricas. Não guarda nada de quem visita:
-- só a data, a página e de onde a pessoa veio (Instagram, Google...).
create table if not exists public.visitas (
  id      bigint generated always as identity primary key,
  data    timestamptz not null default now(),
  pagina  text not null default '/',
  origem  text not null default 'direto'
);


-- ---------------------------------------------------------------------
-- 3. A TRANCA (RLS) LIGADA EM TODAS AS TABELAS
-- Com o RLS ligado, ninguém lê nem escreve nada, a não ser que uma
-- regra abaixo deixe.
-- ---------------------------------------------------------------------
alter table public.videos     enable row level security;
alter table public.marcas     enable row level security;
alter table public.calendario enable row level security;
alter table public.campanhas  enable row level security;
alter table public.marcados   enable row level security;
alter table public.visitas    enable row level security;


-- ---------------------------------------------------------------------
-- 4. A REGRA PRINCIPAL: SÓ A LUANA LOGADA LÊ E ESCREVE
-- Uma regra por tabela, valendo pra ler, criar, editar e apagar.
-- ---------------------------------------------------------------------
drop policy if exists "dona faz tudo" on public.videos;
create policy "dona faz tudo" on public.videos
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());

drop policy if exists "dona faz tudo" on public.marcas;
create policy "dona faz tudo" on public.marcas
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());

drop policy if exists "dona faz tudo" on public.calendario;
create policy "dona faz tudo" on public.calendario
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());

drop policy if exists "dona faz tudo" on public.campanhas;
create policy "dona faz tudo" on public.campanhas
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());

drop policy if exists "dona faz tudo" on public.marcados;
create policy "dona faz tudo" on public.marcados
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());

drop policy if exists "dona faz tudo" on public.visitas;
create policy "dona faz tudo" on public.visitas
  for all to authenticated using (public.eh_dona()) with check (public.eh_dona());


-- ---------------------------------------------------------------------
-- 5. AS EXCEÇÕES (SÓ ESTAS TRÊS)
-- a) Qualquer pessoa pode CRIAR uma marca, mas só como "lead" vindo
--    do formulário do site. Não consegue ler nem mexer em nada.
-- b) Qualquer pessoa pode CRIAR uma visita. Também não lê nada.
-- c) Qualquer pessoa pode LER os vídeos marcados como visíveis
--    (e que não são exemplo), porque o site precisa mostrar eles.
--    Vídeos escondidos continuam trancados.
-- ---------------------------------------------------------------------
drop policy if exists "site cria lead" on public.marcas;
create policy "site cria lead" on public.marcas
  for insert to anon
  with check (situacao = 'lead' and origem = 'site' and exemplo = false
              and length(nome) <= 200 and length(obs) <= 4000);

drop policy if exists "site registra visita" on public.visitas;
create policy "site registra visita" on public.visitas
  for insert to anon
  with check (length(pagina) <= 300 and length(origem) <= 100);

drop policy if exists "site le videos visiveis" on public.videos;
create policy "site le videos visiveis" on public.videos
  for select to anon
  using (visivel = true and exemplo = false);

-- Permissões básicas de acesso às tabelas (a tranca acima continua
-- decidindo linha por linha o que cada um pode fazer).
grant usage on schema public to anon, authenticated;
grant select on public.videos to anon;
grant insert on public.marcas, public.visitas to anon;
grant select, insert, update, delete on
  public.videos, public.marcas, public.calendario,
  public.campanhas, public.marcados, public.visitas
  to authenticated;


-- ---------------------------------------------------------------------
-- 6. UMA LINHA DE EXEMPLO EM CADA LISTA
-- Só entra se a tabela estiver vazia. Fica marcada como exemplo, não
-- aparece no site e não conta nas métricas. Apague pelo painel.
-- ---------------------------------------------------------------------
insert into public.videos (titulo, link, nicho, formato, marca, destaque, ordem, visivel, exemplo)
select 'Exemplo: vídeo de demonstração', 'https://youtube.com/shorts/CODIGO', 'skincare',
       'Demonstração de uso', 'Marca Exemplo', '', 0, true, true
where not exists (select 1 from public.videos);

insert into public.marcas (nome, instagram, email, telefone, situacao, obs, ultimo_contato, exemplo)
select 'Exemplo: Marca Fictícia', '@marcaficticia', 'contato@marcaficticia.com', '11900000000',
       'lead', 'Linha de exemplo, pode apagar.', current_date, true
where not exists (select 1 from public.marcas);

insert into public.calendario (titulo, marca, tipo, data, status, exemplo)
select 'Exemplo: gravar vídeo de unboxing', 'Marca Exemplo', 'gravar', current_date + 2, 'a fazer', true
where not exists (select 1 from public.calendario);

insert into public.campanhas (campanha, cliente, tipo, status, qtd, valor, prazo, pagamento, ativa, favorita, exemplo)
select 'Exemplo: campanha de lançamento', 'Marca Exemplo', 'Conteúdo', 'Briefing', 1, 0,
       current_date + 7, 'pendente', true, false, true
where not exists (select 1 from public.campanhas);
