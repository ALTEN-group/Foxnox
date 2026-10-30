-- Insert default categories. `name` is the internal key, `trans` the localized names.
INSERT INTO security_question_category (id, name, trans, "creatorId", "creatorName") VALUES
(1, 'personal', '{
    "en": "Personal",
    "fr": "Personnel"'
    -- ,"es": "Personal",
    -- "de": "Persönlich",
    -- "it": "Personale",
    -- "pt": "Pessoal"
  '}', -1, 'system'),
(2, 'family', '{
    "en": "Family",
    "fr": "Famille"'
    -- ,"es": "Familia",
    -- "de": "Familie",
    -- "it": "Famiglia",
    -- "pt": "Família"
  '}', -1, 'system'),
(3, 'work', '{
    "en": "Work",
    "fr": "Travail"'
    -- ,"es": "Trabajo",
    -- "de": "Arbeit",
    -- "it": "Lavoro",
    -- "pt": "Trabalho"
  '}', -1, 'system'),
(4, 'favorites', '{
    "en": "Favorites",
    "fr": "Favoris"'
    -- ,"es": "Favoritos",
    -- "de": "Favoriten",
    -- "it": "Preferiti",
    -- "pt": "Favoritos"
  '}', -1, 'system'),
(5, 'education', '{
    "en": "Education",
    "fr": "Éducation"'
    -- ,"es": "Educación",
    -- "de": "Bildung",
    -- "it": "Formazione",
    -- "pt": "Educação"
  '}', -1, 'system')
;


-- Insert default security questions. `question` is the internal label and the
-- fallback text; `trans` holds the localized texts keyed by language.
INSERT INTO security_question (id, question, trans, "categoryId", active, "creatorId", "creatorName") VALUES
(1, 'First pet name', '{
    "en": "What was the name of your first pet?",
    "fr": "Quel était le nom de votre premier animal de compagnie?"'
    -- ,"es": "¿Cuál era el nombre de tu primera mascota?",
    -- "de": "Wie hieß Ihr erstes Haustier?",
    -- "it": "Qual era il nome del tuo primo animale domestico?",
    -- "pt": "Qual era o nome do seu primeiro animal de estimação?"
  '}', 1, TRUE, -1, 'system'),
(2, 'Mother maiden name', '{
    "en": "What is your mother''s maiden name?",
    "fr": "Quel est le nom de jeune fille de votre mère?"'
    -- ,"es": "¿Cuál es el apellido de soltera de tu madre?",
    -- "de": "Wie lautet der Mädchenname Ihrer Mutter?",
    -- "it": "Qual è il cognome da nubile di tua madre?",
    -- "pt": "Qual é o nome de solteira da sua mãe?"
  '}', 2, TRUE, -1, 'system'),
(3, 'First school name', '{
    "en": "What was the name of your first school?",
    "fr": "Quel était le nom de votre première école?"'
    -- ,"es": "¿Cuál era el nombre de tu primera escuela?",
    -- "de": "Wie hieß Ihre erste Schule?",
    -- "it": "Qual era il nome della tua prima scuola?",
    -- "pt": "Qual era o nome da sua primeira escola?"
  '}', 5, TRUE, -1, 'system'),
(4, 'City of birth', '{
    "en": "In what city were you born?",
    "fr": "Dans quelle ville êtes-vous né(e)?"'
    -- ,"es": "¿En qué ciudad naciste?",
    -- "de": "In welcher Stadt wurden Sie geboren?",
    -- "it": "In che città sei nato/a?",
    -- "pt": "Em que cidade você nasceu?"
  '}', 1, TRUE, -1, 'system'),
(5, 'Childhood nickname', '{
    "en": "What was your childhood nickname?",
    "fr": "Quel était votre surnom d''enfance?"'
    -- ,"es": "¿Cuál era tu apodo de la infancia?",
    -- "de": "Wie lautete Ihr Kindheitsspitzname?",
    -- "it": "Qual era il tuo soprannome da bambino/a?",
    -- "pt": "Qual era o seu apelido de infância?"
  '}', 1, TRUE, -1, 'system'),
(6, 'Favorite childhood friend name', '{
    "en": "What is the name of your favorite childhood friend?",
    "fr": "Quel est le nom de votre ami(e) d''enfance préféré(e)?"'
    -- ,"es": "¿Cuál es el nombre de tu amigo/a de la infancia favorito/a?",
    -- "de": "Wie heißt Ihr Lieblingsfreund aus der Kindheit?",
    -- "it": "Qual è il nome del tuo amico/a d''infanzia preferito/a?",
    -- "pt": "Qual é o nome do seu amigo(a) de infância favorito(a)?"
  '}', 1, TRUE, -1, 'system'),
