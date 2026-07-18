import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useApp } from '@/lib/store';
import { useThemeEffect } from '@/lib/ui';
import { useIntegrations, refreshAllIntegrations, fetchSpotifyNowPlaying, refreshSpotifyToken, refreshGoogleToken, fetchGmailMessages, fetchDriveStorage, fetchGoogleCalendar } from '@/lib/integrations';
import { mode, supabase } from '@/lib/supabase';
import { requestNotificationPermission, registerPeriodicSync, syncScheduleToSW, buildDailyFireAt, notificationsGranted } from '@/lib/notifications';
import { subscribeToPush } from '@/lib/push';
import AppLayout from '@/components/layout/AppLayout';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Habits from '@/pages/Habits';
import Tasks from '@/pages/Tasks';
import CalendarPage from '@/pages/CalendarPage';
import Planner from '@/pages/Planner';
import Focus from '@/pages/Focus';
import Health from '@/pages/Health';
import Medicine from '@/pages/Medicine';
import Finance from '@/pages/Finance';
import Learning from '@/pages/Learning';
import Goals from '@/pages/Goals';
import Vision from '@/pages/Vision';
import Journal from '@/pages/Journal';
import Reflection from '@/pages/Reflection';
import WeeklyReview from '@/pages/WeeklyReview';
import Analytics from '@/pages/Analytics';
import ScreenTime from '@/pages/ScreenTime';
import Vault from '@/pages/Vault';
import Shopping from '@/pages/Shopping';
import Assistant from '@/pages/Assistant';
import Rewards from '@/pages/Rewards';
import SettingsPage from '@/pages/SettingsPage';
import IntegrationsPage from '@/pages/Integrations';

export default function App() {
  useThemeEffect();
  const onboarded = useApp((s) => s.onboarded);

  // Listen for Supabase Authentication state changes on mount
  useEffect(() => {
    if (mode === 'supabase' && supabase) {
      const restoreBackup = async (userId: string) => {
        try {
          const { data, error } = await supabase!
            .from('user_backups')
            .select('state')
            .eq('user_id', userId)
            .maybeSingle();
          if (data?.state && !error) {
            useApp.setState(data.state);
            if (data.state.integrationsState) {
              useIntegrations.setState(data.state.integrationsState);
            }
          }
        } catch (e) {
          console.error('Failed to restore backup from Supabase:', e);
        }
      };

      // Check current session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Friend';
          useApp.getState().completeOnboarding(name);
          restoreBackup(session.user.id);
        }
      });

      // Listen for updates
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Friend';
          useApp.getState().completeOnboarding(name);
          if (event === 'SIGNED_IN') {
            restoreBackup(session.user.id);
            if (notificationsGranted()) subscribeToPush();
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear all local states so next user doesn't see them
          localStorage.clear();
          window.location.reload();
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Refresh weather + connected integrations on app mount
  useEffect(() => {
    refreshAllIntegrations(useIntegrations.getState(), useApp.getState().updateHealth);

    // Also refresh Spotify every 30s if playing, and keep the Google token fresh
    const interval = setInterval(() => {
      const { spotifyTokens, setSpotifyTrack, setSpotifyTokens, googleTokens, setGoogleTokens, setGmailMessages, setDriveStorage, setGoogleCalendarEvents, config } = useIntegrations.getState();
      if (spotifyTokens) {
        const isValid = spotifyTokens.expires_at > Date.now() + 30_000;
        if (isValid) {
          fetchSpotifyNowPlaying(spotifyTokens).then(setSpotifyTrack).catch(() => null);
        } else if (spotifyTokens.refresh_token) {
          refreshSpotifyToken(config.spotifyClientId, spotifyTokens.refresh_token)
            .then((newToken) => {
              if (newToken) {
                setSpotifyTokens(newToken);
                fetchSpotifyNowPlaying(newToken).then(setSpotifyTrack).catch(() => null);
              }
            })
            .catch(() => null);
        }
      }
      if (googleTokens) {
        const isValid = googleTokens.expires_at > Date.now() + 60_000;
        if (!isValid && googleTokens.refresh_token) {
          refreshGoogleToken(googleTokens.refresh_token)
            .then((newToken) => {
              if (newToken) {
                setGoogleTokens(newToken);
                fetchGmailMessages(newToken).then(setGmailMessages).catch(() => null);
                fetchDriveStorage(newToken).then(setDriveStorage).catch(() => null);
                fetchGoogleCalendar(newToken).then(setGoogleCalendarEvents).catch(() => null);
              }
            })
            .catch(() => null);
        }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // Request notification permission & sync schedule to SW
  useEffect(() => {
    requestNotificationPermission().then((granted) => {
      if (!granted) return;
      registerPeriodicSync();
      subscribeToPush();

      const syncAll = (state: ReturnType<typeof useApp.getState>) => {
        const { habits, medicines, tasks, events } = state;

        // Habit reminders
        const habitSchedule = habits
          .filter((h) => h.reminder)
          .map((h) => ({
            id: `habit-${h.id}`,
            title: `${h.emoji} ${h.name}`,
            body: 'Time to log your habit!',
            fireAt: buildDailyFireAt(h.reminder),
          }));

        // Medicine reminders (morning=07:00, afternoon=13:00, evening=19:00, night=22:00)
        const MED_TIMES: Record<string, string> = { morning: '07:00', afternoon: '13:00', evening: '19:00', night: '22:00' };
        const medSchedule = medicines.flatMap((m) =>
          (Object.entries(m.times) as [string, boolean][]).filter(([, on]) => on).map(([slot]) => ({
            id: `med-${m.id}-${slot}`,
            title: `💊 ${m.name}`,
            body: `Time to take your ${m.name} (${m.dosage})`,
            fireAt: buildDailyFireAt(MED_TIMES[slot] ?? '08:00'),
          }))
        );

        // Task reminders
        const taskSchedule = tasks
          .filter((t) => !t.done && t.dueDate)
          .map((t) => {
            const time = t.dueTime || '09:00';
            const [yr, mo, dy] = t.dueDate.split('-').map(Number);
            const [hr, mn] = time.split(':').map(Number);
            const fireAt = new Date(yr, mo - 1, dy, hr, mn, 0).getTime();
            return {
              id: `task-${t.id}`,
              title: `📋 Task reminder: ${t.title}`,
              body: t.description || 'This task is due now.',
              fireAt,
            };
          })
          .filter((t) => t.fireAt > Date.now());

        // Calendar event reminders
        const eventSchedule = events
          .map((e) => {
            const [yr, mo, dy] = e.date.split('-').map(Number);
            const [hr, mn] = e.start.split(':').map(Number);
            const fireAt = new Date(yr, mo - 1, dy, hr, mn, 0).getTime();
            return {
              id: `event-${e.id}`,
              title: `📅 Event starting: ${e.title}`,
              body: `Starts at ${e.start}`,
              fireAt,
            };
          })
          .filter((e) => e.fireAt > Date.now());

        syncScheduleToSW([
          ...habitSchedule,
          ...medSchedule,
          ...taskSchedule,
          ...eventSchedule
        ]);
      };

      const unsubscribe = useApp.subscribe(syncAll);
      syncAll(useApp.getState());

      return () => unsubscribe();
    });
  }, []);


  if (!onboarded) return <Onboarding />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/health" element={<Health />} />
        <Route path="/medicine" element={<Medicine />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/vision" element={<Vision />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="/review" element={<WeeklyReview />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/screentime" element={<ScreenTime />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
