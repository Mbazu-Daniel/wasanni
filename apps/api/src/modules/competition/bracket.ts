import { BadRequestError } from "@wasanni/kit";
import { MAX_BRACKET_SIZE } from "./constants.ts";
import type { BracketNode } from "./types.ts";

export function bracketSize(participantCount: number): number {
  if (!Number.isInteger(participantCount) || participantCount < 2) {
    throw new BadRequestError("a bracket needs at least 2 participants");
  }
  if (participantCount > MAX_BRACKET_SIZE) {
    throw new BadRequestError(`a bracket supports at most ${MAX_BRACKET_SIZE} participants`);
  }
  return 2 ** Math.ceil(Math.log2(participantCount));
}

export function totalRounds(size: number): number {
  return Math.log2(size);
}

export function seedOrder(size: number): number[] {
  let order = [1, 2];

  while (order.length < size) {
    const mirror = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, mirror - seed);
    }
    order = next;
  }

  return order;
}

export function nextSlotOf(slot: number): number {
  return Math.floor(slot / 2);
}

export function nextSideOf(slot: number): number {
  return slot % 2;
}

export function buildBracket(participantCount: number): BracketNode[] {
  const size = bracketSize(participantCount);
  const rounds = totalRounds(size);
  const order = seedOrder(size);
  const nodes: BracketNode[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const slots = size / 2 ** round;
    const firstRound = round === 1;
    const finalRound = round === rounds;

    for (let slot = 0; slot < slots; slot += 1) {
      const home = firstRound ? order[slot * 2] : undefined;
      const away = firstRound ? order[slot * 2 + 1] : undefined;

      nodes.push({
        round,
        slot,
        homeSeed:
          home !== undefined && home <= participantCount ? home : null,
        awaySeed:
          away !== undefined && away <= participantCount ? away : null,
        nextRound: finalRound ? null : round + 1,
        nextSlot: finalRound ? null : nextSlotOf(slot),
        nextSide: finalRound ? null : nextSideOf(slot),
      });
    }
  }

  return nodes;
}
