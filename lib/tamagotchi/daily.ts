import type { CombatBuffType } from "./combat-buffs";
import type { Quest } from "./types";

export interface DailyLoginReward {
  day: number;
  title: string;
  bytes: number;
  exp: number;
  skillPoints: number;
  freeBuff?: CombatBuffType;
  badge: string;
  description: string;
}

export const DAILY_LOGIN_REWARDS: DailyLoginReward[] = [
  {
    day: 1,
    title: "ИНИЦИАЛИЗАЦИЯ",
    bytes: 60,
    exp: 50,
    skillPoints: 0,
    badge: "⚡ 100% ЗАРЯД",
    description: "+60 Байтов, +50 EXP и мгновенная полная подзарядка энергии.",
  },
  {
    day: 2,
    title: "СИНХРОНИЗАЦИЯ",
    bytes: 120,
    exp: 80,
    skillPoints: 1,
    badge: "💎 +1 SP",
    description: "+120 Байтов, +80 EXP и +1 Очко характеристик (SP).",
  },
  {
    day: 3,
    title: "ШИП ШИФРОВАНИЯ",
    bytes: 180,
    exp: 100,
    skillPoints: 0,
    freeBuff: "BLADEMAIL",
    badge: "🛡️ BLADEMAIL",
    description: "+180 Байтов, +100 EXP и боевой оверклок «BLADEMAIL» в инвентарь.",
  },
  {
    day: 4,
    title: "РАСШИРЕНИЕ ОЗУ",
    bytes: 260,
    exp: 140,
    skillPoints: 1,
    badge: "💎 +1 SP",
    description: "+260 Байтов, +140 EXP и +1 Очко характеристик (SP).",
  },
  {
    day: 5,
    title: "АДРЕНАЛИН БЕРСЕРКА",
    bytes: 380,
    exp: 200,
    skillPoints: 0,
    freeBuff: "BERSERK",
    badge: "🩸 BERSERK",
    description: "+380 Байтов, +200 EXP и боевой оверклок «BERSERK» в инвентарь.",
  },
  {
    day: 6,
    title: "СИСТЕМНЫЙ ПРОРЫВ",
    bytes: 550,
    exp: 300,
    skillPoints: 2,
    badge: "💎 +2 SP",
    description: "+550 Байтов, +300 EXP и сразу +2 Очка характеристик (SP).",
  },
  {
    day: 7,
    title: "ДЖЕКПОТ ЯДРА",
    bytes: 1200,
    exp: 600,
    skillPoints: 3,
    freeBuff: "VAMPIRISM",
    badge: "👑 МЕГА-КЭШ",
    description: "ДЖЕКПОТ! +1200 Байтов, +600 EXP, +3 SP и оверклок «NANITE DRAIN».",
  },
];

export interface QuestTemplate {
  id: string;
  category: "SURVIVORS" | "CARE" | "ARCADE";
  title: string;
  desc: string;
  target: number;
  rewardBytes: number;
  rewardExp: number;
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  // Survivors directives
  {
    id: "surv_time_60",
    category: "SURVIVORS",
    title: "ВЫЖИТЬ 60 СЕКУНД",
    desc: "Продержаться не менее 60 секунд в одном кибер-рейде Survivors",
    target: 1,
    rewardBytes: 45,
    rewardExp: 75,
  },
  {
    id: "surv_kills_80",
    category: "SURVIVORS",
    title: "ОЧИСТКА ОТ ВИРУСОВ",
    desc: "Уничтожить 80 багов и вирусов в рейдах Survivors",
    target: 80,
    rewardBytes: 50,
    rewardExp: 90,
  },
  {
    id: "surv_tank_kill",
    category: "SURVIVORS",
    title: "СОКРУШИТЕЛЬ БРОНИ",
    desc: "Уничтожить бронированного Танка или Босса в рейде",
    target: 1,
    rewardBytes: 60,
    rewardExp: 120,
  },
  {
    id: "surv_buff_run",
    category: "SURVIVORS",
    title: "БОЕВОЙ ОВЕРКЛОК",
    desc: "Запустить рейд с любым активным боевым оверклоком (баффом)",
    target: 1,
    rewardBytes: 40,
    rewardExp: 60,
  },
  {
    id: "surv_medkit_3",
    category: "SURVIVORS",
    title: "ПОЛЕВОЙ РЕМОНТ",
    desc: "Подобрать 3 аптечки во время выживания в рейде",
    target: 3,
    rewardBytes: 35,
    rewardExp: 60,
  },

