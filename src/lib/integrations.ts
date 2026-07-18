/**
 * integrations.ts — Google OAuth2 (Gmail, Drive, Calendar) + Spotify Web API
 * All integrations use PKCE / implicit grant flows (no backend needed).
 * Data is stored in localStorage under 'life-os-integrations'.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
export interface GoogleTokens {
  access_token: string;
  expires_at: number; // unix ms
  scope: string;
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
}

export interface DriveStorage {
  used: number;    // bytes
  limit: number;  // bytes
  usedLabel: string;
  limitLabel: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  url: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  colorId?: string;
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windKph: number;
  desc: string;
  emoji: string;
  city: string;
}

/* ─────────────────────────────────────────────────────────────
   CONFIG — user fills these in Settings → Integrations
   CLIENT IDs are safe to expose (they go through OAuth popup).
───────────────────────────────────────────────────────────── */
export interface IntegrationConfig {
  googleClientId: string;
  spotifyClientId: string;
}

/* ─────────────────────────────────────────────────────────────
   ZUSTAND STORE
───────────────────────────────────────────────────────────── */
interface IntegrationState {
  config: IntegrationConfig;
  googleTokens: GoogleTokens | null;
  spotifyTokens: SpotifyTokens | null;

  // cached data
  gmailMessages: GmailMessage[];
  driveStorage: DriveStorage | null;
  spotifyTrack: SpotifyTrack | null;
  googleCalendarEvents: GoogleCalendarEvent[];
  weather: WeatherData | null;

  // status
  googleLoading: boolean;
  spotifyLoading: boolean;
  weatherLoading: boolean;

  // actions
  setConfig: (c: Partial<IntegrationConfig>) => void;
  setGoogleTokens: (t: GoogleTokens | null) => void;
  setSpotifyTokens: (t: SpotifyTokens | null) => void;
  setGmailMessages: (m: GmailMessage[]) => void;
  setDriveStorage: (d: DriveStorage | null) => void;
  setSpotifyTrack: (t: SpotifyTrack | null) => void;
  setGoogleCalendarEvents: (e: GoogleCalendarEvent[]) => void;
  setWeather: (w: WeatherData | null) => void;
  setGoogleLoading: (b: boolean) => void;
  setSpotifyLoading: (b: boolean) => void;
  setWeatherLoading: (b: boolean) => void;
  disconnectGoogle: () => void;
  disconnectSpotify: () => void;
}

export const useIntegrations = create<IntegrationState>()(
  persist(
    (set) => ({
      config: { googleClientId: '2223939342-q1k6h46531mu5g4l1slnll96lp31pli8.apps.googleusercontent.com', spotifyClientId: '324ac5d0f5f54ea4909864ac21582440' },
      googleTokens: null,
      spotifyTokens: null,
      gmailMessages: [],
      driveStorage: null,
      spotifyTrack: null,
      googleCalendarEvents: [],
      weather: null,
      googleLoading: false,
      spotifyLoading: false,
      weatherLoading: false,

      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      setGoogleTokens: (t) => set({ googleTokens: t }),
      setSpotifyTokens: (t) => set({ spotifyTokens: t }),
      setGmailMessages: (m) => set({ gmailMessages: m }),
      setDriveStorage: (d) => set({ driveStorage: d }),
      setSpotifyTrack: (t) => set({ spotifyTrack: t }),
      setGoogleCalendarEvents: (e) => set({ googleCalendarEvents: e }),
      setWeather: (w) => set({ weather: w }),
      setGoogleLoading: (b) => set({ googleLoading: b }),
      setSpotifyLoading: (b) => set({ spotifyLoading: b }),
      setWeatherLoading: (b) => set({ weatherLoading: b }),
      disconnectGoogle: () => set({ googleTokens: null, gmailMessages: [], driveStorage: null, googleCalendarEvents: [] }),
      disconnectSpotify: () => set({ spotifyTokens: null, spotifyTrack: null }),
    }),
    { name: 'life-os-integrations-v1' }
  )
);

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const REDIRECT = window.location.origin + '/';

