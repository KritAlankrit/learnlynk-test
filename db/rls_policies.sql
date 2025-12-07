-- rls_policies.sql

-- DUMMY TABLE for team check
CREATE TABLE IF NOT EXISTS user_teams (
    user_id uuid,
    team_id uuid NOT NULL,
    PRIMARY KEY (user_id, team_id)
);

-- Enable RLS on the leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS policy for SELECT: Admins can read all, Counselors can read their own or their team's leads.
CREATE POLICY "Leads access for Admins and Counselors"
ON leads FOR SELECT
USING (
    (auth.jwt() ->> 'role' = 'admin')
    OR
    (
        auth.jwt() ->> 'role' = 'counselor'
        AND
        (
            owner_id = auth.uid()
            OR
            owner_id IN (
                SELECT
                    ut2.user_id
                FROM
                    user_teams ut1
                JOIN
                    user_teams ut2
                    ON ut1.team_id = ut2.team_id
                WHERE
                    ut1.user_id = auth.uid()
            )
        )
    )
);

-- RLS policy for INSERT: Only Admins and Counselors can create leads.
CREATE POLICY "Allow Admins and Counselors to create leads"
ON leads FOR INSERT
WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin')
    OR
    (auth.jwt() ->> 'role' = 'counselor')
);