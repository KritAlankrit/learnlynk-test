-- schema_and_policies.sql

-- Enable UUID extension for primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to set the 'updated_at' timestamp automatically on every row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- 1. leads Table
CREATE TABLE leads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    owner_id uuid,
    stage text NOT NULL,
    name text NOT NULL,
    email text UNIQUE NOT NULL
);

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Indexing for common queries (owner, stage, created_at)
CREATE INDEX idx_leads_owner_stage_created_at 
ON leads (owner_id, stage, created_at);


-- 2. applications Table
CREATE TABLE applications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    lead_id uuid NOT NULL,

    -- FK: applications references leads(id)
    CONSTRAINT fk_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE RESTRICT
);

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Indexing for fetching applications by lead
CREATE INDEX idx_applications_lead_id
ON applications (lead_id);


-- 3. tasks Table
CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),

    related_id uuid NOT NULL, -- References applications(id)
    title text,
    due_at timestamp with time zone,
    type text NOT NULL,

    -- FK: tasks references applications(id) (as related_id)
    CONSTRAINT fk_application
        FOREIGN KEY (related_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    -- Constraint: due_at must be >= created_at
    CONSTRAINT check_due_date_future_of_creation
        CHECK (due_at >= created_at),

    -- Check constraint: task type must be one of 'call', 'email', or 'review'
    CONSTRAINT check_task_type
        CHECK (type IN ('call', 'email', 'review'))
);

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Indexing for fetching tasks due today
CREATE INDEX idx_tasks_due_at
ON tasks (due_at);