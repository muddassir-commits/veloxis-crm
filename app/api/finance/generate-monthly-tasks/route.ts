import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET or shared secret
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 2. Fetch active clients
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active');

    if (clientsErr) throw clientsErr;

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients found.' });
    }

    const currentYear = new Date().getFullYear();
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const currentMonthName = months[new Date().getMonth()];
    const monthYearStr = `${currentMonthName} ${currentYear}`;

    // Add days utility
    const addDays = (date: Date, days: number) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().slice(0, 10);
    };

    const firstOfMonth = new Date(currentYear, new Date().getMonth(), 1);
    const generatedTasks = [];

    // 3. For each active client, analyze services and insert standard tasks
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const services = client.services || [];
      const tasksToCreate = [];

      // A. SEO tasks
      if (services.includes('seo')) {
        tasksToCreate.push(
          {
            title: 'Weekly GBP Post (x4) — Local SEO',
            description: 'Draft and schedule 4 Google Business Profile updates highlighting core services and customer reviews.',
            instructions: 'Ensure target keywords are in captions and use matching high-quality local images.',
            priority: 'medium',
            department: 'seo',
            due_offset: 7,
            estimated_hours: 2,
          },
          {
            title: 'Keyword Rankings Analysis',
            description: 'Run keyword rankings report and map shifts compared to the previous month.',
            instructions: 'Extract top keyword changes from Search Console and GA4 tracking and save rankings table.',
            priority: 'medium',
            department: 'seo',
            due_offset: 25,
            estimated_hours: 3,
          },
          {
            title: 'Citations & Directory Audits',
            description: 'Register and sync citations across 5 standard digital local directories.',
            instructions: 'Verify NAP consistency (Name, Address, Phone) exactly matching canonical profile details.',
            priority: 'low',
            department: 'seo',
            due_offset: 14,
            estimated_hours: 4,
          }
        );
      }

      // B. Social Media tasks
      if (services.includes('smm') || services.includes('social')) {
        tasksToCreate.push(
          {
            title: 'Monthly Content Calendar Planning',
            description: 'Develop full monthly calendar containing post ideas, graphics assets, and captions.',
            instructions: 'Plan out a cohesive aesthetic feed grid, write engaging captions, and assign posting templates.',
            priority: 'high',
            department: 'social',
            due_offset: 3,
            estimated_hours: 6,
          },
          {
            title: 'Social Graphic Design (16 posts)',
            description: 'Design 16 graphics template variants matching brand color tokens.',
            instructions: 'Export designs in standard high-res grid layout matching Instagram carousel sizes.',
            priority: 'high',
            department: 'social',
            due_offset: 10,
            estimated_hours: 8,
          }
        );
      }

      // C. Google or Meta Ads tasks
      if (services.includes('ads') || services.includes('google_ads') || services.includes('meta_ads')) {
        tasksToCreate.push(
          {
            title: 'Paid Ads Performance Check',
            description: 'Analyze campaigns CPL, conversions, spend metrics, and pacing trends.',
            instructions: 'Compile spend curves, flag high CPC ad groups, and review search terms for negative keywords.',
            priority: 'high',
            department: 'ads',
            due_offset: 5,
            estimated_hours: 3,
          }
        );
      }

      // If no tasks were identified, push a general account review task
      if (tasksToCreate.length === 0) {
        tasksToCreate.push({
          title: 'Account Strategy Review',
          description: 'Review client account deliverables, log client check-in call notes, and set next priorities.',
          instructions: 'Discuss account health status with owner and sync dashboard tasks checklist.',
          priority: 'medium',
          department: 'content',
          due_offset: 15,
          estimated_hours: 2,
        });
      }

      // Insert tasks to database
      for (const t of tasksToCreate) {
        const { data: task, error: taskErr } = await supabase
          .from('tasks')
          .insert({
            client_id: client.id,
            title: t.title,
            description: t.description,
            instructions: t.instructions,
            status: 'todo',
            priority: t.priority,
            due_date: addDays(firstOfMonth, t.due_offset),
            month_year: monthYearStr,
            assigned_to: client.assigned_to || null,
            estimated_hours: t.estimated_hours,
            department: t.department,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (taskErr) {
          console.error(`Error generating task for client ${client.name}:`, taskErr);
          continue;
        }

        generatedTasks.push(task);
      }
    }

    // 4. Broadcast notification to admins
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    if (admins && admins.length > 0 && generatedTasks.length > 0) {
      const notifs = admins.map((a) => ({
        user_id: a.id,
        type: 'task_submitted',
        title: '📋 Monthly Deliverables Scheduled',
        message: `Automated deliverables complete: generated ${generatedTasks.length} assigned student tasks for active clients.`,
        link: '/dashboard/deliverables',
        is_read: false,
        priority: 'normal',
      }));
      await supabase.from('notifications').insert(notifs);
    }

    return NextResponse.json({
      success: true,
      message: `Tasks generated successfully: ${generatedTasks.length} tasks scheduled.`,
      count: generatedTasks.length,
    });
  } catch (err: any) {
    console.error('[Generate Monthly Tasks API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate monthly tasks' }, { status: 500 });
  }
}

// Support GET for testing convenience
export async function GET(req: NextRequest) {
  return POST(req);
}
