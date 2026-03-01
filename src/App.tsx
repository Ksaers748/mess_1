import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Track, Playlist, TabIndex } from './types';
import { openDB, saveAppState, loadAppState, cacheAudio, getAudioBlob, saveCover, loadCover } from './utils/db';
import { readID3Tags, readID3FromBlob } from './utils/id3';
import { filterTracks, pluralize } from './utils/search';
import { usePlayer } from './hooks/usePlayer';
import { TrackItem } from './components/TrackItem';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { SearchBox } from './components/SearchBox';
import { TrackCover } from './components/TrackCover';
import { Toast } from './components/Toast';

const GITHUB_API = 'https://api.github.com/repos/Ksaers748/MSBD/contents/track';
const GITHUB_RAW = 'https://raw.githubusercontent.com/Ksaers748/MSBD/main/track/';

const coverCache: Record<string, string> = {};

/* ─── Icons ──────────────────────────────────────────────────── */
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: active ? 'var(--accent)' : 'var(--text3)', transition: 'fill 0.25s' }}>
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);
const ListIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: active ? 'var(--accent)' : 'var(--text3)', transition: 'fill 0.25s' }}>
    <path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/>
  </svg>
);
const HeartNavIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24"
    style={{ fill: active ? 'var(--accent)' : 'none', stroke: active ? 'var(--accent)' : 'var(--text3)', strokeWidth: 2, transition: 'all 0.25s' }}>
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);
const DownloadNavIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: active ? 'var(--accent)' : 'var(--text3)', transition: 'fill 0.25s' }}>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);
const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'white' }}>
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'white' }}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ fill: 'var(--red)' }}>
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ fill: 'var(--text2)' }}>
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'white' }}>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
);
const MusicNoteIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" style={{ fill: 'var(--text3)' }}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