  // Care directives
  {
    id: "care_feed_3",
    category: "CARE",
    title: "СБАЛАНСИРОВАННЫЙ КОД",
    desc: "Покормить питомца 3 раза питательными пакетами данных",
    target: 3,
    rewardBytes: 25,
    rewardExp: 45,
  },
  {
    id: "care_clean_1",
    category: "CARE",
    title: "ГЛУБОКИЙ ДЕФРАГ",
    desc: "Очистить кэш буфера питомца от системного мусора",
    target: 1,
    rewardBytes: 20,
    rewardExp: 35,
  },
  {
    id: "care_pet_5",
    category: "CARE",
    title: "НЕЙРО-СИНХРОНИЗАЦИЯ",
    desc: "Погладить демона 5 раз для калибровки ядра",
    target: 5,
    rewardBytes: 20,
    rewardExp: 30,
  },

  // Arcade directives
  {
    id: "arcade_play_2",
    category: "ARCADE",
    title: "МАСТЕР АРКАД",
    desc: "Сыграть в аркадные мини-игры (Взлом, Вирусы, Раннер) 2 раза",
    target: 2,
    rewardBytes: 35,
    rewardExp: 60,
  },
  {
    id: "arcade_wheel_1",
    category: "ARCADE",
    title: "ФОРТУНА ХАКЕРА",
    desc: "Испытать удачу в Рулетке Взлома",
    target: 1,
    rewardBytes: 25,
    rewardExp: 35,
  },
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Pseudo-random deterministic daily quest selector based on date
export function generateDailyQuests(dateStr: string): Quest[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  }

  const survPool = QUEST_TEMPLATES.filter((q) => q.category === "SURVIVORS");
  const carePool = QUEST_TEMPLATES.filter((q) => q.category === "CARE");
  const arcadePool = QUEST_TEMPLATES.filter((q) => q.category === "ARCADE");

  // Pick 2 survivors, 1 care, 1 arcade
  const pickFrom = (pool: QuestTemplate[], offset: number) => {
    const idx = (seed + offset) % pool.length;
    return pool[idx]!;
  };

  const q1 = pickFrom(survPool, 1);
  let q2 = pickFrom(survPool, 2);
  if (q2.id === q1.id) {
    q2 = survPool[(survPool.indexOf(q1) + 1) % survPool.length]!;
  }
  const q3 = pickFrom(carePool, 3);
  const q4 = pickFrom(arcadePool, 4);

  return [q1, q2, q3, q4].map((t) => ({
    id: t.id,
    title: t.title,
    desc: t.desc,
    target: t.target,
    current: 0,
    rewardBytes: t.rewardBytes,
    rewardExp: t.rewardExp,
    completed: false,
  }));
}

export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 7;
}

// Progress a specific quest by ID or category
export function advanceQuestProgress(
  quests: Quest[],
  questId: string,
  amount = 1,
): { quests: Quest[]; bytesAwarded: number; expAwarded: number; anyCompleted: boolean } {
  let bytesAwarded = 0;
  let expAwarded = 0;
  let anyCompleted = false;

  const updated = quests.map((q) => {
    if (q.id === questId && !q.completed) {
      const nextVal = Math.min(q.target, q.current + amount);
      const isNowCompleted = nextVal >= q.target;
      if (isNowCompleted) {
        bytesAwarded += q.rewardBytes;
        expAwarded += q.rewardExp;
        anyCompleted = true;
      }
      return {
        ...q,
        current: nextVal,
        completed: isNowCompleted,
      };
    }
    return q;
  });

  return { quests: updated, bytesAwarded, expAwarded, anyCompleted };
}

// Milestone reward for completing all 4 daily quests
export const DAILY_CONTRACT_BONUS = {
  bytes: 120,
  exp: 160,
  skillPoints: 1,
  title: "КВАНТОВЫЙ КОНТЕЙНЕР ДНЯ",
};
