-- Nullable so books inserted without an author (e.g. before this migration) stay valid.
alter table book add column author text;
