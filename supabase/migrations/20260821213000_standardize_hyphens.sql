-- Standardize hyphens: convert all typographic em-dash (—) and en-dash (–) to standard hyphen (-)

UPDATE training_programs
SET name = REPLACE(REPLACE(name, '—', '-'), '–', '-'),
    name_vi = REPLACE(REPLACE(name_vi, '—', '-'), '–', '-'),
    description = REPLACE(REPLACE(description, '—', '-'), '–', '-');

UPDATE training_program_days
SET name = REPLACE(REPLACE(name, '—', '-'), '–', '-'),
    name_vi = REPLACE(REPLACE(name_vi, '—', '-'), '–', '-');

UPDATE exercises
SET name = REPLACE(REPLACE(name, '—', '-'), '–', '-'),
    name_vi = REPLACE(REPLACE(name_vi, '—', '-'), '–', '-');
