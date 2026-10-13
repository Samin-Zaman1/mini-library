create table app_user (
  id serial primary key,
  username text not null unique,
  password_hash text not null,
  role text not null default 'member' check (role in ('member', 'librarian'))
);

alter table app_user enable row level security;

-- Nullable so existing loans (and borrow_book, which only knows the member name) keep working.
alter table loan
  add column member_id int references app_user(id),
  add column due_date timestamptz not null default now() + interval '14 days',
  add column fine_amount numeric(10, 2) not null default 0 check (fine_amount >= 0),
  add column returned_at timestamptz;

create function return_book(p_loan_id int)
returns void language plpgsql as $$
declare
  v_book_id int;
  v_returned_at timestamptz;
begin
  select book_id, returned_at into v_book_id, v_returned_at
    from loan where id = p_loan_id for update;
  if not found then
    raise exception 'Loan not found';
  end if;

  if v_returned_at is not null then
    raise exception 'Already returned';
  end if;

  perform 1 from book where id = v_book_id for update;

  update loan set returned_at = now() where id = p_loan_id;
  update book set copies_available = copies_available + 1 where id = v_book_id;
end $$;
