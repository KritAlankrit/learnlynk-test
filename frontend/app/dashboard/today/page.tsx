// frontend/app/dashboard/today/page.tsx

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Types ---
interface Task {
    id: string;
    title: string | null;
    related_id: string;
    due_at: string;
    status: 'pending' | 'completed';
}

const supabase = createClientComponentClient();

// --- API Functions ---

async function fetchTasksDueToday(): Promise<Task[]> {
    // Define today's date range (start of day to end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { data, error } = await supabase
        .from('tasks')
        .select(`id, title, related_id, due_at, status`)
        .gte('due_at', today.toISOString())
        .lt('due_at', tomorrow.toISOString())
        .eq('status', 'pending')
        .order('due_at', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }
    
    return data as Task[];
}

async function markTaskComplete(taskId: string): Promise<void> {
    const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed' })
        .eq('id', taskId);

    if (error) {
        throw new Error(error.message);
    }
}


// --- Main Component ---
export default function DashboardTodayPage() {
    const queryClient = useQueryClient();

    const { data: tasks, isLoading, error } = useQuery({
        queryKey: ['tasksDueToday'],
        queryFn: fetchTasksDueToday,
    });

    const mutation = useMutation({
        mutationFn: markTaskComplete,
        onSuccess: () => {
            // Invalidate the query cache to re-fetch and update the UI
            queryClient.invalidateQueries({ queryKey: ['tasksDueToday'] });
        },
    });

    const handleMarkComplete = (taskId: string) => {
        if (mutation.isPending) return;
        mutation.mutate(taskId);
    };


    // Loading and Error States
    if (isLoading) {
        return <div className="p-8 text-center">Loading tasks for today...</div>;
    }

    if (error) {
        return <div className="p-8 text-red-600 border border-red-300 rounded">Error loading tasks: {error.message}</div>;
    }

    if (!tasks || tasks.length === 0) {
        return <div className="p-8 text-center">🎉 No pending tasks due today!</div>;
    }

    // Task List Table
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">🎯 Today's Task Dashboard</h1>
            
            {mutation.isPending && (
                <div className="p-3 mb-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
                    Updating task status...
                </div>
            )}
            {mutation.isError && (
                <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-800 rounded">
                    Failed to complete task: {mutation.error.message}
                </div>
            )}

            <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Related Application ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                        <tr key={task.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title || task.type.toUpperCase()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.related_id.substring(0, 8)}...</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(task.due_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                    {task.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => handleMarkComplete(task.id)}
                                    disabled={mutation.isPending}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    Mark Complete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}