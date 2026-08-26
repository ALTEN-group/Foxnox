-- Insert default categories
INSERT INTO security_question_category (id, name) VALUES
(1, 'personal'),
(2, 'family'),
(3, 'work'),
(4, 'favorites'),
(5, 'education')
;

-- Insert translations for categories
INSERT INTO security_question_category_trans ("categoryId", lang, trans) VALUES
-- Personal
(1, 'en', 'Personal'),
(1, 'fr', 'Personnel'),
(1, 'es', 'Personal'),
(1, 'de', 'Persönlich'),
(1, 'it', 'Personale'),
(1, 'pt', 'Pessoal'),
-- Family
(2, 'en', 'Family'),
(2, 'fr', 'Famille'),
(2, 'es', 'Familia'),
(2, 'de', 'Familie'),
(2, 'it', 'Famiglia'),
(2, 'pt', 'Família'),
-- Work
(3, 'en', 'Work'),
(3, 'fr', 'Travail'),
(3, 'es', 'Trabajo'),
(3, 'de', 'Arbeit'),
(3, 'it', 'Lavoro'),
(3, 'pt', 'Trabalho'),
-- Favorites
(4, 'en', 'Favorites'),
(4, 'fr', 'Favoris'),
(4, 'es', 'Favoritos'),
(4, 'de', 'Favoriten'),
(4, 'it', 'Preferiti'),
(4, 'pt', 'Favoritos'),
-- Education
(5, 'en', 'Education'),
(5, 'fr', 'Éducation'),
(5, 'es', 'Educación'),
(5, 'de', 'Bildung'),
(5, 'it', 'Formazione'),
(5, 'pt', 'Educação')
;


-- Insert default security questions
INSERT INTO security_question (id, question, "categoryId", active) VALUES
(1, 'First pet name', 1, TRUE),
(2, 'Mother maiden name', 2, TRUE),
(3, 'First school name', 5, TRUE),
(4, 'City of birth', 1, TRUE),
(5, 'Childhood nickname', 1, TRUE),
(6, 'Favorite childhood friend name', 1, TRUE),
(7, 'Street lived on in third grade', 1, TRUE),
(8, 'Childhood phone number including area code', 1, TRUE),
(9, 'First stuffed animal name', 1, TRUE),
(10, 'Father birth date', 2, TRUE),
(11, 'First car model', 1, TRUE),
(12, 'First job company name', 3, TRUE),
(13, 'Favorite childhood food', 4, TRUE),
(14, 'First concert attended', 4, TRUE),
(15, 'Favorite childhood book', 4, TRUE)
;

-- Insert security question translations
INSERT INTO security_question_trans ("questionId", lang, trans) VALUES
-- What was the name of your first pet?
(1, 'en', 'What was the name of your first pet?'),
(1, 'fr', 'Quel était le nom de votre premier animal de compagnie?'),
(1, 'es', '¿Cuál era el nombre de tu primera mascota?'),
(1, 'de', 'Wie hieß Ihr erstes Haustier?'),
(1, 'it', 'Qual era il nome del tuo primo animale domestico?'),
(1, 'pt', 'Qual era o nome do seu primeiro animal de estimação?'),

-- What is your mother''s maiden name?
(2, 'en', 'What is your mother''s maiden name?'),
(2, 'fr', 'Quel est le nom de jeune fille de votre mère?'),
(2, 'es', '¿Cuál es el apellido de soltera de tu madre?'),
(2, 'de', 'Wie lautet der Mädchenname Ihrer Mutter?'),
(2, 'it', 'Qual è il cognome da nubile di tua madre?'),
(2, 'pt', 'Qual é o nome de solteira da sua mãe?'),

-- What was the name of your first school?
(3, 'en', 'What was the name of your first school?'),
(3, 'fr', 'Quel était le nom de votre première école?'),
(3, 'es', '¿Cuál era el nombre de tu primera escuela?'),
(3, 'de', 'Wie hieß Ihre erste Schule?'),
(3, 'it', 'Qual era il nome della tua prima scuola?'),
(3, 'pt', 'Qual era o nome da sua primeira escola?'),

-- In what city were you born?
(4, 'en', 'In what city were you born?'),
(4, 'fr', 'Dans quelle ville êtes-vous né(e)?'),
(4, 'es', '¿En qué ciudad naciste?'),
(4, 'de', 'In welcher Stadt wurden Sie geboren?'),
(4, 'it', 'In che città sei nato/a?'),
(4, 'pt', 'Em que cidade você nasceu?'),

-- What was your childhood nickname?
(5, 'en', 'What was your childhood nickname?'),
(5, 'fr', 'Quel était votre surnom d''enfance?'),
(5, 'es', '¿Cuál era tu apodo de la infancia?'),
(5, 'de', 'Wie lautete Ihr Kindheitsspitzname?'),
(5, 'it', 'Qual era il tuo soprannome da bambino/a?'),
(5, 'pt', 'Qual era o seu apelido de infância?'),