function isTokenValid(tokens: { expires_at: number } | null) {
  if (!tokens) return false;
  return tokens.expires_at > Date.now() + 30_000; // 30s buffer
}

function openPopup(url: string): Window {
  const w = 500, h = 650;
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
  return window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top}`)!;
}

function bytesToLabel(b: number) {
  if (b >= 1e12) return (b / 1e12).toFixed(1) + ' TB';
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(0) + ' KB';
}

/* ─────────────────────────────────────────────────────────────
   GOOGLE OAUTH (implicit grant — works client-side)
───────────────────────────────────────────────────────────── */
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'profile',
  'email',
].join(' ');

export interface GoogleFitData {
  steps: number;
  calories: number;
}

export async function fetchGoogleFitData(tokens: GoogleTokens): Promise<GoogleFitData | null> {
  if (!isTokenValid(tokens)) return null;

  if (!tokens.scope.includes('fitness.activity.read')) {
    alert('Your Google connection is missing Fitness permissions (likely connected before the update).\n\nPlease disconnect and reconnect Google Workspace in Settings to enable Health syncing.');
    return null;
  }

  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const body = {
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' }
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfToday.getTime(),
      endTimeMillis: endOfToday.getTime()
    };

    const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset/aggregate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.access_token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Google Fit error: ${res.status}`);
    const data = await res.json();
    
    let steps = 0;
    let calories = 0;

    if (data.bucket && data.bucket.length > 0) {
      const bucket = data.bucket[0];
      if (bucket.dataset) {
        // Dataset array matches the aggregateBy array order
        const stepDataset = bucket.dataset[0];
        const calorieDataset = bucket.dataset[1];

        if (stepDataset?.point) {
          stepDataset.point.forEach((pt: any) => {
            if (pt.value) {
              pt.value.forEach((val: any) => {
                steps += val.intVal ?? 0;
              });
            }
          });
        }

        if (calorieDataset?.point) {
          calorieDataset.point.forEach((pt: any) => {
            if (pt.value) {
              pt.value.forEach((val: any) => {
                calories += Math.round(val.fpVal ?? 0);
              });
            }
          });
        }
      }
    }

    return { steps, calories };
  } catch (e) {
    console.error('Failed to fetch Google Fit data:', e);
    return null;
  }
}

export async function connectGoogle(clientId: string): Promise<GoogleTokens | null> {
  if (!clientId) {
    alert('Please enter your Google Client ID in Settings → Integrations first.');
    return null;
  }
  const state = Math.random().toString(36).slice(2);
  sessionStorage.setItem('google_state', state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'token',
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: 'true',
  });

  return new Promise((resolve) => {
    const popup = openPopup(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    let elapsed = 0;
    
    const timer = setInterval(() => {
      elapsed += 300;
      
      // 60-second timeout
      if (elapsed > 60000) {
        clearInterval(timer);
        if (popup && !popup.closed) popup.close();
        alert('Google Connection Timeout.\n\nMake sure your Google Cloud Console settings are correct:\n1. The Authorized Redirect URI must exactly match your app URL (including trailing /).\n2. If your OAuth screen is in "Testing" mode, add your email as a Test User.');
        resolve(null);
        return;
      }

      try {
        if (!popup || popup.closed) { clearInterval(timer); resolve(null); return; }
        const hash = popup.location.hash;
        const search = popup.location.search;

        // Check for Google OAuth redirect error
        if ((hash && hash.includes('error=')) || (search && search.includes('error='))) {
          clearInterval(timer);
          const p = new URLSearchParams(hash ? hash.slice(1) : search);
          const err = p.get('error') || 'unknown_error';
          const desc = p.get('error_description') || '';
          popup.close();
          alert(`Google OAuth Error: ${err}\nDescription: ${desc}\n\nMake sure you added the correct Redirect URI to your Google Cloud Console.`);
          resolve(null);
          return;
        }

        if (hash && hash.includes('access_token')) {
          clearInterval(timer);
          popup.close();
          const p = new URLSearchParams(hash.slice(1));
          
          const expires_in_sec = parseInt(p.get('expires_in') || '3600', 10);
          const token: GoogleTokens = {
            access_token: p.get('access_token') ?? '',
            expires_at: Date.now() + (isNaN(expires_in_sec) ? 3600 : expires_in_sec) * 1000,
            scope: p.get('scope') ?? '',
          };
          resolve(token);
        }
      } catch { /* cross-origin — wait */ }
    }, 300);
  });
}

