   create table book (
     id serial primary key,
     title text not null,
     copies_available int not null check (copies_available >= 0)
   );

   create table loan (
     id serial primary key,
     book_id int not null references book(id),
     member text not null,
     borrowed_at timestamptz not null default now()
   );

   create function borrow_book(p_book_id int, p_member text)
   returns int language plpgsql as $$
   declare v_id int;
   begin
     perform 1 from book where id = p_book_id for update;
     if not found then
       raise exception 'Book not found';
     end if;

     if (select copies_available from book where id = p_book_id) < 1 then
       raise exception 'No copies available';
     end if;

     update book set copies_available = copies_available - 1 where id = p_book_id;
     insert into loan (book_id, member) values (p_book_id, p_member)
       returning id into v_id;
     return v_id;
   end $$;