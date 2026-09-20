-- Limit function for preference table: prevents a user from exceeding 10 preferences per resource
CREATE OR REPLACE FUNCTION check_preference_limit() RETURNS trigger AS $$
  DECLARE
    pref_count INT;
  BEGIN
    SELECT COUNT(*) INTO pref_count
    FROM preference
    WHERE "userId" = NEW."userId" AND "resourceName" = NEW."resourceName";

    IF pref_count >= 10 THEN
      RAISE EXCEPTION 'Preference limit reached: a user cannot have more than 10 preferences per table.';
    END IF;

    RETURN NEW;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTEAD OF trigger function for the preferences view
-- This function handles INSERT, UPDATE, DELETE operations on the preferences view
-- by converting them to operations on the underlying preference table
CREATE OR REPLACE FUNCTION iud_preference() RETURNS trigger AS $$
  DECLARE
    fork_name TEXT;
    fork_n    INT;
    fork_id   INT;
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO preference ("userId", "resourceName", name, conf, "creatorId", "creatorName")
      VALUES (NEW."userId", NEW."resourceName", NEW.name, NEW.conf, NEW."creatorId", NEW."creatorName")
      RETURNING id INTO NEW.id;

      IF NEW."isActive" IS TRUE THEN
        INSERT INTO preference_selection ("userId", "resourceName", "preferenceId")
        VALUES (NEW."userId", NEW."resourceName", NEW.id)
        ON CONFLICT ("userId", "resourceName")
        DO UPDATE SET "preferenceId" = EXCLUDED."preferenceId";
      END IF;

      RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD."userId" IS NULL THEN
        -- Template row: never mutated directly. A genuine name/conf change (not just
        -- the frontend re-sending the same values) forks a personal copy instead
        -- (and selects it); a plain isActive=true just selects the template as-is -
        -- preference_selection can point straight at a template id.
        IF (NEW.name IS NOT NULL AND NEW.name IS DISTINCT FROM OLD.name)
           OR (NEW.conf IS NOT NULL AND NEW.conf IS DISTINCT FROM OLD.conf) THEN
          fork_name := COALESCE(NEW.name, OLD.name) || ' (copy)';
          fork_n := 1;
          WHILE EXISTS (
            SELECT 1 FROM preference
            WHERE "userId" = NEW."updaterId" AND "resourceName" = OLD."resourceName" AND name = fork_name
          ) LOOP
            fork_n := fork_n + 1;
            fork_name := COALESCE(NEW.name, OLD.name) || ' (copy ' || fork_n || ')';
          END LOOP;

          INSERT INTO preference ("userId", "resourceName", name, conf, "creatorId", "creatorName")
          VALUES (NEW."updaterId", OLD."resourceName", fork_name, COALESCE(NEW.conf, OLD.conf), NEW."updaterId", NEW."updaterName")
          RETURNING id INTO fork_id;

          INSERT INTO preference_selection ("userId", "resourceName", "preferenceId")
          VALUES (NEW."updaterId", OLD."resourceName", fork_id)
          ON CONFLICT ("userId", "resourceName")
          DO UPDATE SET "preferenceId" = EXCLUDED."preferenceId";
        ELSIF NEW."isActive" IS TRUE THEN
          INSERT INTO preference_selection ("userId", "resourceName", "preferenceId")
          VALUES (NEW."updaterId", OLD."resourceName", OLD.id)
          ON CONFLICT ("userId", "resourceName")
          DO UPDATE SET "preferenceId" = EXCLUDED."preferenceId";
        END IF;

      ELSE
        -- Personal preference: only the owner can update it.
        IF OLD."userId" != NEW."updaterId" THEN
          RAISE EXCEPTION 'Preference (id=%) does not belong to user %.', OLD.id, NEW."updaterId";
        END IF;

        UPDATE preference SET
          name          = COALESCE(NEW.name, name),
          conf          = COALESCE(NEW.conf, conf),
          "updaterId"   = NEW."updaterId",
          "updaterName" = NEW."updaterName",
          "updatedAt"   = NOW()
        WHERE id = OLD.id;

        IF NEW."isActive" IS TRUE THEN
          INSERT INTO preference_selection ("userId", "resourceName", "preferenceId")
          VALUES (NEW."updaterId", NEW."resourceName", OLD.id)
          ON CONFLICT ("userId", "resourceName")
          DO UPDATE SET "preferenceId" = EXCLUDED."preferenceId";
        END IF;
      END IF;

      RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
      DELETE FROM preference WHERE id = OLD.id;
      RETURN OLD;

    END IF;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevents deleting a template preference ("userId" IS NULL), regardless of whether the
-- delete comes through the preferences view or directly on the preference table
CREATE OR REPLACE FUNCTION check_preference_template_delete() RETURNS trigger AS $$
  BEGIN
    IF OLD."userId" IS NULL THEN
      RAISE EXCEPTION 'A template preference (id=%) cannot be deleted.', OLD.id;
    END IF;

    RETURN OLD;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevents a user's own preference from reusing a template's name for the same resource
CREATE OR REPLACE FUNCTION check_preference_template_name() RETURNS trigger AS $$
  BEGIN
    IF NEW."userId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM preference
      WHERE "userId" IS NULL AND "resourceName" = NEW."resourceName" AND name = NEW.name
    ) THEN
      RAISE EXCEPTION 'A preference cannot use the same name (%) as a template for resource %.', NEW.name, NEW."resourceName";
    END IF;

    RETURN NEW;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
