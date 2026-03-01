import { useRef, useState, useEffect, useCallback } from 'react';
import type { Track, RepeatMode } from '../types';
import { dbGet } from '../utils/db';

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataArrayRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(0);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [eqData, setEqData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    });
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  function handleEnded() {
    setRepeatMode(rm => {
      if (rm === 2) {
        audioRef.current!.currentTime = 0;
        audioRef.current!.play();
      } else {
        setQueueIndex(qi => {
          setQueue(q => {
            const next = qi + 1;
            if (rm === 1 || next < q.length) {
              const ni = next % q.length;
              loadTrack(q[ni], ni, q);
            } else {
              setIsPlaying(false);
              stopEq();
            }
            return q;
          });
          return qi;
        });
      }
      return rm;
    });
  }

  function initAudioCtx() {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaElementSource(audioRef.current!);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (_) {}
  }

  function startEq() {
    if (!analyserRef.current || !dataArrayRef.current) return;
    function animate() {
      analyserRef.current!.getByteFrequencyData(dataArrayRef.current!);
      const arr = dataArrayRef.current!;
      const step = Math.floor(arr.length / 12);
      const vals = Array.from({ length: 12 }, (_, i) => (arr[Math.min(i * step, arr.length - 1)] / 255));
      setEqData(vals);
      animFrameRef.current = requestAnimationFrame(animate);
    }
    cancelAnimationFrame(animFrameRef.current);
    animate();
  }

  function stopEq() {
    cancelAnimationFrame(animFrameRef.current);
    setEqData(new Array(12).fill(0));
  }

  async function loadTrack(track: Track, index: number, q: Track[]) {
    const audio = audioRef.current!;
    initAudioCtx();
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();

    let src = track.src;
    try {
      const cached = await dbGet<{ id: string; blob: Blob }>('audioCache', track.id);
      if (cached?.blob) src = URL.createObjectURL(cached.blob);
    } catch (_) {}

    audio.src = src;
    audio.load();
    setCurrentTrack(track);
    setQueueIndex(index);
    setQueue(q);

    try {
      await audio.play();
      setIsPlaying(true);
      startEq();
    } catch (_) {
      setIsPlaying(false);
    }
  }

  const playFromList = useCallback((list: Track[], index: number) => {
    if (index < 0 || index >= list.length) return;
    loadTrack(list[index], index, list);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current!;
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
      stopEq();
    } else {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      audio.play().catch(() => {});
      startEq();
    }
  }, [currentTrack, isPlaying]);

  const nextTrack = useCallback(() => {
    if (!queue.length) return;
    const ni = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (queueIndex + 1) % queue.length;
    loadTrack(queue[ni], ni, queue);
  }, [queue, queueIndex, isShuffle]);

  const prevTrack = useCallback(() => {
    if (!queue.length) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const pi = isShuffle
      ? Math.floor(Math.random() * queue.length)
      : (queueIndex - 1 + queue.length) % queue.length;
    loadTrack(queue[pi], pi, queue);
  }, [queue, queueIndex, isShuffle]);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current!;
    if (audio.duration) audio.currentTime = (pct / 100) * audio.duration;
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(s => !s), []);
  const toggleRepeat = useCallback(() => setRepeatMode(r => ((r + 1) % 3) as RepeatMode), []);

  return {
    currentTrack, queue, queueIndex, isPlaying, isShuffle, repeatMode,
    progress, duration, currentTime, eqData,
    playFromList, togglePlay, nextTrack, prevTrack, seek,
    toggleShuffle, toggleRepeat,
  };
}
