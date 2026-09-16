ALTER TABLE questions
  ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'Other' AFTER content,
  ADD INDEX idx_questions_category (category);
