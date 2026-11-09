-- =====================================================================
-- OPCIONAL: IMPORTAR OS VÍDEOS QUE JÁ ESTÃO NO SEU SITE HOJE
-- Rode DEPOIS do banco.sql, uma vez só (rodar de novo duplica os vídeos).
-- Onde colar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Depois disso, todos os vídeos do site passam a ser editados pelo painel.
-- Os 3 primeiros têm "formato" preenchido, por isso entram no carrossel
-- de Conteúdos de destaque, como hoje.
-- Total: 43 vídeos.
-- =====================================================================
insert into public.videos (titulo, link, nicho, formato, marca, destaque, ordem)
values
('Hyze Pay', 'https://youtube.com/shorts/97-HXwpJuVI', 'tech', 'Explicativo + Demonstração de Plataforma', 'Hyze Pay', '', 0),
('Shop Lumina', 'https://youtube.com/shorts/6Sz8S3cIRu0', 'acessorios', 'Apresentação com foco em conversão', 'Shop Lumina', '', 1),
('Aneethun', 'https://youtube.com/shorts/24u26UN8heI', 'haircare', 'Storytelling + Product Demo', 'Aneethun', '', 2),
('Murano', 'https://youtube.com/shorts/C_-omdb_ENc', 'acessorios', '', 'Murano', '', 3),
('Shop Lumina', 'https://youtube.com/shorts/W82jO15Etxs', 'acessorios', '', 'Shop Lumina', '', 4),
('Murano', 'https://youtube.com/shorts/JzAvji8Ec2Y', 'acessorios', '', 'Murano', '', 5),
('Murano', 'https://youtube.com/shorts/WiEBAE_8pd0', 'acessorios', '', 'Murano', '', 6),
('Murano', 'https://youtube.com/shorts/z-jGkA4PWas', 'acessorios', '', 'Murano', '', 7),
('Carla Art Piercing', 'https://youtube.com/shorts/4LBjncEnFYI', 'acessorios', '', 'Carla Art Piercing', '', 8),
('Donaris', 'https://youtube.com/shorts/0TLwJxj_MzU', 'acessorios', '', 'Donaris', '', 9),
('Murano', 'https://youtube.com/shorts/VJIs8eHMzgM', 'acessorios', '', 'Murano', '', 10),
('Murano', 'https://youtube.com/shorts/Bie9VZ0Ea7Y', 'acessorios', '', 'Murano', '', 11),
('Ráwve', 'https://youtube.com/shorts/a8kUJ7WHUzA', 'skincare', '', 'Ráwve', '', 12),
('Bioderma', 'https://youtube.com/shorts/QnsAOmT-FU4', 'skincare', '', 'Bioderma', '', 13),
('Creamy', 'https://youtube.com/shorts/wpXdIOL0N7s', 'skincare', '', 'Creamy', '', 14),
('Bioderma', 'https://youtube.com/shorts/A4O_IIyDON0', 'skincare', '', 'Bioderma', '', 15),
('Bearry', 'https://youtube.com/shorts/5VCJqJcjFQo', 'skincare', '', 'Bearry', '', 16),
('Alfaparf', 'https://youtube.com/shorts/x2rx5po9DQE', 'haircare', '', 'Alfaparf', '', 17),
('Memoz', 'https://youtube.com/shorts/IfGNWQPhmqA', 'tech', '', 'Memoz', '', 18),
('Memoz', 'https://youtube.com/shorts/V47S1_gikbk', 'tech', '', 'Memoz', '', 19),
('Memoz', 'https://youtube.com/shorts/pFMRNhcr2wc', 'tech', '', 'Memoz', '', 20),
('Memoz', 'https://youtube.com/shorts/G_f4moCMrBQ', 'tech', '', 'Memoz', '', 21),
('Memoz', 'https://youtube.com/shorts/d6QSUycxidY', 'tech', '', 'Memoz', '', 22),
('Memoz', 'https://youtube.com/shorts/bh_xhiUlMKY', 'tech', '', 'Memoz', '', 23),
('Memoz', 'https://youtube.com/shorts/iM2SWXuTrrI', 'tech', '', 'Memoz', '', 24),
('Memoz', 'https://youtube.com/shorts/_3mduJsGbIg', 'tech', '', 'Memoz', '', 25),
('Memoz', 'https://youtube.com/shorts/Ij1I9w_kUpI', 'tech', '', 'Memoz', '', 26),
('Voltpix', 'https://youtube.com/shorts/3LGrdFJXsMQ', 'tech', '', 'Voltpix', '', 27),
('Arara Sport', 'https://youtube.com/shorts/AVFWwZ8dMkM', 'moda', '', 'Arara Sport', '', 28),
('Bruna Bohac', 'https://youtube.com/shorts/qLowoGABsMk', 'moda', '', 'Bruna Bohac', '', 29),
('Ovacare', 'https://youtube.com/shorts/G_ns3HPGY00', 'saude', '', 'Ovacare', '', 30),
('Ráwve', 'https://youtube.com/shorts/ck4g6Ku2WQw', 'saude', '', 'Ráwve', '', 31),
('Ovacare', 'https://youtube.com/shorts/TC2N_R2qW94', 'saude', '', 'Ovacare', '', 32),
('Ovacare', 'https://youtube.com/shorts/X-HMlbF4vRI', 'saude', '', 'Ovacare', '', 33),
('For You', 'https://youtube.com/shorts/xGkAlX-lO3g', 'saude', '', 'For You', '', 34),
('Pet Saudável', 'https://youtube.com/shorts/AAXAckgYRuA', 'pet', '', 'Pet Saudável', '', 35),
('Pet Saudável', 'https://youtube.com/shorts/MNF-CO2xZe8', 'pet', '', 'Pet Saudável', '', 36),
('Collum', 'https://youtube.com/shorts/bUwnsSDJgJY', 'pet', '', 'Collum', '', 37),
('Hydra', 'https://youtube.com/shorts/sXMb6tnK1ks', 'pet', '', 'Hydra', '', 38),
('Memoz', 'https://youtube.com/shorts/GDMQ62FwJoA', 'collab', '', 'Memoz', '', 39),
('Donaris', 'https://youtube.com/shorts/0TLwJxj_MzU', 'collab', '', 'Donaris', '', 40),
('Donaris', 'https://youtube.com/shorts/4Q09qW97u7A', 'collab', '', 'Donaris', '', 41),
('Beta', 'https://youtube.com/shorts/LpdMaae-NLE', 'collab', '', 'Beta', '', 42);