-- What is the name of your favorite childhood friend?
(6, 'en', 'What is the name of your favorite childhood friend?'),
(6, 'fr', 'Quel est le nom de votre ami(e) d''enfance préféré(e)?'),
(6, 'es', '¿Cuál es el nombre de tu amigo/a de la infancia favorito/a?'),
(6, 'de', 'Wie heißt Ihr Lieblingsfreund aus der Kindheit?'),
(6, 'it', 'Qual è il nome del tuo amico/a d''infanzia preferito/a?'),
(6, 'pt', 'Qual é o nome do seu amigo(a) de infância favorito(a)?'),

-- What street did you live on in third grade?
(7, 'en', 'What street did you live on in third grade?'),
(7, 'fr', 'Dans quelle rue habitiez-vous en troisième année?'),
(7, 'es', '¿En qué calle vivías en tercer grado?'),
(7, 'de', 'In welcher Straße haben Sie in der dritten Klasse gewohnt?'),
(7, 'it', 'In quale strada vivevi in terza elementare?'),
(7, 'pt', 'Em que rua você morava na terceira série?'),

-- What was your childhood phone number including area code?
(8, 'en', 'What was your childhood phone number including area code?'),
(8, 'fr', 'Quel était votre numéro de téléphone d''enfance, y compris l''indicatif régional?'),
(8, 'es', '¿Cuál era tu número de teléfono de la infancia, incluido el código de área?'),
(8, 'de', 'Wie lautete Ihre Telefonnummer aus der Kindheit einschließlich Vorwahl?'),
(8, 'it', 'Qual era il tuo numero di telefono d''infanzia, compreso il prefisso?'),
(8, 'pt', 'Qual era o seu número de telefone de infância, incluindo o código de área?'),

-- What was the name of your first stuffed animal?
(9, 'en', 'What was the name of your first stuffed animal?'),
(9, 'fr', 'Quel était le nom de votre premier animal en peluche?'),
(9, 'es', '¿Cuál era el nombre de tu primer peluche?'),
(9, 'de', 'Wie hieß Ihr erstes Stofftier?'),
(9, 'it', 'Qual era il nome del tuo primo peluche?'),
(9, 'pt', 'Qual era o nome do seu primeiro bicho de pelúcia?'),

-- In what year was your father born?
(10, 'en', 'In what year was your father born?'),
(10, 'fr', 'En quelle année votre père est-il né?'),
(10, 'es', '¿En qué año nació tu padre?'),
(10, 'de', 'In welchem Jahr wurde Ihr Vater geboren?'),
(10, 'it', 'In che anno è nato tuo padre?'),
(10, 'pt', 'Em que ano seu pai nasceu?'),

-- What was your first car?
(11, 'en', 'What was your first car?'),
(11, 'fr', 'Quelle était votre première voiture?'),
(11, 'es', '¿Cuál fue tu primer coche?'),
(11, 'de', 'Was war Ihr erstes Auto?'),
(11, 'it', 'Qual è stata la tua prima macchina?'),
(11, 'pt', 'Qual foi o seu primeiro carro?'),

-- What was the name of the company where you had your first job?
(12, 'en', 'What was the name of the company where you had your first job?'),
(12, 'fr', 'Quel était le nom de l''entreprise où vous avez eu votre premier emploi?'),
(12, 'es', '¿Cuál era el nombre de la empresa donde tuviste tu primeiro trabalho?'),
(12, 'de', 'Wie hieß die Firma, in der Sie Ihren ersten Job hatten?'),
(12, 'it', 'Qual era il nome dell''azienda in cui hai avuto il tuo primo lavoro?'),
(12, 'pt', 'Qual era o nome da empresa onde você teve seu primeiro emprego?'),

-- What was your favorite food as a child?
(13, 'en', 'What was your favorite food as a child?'),
(13, 'fr', 'Quel était votre plat préféré quand vous étiez enfant?'),
(13, 'es', '¿Cuál era tu comida favorita de niño/a?'),
(13, 'de', 'Was war Ihr Lieblingsessen als Kind?'),
(13, 'it', 'Qual era il tuo cibo preferito da bambino/a?'),
(13, 'pt', 'Qual era a sua comida favorita quando criança?'),

-- What was the first concert you attended?
(14, 'en', 'What was the first concert you attended?'),
(14, 'fr', 'Quel a été le premier concert auquel vous avez assisté?'),
(14, 'es', '¿Cuál fue el primer concierto al que asististe?'),
(14, 'de', 'Was war das erste Konzert, das Sie besucht haben?'),
(14, 'it', 'Qual è stato il primo concerto a cui hai assistito?'),
(14, 'pt', 'Qual foi o primeiro show a que você assistiu?'),

-- What was your favorite book as a child?
(15, 'en', 'What was your favorite book as a child?'),
(15, 'fr', 'Quel était votre livre préféré quand vous étiez enfant?'),
(15, 'es', '¿Cuál era tu libro favorito de niño/a?'),
(15, 'de', 'Was war Ihr Lieblingsbuch als Kind?'),
(15, 'it', 'Qual era il tuo libro preferito da bambino/a?'),
(15, 'pt', 'Qual era o seu livro favorito quando criança?')
;

-- Reset sequences to avoid conflicts with manual ID insertion
SELECT setval(pg_get_serial_sequence('security_question_category', 'id'), (SELECT MAX(id) FROM security_question_category));
SELECT setval(pg_get_serial_sequence('security_question', 'id'), (SELECT MAX(id) FROM security_question));