async function gFetch(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google API error: ${res.status}`);
  return res.json();
}

export async function fetchGmailMessages(tokens: GoogleTokens): Promise<GmailMessage[]> {
  if (!isTokenValid(tokens)) return [];
  try {
    const list = await gFetch('/gmail/v1/users/me/messages', tokens.access_token, {
      maxResults: '15',
      labelIds: 'INBOX',
      q: 'is:unread OR is:read',
    });
    const ids: string[] = (list.messages ?? []).slice(0, 10).map((m: { id: string }) => m.id);
    const messages = await Promise.all(
      ids.map((id) => gFetch(`/gmail/v1/users/me/messages/${id}`, tokens.access_token, { format: 'metadata', metadataHeaders: ['From,Subject,Date'].join(',') }))
    );
    return messages.map((m) => {
      const headers: { name: string; value: string }[] = m.payload?.headers ?? [];
      const get = (name: string) => headers.find((h: { name: string }) => h.name === name)?.value ?? '';
      return {
        id: m.id,
        threadId: m.threadId,
        snippet: m.snippet ?? '',
        from: get('From'),
        subject: get('Subject') || '(no subject)',
        date: get('Date'),
        unread: (m.labelIds ?? []).includes('UNREAD'),
      };
    });
  } catch (e) {
    console.error('Gmail fetch failed:', e);
    return [];
  }
}

export async function fetchDriveStorage(tokens: GoogleTokens): Promise<DriveStorage | null> {
  if (!isTokenValid(tokens)) return null;
  try {
    const data = await gFetch('/drive/v3/about', tokens.access_token, { fields: 'storageQuota' });
    const used = parseInt(data.storageQuota?.usage ?? '0');
    const limit = parseInt(data.storageQuota?.limit ?? '16106127360'); // 15 GB default
    return { used, limit, usedLabel: bytesToLabel(used), limitLabel: bytesToLabel(limit) };
  } catch (e) {
    console.error('Drive storage fetch failed:', e);
    return null;
  }
}

export async function fetchGoogleCalendar(tokens: GoogleTokens): Promise<GoogleCalendarEvent[]> {
  if (!isTokenValid(tokens)) return [];
  try {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const data = await gFetch('/calendar/v3/calendars/primary/events', tokens.access_token, {
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
      maxResults: '15',
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    return (data.items ?? []).map((ev: { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; location?: string; colorId?: string }) => ({
      id: ev.id,
      summary: ev.summary ?? '(no title)',
      start: ev.start?.dateTime ?? ev.start?.date ?? '',
      end: ev.end?.dateTime ?? ev.end?.date ?? '',
      location: ev.location,
      colorId: ev.colorId,
    }));
  } catch (e) {
    console.error('Google Calendar fetch failed:', e);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   SPOTIFY (PKCE flow — client-side safe, no client secret required)
───────────────────────────────────────────────────────────── */
const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
  'user-top-read',
  'user-modify-playback-state',
].join(' ');

function generateRandomString(length: number) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function connectSpotify(clientId: string): Promise<SpotifyTokens | null> {
  if (!clientId) {
    alert('Please enter your Spotify Client ID in Settings → Integrations first.');
    return null;
  }

  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);
  
  sessionStorage.setItem('spotify_verifier', verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
    show_dialog: 'true',
  });

  return new Promise((resolve) => {
    const popup = openPopup(`https://accounts.spotify.com/authorize?${params}`);
    const timer = setInterval(async () => {
      try {
        if (!popup || popup.closed) { clearInterval(timer); resolve(null); return; }
        const search = popup.location.search;

        if (search && search.includes('error=')) {
          clearInterval(timer);
          const p = new URLSearchParams(search);
          const err = p.get('error') || 'unknown_error';
          const desc = p.get('error_description') || '';
          popup.close();
          alert(`Spotify OAuth Error: ${err}\nDescription: ${desc}\n\nMake sure you added the correct Redirect URI to your Spotify Developer Dashboard.`);
          resolve(null);
          return;
        }

        if (search && search.includes('code=')) {
          clearInterval(timer);
          popup.close();
          const p = new URLSearchParams(search);
          const code = p.get('code') ?? '';
          
          // Exchange code for token
          const verifierVal = sessionStorage.getItem('spotify_verifier') ?? '';
          const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              grant_type: 'authorization_code',
              code,
              redirect_uri: REDIRECT,
              code_verifier: verifierVal,
            }),
          });
          
          if (tokenRes.ok) {
            const data = await tokenRes.json();
            resolve({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: Date.now() + data.expires_in * 1000,
            });
          } else {
            console.error('Failed to exchange code for token:', await tokenRes.text());
            resolve(null);
          }
        }
      } catch { /* wait — cross origin redirect pending */ }
    }, 300);
  });
}