(7, 'Street lived on in third grade', '{
    "en": "What street did you live on in third grade?",
    "fr": "Dans quelle rue habitiez-vous en troisième année?"'
    -- ,"es": "¿En qué calle vivías en tercer grado?",
    -- "de": "In welcher Straße haben Sie in der dritten Klasse gewohnt?",
    -- "it": "In quale strada vivevi in terza elementare?",
    -- "pt": "Em que rua você morava na terceira série?"
  '}', 1, TRUE, -1, 'system'),
(8, 'Childhood phone number including area code', '{
    "en": "What was your childhood phone number including area code?",
    "fr": "Quel était votre numéro de téléphone d''enfance, y compris l''indicatif régional?"'
    -- ,"es": "¿Cuál era tu número de teléfono de la infancia, incluido el código de área?",
    -- "de": "Wie lautete Ihre Telefonnummer aus der Kindheit einschließlich Vorwahl?",
    -- "it": "Qual era il tuo numero di telefono d''infanzia, compreso il prefisso?",
    -- "pt": "Qual era o seu número de telefone de infância, incluindo o código de área?"
  '}', 1, TRUE, -1, 'system'),
(9, 'First stuffed animal name', '{
    "en": "What was the name of your first stuffed animal?",
    "fr": "Quel était le nom de votre premier animal en peluche?"'
    -- ,"es": "¿Cuál era el nombre de tu primer peluche?",
    -- "de": "Wie hieß Ihr erstes Stofftier?",
    -- "it": "Qual era il nome del tuo primo peluche?",
    -- "pt": "Qual era o nome do seu primeiro bicho de pelúcia?"
  '}', 1, TRUE, -1, 'system'),
(10, 'Father birth date', '{
    "en": "In what year was your father born?",
    "fr": "En quelle année votre père est-il né?"'
    -- ,"es": "¿En qué año nació tu padre?",
    -- "de": "In welchem Jahr wurde Ihr Vater geboren?",
    -- "it": "In che anno è nato tuo padre?",
    -- "pt": "Em que ano seu pai nasceu?"
  '}', 2, TRUE, -1, 'system'),
(11, 'First car model', '{
    "en": "What was your first car?",
    "fr": "Quelle était votre première voiture?"'
    -- ,"es": "¿Cuál fue tu primer coche?",
    -- "de": "Was war Ihr erstes Auto?",
    -- "it": "Qual è stata la tua prima macchina?",
    -- "pt": "Qual foi o seu primeiro carro?"
  '}', 1, TRUE, -1, 'system'),
(12, 'First job company name', '{
    "en": "What was the name of the company where you had your first job?",
    "fr": "Quel était le nom de l''entreprise où vous avez eu votre premier emploi?"'
    -- ,"es": "¿Cuál era el nombre de la empresa donde tuviste tu primeiro trabalho?",
    -- "de": "Wie hieß die Firma, in der Sie Ihren ersten Job hatten?",
    -- "it": "Qual era il nome dell''azienda in cui hai avuto il tuo primo lavoro?",
    -- "pt": "Qual era o nome da empresa onde você teve seu primeiro emprego?"
  '}', 3, TRUE, -1, 'system'),
(13, 'Favorite childhood food', '{
    "en": "What was your favorite food as a child?",
    "fr": "Quel était votre plat préféré quand vous étiez enfant?"'
    -- ,"es": "¿Cuál era tu comida favorita de niño/a?",
    -- "de": "Was war Ihr Lieblingsessen als Kind?",
    -- "it": "Qual era il tuo cibo preferito da bambino/a?",
    -- "pt": "Qual era a sua comida favorita quando criança?"
  '}', 4, TRUE, -1, 'system'),
(14, 'First concert attended', '{
    "en": "What was the first concert you attended?",
    "fr": "Quel a été le premier concert auquel vous avez assisté?"'
    -- ,"es": "¿Cuál fue el primer concierto al que asististe?",
    -- "de": "Was war das erste Konzert, das Sie besucht haben?",
    -- "it": "Qual è stato il primo concerto a cui hai assistito?",
    -- "pt": "Qual foi o primeiro show a que você assistiu?"
  '}', 4, TRUE, -1, 'system'),
(15, 'Favorite childhood book', '{
    "en": "What was your favorite book as a child?",
    "fr": "Quel était votre livre préféré quand vous étiez enfant?"'
    -- ,"es": "¿Cuál era tu libro favorito de niño/a?",
    -- "de": "Was war Ihr Lieblingsbuch als Kind?",
    -- "it": "Qual era il tuo libro preferito da bambino/a?",
    -- "pt": "Qual era o seu livro favorito quando criança?"
  '}', 4, TRUE, -1, 'system')
;

-- Reset sequences to avoid conflicts with manual ID insertion
SELECT setval(pg_get_serial_sequence('security_question_category', 'id'), (SELECT MAX(id) FROM security_question_category));
SELECT setval(pg_get_serial_sequence('security_question', 'id'), (SELECT MAX(id) FROM security_question));
