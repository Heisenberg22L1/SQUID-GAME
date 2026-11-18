import { useCallback, useEffect, useRef, useState } from 'react';
import { ChampionModal } from './components/ChampionModal';
import { CharacterShopModal } from './components/CharacterShopModal';
import { DashboardModal } from './components/DashboardModal';
import { GameCanvasShell } from './components/GameCanvasShell';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { audioEngine } from './game/audio';
import {
  ACCESSORIES,
  ACHIEVEMENTS,
  applyLevelDefeat,
  applyLevelVictory,
  CHARACTERS,
  claimDailyReward,
  getLevelMeta,
  isStageItemUnlocked,
  MASKS,
  OUTFITS,
} from './game/rules';
import {
  getTodayIsoDate,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './game/storage';
import type {
  AchievementDef,
  AudioSettings,
  Difficulty,
  GameScreenState,
  LevelId,
  LevelOutcome,
  SaveData,
} from './game/types';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [screenState, setScreenState] = useState<GameScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [activeLevel, setActiveLevel] = useState<LevelId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lvl = Number(params.get('level'));
      if (lvl >= 1 && lvl <= 50) return lvl as LevelId;
    }
    return loadSaveData().unlockedLevel;
  });

  const [runKey, setRunKey] = useState(1);
  const [practiceMode, setPracticeMode] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<
    null | 'levels' | 'shop' | 'dashboard' | 'howto' | 'settings' | 'champion_hall'
  >(null);
  const [lastOutcome, setLastOutcome] = useState<LevelOutcome | null>(null);
  const [newAchievements, setNewAchievements] = useState<AchievementDef[]>([]);
  const [stageBonusAwarded, setStageBonusAwarded] = useState<{
    stageId: number;
    coins: number;
    xp: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    audioEngine.updateSettings(save.settings);
  }, [save.settings]);

  useEffect(() => {
    const mapped =
      screenState === 'title'
        ? 'title'
        : screenState === 'playing'
        ? 'playing'
        : screenState === 'paused'
        ? 'paused'
        : screenState === 'spectating'
        ? 'spectating'
        : 'gameover';
    document.body.dataset.state = mapped;
  }, [screenState]);

  const prevMusicRunRef = useRef<{ runKey: number; level: LevelId } | null>(null);

  useEffect(() => {
    if (screenState === 'title') {
      audioEngine.startBgm(false, activeLevel, 'title', false);
    } else if (screenState === 'playing') {
      const isBoss = Boolean(getLevelMeta(activeLevel).isBoss);
      const changedRun =
        !prevMusicRunRef.current ||
        prevMusicRunRef.current.runKey !== runKey ||
        prevMusicRunRef.current.level !== activeLevel;
      prevMusicRunRef.current = { runKey, level: activeLevel };
      audioEngine.startBgm(isBoss, activeLevel, 'playing', changedRun);
    } else if (screenState === 'spectating') {
      audioEngine.startBgm(false, activeLevel, 'spectating', false);
    } else if (screenState === 'paused') {
      audioEngine.pauseBgm();
    } else if (
      screenState === 'level_clear' ||
      screenState === 'gameover' ||
      screenState === 'champion'
    ) {
      audioEngine.stopBgm(true);
    }
  }, [screenState, activeLevel, runKey]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!activeOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveOverlay(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeOverlay]);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  const startLevel = useCallback((lvl: LevelId) => {
    audioEngine.unlock();
    audioEngine.click();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setActiveOverlay(null);
    setLastOutcome(null);
    setNewAchievements([]);
    setStageBonusAwarded(null);
    setActiveLevel(lvl);
    setRunKey((k) => k + 1);
    setScreenState('playing');
  }, []);

  const handleStartContinue = useCallback(() => {
    startLevel(save.unlockedLevel);
  }, [save.unlockedLevel, startLevel]);

  const handleOutcome = useCallback(
    (outcome: LevelOutcome) => {
      setLastOutcome(outcome);
      if (outcome.won) {
        const result = applyLevelVictory(save, {
          levelId: outcome.levelId,
          score: outcome.score,
          coinsEarned: outcome.coinsEarned,
          xpEarned: outcome.xpEarned,
          timeUsed: outcome.timeUsed,
          hpRemaining: outcome.hpRemaining,
          maxHp: outcome.maxHp,
          practiceMode,
          dateStr: getTodayIsoDate(),
        });
        persistSaveData(result.nextSave);
        setSave(result.nextSave);
        setNewAchievements(result.newlyUnlockedAchievements);
        setStageBonusAwarded(result.stageBonusAwarded);
        setScreenState(outcome.levelId === 50 && !practiceMode ? 'champion' : 'level_clear');
      } else {
        const next = applyLevelDefeat(
          save,
          outcome.levelId,
          outcome.score,
          outcome.timeUsed,
          practiceMode
        );
        persistSaveData(next);
        setSave(next);
        setNewAchievements([]);
        setStageBonusAwarded(null);
        // Enter live Spectator Mode upon elimination!
        setScreenState('spectating');
      }
    },
    [practiceMode, save]
  );

  const handleToggleMute = useCallback(() => {
    audioEngine.unlock();
    updateSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, muted: !prev.settings.muted },
    }));
  }, [updateSave]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleUpdatePlayerName = useCallback(
    (playerName: string) => {
      updateSave((prev) => ({ ...prev, playerName }));
    },
    [updateSave]
  );

  const handleClaimDaily = useCallback(() => {
    audioEngine.unlock();
    audioEngine.pickup();
    updateSave((prev) => claimDailyReward(prev, getTodayIsoDate()).nextSave);
  }, [updateSave]);

  const handleBuyOrEquip = useCallback(
    (category: 'character' | 'outfit' | 'mask' | 'accessory', itemId: string) => {
      audioEngine.unlock();
      audioEngine.click();
      updateSave((prev) => {
        const next = {
          ...prev,
          equipped: { ...prev.equipped },
          ownedCharacters: [...prev.ownedCharacters],
          ownedOutfits: [...prev.ownedOutfits],
          ownedMasks: [...prev.ownedMasks],
          ownedAccessories: [...prev.ownedAccessories],
          unlockedAchievements: [...prev.unlockedAchievements],
        };

        const list =
          category === 'character'
            ? CHARACTERS
            : category === 'outfit'
            ? OUTFITS
            : category === 'mask'
            ? MASKS
            : ACCESSORIES;
        const ownedList =
          category === 'character'
            ? next.ownedCharacters
            : category === 'outfit'
            ? next.ownedOutfits
            : category === 'mask'
            ? next.ownedMasks
            : next.ownedAccessories;

        if (!ownedList.includes(itemId)) {
          const item = list.find((it) => it.id === itemId);
          if (!item) return prev;
          if (!isStageItemUnlocked(item.unlockStage, prev.completedLevels)) return prev;
          if (prev.coins < item.price) return prev;
          next.coins -= item.price;
          ownedList.push(itemId);
          audioEngine.pickup();
        }

        if (category === 'character') next.equipped.characterId = itemId;
        else if (category === 'outfit') next.equipped.outfitId = itemId;
        else if (category === 'mask') next.equipped.maskId = itemId;
        else next.equipped.accessoryId = itemId;

        const customCount =
          next.ownedCharacters.length -
          1 +
          (next.ownedOutfits.length - 1) +
          (next.ownedMasks.length - 1) +
          (next.ownedAccessories.length - 1);
        if (customCount >= 5 && !next.unlockedAchievements.includes('collector_10')) {
          const ach = ACHIEVEMENTS.find((a) => a.id === 'collector_10');
          if (ach) {
            next.unlockedAchievements.push(ach.id);
            next.coins += ach.rewardCoins;
            next.xp += ach.rewardXp;
            next.totalCoinsEarned += ach.rewardCoins;
          }
        }

        return next;
      });
    },
    [updateSave]
  );

  const handleChangeDifficulty = useCallback(
    (difficulty: Difficulty) => {
      audioEngine.click();
      updateSave((prev) => ({ ...prev, difficulty }));
    },
    [updateSave]
  );

  const handleChangeAudio = useCallback(
    (settings: AudioSettings) => {
      updateSave((prev) => ({ ...prev, settings }));
    },
    [updateSave]
  );

  const handleResetProgress = useCallback(() => {
    const fresh = resetSaveData();
    setSave(fresh);
    setActiveLevel(1);
    audioEngine.click();
  }, []);

  return (
    <>
      {screenState === 'title' ? (
        <TitleScreen
          save={save}
          isFullscreen={isFullscreen}
          onStartContinue={handleStartContinue}
          onOpenLevels={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('levels');
          }}
          onOpenShop={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('shop');
          }}
          onOpenDashboard={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('dashboard');
          }}
          onOpenHowToPlay={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('howto');
          }}
          onOpenSettings={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('settings');
          }}
          onOpenChampion={() => {
            audioEngine.unlock();
            audioEngine.click();
            setActiveOverlay('champion_hall');
          }}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
        />
      ) : (
        <GameCanvasShell
          levelId={activeLevel}
          runKey={runKey}
          save={save}
          practiceMode={practiceMode}
          isFullscreen={isFullscreen}
          screenState={screenState}
          lastOutcome={lastOutcome}
          newAchievements={newAchievements}
          stageBonusAwarded={stageBonusAwarded}
          onSetScreenState={setScreenState}
          onOutcome={handleOutcome}
          onRestartLevel={() => startLevel(activeLevel)}
          onNextLevel={() =>
            startLevel((activeLevel < 50 ? activeLevel + 1 : 50) as LevelId)
          }
          onOpenLevelSelect={() => setActiveOverlay('levels')}
          onExitToTitle={() => {
            audioEngine.click();
            setScreenState('title');
          }}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {activeOverlay === 'levels' && (
        <LevelSelectModal
          save={save}
          practiceMode={practiceMode}
          onTogglePracticeMode={() => setPracticeMode((p) => !p)}
          onSelectLevel={(lvl) => startLevel(lvl)}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'shop' && (
        <CharacterShopModal
          save={save}
          onBuyOrEquip={handleBuyOrEquip}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'dashboard' && (
        <DashboardModal
          save={save}
          onUpdatePlayerName={handleUpdatePlayerName}
          onClaimDaily={handleClaimDaily}
          onOpenShop={() => setActiveOverlay('shop')}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'howto' && (
        <HowToPlayModal onClose={() => setActiveOverlay(null)} />
      )}

      {activeOverlay === 'settings' && (
        <SettingsModal
          save={save}
          isFullscreen={isFullscreen}
          onChangeDifficulty={handleChangeDifficulty}
          onChangeAudio={handleChangeAudio}
          onToggleFullscreen={handleToggleFullscreen}
          onResetProgress={handleResetProgress}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'champion_hall' && (
        <ChampionModal
          save={save}
          lastOutcome={null}
          onReplayFinal={() => startLevel(50)}
          onExitToTitle={() => setActiveOverlay(null)}
        />
      )}

      <OfflineIndicator />
    </>
  );
}
