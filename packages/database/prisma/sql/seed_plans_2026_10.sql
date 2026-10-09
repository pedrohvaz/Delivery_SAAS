-- Planos da página de vendas (outubro/2026): Starter grátis, PRO e Elite com preço por período.
-- Rode DEPOIS de add_plan_prices.sql. Idempotente: não mexe em plano ou preço que já existe.
-- Desconto por período pago adiantado: 3 meses -5%, 6 meses -10%, 12 meses -20%.
-- Os preços na Stripe são criados depois, pelo botão "Sincronizar com a Stripe" do superadmin.

INSERT INTO "Plan" ("id", "slug", "name", "tagline", "monthlyPrice", "features", "limits", "color", "highlight", "badge", "isActive", "position", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'gratis', 'Starter', 'Para começar a vender pelo seu link', 0,
   '["Até 50 pedidos por mês", "Cardápio digital com o nome da loja", "1 usuário no painel", "Relatório simples"]'::jsonb,
   '{"maxOrders": 50, "maxUsers": 1}'::jsonb, 'from-gray-400 to-gray-500', false, NULL, true, 0, now(), now()),
  (gen_random_uuid()::text, 'pro', 'PRO', 'Para a lanchonete que vende todo dia', 99.90,
   '["Pedidos ilimitados", "WhatsApp automático de pedidos", "Pix automático com validação", "Caixa de balcão (PDV)"]'::jsonb,
   '{}'::jsonb, 'from-orange-500 to-pink-500', true, 'Mais escolhido', true, 1, now(), now()),
  (gen_random_uuid()::text, 'elite', 'Elite', 'Para quem quer IA e mais de uma loja', 249.00,
   '["Tudo do PRO", "Atendente com IA no WhatsApp", "Várias lojas no mesmo painel", "Programa de fidelidade"]'::jsonb,
   '{}'::jsonb, 'from-purple-500 to-indigo-600', false, NULL, true, 2, now(), now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "PlanPrice" ("id", "planId", "cycle", "monthlyPrice", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", v.cycle::"BillingCycle", v.price, now(), now()
FROM (VALUES
  ('pro',   'MONTHLY',    99.90),
  ('pro',   'QUARTERLY',  94.90),
  ('pro',   'SEMIANNUAL', 89.90),
  ('pro',   'ANNUAL',     79.90),
  ('elite', 'MONTHLY',    249.00),
  ('elite', 'QUARTERLY',  237.00),
  ('elite', 'SEMIANNUAL', 224.00),
  ('elite', 'ANNUAL',     199.00)
) AS v(slug, cycle, price)
JOIN "Plan" p ON p."slug" = v.slug
ON CONFLICT ("planId", "cycle") DO NOTHING;
