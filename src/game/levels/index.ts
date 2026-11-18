import { createBossLevel } from '../bosses';
import type { LevelContext } from '../levelContext';
import type { LevelEngine, LevelId } from '../types';
import { createFloorSurvivalLevel } from './floorSurvivalEngine';
import { createHazardCourseLevel } from './hazardCourseEngine';
import { createLevel1 } from './level1';
import { createLevel2 } from './level2';
import { createLevel3 } from './level3';
import { createLevel4 } from './level4';
import { createLevel5 } from './level5';
import { createLevel6 } from './level6';
import { createLevel7 } from './level7';
import { createMindGamesLevel } from './mindGamesEngine';

export function createLevelEngine(levelId: LevelId, ctx: LevelContext): LevelEngine {
  switch (levelId) {
    case 1:
    case 42:
      return createLevel1(ctx);
    case 2:
      return createLevel2(ctx);
    case 3:
    case 44:
      return createLevel3(ctx);
    case 4:
      return createLevel4(ctx);
    case 5:
    case 43:
      return createLevel5(ctx);
    case 6:
    case 19:
    case 25:
    case 35:
    case 47:
      return createLevel6(ctx);
    case 7:
    case 39:
    case 49:
      return createLevel7(ctx);
    case 9:
    case 11:
    case 12:
    case 14:
    case 17:
    case 28:
    case 32:
    case 36:
    case 46:
      return createHazardCourseLevel(ctx);
    case 8:
    case 13:
    case 15:
    case 16:
    case 18:
    case 26:
    case 31:
    case 33:
    case 34:
    case 37:
    case 38:
    case 41:
    case 45:
    case 48:
      return createFloorSurvivalLevel(ctx);
    case 21:
    case 22:
    case 23:
    case 24:
    case 27:
    case 29:
      return createMindGamesLevel(ctx);
    case 10:
    case 20:
    case 30:
    case 40:
    case 50:
      return createBossLevel(ctx);
    default:
      return createFloorSurvivalLevel(ctx);
  }
}
