/** Apply the rewriting rules n times, preserving characters without a rule. */
export function expand(
  axiom: string,
  rules: Record<string, string>,
  n: number,
): string {
  let result = axiom;

  for (let iteration = 0; iteration < n; iteration += 1) {
    result = [...result].map((symbol) => rules[symbol] ?? symbol).join("");
  }

  return result;
}

export type Segment = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  depth: number;
};

type TurtleState = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  depth: number;
};

/** Interpret L-system commands as turtle-drawn line segments. */
export function turtle(
  cmds: string,
  opts?: { step?: number; angleDeg?: number },
): Segment[] {
  const step = opts?.step ?? 1;
  const angle = ((opts?.angleDeg ?? 25) * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const segments: Segment[] = [];
  const stack: TurtleState[] = [];
  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = 1;
  let depth = 0;

  for (const command of cmds) {
    switch (command) {
      case "F": {
        const x1 = x + dx * step;
        const y1 = y + dy * step;
        segments.push({ x0: x, y0: y, x1, y1, depth });
        x = x1;
        y = y1;
        break;
      }
      case "f":
        x += dx * step;
        y += dy * step;
        break;
      case "+": {
        const nextDx = dx * cosine - dy * sine;
        dy = dx * sine + dy * cosine;
        dx = nextDx;
        break;
      }
      case "-": {
        const nextDx = dx * cosine + dy * sine;
        dy = -dx * sine + dy * cosine;
        dx = nextDx;
        break;
      }
      case "[":
        stack.push({ x, y, dx, dy, depth });
        depth += 1;
        break;
      case "]": {
        const state = stack.pop()!;
        ({ x, y, dx, dy, depth } = state);
        break;
      }
    }
  }

  return segments;
}

export const PRESETS: Record<
  "tree" | "weed" | "koch",
  { axiom: string; rules: Record<string, string>; angleDeg: number }
> = {
  tree: {
    axiom: "F",
    rules: { F: "F[+F]F[-F]F" },
    angleDeg: 25,
  },
  weed: {
    axiom: "X",
    rules: { X: "F[+X][-X]FX", F: "FF" },
    angleDeg: 22.5,
  },
  koch: {
    axiom: "F",
    rules: { F: "F+F-F-F+F" },
    angleDeg: 90,
  },
};
