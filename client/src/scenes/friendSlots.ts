// 학생이 고른 캐릭터를 빼고, 나머지 5마리를 npc_friend_1 ~ npc_friend_5 슬롯에 매핑.
// 시드 기반 셔플로 일관성 유지 (같은 학생 = 항상 같은 매핑).

import { CHARACTER_IDS } from '@shared/lib/characters';

export type FriendSlotMap = Record<string, string>; // 'npc_friend_1' → 'fox' 등

// 단순 결정적 셔플 (Fisher-Yates 변형, 시드는 학생 ID 의 hash)
const seededShuffle = (arr: string[], seed: string): string[] => {
  const out = [...arr];
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const buildFriendSlots = (selectedCharacterId: string): FriendSlotMap => {
  const others = CHARACTER_IDS.filter((id) => id !== selectedCharacterId);
  const shuffled = seededShuffle(others, selectedCharacterId);
  const map: FriendSlotMap = {};
  for (let i = 0; i < shuffled.length; i++) {
    map[`npc_friend_${i + 1}`] = shuffled[i];
  }
  return map;
};