export async function refreshSpotifyToken(clientId: string, refreshToken: string): Promise<SpotifyTokens | null> {
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        expires_at: Date.now() + data.expires_in * 1000,
      };
    }
  } catch (e) {
    console.error('Failed to refresh Spotify token:', e);
  }
  return null;
}

async function spFetch(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
}

export async function fetchSpotifyNowPlaying(tokens: SpotifyTokens): Promise<SpotifyTrack | null> {
  if (!isTokenValid(tokens)) return null;
  try {
    const data = await spFetch('/me/player/currently-playing', tokens.access_token);
    if (!data || !data.item) {
      // fallback: get recently played
      const recent = await spFetch('/me/player/recently-played?limit=1', tokens.access_token);
      const item = recent?.items?.[0]?.track;
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        artist: item.artists?.[0]?.name ?? '',
        album: item.album?.name ?? '',
        albumArt: item.album?.images?.[0]?.url ?? '',
        isPlaying: false,
        progressMs: 0,
        durationMs: item.duration_ms ?? 0,
        url: item.external_urls?.spotify ?? '',
      };
    }
    const item = data.item;
    return {
      id: item.id,
      name: item.name,
      artist: item.artists?.[0]?.name ?? '',
      album: item.album?.name ?? '',
      albumArt: item.album?.images?.[0]?.url ?? '',
      isPlaying: data.is_playing,
      progressMs: data.progress_ms ?? 0,
      durationMs: item.duration_ms ?? 0,
      url: item.external_urls?.spotify ?? '',
    };
  } catch (e) {
    console.error('Spotify fetch failed:', e);
    return null;
  }
}

