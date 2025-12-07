// create-task/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

interface CreateTaskPayload {
    application_id: string;
    task_type: 'call' | 'email' | 'review';
    due_at: string;
}

// Check if the provided type is one of the allowed values
const isValidTaskType = (type: string): type is CreateTaskPayload['task_type'] => {
    const validTypes: Array<string> = ['call', 'email', 'review'];
    return validTypes.includes(type);
}

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method Not Allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    let payload: CreateTaskPayload;
    try {
        payload = await req.json();
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Invalid JSON body' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const { application_id, task_type, due_at } = payload;

    // Input Validation
    if (!application_id || !task_type || !due_at) {
        return new Response(
            JSON.stringify({ error: 'Missing required fields: application_id, task_type, or due_at' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!isValidTaskType(task_type)) {
        return new Response(
            JSON.stringify({ error: `Invalid task_type: must be 'call', 'email', or 'review'` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    // Validate due_at is a valid date in the future
    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
        return new Response(
            JSON.stringify({ error: 'due_at must be a valid date and in the future' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Initialize Supabase client using the Service Role Key to bypass RLS
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false } }
    );

    try {
        // Insert into tasks table
        const { data, error: dbError } = await supabase
            .from('tasks')
            .insert({
                related_id: application_id,
                type: task_type,
                due_at: due_at,
                // Placeholder tenant_id; should be derived in production
                tenant_id: '00000000-0000-0000-0000-000000000000',
                title: `New ${task_type} for Application ${application_id.substring(0, 8)}...`
            })
            .select('id')
            .single();

        if (dbError) {
            console.error('Supabase Insert Error:', dbError);
            throw new Error(dbError.message);
        }

        const task_id = data.id;

        // Emit a Supabase Realtime broadcast event
        const { error: broadcastError } = await supabase.realtime
            .channel('tasks-channel')
            .send({
                type: 'broadcast',
                event: 'task.created',
                payload: { task_id, application_id, task_type },
            });
            
        if (broadcastError) {
             console.warn('Realtime Broadcast Warning:', broadcastError);
        }

        // Return success response
        return new Response(
            JSON.stringify({
                success: true,
                task_id: task_id,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Edge Function Fatal Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error during task creation' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});