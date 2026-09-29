-- =============================================================================
-- Edição do próprio nome (Configurações → Minha conta).
--
-- `profiles` não aceita escrita direta pela API (papel e ativação só pelo
-- servidor). Esta RPC altera APENAS o nome da conta de quem chama. Vale para a
-- equipe; o nome do cliente vem do cadastro mantido pela equipe.
-- =============================================================================

create function public.update_my_profile(p_full_name text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nome text := btrim(coalesce(p_full_name, ''));
begin
  if not app.is_team() then
    perform app.fail('AL403', 'Você não tem permissão para esta ação.');
  end if;
  if char_length(v_nome) not between 3 and 160 then
    perform app.fail('AL422', 'O nome deve ter entre 3 e 160 caracteres.');
  end if;

  update public.profiles set full_name = v_nome where id = auth.uid();
end
$$;

revoke execute on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;
