# LearnLynk Technical Test Submission Notes

## Section 5: Stripe Checkout Integration Explanation

The detailed explanation for implementing Stripe Checkout is provided in the separate file: **`stripe_integration.txt`**.

## Technical Assumptions and Notes

1.  **Section 1 & 2 (SQL Schema and RLS):**
    * **Updating `updated_at`:** I included a generic trigger function (`update_updated_at_column`) on all three tables (`leads`, `applications`, `tasks`) to automatically manage the `updated_at` timestamp on every row update.
    * **RLS Team Access:** The RLS policies for `leads` rely on the existence of a `user_teams` table to join a counselor (identified by `auth.uid()`) to the owners of other leads within their team.
    * **JWT Role:** The RLS logic assumes the user's JSON Web Token (JWT) contains a top-level key named `role` with values like `"admin"` or `"counselor"`.

2.  **Section 3 (Edge Function):**
    * **Environment Variables:** The TypeScript code assumes the Edge Function environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured for using the Supabase client with the necessary service role permissions.
    * **`tenant_id`:** I used a placeholder UUID for `tenant_id` during insertion. In a real-world scenario, this value would be derived from the user's JWT or the application context to ensure proper multi-tenancy.
    * **Realtime:** The broadcast is sent over a Realtime channel named `'tasks-channel'`.

3.  **Section 4 (Frontend Exercise):**
    * **Dependencies:** The component assumes a Next.js environment with the App Router, and external libraries like `@supabase/auth-helpers-nextjs` and `@tanstack/react-query` are installed and configured globally for data management.
    * **Task Status:** The implementation relies on the `tasks` table having an implicit `status` column (with values like `'pending'` and `'completed'`) to handle the "Mark Complete" mutation and filtering.
    * **Styling:** Basic class names (like `bg-yellow-100`) were used to provide visual clarity for loading/error states, assuming a framework like Tailwind CSS is present.