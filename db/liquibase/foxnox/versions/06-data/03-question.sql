-- Insert default categories. `name` is the internal key, `trans` the localized names.
INSERT INTO security_question_category (id, name, trans, "creatorId", "creatorName") VALUES
(1, 'personal', '{
    "en": "Personal",
    "fr": "Personnel"
  }', -1, 'system'),
(2, 'family', '{
    "en": "Family",
    "fr": "Famille"
  }', -1, 'system'),
(3, 'work', '{
    "en": "Work",
    "fr": "Travail"
  }', -1, 'system'),
(4, 'favorites', '{
    "en": "Favorites",
    "fr": "Favoris"
  }', -1, 'system'),
(5, 'education', '{
    "en": "Education",
    "fr": "Éducation"
  }', -1, 'system')
;


-- Insert default security questions. `question` is the internal label and the
-- fallback text; `trans` holds the localized texts keyed by language.
INSERT INTO security_question (id, question, trans, "categoryId", active, "creatorId", "creatorName") VALUES
(1, 'First pet name', '{
    "en": "What was the name of your first pet?",
    "fr": "Quel était le nom de votre premier animal de compagnie?"
  }', 1, TRUE, -1, 'system'),
(2, 'Mother maiden name', '{
    "en": "What is your mother''s maiden name?",
    "fr": "Quel est le nom de jeune fille de votre mère?"
  }', 2, TRUE, -1, 'system'),
(3, 'First school name', '{
    "en": "What was the name of your first school?",
    "fr": "Quel était le nom de votre première école?"
  }', 5, TRUE, -1, 'system'),
(4, 'City of birth', '{
    "en": "In what city were you born?",
    "fr": "Dans quelle ville êtes-vous né(e)?"
  }', 1, TRUE, -1, 'system'),
(5, 'Childhood nickname', '{
    "en": "What was your childhood nickname?",
    "fr": "Quel était votre surnom d''enfance?"
  }', 1, TRUE, -1, 'system'),
(6, 'Favorite childhood friend name', '{
    "en": "What is the name of your favorite childhood friend?",
    "fr": "Quel est le nom de votre ami(e) d''enfance préféré(e)?"
  }', 1, TRUE, -1, 'system'),
(7, 'Street lived on in third grade', '{
    "en": "What street did you live on in third grade?",
    "fr": "Dans quelle rue habitiez-vous en troisième année?"
  }', 1, TRUE, -1, 'system'),
(8, 'Childhood phone number including area code', '{
    "en": "What was your childhood phone number including area code?",
    "fr": "Quel était votre numéro de téléphone d''enfance, y compris l''indicatif régional?"
  }', 1, TRUE, -1, 'system'),
(9, 'First stuffed animal name', '{
    "en": "What was the name of your first stuffed animal?",
    "fr": "Quel était le nom de votre premier animal en peluche?"
  }', 1, TRUE, -1, 'system'),
(10, 'Father birth date', '{
    "en": "In what year was your father born?",
    "fr": "En quelle année votre père est-il né?"
  }', 2, TRUE, -1, 'system'),
(11, 'First car model', '{
    "en": "What was your first car?",
    "fr": "Quelle était votre première voiture?"
  }', 1, TRUE, -1, 'system'),
(12, 'First job company name', '{
    "en": "What was the name of the company where you had your first job?",
    "fr": "Quel était le nom de l''entreprise où vous avez eu votre premier emploi?"
  }', 3, TRUE, -1, 'system'),
(13, 'Favorite childhood food', '{
    "en": "What was your favorite food as a child?",
    "fr": "Quel était votre plat préféré quand vous étiez enfant?"
  }', 4, TRUE, -1, 'system'),
(14, 'First concert attended', '{
    "en": "What was the first concert you attended?",
    "fr": "Quel a été le premier concert auquel vous avez assisté?"
  }', 4, TRUE, -1, 'system'),
(15, 'Favorite childhood book', '{
    "en": "What was your favorite book as a child?",
    "fr": "Quel était votre livre préféré quand vous étiez enfant?"
  }', 4, TRUE, -1, 'system')
;

-- Reset sequences to avoid conflicts with manual ID insertion
SELECT setval(pg_get_serial_sequence('security_question_category', 'id'), (SELECT MAX(id) FROM security_question_category));
SELECT setval(pg_get_serial_sequence('security_question', 'id'), (SELECT MAX(id) FROM security_question));