export async function spotifyControl(action: 'play' | 'pause' | 'next' | 'previous', tokens: SpotifyTokens): Promise<boolean> {
  if (!isTokenValid(tokens)) return false;
  try {
    const isPlaybackAction = action === 'play' || action === 'pause';
    const res = await fetch(`https://api.spotify.com/v1/me/player/${action}`, {
      method: isPlaybackAction ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (res.status === 403) {
      throw new Error('Premium Required');
    }
    return res.ok;
  } catch (e: any) {
    console.error('Spotify control failed:', e);
    if (e.message === 'Premium Required') {
      throw e;
    }
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
   WEATHER — Open-Meteo (free, no API key needed)
───────────────────────────────────────────────────────────── */
function wmoToEmoji(code: number): { emoji: string; desc: string } {
  if (code === 0) return { emoji: '☀️', desc: 'Clear sky' };
  if (code <= 2) return { emoji: '⛅', desc: 'Partly cloudy' };
  if (code === 3) return { emoji: '☁️', desc: 'Overcast' };
  if (code <= 49) return { emoji: '🌫️', desc: 'Foggy' };
  if (code <= 55) return { emoji: '🌦️', desc: 'Drizzle' };
  if (code <= 65) return { emoji: '🌧️', desc: 'Rain' };
  if (code <= 77) return { emoji: '❄️', desc: 'Snow' };
  if (code <= 82) return { emoji: '🌦️', desc: 'Showers' };
  if (code <= 99) return { emoji: '⛈️', desc: 'Thunderstorm' };
  return { emoji: '🌤️', desc: 'Mixed' };
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }
    // get location
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    );
    const { latitude: lat, longitude: lon } = pos.coords;

    // reverse geocode city name (free nominatim)
    const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`).then((r) => r.json()).catch(() => null);
    const city = geo?.address?.city ?? geo?.address?.town ?? geo?.address?.village ?? 'Your city';

    // weather
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature&wind_speed_unit=kmh`
    ).then((r) => r.json());

    const cur = w.current;
    const { emoji, desc } = wmoToEmoji(cur.weather_code);
    return {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windKph: Math.round(cur.wind_speed_10m),
      desc,
      emoji,
      city,
    };
  } catch (e) {
    console.error('Weather fetch failed:', e);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   REFRESH HELPERS — call from App.tsx on mount
───────────────────────────────────────────────────────────── */
export async function refreshAllIntegrations(store: ReturnType<typeof useIntegrations.getState>, updateHealth?: (date: string, p: any) => void) {
  const { googleTokens, spotifyTokens } = store;

  // weather (always)
  store.setWeatherLoading(true);
  fetchWeather()
    .then((w) => {
      store.setWeather(w);
      store.setWeatherLoading(false);
    })
    .catch((err) => {
      console.error('Weather loader failed:', err);
      store.setWeatherLoading(false);
    });

  // google
  if (googleTokens && isTokenValid(googleTokens)) {
    store.setGoogleLoading(true);
    
    if (updateHealth) {
      fetchGoogleFitData(googleTokens)
        .then((fit) => {
          if (fit) {
            const today = new Date().toISOString().split('T')[0];
            updateHealth(today, {
              steps: fit.steps || undefined,
              calories: fit.calories || undefined
            });
          }
        })
        .catch((err) => console.error('Google Fit load failed:', err));
    }

    Promise.all([
      fetchGmailMessages(googleTokens).then(store.setGmailMessages),
      fetchDriveStorage(googleTokens).then(store.setDriveStorage),
      fetchGoogleCalendar(googleTokens).then(store.setGoogleCalendarEvents),
    ])
      .catch((err) => console.error('Google loader failed:', err))
      .finally(() => store.setGoogleLoading(false));
  }

  // spotify
  if (spotifyTokens) {
    if (!isTokenValid(spotifyTokens) && spotifyTokens.refresh_token) {
      store.setSpotifyLoading(true);
      refreshSpotifyToken(store.config.spotifyClientId, spotifyTokens.refresh_token)
        .then((newToken) => {
          if (newToken) {
            store.setSpotifyTokens(newToken);
            fetchSpotifyNowPlaying(newToken).then(store.setSpotifyTrack);
          }
        })
        .catch((err) => console.error('Spotify token refresh failed:', err))
        .finally(() => store.setSpotifyLoading(false));
    } else if (isTokenValid(spotifyTokens)) {
      store.setSpotifyLoading(true);
      fetchSpotifyNowPlaying(spotifyTokens)
        .then((t) => {
          store.setSpotifyTrack(t);
        })
        .catch((err) => console.error('Spotify loader failed:', err))
        .finally(() => store.setSpotifyLoading(false));
    }
  }
}

// Subscribe to state changes to trigger Supabase sync in store.ts
if (typeof window !== 'undefined') {
  useIntegrations.subscribe(() => {
    window.dispatchEvent(new Event('integrations-updated'));
  });
}
