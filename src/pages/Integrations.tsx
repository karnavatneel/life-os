import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, HardDrive, Calendar, Music, CloudLightning, Wifi, WifiOff, RefreshCw, ExternalLink, ChevronRight, Check, Info, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  useIntegrations,
  connectGoogle,
  connectSpotify,
  fetchGmailMessages,
  fetchDriveStorage,
  fetchGoogleCalendar,
  fetchSpotifyNowPlaying,
  fetchWeather,
  spotifyControl,
} from '@/lib/integrations';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const fade = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' as const },
});

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? 'default' : 'secondary'} className={cn('text-[10px] gap-1', connected && 'accent-gradient border-0 text-white')}>
      {connected ? <Check className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {connected ? 'Connected' : 'Not connected'}
    </Badge>
  );
}

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const store = useIntegrations();
  const [gclientId, setGclientId] = useState(store.config.googleClientId);
  const [sclientId, setSclientId] = useState(store.config.spotifyClientId);
  const [gLoading, setGLoading] = useState(false);
  const [sLoading, setSLoading] = useState(false);
  const [wLoading, setWLoading] = useState(false);

  async function handleSpotifyAction(action: 'play' | 'pause' | 'next' | 'previous') {
    if (!store.spotifyTokens) return;
    try {
      await spotifyControl(action, store.spotifyTokens);
      // Wait a moment and refresh track info to show updated status
      setTimeout(async () => {
        const track = await fetchSpotifyNowPlaying(store.spotifyTokens!);
        store.setSpotifyTrack(track);
      }, 500);
    } catch (err: any) {
      if (err.message === 'Premium Required') {
        toast.error('Spotify Premium is required for player controls');
      } else {
        toast.error('Could not control playback. Make sure Spotify is active.');
      }
    }
  }

  const isGoogleConnected = !!store.googleTokens && store.googleTokens.expires_at > Date.now();
  const isSpotifyConnected = !!store.spotifyTokens && store.spotifyTokens.expires_at > Date.now();

  useEffect(() => {
    setGclientId(store.config.googleClientId);
    setSclientId(store.config.spotifyClientId);
  }, [store.config]);

  async function handleGoogleConnect() {
    store.setConfig({ googleClientId: gclientId });
    setGLoading(true);
    try {
      const tokens = await connectGoogle(gclientId);
      if (tokens) {
        store.setGoogleTokens(tokens);
        toast.success('Google connected!');
        // fetch data immediately
        const [msgs, storage, events] = await Promise.all([
          fetchGmailMessages(tokens),
          fetchDriveStorage(tokens),
          fetchGoogleCalendar(tokens),
        ]);
        store.setGmailMessages(msgs);
        store.setDriveStorage(storage);
        store.setGoogleCalendarEvents(events);
        toast.success(`Loaded ${msgs.length} emails, ${events.length} calendar events`);
      } else {
        toast.error('Google connection cancelled');
      }
    } catch (e) {
      toast.error('Google connection failed — check your Client ID');
    } finally {
      setGLoading(false);
    }
  }

  async function handleSpotifyConnect() {
    store.setConfig({ spotifyClientId: sclientId });
    setSLoading(true);
    try {
      const tokens = await connectSpotify(sclientId);
      if (tokens) {
        store.setSpotifyTokens(tokens);
        toast.success('Spotify connected!');
        const track = await fetchSpotifyNowPlaying(tokens);
        store.setSpotifyTrack(track);
      } else {
        toast.error('Spotify connection cancelled');
      }
    } catch (e) {
      toast.error('Spotify connection failed — check your Client ID');
    } finally {
      setSLoading(false);
    }
  }

  async function handleRefreshWeather() {
    setWLoading(true);
    const w = await fetchWeather();
    store.setWeather(w);
    setWLoading(false);
    if (w) toast.success(`Weather loaded: ${w.emoji} ${w.temp}°C in ${w.city}`);
    else toast.error('Weather fetch failed — allow location access');
  }

  async function handleRefreshGoogle() {
    if (!store.googleTokens) return;
    setGLoading(true);
    const [msgs, storage, events] = await Promise.all([
      fetchGmailMessages(store.googleTokens),
      fetchDriveStorage(store.googleTokens),
      fetchGoogleCalendar(store.googleTokens),
    ]);
    store.setGmailMessages(msgs);
    store.setDriveStorage(storage);
    store.setGoogleCalendarEvents(events);
    setGLoading(false);
    toast.success('Google data refreshed');
  }

  async function handleRefreshSpotify() {
    if (!store.spotifyTokens) return;
    setSLoading(true);
    const track = await fetchSpotifyNowPlaying(store.spotifyTokens);
    store.setSpotifyTrack(track);
    setSLoading(false);
  }

  const drivePct = store.driveStorage ? (store.driveStorage.used / store.driveStorage.limit) * 100 : 0;

  return (
    <Page>
      <PageHeader
        title="Integrations"
        subtitle="Connect your apps for a unified life dashboard"
      />

      {/* ── WEATHER ── */}
      <SectionTitle>🌤️ Live Weather</SectionTitle>
      <motion.div {...fade(0)}>
        <GlassCard className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl accent-gradient-soft flex items-center justify-center text-3xl">
            {store.weather?.emoji ?? '🌍'}
          </div>
          <div className="flex-1 min-w-0">
            {store.weather ? (
              <>
                <div className="font-semibold">{store.weather.temp}°C · {store.weather.desc}</div>
                <div className="text-xs text-muted-foreground">{store.weather.city} · Feels {store.weather.feelsLike}°C · 💧{store.weather.humidity}% · 💨{store.weather.windKph} km/h</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No weather data — tap refresh to load</div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">Powered by Open-Meteo (no API key needed)</div>
          </div>
          <Button size="icon" variant="ghost" onClick={handleRefreshWeather} disabled={wLoading} className="press shrink-0">
            <RefreshCw className={cn('w-4 h-4', wLoading && 'animate-spin')} />
          </Button>
        </GlassCard>
      </motion.div>

      {/* ── GOOGLE ── */}
      <SectionTitle>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold" style={{ background: 'linear-gradient(135deg,#4285F4,#EA4335,#FBBC05,#34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</span>
          </div>
          Google Workspace
          <StatusBadge connected={isGoogleConnected} />
        </div>
      </SectionTitle>
      <motion.div {...fade(1)} className="space-y-3">
        <GlassCard>
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create a Google Cloud project → Enable Gmail, Drive, Calendar APIs → Create OAuth2 credentials (Web application, add <code className="bg-muted px-1 rounded">{window.location.origin}/</code> as redirect URI) → Paste Client ID below.
              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary ml-1 inline-flex items-center gap-0.5">Open Console <ExternalLink className="w-3 h-3" /></a>
            </p>
          </div>
          <Input
            placeholder="Google OAuth2 Client ID (xxxxxx.apps.googleusercontent.com)"
            value={gclientId}
            onChange={(e) => setGclientId(e.target.value)}
            className="mb-3 font-mono text-xs"
          />
          <div className="flex gap-2">
            {isGoogleConnected ? (
              <>
                <Button size="sm" variant="outline" onClick={handleRefreshGoogle} disabled={gLoading} className="flex-1">
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', gLoading && 'animate-spin')} /> Refresh data
                </Button>
                <Button size="sm" variant="destructive" onClick={store.disconnectGoogle}>Disconnect</Button>
              </>
            ) : (
              <Button size="sm" onClick={handleGoogleConnect} disabled={gLoading || !gclientId} className="flex-1 accent-gradient border-0 text-white">
                {gLoading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5 mr-1.5" />}
                Connect Google Account
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Gmail preview */}
        {isGoogleConnected && store.gmailMessages.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-sm">Gmail</span>
              <Badge variant="secondary" className="text-[10px] ml-auto">{store.gmailMessages.filter(m => m.unread).length} unread</Badge>
            </div>
            <div className="space-y-2">
              {store.gmailMessages.slice(0, 5).map((m) => (
                <a key={m.id} href={`https://mail.google.com/mail/u/0/#inbox/${m.id}`} target="_blank" rel="noreferrer" className={cn('block p-2.5 rounded-xl transition-colors hover:bg-muted/60', m.unread ? 'bg-primary/10' : 'bg-muted/40')}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn('text-xs truncate', m.unread ? 'font-semibold' : 'text-muted-foreground')}>{m.subject}</span>
                    {m.unread && <div className="w-2 h-2 rounded-full accent-gradient shrink-0 mt-0.5" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate mt-0.5">{m.from.replace(/<.*>/, '').trim()} · {m.snippet.slice(0, 60)}...</div>
                </a>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Drive storage */}
        {isGoogleConnected && store.driveStorage && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm">Google Drive</span>
              <span className="text-xs text-muted-foreground ml-auto">{store.driveStorage.usedLabel} / {store.driveStorage.limitLabel}</span>
            </div>
            <Progress value={drivePct} className="h-2" />
            <div className="text-[10px] text-muted-foreground mt-1.5">{drivePct.toFixed(1)}% used</div>
          </GlassCard>
        )}

        {/* Google Calendar preview */}
        {isGoogleConnected && store.googleCalendarEvents.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-sm">Google Calendar</span>
              <span className="text-xs text-muted-foreground ml-auto">Next 7 days</span>
            </div>
            <div className="space-y-2">
              {store.googleCalendarEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-2 rounded-xl bg-muted/40">
                  <div className="w-1.5 h-1.5 rounded-full accent-gradient mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{ev.summary}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {ev.start ? (() => { try { return format(parseISO(ev.start), 'EEE, MMM d · h:mm a'); } catch { return ev.start; } })() : ''}
                      {ev.location && ` · 📍${ev.location.slice(0, 30)}`}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* ── SPOTIFY ── */}
      <SectionTitle>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center">
            <Music className="w-3 h-3 text-black" />
          </div>
          Spotify
          <StatusBadge connected={isSpotifyConnected} />
        </div>
      </SectionTitle>
      <motion.div {...fade(2)} className="space-y-3">
        <GlassCard>
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create an app on the Spotify Developer Dashboard → Add <code className="bg-muted px-1 rounded">{window.location.origin}/</code> as Redirect URI → Copy Client ID below.
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-primary ml-1 inline-flex items-center gap-0.5">Open Dashboard <ExternalLink className="w-3 h-3" /></a>
            </p>
          </div>
          <Input
            placeholder="Spotify Client ID"
            value={sclientId}
            onChange={(e) => setSclientId(e.target.value)}
            className="mb-3 font-mono text-xs"
          />
          <div className="flex gap-2">
            {isSpotifyConnected ? (
              <>
                <Button size="sm" variant="outline" onClick={handleRefreshSpotify} disabled={sLoading} className="flex-1">
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', sLoading && 'animate-spin')} /> Refresh
                </Button>
                <Button size="sm" variant="destructive" onClick={store.disconnectSpotify}>Disconnect</Button>
              </>
            ) : (
              <Button size="sm" onClick={handleSpotifyConnect} disabled={sLoading || !sclientId} className="flex-1 bg-[#1DB954] hover:bg-[#1aa34a] border-0 text-black font-semibold">
                {sLoading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Music className="w-3.5 h-3.5 mr-1.5" />}
                Connect Spotify
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Now Playing */}
        {isSpotifyConnected && store.spotifyTrack && (
          <GlassCard>
            <div className="flex items-center gap-4">
              {store.spotifyTrack.albumArt ? (
                <img src={store.spotifyTrack.albumArt} alt="album" className="w-16 h-16 rounded-xl object-cover shadow-soft" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#1DB954]/20 flex items-center justify-center text-2xl">🎵</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {store.spotifyTrack.isPlaying && (
                    <div className="flex gap-[2px] items-end h-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-[2.5px] bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`, height: `${[50, 100, 70][i-1]}%` }} />
                      ))}
                    </div>
                  )}
                  <span className="text-[9px] font-bold tracking-wider text-[#1DB954]">{store.spotifyTrack.isPlaying ? 'NOW PLAYING' : 'LAST PLAYED'}</span>
                </div>
                <div className="font-semibold text-sm truncate">{store.spotifyTrack.name}</div>
                <div className="text-xs text-muted-foreground truncate mb-2">{store.spotifyTrack.artist}</div>
                
                {/* Playback Controls */}
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSpotifyAction('previous')} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors press" aria-label="Previous track">
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleSpotifyAction(store.spotifyTrack?.isPlaying ? 'pause' : 'play')} className="p-1.5 rounded-full bg-[#1DB954] hover:bg-[#1aa34a] text-black transition-colors press" aria-label={store.spotifyTrack?.isPlaying ? 'Pause' : 'Play'}>
                    {store.spotifyTrack?.isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  </button>
                  <button onClick={() => handleSpotifyAction('next')} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors press" aria-label="Next track">
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <a href={store.spotifyTrack.url} target="_blank" rel="noreferrer" className="shrink-0 p-2.5 rounded-full bg-[#1DB954]/15 hover:bg-[#1DB954]/25 transition-colors press" title="Open in Spotify">
                <ExternalLink className="w-4 h-4 text-[#1DB954]" />
              </a>
            </div>
          </GlassCard>
        )}
      </motion.div>

      {/* ── DIGITAL WELLBEING NOTE ── */}
      <SectionTitle>⏳ Digital Wellbeing</SectionTitle>
      <motion.div {...fade(3)}>
        <GlassCard>
          <div className="flex items-start gap-3">
            <CloudLightning className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">Screen Time Tracking</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Android's Digital Wellbeing API is restricted to native apps only. On iOS, Screen Time data requires a native app via Family Controls. 
                Instead, use our built-in <strong>Screen Time</strong> page to manually log your app usage — it provides charts and trends just like the native app.
              </p>
              <button className="mt-2.5 text-xs text-primary font-medium flex items-center gap-1 press" onClick={() => navigate('/screentime')}>
                Go to Screen Time tracker <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </Page>
  );
}
