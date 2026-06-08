with ranked_unlocks as (
  select
    id,
    row_number() over (
      partition by sort_run_id, stripe_checkout_session_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from payments
  where stripe_checkout_session_id in ('billing_deferred', 'dev_bypass')
)
delete from payments
using ranked_unlocks
where payments.id = ranked_unlocks.id
  and ranked_unlocks.duplicate_rank > 1;

create unique index if not exists idx_payments_unique_zero_dollar_sort_unlock
  on payments (sort_run_id, stripe_checkout_session_id)
  where stripe_checkout_session_id in ('billing_deferred', 'dev_bypass');
