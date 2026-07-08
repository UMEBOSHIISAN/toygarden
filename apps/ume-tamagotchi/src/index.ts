import type { PlayEvent } from "@toygarden/contracts";
import type { Device } from "@toygarden/core-device";

/**
 * ume-tamagotchi — うめこ/しそこ（ブランドキャラ）を育成。
 * 投稿(task.done: 投稿)で喜ぶ、発送滞り(gate.pending)で弱る＝売上導線をキャラで体感。
 * brand-guidelines と接続する遊び。core-device に表情を描く。
 */

export interface Pet {
  name: string;
  mood: number; // 0..100
  energy: number; // 0..100
}

export function initPet(name = "うめこ"): Pet {
  return { name, mood: 50, energy: 50 };
}

const clamp = (n: number): number => Math.max(0, Math.min(100, n));

export function applyEvent(pet: Pet, e: PlayEvent): Pet {
  switch (e.kind) {
    case "task.done":
      return e.project === "投稿"
        ? { ...pet, mood: clamp(pet.mood + 15) } // 投稿＝売上の入口。一番喜ぶ
        : { ...pet, mood: clamp(pet.mood + 5) };
    case "gate.pending":
      return { ...pet, energy: clamp(pet.energy - 10) }; // 承認待ちが溜まると弱る
    case "deploy.success":
      return { ...pet, mood: clamp(pet.mood + 10), energy: clamp(pet.energy + 10) };
    default:
      return pet;
  }
}

/** 状態から表情（ASCII）。energy 低下を最優先で表示。 */
export function face(pet: Pet): string {
  if (pet.energy < 20) return "(´;ω;`)";
  if (pet.mood > 70) return "(*^▽^*)";
  if (pet.mood < 30) return "(-_-)";
  return "(・ω・)";
}

/** 実機パネル用の表情（ASCIIのみ）。小型液晶のフォントは ASCII しか描けない。 */
export function deviceFace(pet: Pet): string {
  if (pet.energy < 20) return "(;_;)";
  if (pet.mood > 70) return "\\(^o^)/";
  if (pet.mood < 30) return "(-_-)";
  return "(o_o)";
}

export function draw(device: Device, pet: Pet): void {
  device.draw({ op: "clear" });
  device.draw({ op: "text", x: 20, y: 20, text: deviceFace(pet) });
  device.draw({ op: "text", x: 20, y: 48, text: `umeko mood:${pet.mood} e:${pet.energy}` });
  device.flush();
}

/** ボタン A（なでる）。手でかまってもらえると機嫌が上がる。 */
export function pat(pet: Pet): Pet {
  return { ...pet, mood: clamp(pet.mood + 8) };
}

/** ボタン B（おやつ）。食べると元気が回復する。 */
export function feed(pet: Pet): Pet {
  return { ...pet, energy: clamp(pet.energy + 8) };
}

/**
 * 実機ボタン A(0)=なでる/B(1)=おやつ を pet 状態へ配線する。
 * 押下ごとに現在の pet を取得→変換→反映→即 draw() する。戻り値を呼ぶと購読解除。
 */
export function wireButtons(device: Device, getPet: () => Pet, setPet: (pet: Pet) => void): () => void {
  return device.onButton((button) => {
    const current = getPet();
    const next = button === 0 ? pat(current) : button === 1 ? feed(current) : current;
    if (next === current) return;
    setPet(next);
    draw(device, next);
  });
}
