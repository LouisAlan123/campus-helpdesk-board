CREATE TABLE IF NOT EXISTS help_requests (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(50) NOT NULL,
    message VARCHAR(200) NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);
