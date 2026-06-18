-- FK on parent_id is incompatible with async batched ingestion:
-- parent and child spans can arrive in different batches in any order.
-- The recursive CTE that reconstructs traces works purely on the value of
-- parent_id — it does not rely on a FK constraint.
ALTER TABLE runs DROP CONSTRAINT IF EXISTS runs_parent_id_fkey;
