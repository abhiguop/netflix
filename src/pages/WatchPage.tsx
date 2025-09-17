import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Player from "video.js/dist/types/player";
import { Box, Stack, Typography, Slider } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import SettingsIcon from "@mui/icons-material/Settings";
import BrandingWatermarkOutlinedIcon from "@mui/icons-material/BrandingWatermarkOutlined";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";

import useWindowSize from "src/hooks/useWindowSize";
import { formatTime } from "src/utils/common";

import MaxLineTypography from "src/components/MaxLineTypography";
import VolumeControllers from "src/components/watch/VolumeControllers";
import VideoJSPlayer from "src/components/watch/VideoJSPlayer";
import PlayerSeekbar from "src/components/watch/PlayerSeekbar";
import PlayerControlButton from "src/components/watch/PlayerControlButton";
import MainLoadingScreen from "src/components/MainLoadingScreen";

export function Component() {
  const playerRef = useRef<Player | null>(null);
  const navigate = useNavigate();
  const [playerInitialized, setPlayerInitialized] = useState(false);

  const [playerState, setPlayerState] = useState({
    paused: false,
    muted: false,
    playedSeconds: 0,
    duration: 0,
    volume: 0.8,
    loaded: 0,
  });

  const windowSize = useWindowSize();

  const videoJsOptions = useMemo(() => {
    return {
      preload: "metadata",
      autoplay: true,
      controls: false,
      width: windowSize.width,
      height: windowSize.height,
      sources: [
        {
          src: "https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
          type: "application/x-mpegurl",
        },
      ],
    };
  }, [windowSize]);

  // Player Ready Handler
  const handlePlayerReady = (player: Player) => {
    playerRef.current = player;

    // Initialize states
    setPlayerState((draft) => ({
      ...draft,
      paused: player.paused(),
      muted: player.muted() ?? false,
      volume: player.volume() ?? 0.8,
      duration: player.duration() ?? 0,
    }));

    // Player events
    player.on("pause", () =>
      setPlayerState((draft) => ({ ...draft, paused: true }))
    );
    player.on("play", () =>
      setPlayerState((draft) => ({ ...draft, paused: false }))
    );
    player.on("timeupdate", () =>
      setPlayerState((draft) => ({
        ...draft,
        playedSeconds: player.currentTime() ?? 0,
      }))
    );
    player.one("durationchange", () => {
      setPlayerInitialized(true);
      setPlayerState((draft) => ({
        ...draft,
        duration: player.duration() ?? 0,
      }));
    });
  };

  // Volume Change Handler
  const handleVolumeChange = (_: Event, value: number | number[]) => {
    const vol = Array.isArray(value) ? value[0] : value;
    playerRef.current?.volume(vol / 100);
    setPlayerState((draft) => ({ ...draft, volume: vol / 100 }));
  };

  // Mute Toggle
  const handleVolumeToggle = () => {
    const newMuted = !playerState.muted;
    playerRef.current?.muted(newMuted);
    setPlayerState((draft) => ({ ...draft, muted: newMuted }));
  };

  // Seek Handler
  const handleSeekTo = (v: number) => {
    playerRef.current?.currentTime(v);
  };

  const handleGoBack = () => {
    navigate("/browse");
  };

  if (!videoJsOptions.width) return null;

  return (
    <Box sx={{ position: "relative" }}>
      <VideoJSPlayer options={videoJsOptions} onReady={handlePlayerReady} />

      {playerRef.current && playerInitialized && (
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Back Button */}
          <Box px={2} sx={{ position: "absolute", top: 75 }}>
            <PlayerControlButton onClick={handleGoBack}>
              <KeyboardBackspaceIcon />
            </PlayerControlButton>
          </Box>

          {/* Title */}
          <Box px={2} sx={{ position: "absolute", top: "50%", left: 0 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: "white" }}>
              Title
            </Typography>
          </Box>

          {/* Age Label */}
          <Box px={{ xs: 0, sm: 1, md: 2 }} sx={{ position: "absolute", top: "60%", right: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                px: 1,
                py: 0.5,
                fontWeight: 700,
                color: "white",
                bgcolor: "red",
                borderRadius: "12px 0 0 12px",
              }}
            >
              12+
            </Typography>
          </Box>

          {/* Seekbar & Controls */}
          <Box px={{ xs: 1, sm: 2 }} sx={{ position: "absolute", bottom: 20, left: 0, right: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PlayerSeekbar
                playedSeconds={playerState.playedSeconds}
                duration={playerState.duration}
                seekTo={handleSeekTo}
              />
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {/* Left controls */}
              <Stack direction="row" spacing={2} alignItems="center">
                {!playerState.paused ? (
                  <PlayerControlButton onClick={() => playerRef.current?.pause()}>
                    <PauseIcon />
                  </PlayerControlButton>
                ) : (
                  <PlayerControlButton onClick={() => playerRef.current?.play()}>
                    <PlayArrowIcon />
                  </PlayerControlButton>
                )}
                <PlayerControlButton>
                  <SkipNextIcon />
                </PlayerControlButton>
                <VolumeControllers
                  muted={playerState.muted}
                  handleVolumeToggle={handleVolumeToggle}
                  value={playerState.volume}
                  handleVolume={handleVolumeChange}
                />
                <Typography variant="caption" sx={{ color: "white" }}>
                  {`${formatTime(playerState.playedSeconds)} / ${formatTime(
                    playerState.duration
                  )}`}
                </Typography>
              </Stack>

              {/* Middle description */}
              <Box flexGrow={1}>
                <MaxLineTypography
                  maxLine={1}
                  variant="subtitle1"
                  textAlign="center"
                  sx={{ maxWidth: 300, mx: "auto", color: "white" }}
                >
                  Description
                </MaxLineTypography>
              </Box>

              {/* Right controls */}
              <Stack direction="row" spacing={2} alignItems="center">
                <PlayerControlButton>
                  <SettingsIcon />
                </PlayerControlButton>
                <PlayerControlButton>
                  <BrandingWatermarkOutlinedIcon />
                </PlayerControlButton>
                <PlayerControlButton>
                  <FullscreenIcon />
                </PlayerControlButton>
              </Stack>
            </Stack>
          </Box>
        </Box>
      )}
    </Box>
  );
}

Component.displayName = "WatchPage";