/* ─── App ─────────────────────────────────────────────────────── */
export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [splashHide, setSplashHide] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [downloaded, setDownloaded] = useState<string[]>([]);

  const [tab, setTab] = useState<TabIndex>(0);
  const [searchHome, setSearchHome] = useState('');
  const [searchFav, setSearchFav] = useState('');
  const [searchDl, setSearchDl] = useState('');

  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [playlistViewId, setPlaylistViewId] = useState<string | null>(null);
  const [addTracksMode, setAddTracksMode] = useState<'all' | 'fav'>('all');
  const [addTracksOpen, setAddTracksOpen] = useState(false);
  const [searchAddTracks, setSearchAddTracks] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [toast, setToast] = useState({ msg: '', visible: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const player = usePlayer();
  const { currentTrack, isPlaying, isShuffle, repeatMode, progress, currentTime, duration, eqData } = player;

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  }, []);

  /* ── Init ── */
  useEffect(() => {
    openDB().then(async () => {
      const state = await loadAppState();
      if (state.favorites) setFavorites(state.favorites);
      if (state.playlists) setPlaylists(state.playlists);
      if (state.downloaded) setDownloaded(state.downloaded);
      if (state.currentTab != null) setTab(state.currentTab as TabIndex);
      if (state.hasVisited) setSplashDone(true);

      if (state.localTracks) {
        const lts: Track[] = [];
        for (const t of state.localTracks) {
          const blob = await getAudioBlob(t.id);
          const tClone = { ...t, src: blob ? URL.createObjectURL(blob) : '' };
          const coverBlob = await loadCover(t.id);
          if (coverBlob) {
            const url = URL.createObjectURL(coverBlob);
            tClone.img = url;
            coverCache[t.id] = url;
          }
          lts.push(tClone);
        }
        setLocalTracks(lts);
      }

      setDbReady(true);

      if (navigator.onLine) {
        await fetchTracks();
      } else if (state.cachedTracks) {
        const tracks = state.cachedTracks as Track[];
        for (const t of tracks) {
          const cb = await loadCover(t.id);
          if (cb) {
            const url = URL.createObjectURL(cb);
            t.img = url;
            coverCache[t.id] = url;
          }
        }
        setAllTracks(tracks);
      }
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function handleOnline() {
    setIsOnline(true);
    showToast('Подключение восстановлено');
    await fetchTracks();
  }
  function handleOffline() {
    setIsOnline(false);
    showToast('Офлайн режим');
  }

  async function fetchTracks() {
    setLoadingTracks(true);
    try {
      const resp = await fetch(GITHUB_API);
      if (!resp.ok) throw new Error('API ' + resp.status);
      const files: { name: string; sha: string; download_url: string }[] = await resp.json();

      const audioFiles = files.filter(f => /\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(f.name));

      let catalog: { file: string; title?: string; artist?: string; album?: string; cover?: string }[] = [];
      try {
        const cr = await fetch(GITHUB_RAW + 'catalog.json?t=' + Date.now());
        if (cr.ok) catalog = await cr.json();
      } catch (_) {}
      const catalogMap: Record<string, typeof catalog[0]> = {};
      catalog.forEach(c => { catalogMap[c.file] = c; });

      const tracks: Track[] = audioFiles.map(f => {
        const cat = catalogMap[f.name];
        const url = f.download_url || (GITHUB_RAW + encodeURIComponent(f.name));
        let name: string, artist: string, album = '', cover = '';
        if (cat) {
          name = cat.title || f.name.replace(/\.[^.]+$/, '');
          artist = cat.artist || 'Неизвестный';
          album = cat.album || '';
          cover = cat.cover || '';
        } else {
          const base = f.name.replace(/\.[^.]+$/, '');
          const parts = base.split(' - ');
          if (parts.length >= 2) { artist = parts[0].trim(); name = parts.slice(1).join(' - ').trim(); }
          else { artist = 'Неизвестный'; name = base; }
        }
        return { id: 'gh_' + f.sha, name, artist, album, src: url, img: cover, isLocal: false, fileName: f.name };
      });

      setAllTracks(tracks);
      setLoadingTracks(false);

      // Background ID3 read (no catalog entries)
      const needsID3 = tracks.filter(t => !catalogMap[t.fileName || '']);
      for (let i = 0; i < needsID3.length; i += 3) {
        const batch = needsID3.slice(i, i + 3);
        await Promise.allSettled(batch.map(async t => {
          try {
            const tags = await readID3Tags(t.src);
            if (!tags) return;
            if (tags.title) t.name = tags.title;
            if (tags.artist) t.artist = tags.artist;
            if (tags.album) t.album = tags.album;
            if (tags.coverBlob) {
              const url = URL.createObjectURL(tags.coverBlob);
              t.img = url;
              coverCache[t.id] = url;
              await saveCover(t.id, tags.coverBlob);
            }
          } catch (_) {}
        }));
        setAllTracks([...tracks]);
      }

      await saveAppState({
        cachedTracks: tracks.map(t => ({
          ...t,
          img: t.img.startsWith('blob:') ? '' : t.img,
        })),
      });
    } catch (_) {
      setLoadingTracks(false);
    }
  }

  /* ── Persist state ── */
  useEffect(() => {
    if (!dbReady) return;
    saveAppState({ favorites, playlists, downloaded, currentTab: tab, hasVisited: true,
      localTracks: localTracks.map(t => ({ ...t, src: '', img: t.img.startsWith('blob:') ? '' : t.img })) });
  }, [favorites, playlists, downloaded, tab, localTracks, dbReady]);

  /* ── Helpers ── */
  const allTracksArr = [...allTracks, ...localTracks];

  function getList(ctx: 'home' | 'fav' | 'dl'): Track[] {
    switch (ctx) {
      case 'home':
        if (!isOnline) {
          const dlSet = new Set(downloaded);
          return filterTracks(allTracksArr.filter(t => t.isLocal || dlSet.has(t.id)), searchHome);
        }
        return filterTracks(allTracksArr, searchHome);
      case 'fav':
        return filterTracks(allTracksArr.filter(t => favorites.includes(t.id)), searchFav);
      case 'dl': {
        const dlSet = new Set(downloaded);
        return filterTracks(allTracksArr.filter(t => t.isLocal || dlSet.has(t.id)), searchDl);
      }
    }
  }

  function toggleFav(id: string) {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      showToast(prev.includes(id) ? 'Убрано из избранного' : 'Добавлено в избранное');
      return next;
    });
  }

  /* ── Download ── */
  async function handleDownload() {
    if (!currentTrack || isDownloading) return;
    if (downloaded.includes(currentTrack.id) || currentTrack.isLocal) {
      showToast('Уже скачано'); return;
    }
    setIsDownloading(true);
    showToast('Скачивание…');
    try {
      const resp = await fetch(currentTrack.src);
      const blob = await resp.blob();
      await cacheAudio(currentTrack.id, blob);
      setDownloaded(d => [...d, currentTrack.id]);
      if (currentTrack.img && currentTrack.img.startsWith('blob:')) {
        try {
          const cr = await fetch(currentTrack.img);
          await saveCover(currentTrack.id, await cr.blob());
        } catch (_) {}
      }
      showToast('Скачано ✓');
    } catch (_) { showToast('Ошибка скачивания'); }
    finally { setIsDownloading(false); }
  }

  /* ── File upload ── */
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    showToast('Обработка файлов…');
    const newLocal: Track[] = [];

    for (const file of files) {
      const id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      let name = file.name.replace(/\.[^.]+$/, '');
      let artist = 'Мои треки';
      let coverUrl = '';

      try {
        const tags = await readID3FromBlob(file);
        if (tags) {
          if (tags.title) name = tags.title;
          if (tags.artist) artist = tags.artist;
          if (tags.coverBlob) {
            coverUrl = URL.createObjectURL(tags.coverBlob);
            coverCache[id] = coverUrl;
            await saveCover(id, tags.coverBlob);
          }
        } else {
          const parts = name.split(' - ');
          if (parts.length >= 2) { artist = parts[0].trim(); name = parts.slice(1).join(' - ').trim(); }
        }
      } catch (_) {}

      await cacheAudio(id, file);
      const track: Track = { id, name, artist, album: '', src: URL.createObjectURL(file), img: coverUrl, isLocal: true };
      newLocal.push(track);
      setDownloaded(d => [...d, id]);
    }

    setLocalTracks(prev => [...prev, ...newLocal]);
    showToast(`Добавлено ${files.length} трек${pluralize(files.length)}`);
    if (e.target) e.target.value = '';
  }

  /* ── Playlists ── */
  function createPlaylist() {
    const name = newPlaylistName.trim();
    if (!name) { showToast('Введите название'); return; }
    setPlaylists(prev => [...prev, { id: 'pl_' + Date.now(), name, trackIds: [] }]);
    setNewPlaylistName('');
    setCreatePlaylistOpen(false);
    showToast('Плейлист создан');
  }

  function deletePlaylist() {
    setPlaylists(prev => prev.filter(p => p.id !== playlistViewId));
    setPlaylistViewId(null);
    showToast('Плейлист удалён');
  }

  function doneAddTracks() {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistViewId
        ? { ...p, trackIds: [...p.trackIds, ...Array.from(selectedTracks).filter(id => !p.trackIds.includes(id))] }
        : p
    ));
    showToast(`Добавлено ${selectedTracks.size} трек${pluralize(selectedTracks.size)}`);
    setAddTracksOpen(false);
    setSelectedTracks(new Set());
    setSearchAddTracks('');
  }

  function removeFromPlaylist(trackId: string) {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistViewId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p
    ));
    showToast('Удалено из плейлиста');
  }

  /* ── Tab swipe ── */
  const tabSwipeStart = useRef(0);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  function handleTabTouchStart(e: React.TouchEvent) { tabSwipeStart.current = e.touches[0].clientX; }
  function handleTabTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - tabSwipeStart.current;
    if (Math.abs(dx) > 55) {
      if (dx < 0 && tab < 3) setTab((tab + 1) as TabIndex);
      else if (dx > 0 && tab > 0) setTab((tab - 1) as TabIndex);
    }
  }

  /* ── Render track list ── */
  function renderTrackList(ctx: 'home' | 'fav' | 'dl', tracks: Track[]) {
    if (loadingTracks && ctx === 'home' && tracks.length === 0) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="spinner" />
        </div>
      );
    }
    if (tracks.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
          <MusicNoteIcon />
          <p style={{ marginTop: 12, fontSize: 14 }}>
            {ctx === 'fav' ? 'Нет избранных треков' :
             ctx === 'dl' ? 'Нет скачанных треков' :
             isOnline ? 'Треки не найдены' : 'Нет доступных треков офлайн'}
          </p>
        </div>
      );
    }
    return tracks.map((t, i) => (
      <TrackItem
        key={t.id} track={t} index={i}
        isCurrent={currentTrack?.id === t.id}
        isFav={favorites.includes(t.id)}
        isPlaying={isPlaying}
        eqData={eqData}
        onPlay={() => player.playFromList(tracks, i)}
        onFav={(e) => { e.stopPropagation(); toggleFav(t.id); }}
      />
    ));
  }

  /* ── Playlist view tracks ── */
  const currentPlaylist = playlists.find(p => p.id === playlistViewId);
  const playlistTracks = currentPlaylist
    ? currentPlaylist.trackIds.map(id => allTracksArr.find(t => t.id === id)).filter(Boolean) as Track[]
    : [];

  /* ── Add tracks list ── */
  const addSourceTracks = addTracksMode === 'fav'
    ? allTracksArr.filter(t => favorites.includes(t.id) && !currentPlaylist?.trackIds.includes(t.id))
    : allTracksArr.filter(t => !currentPlaylist?.trackIds.includes(t.id));
  const filteredAddTracks = filterTracks(addSourceTracks, searchAddTracks);

  const isFavCurrent = currentTrack ? favorites.includes(currentTrack.id) : false;
  const isDownloadedCurrent = currentTrack
    ? (downloaded.includes(currentTrack.id) || currentTrack.isLocal)
    : false;

  /* ─── RENDER ─────────────────────────────────────────────────── */
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── SPLASH ── */}
      {!splashDone && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 28, padding: 32,
          opacity: splashHide ? 0 : 1,
          transform: splashHide ? 'scale(0.95)' : 'scale(1)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
          pointerEvents: splashHide ? 'none' : 'all',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div className="gradient-text" style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1, marginBottom: 6 }}>
              Lips-songs
            </div>
            <div style={{ fontSize: 14, color: 'var(--text2)' }}>Музыкальный плеер</div>
          </div>

          {/* Feature card */}
          <div style={{
            background: 'var(--card)', borderRadius: 20, padding: '20px 24px',
            maxWidth: 300, width: '100%',
            border: '1px solid rgba(255,255,255,0.04)',
            animation: 'fadeInUp 0.7s ease 0.2s both',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Возможности
            </div>
            {['Визуализатор эквалайзера', 'Плавные жесты управления', 'Плейлисты и избранное', 'Офлайн режим', 'Свои треки (mp3, flac…)'].map(f => (
              <div key={f} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--accent2)', fontWeight: 700 }}>›</span> {f}
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', animation: 'fadeInUp 0.7s ease 0.4s both' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isOnline ? 'var(--green)' : 'var(--red)',
              animation: isOnline ? 'pulse 2s infinite' : 'none',
            }} />
            {isOnline ? 'Онлайн' : 'Офлайн'}
          </div>

          {/* Enter btn */}
          <button
            onClick={() => {
              setSplashHide(true);
              setTimeout(() => setSplashDone(true), 560);
            }}
            style={{
              padding: '15px 56px', border: 'none', borderRadius: 50,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 28px rgba(224,64,251,0.4)',
              animation: 'fadeInUp 0.7s ease 0.6s both',
              transition: 'transform 0.12s, box-shadow 0.2s',
            }}
            className="active-scale"
          >
            Войти
          </button>
        </div>
      )}

      {/* ── MAIN APP ── */}
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
        opacity: splashDone ? 1 : 0, transition: 'opacity 0.4s ease',
        pointerEvents: splashDone ? 'all' : 'none',
      }}>
        {/* Tab pages container */}
        <div
          ref={tabContainerRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onTouchStart={handleTabTouchStart}
          onTouchEnd={handleTabTouchEnd}
        >
          <div style={{
            display: 'flex', width: '400%', height: '100%',
            transform: `translateX(-${tab * 25}%)`,
            transition: 'transform 0.38s cubic-bezier(0.22, 0.68, 0.32, 1)',
            willChange: 'transform',
          }}>

            {/* ── HOME ── */}
            <div style={{ width: '25%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '20px 16px 0', background: 'var(--bg)', position: 'relative', zIndex: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, marginBottom: 14 }}>
                  Главная
                  {loadingTracks && allTracks.length > 0 && (
                    <span style={{ marginLeft: 10, verticalAlign: 'middle' }}>
                      <div className="spinner" style={{ width: 16, height: 16, display: 'inline-block' }} />
                    </span>
                  )}
                </div>
                <SearchBox value={searchHome} onChange={setSearchHome} placeholder="Поиск треков или артистов…" />
              </div>
              <div className="track-scroll" style={{ flex: 1, padding: '4px 16px 0', paddingBottom: 160 }}>
                <div style={{ paddingBottom: 160 }}>
                  {renderTrackList('home', getList('home'))}
                </div>
              </div>
            </div>

            {/* ── PLAYLISTS ── */}
            <div style={{ width: '25%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '20px 16px 14px', background: 'var(--bg)', zIndex: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8 }}>Плейлисты</div>
              </div>
              <div className="track-scroll" style={{ flex: 1, padding: '0 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 160 }}>
                  {/* Favorites card */}
                  <PlaylistCard
                    name="Избранное"
                    count={favorites.length}
                    coverSrc={(() => {
                      const t = allTracksArr.find(t => favorites.includes(t.id) && t.img);
                      return t?.img || '';
                    })()}
                    gradient="linear-gradient(135deg, var(--accent), var(--accent2))"
                    icon={<svg width="36" height="36" viewBox="0 0 24 24" style={{ fill: 'white' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
                    onClick={() => setTab(2)}
                    index={0}
                  />

                  {playlists.map((pl, i) => {
                    const firstWithCover = pl.trackIds.map(id => allTracksArr.find(t => t.id === id)).find(t => t?.img);
                    return (
                      <PlaylistCard
                        key={pl.id}
                        name={pl.name}
                        count={pl.trackIds.length}
                        coverSrc={firstWithCover?.img || ''}
                        gradient={`hsl(${(i * 60 + 200) % 360},35%,18%)`}
                        icon={<svg width="32" height="32" viewBox="0 0 24 24" style={{ fill: 'rgba(255,255,255,0.4)' }}><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/></svg>}
                        onClick={() => setPlaylistViewId(pl.id)}
                        index={i + 1}
                      />
                    );
                  })}

                  {/* Create card */}
                  <div
                    className="active-scale animate-fade-in-up"
                    onClick={() => setCreatePlaylistOpen(true)}
                    style={{
                      background: 'transparent',
                      border: '2px dashed rgba(255,255,255,0.1)',
                      borderRadius: 18, overflow: 'hidden',
                      cursor: 'pointer', transition: 'transform 0.15s, border-color 0.2s',
                      animationDelay: (playlists.length + 1) * 0.08 + 's',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(224,64,251,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <div style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PlusIcon />
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Создать</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Новый плейлист</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── FAVORITES ── */}
            <div style={{ width: '25%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '20px 16px 0', background: 'var(--bg)', zIndex: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, marginBottom: 14 }}>Избранное</div>
                <SearchBox value={searchFav} onChange={setSearchFav} placeholder="Поиск в избранном…" />
              </div>
              <div className="track-scroll" style={{ flex: 1, padding: '4px 16px 0' }}>
                <div style={{ paddingBottom: 160 }}>
                  {renderTrackList('fav', getList('fav'))}
                </div>
              </div>
            </div>

            {/* ── DOWNLOADS ── */}
            <div style={{ width: '25%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, padding: '20px 16px 0', background: 'var(--bg)', zIndex: 10 }}>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, marginBottom: 14 }}>Скачанное</div>
                <SearchBox value={searchDl} onChange={setSearchDl} placeholder="Поиск в скачанном…" />
                <button
                  className="active-scale"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 16px', marginBottom: 12,
                    border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12,
                    background: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
                    transition: 'border-color 0.2s, color 0.2s, transform 0.12s',
                  }}
                >
                  <UploadIcon /> Добавить свои треки
                </button>
              </div>
              <div className="track-scroll" style={{ flex: 1, padding: '4px 16px 0' }}>
                <div style={{ paddingBottom: 160 }}>
                  {renderTrackList('dl', getList('dl'))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MINI PLAYER ── */}
        {currentTrack && (
          <div style={{ position: 'absolute', bottom: 68, left: 0, right: 0, zIndex: 100 }}>
            <MiniPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              progress={progress}
              isFav={isFavCurrent}
              eqData={eqData}
              onOpen={() => setFullPlayerOpen(true)}
              onTogglePlay={(e) => { e.stopPropagation(); player.togglePlay(); }}
              onToggleFav={(e) => { e.stopPropagation(); if (currentTrack) toggleFav(currentTrack.id); }}
              onNext={player.nextTrack}
              onPrev={player.prevTrack}
            />
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          height: 64, flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          paddingBottom: 'var(--safe-bottom)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(8,8,16,0.95)',
          position: 'relative', zIndex: 200,
        }}>
          {([
            { label: 'Главная', icon: <HomeIcon active={tab === 0} />, idx: 0 },
            { label: 'Плейлисты', icon: <ListIcon active={tab === 1} />, idx: 1 },
            { label: 'Избранное', icon: <HeartNavIcon active={tab === 2} />, idx: 2 },
            { label: 'Скачанное', icon: <DownloadNavIcon active={tab === 3} />, idx: 3 },
          ] as { label: string; icon: React.ReactNode; idx: TabIndex }[]).map(({ label, icon, idx }) => (
            <button
              key={idx}
              className="active-scale-sm"
              onClick={() => setTab(idx)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                border: 'none', background: 'none', cursor: 'pointer', padding: '6px 16px',
                transition: 'transform 0.12s',
              }}
            >
              {icon}
              <span style={{ fontSize: 10, color: tab === idx ? 'var(--accent)' : 'var(--text3)', transition: 'color 0.25s' }}>
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── FULL PLAYER ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        transform: fullPlayerOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.45s cubic-bezier(0.22, 0.68, 0.32, 1)',
        willChange: 'transform',
      }}>
        <FullPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          progress={progress}
          currentTime={currentTime}
          duration={duration}
          isFav={isFavCurrent}
          isDownloaded={isDownloadedCurrent}
          eqData={eqData}
          onClose={() => setFullPlayerOpen(false)}
          onTogglePlay={player.togglePlay}
          onNext={player.nextTrack}
          onPrev={player.prevTrack}
          onToggleShuffle={() => { player.toggleShuffle(); showToast(isShuffle ? 'Перемешивание выкл' : 'Перемешивание вкл'); }}
          onToggleRepeat={() => { player.toggleRepeat(); }}
          onSeek={player.seek}
          onToggleFav={() => currentTrack && toggleFav(currentTrack.id)}
          onDownload={handleDownload}
        />
      </div>

      {/* ── PLAYLIST VIEW ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'var(--bg)',
        transform: playlistViewId ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.22, 0.68, 0.32, 1)',
        display: 'flex', flexDirection: 'column',
        willChange: 'transform',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px' }}>
          <button className="active-scale-sm" onClick={() => setPlaylistViewId(null)} style={{ width: 40, height: 40, border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BackIcon />
          </button>
          <div style={{ fontSize: 20, fontWeight: 800, flex: 1, letterSpacing: -0.3 }}>
            {currentPlaylist?.name || 'Плейлист'}
          </div>
          <button className="active-scale-sm" onClick={deletePlaylist} style={{ width: 40, height: 40, border: 'none', background: 'rgba(255,64,64,0.08)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrashIcon />
          </button>
        </div>

        {/* Action btns */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 14px' }}>
          {[
            { label: 'Добавить треки', mode: 'all' as const },
            { label: 'Из избранного', mode: 'fav' as const },
          ].map(({ label, mode }) => (
            <button
              key={mode}
              className="active-scale"
              onClick={() => { setAddTracksMode(mode); setAddTracksOpen(true); setSelectedTracks(new Set()); }}
              style={{
                flex: 1, padding: '10px 8px',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                background: 'var(--card)', color: 'var(--text2)',
                fontSize: 12, cursor: 'pointer', fontWeight: 600,
                transition: 'transform 0.12s, background 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Play all */}
        {playlistTracks.length > 0 && (
          <div style={{ padding: '0 16px 8px' }}>
            <button
              className="active-scale"
              onClick={() => player.playFromList(playlistTracks, 0)}
              style={{
                width: '100%', padding: '11px',
                background: 'linear-gradient(135deg, rgba(224,64,251,0.15), rgba(124,77,255,0.15))',
                border: '1px solid rgba(224,64,251,0.2)',
                borderRadius: 12, color: 'var(--accent)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'transform 0.12s',
              }}
            >
              ▶ Воспроизвести все ({playlistTracks.length})
            </button>
          </div>
        )}

        {/* Track list */}
        <div className="track-scroll" style={{ flex: 1, padding: '0 16px', paddingBottom: currentTrack ? 80 : 20 }}>
          {playlistTracks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', color: 'var(--text3)' }}>
              <MusicNoteIcon />
              <p style={{ marginTop: 12, fontSize: 14 }}>Нет треков в плейлисте</p>
            </div>
          ) : (
            playlistTracks.map((t, i) => (
              <div key={t.id} style={{ position: 'relative' }}>
                <TrackItem
                  track={t} index={i}
                  isCurrent={currentTrack?.id === t.id}
                  isFav={favorites.includes(t.id)}
                  isPlaying={isPlaying} eqData={eqData}
                  onPlay={() => player.playFromList(playlistTracks, i)}
                  onFav={(e) => { e.stopPropagation(); toggleFav(t.id); }}
                />
                <button
                  onClick={() => removeFromPlaylist(t.id)}
                  style={{
                    position: 'absolute', right: 44, top: '50%', transform: 'translateY(-50%)',
                    width: 28, height: 28, border: 'none', background: 'rgba(255,23,68,0.1)',
                    borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Удалить из плейлиста"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" style={{ fill: 'var(--red)' }}>
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── ADD TRACKS MODAL ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: 'var(--bg)',
        transform: addTracksOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.22, 0.68, 0.32, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 8px' }}>
          <button className="active-scale-sm" onClick={() => { setAddTracksOpen(false); setSelectedTracks(new Set()); setSearchAddTracks(''); }} style={{ width: 40, height: 40, border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BackIcon />
          </button>
          <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>
            {addTracksMode === 'fav' ? 'Из избранного' : 'Добавить треки'}
          </div>
          <button
            className="active-scale"
            onClick={doneAddTracks}
            style={{
              padding: '8px 18px', border: 'none', borderRadius: 20,
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'transform 0.12s',
            }}
          >
            Готово {selectedTracks.size > 0 && `(${selectedTracks.size})`}
          </button>
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          <SearchBox value={searchAddTracks} onChange={setSearchAddTracks} placeholder="Поиск…" />
        </div>
        <div className="track-scroll" style={{ flex: 1, padding: '0 16px 40px' }}>
          {filteredAddTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 14 }}>
              Нет доступных треков
            </div>
          ) : (
            filteredAddTracks.map((t, i) => {
              const checked = selectedTracks.has(t.id);
              return (
                <div
                  key={t.id}
                  className="active-scale"
                  onClick={() => setSelectedTracks(prev => {
                    const next = new Set(prev);
                    checked ? next.delete(t.id) : next.add(t.id);
                    return next;
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 8px', borderRadius: 14, cursor: 'pointer',
                    background: checked ? 'rgba(224,64,251,0.06)' : 'transparent',
                    transition: 'background 0.15s, transform 0.12s',
                    animationDelay: i * 0.03 + 's',
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 7,
                    border: checked ? 'none' : '2px solid var(--text3)',
                    background: checked ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
                  }}>
                    {checked && <CheckIcon />}
                  </div>
                  <TrackCover src={t.img} size={46} borderRadius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CREATE PLAYLIST MODAL ── */}
      {createPlaylistOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
            backdropFilter: 'blur(12px)',
            animation: 'fadeInUp 0.3s ease',
          }}
          onClick={e => { if (e.target === e.currentTarget) setCreatePlaylistOpen(false); }}
        >
          <div style={{
            background: 'var(--card)', borderRadius: 24, padding: '28px 24px',
            width: '100%', maxWidth: 320,
            border: '1px solid rgba(255,255,255,0.06)',
            animation: 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18, textAlign: 'center' }}>Новый плейлист</div>
            <input
              type="text"
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              placeholder="Название плейлиста"
              maxLength={50}
              autoFocus
              style={{
                width: '100%', padding: '13px 16px',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                background: 'var(--bg)', color: 'white', fontSize: 14, outline: 'none',
                marginBottom: 16, userSelect: 'text', WebkitUserSelect: 'text',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(224,64,251,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="active-scale" onClick={() => setCreatePlaylistOpen(false)} style={{ flex: 1, padding: 13, border: 'none', borderRadius: 14, background: 'var(--card2)', color: 'var(--text2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'transform 0.12s' }}>
                Отмена
              </button>
              <button className="active-scale" onClick={createPlaylist} style={{ flex: 1, padding: 13, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.12s' }}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <Toast message={toast.msg} visible={toast.visible} />
    </div>
  );
}

/* ─── Playlist Card ─────────────────────────────────────────── */
interface PlaylistCardProps {
  name: string;
  count: number;
  coverSrc: string;
  gradient: string;
  icon: React.ReactNode;
  onClick: () => void;
  index: number;
}

function PlaylistCard({ name, count, coverSrc, gradient, icon, onClick, index }: PlaylistCardProps) {
  return (
    <div
      className="active-scale animate-fade-in-up"
      onClick={onClick}
      style={{
        background: 'var(--card)', borderRadius: 18, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform 0.15s',
        border: '1px solid rgba(255,255,255,0.03)',
        animationDelay: index * 0.07 + 's',
      }}
    >
      <div style={{ aspectRatio: '1', background: gradient, position: 'relative', overflow: 'hidden' }}>
        {coverSrc ? (
          <img src={coverSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
          {count} трек{pluralize(count)}
        </div>
      </div>
    </div>
  );
}
