import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import type { PaperTradeWhereInput } from "../generated/prisma/models/PaperTrade";
import type { PaperTrade } from "../generated/prisma/client";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────────

function serializeTrade(trade: PaperTrade) {
  return {
    ...trade,
    quantity: Number(trade.quantity),
    entryPrice: Number(trade.entryPrice),
    exitPrice: trade.exitPrice != null ? Number(trade.exitPrice) : null,
    fees: trade.fees != null ? Number(trade.fees) : null,
    pnl: trade.pnl != null ? Number(trade.pnl) : null,
    probabilityAtEntry:
      trade.probabilityAtEntry != null
        ? Number(trade.probabilityAtEntry)
        : null,
    probabilityAtExit:
      trade.probabilityAtExit != null
        ? Number(trade.probabilityAtExit)
        : null,
  };
}

const idParamSchema = z.coerce.number().int().positive();

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const createTradeSchema = z.object({
  marketId: z.string(),
  marketName: z.string().optional(),
  tokenId: z.string().optional(),
  conditionId: z.string().optional(),
  slug: z.string(),
  strategy: z.string().optional(),
  direction: z.enum(["YES", "NO"]),
  quantity: z.number().positive(),
  entryPrice: z.number().min(0).max(1),
  probabilityAtEntry: z.number().min(0).max(1).optional(),
  reasoning: z.string().optional(),
});

const closeTradeSchema = z.object({
  exitPrice: z.number().min(0).max(1),
  probabilityAtExit: z.number().min(0).max(1).optional(),
  exitReason: z
    .enum(["TAKE_PROFIT", "STOP_LOSS", "MARKET_RESOLVED", "SIGNAL", "MANUAL"])
    .optional(),
  fees: z.number().min(0).optional(),
});

const tradeQuerySchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  strategy: z.string().optional(),
  marketId: z.string().optional(),
});

const portfolioQuerySchema = z.object({
  balance: z.coerce.number().positive().default(1000),
});

// ─── Routes ─────────────────────────────────────────────────────────────────────

/**
 * POST /trades — Open a new paper trade
 */
router.post("/", async (req: Request, res: Response) => {
  const parsed = createTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const trade = await prisma.paperTrade.create({ data: parsed.data });
    res.status(201).json(serializeTrade(trade));
  } catch (error) {
    console.error("Failed to create trade:", error);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

/**
 * PATCH /trades/:id/close — Close an open trade
 */
router.patch("/:id/close", async (req: Request, res: Response) => {
  const idResult = idParamSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  const parsed = closeTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const id = idResult.data;

    const existing = await prisma.paperTrade.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }
    if (existing.status === "CLOSED") {
      res.status(400).json({ error: "Trade is already closed" });
      return;
    }

    const {
      exitPrice,
      probabilityAtExit,
      exitReason,
      fees: inputFees,
    } = parsed.data;
    const entryPrice = Number(existing.entryPrice);
    const quantity = Number(existing.quantity);
    const fees = inputFees ?? Number(existing.fees ?? 0);

    const direction = existing.direction === "YES" ? 1 : -1;
    const pnl = (exitPrice - entryPrice) * quantity * direction - fees;

    const trade = await prisma.paperTrade.update({
      where: { id },
      data: {
        status: "CLOSED",
        exitPrice,
        exitAt: new Date(),
        pnl,
        fees,
        probabilityAtExit,
        exitReason,
      },
    });

    res.json(serializeTrade(trade));
  } catch (error) {
    console.error("Failed to close trade:", error);
    res.status(500).json({ error: "Failed to close trade" });
  }
});

/**
 * GET /trades — List trades, optionally filtered
 */
router.get("/", async (req: Request, res: Response) => {
  const parsed = tradeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const where: PaperTradeWhereInput = {};
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.strategy) where.strategy = parsed.data.strategy;
    if (parsed.data.marketId) where.marketId = parsed.data.marketId;

    const trades = await prisma.paperTrade.findMany({
      where,
      orderBy: { entryAt: "desc" },
    });

    res.json(trades.map(serializeTrade));
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

/**
 * GET /trades/portfolio — Derived portfolio state from trades
 */
router.get("/portfolio", async (req: Request, res: Response) => {
  const parsed = portfolioQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const { balance: startingBalance } = parsed.data;

    const [openTrades, closedTrades] = await Promise.all([
      prisma.paperTrade.findMany({ where: { status: "OPEN" } }),
      prisma.paperTrade.findMany({ where: { status: "CLOSED" } }),
    ]);

    const realizedPnl = closedTrades.reduce(
      (sum, t) => sum + (t.pnl ? Number(t.pnl) : 0),
      0,
    );

    const capitalDeployed = openTrades.reduce(
      (sum, t) => sum + Number(t.entryPrice) * Number(t.quantity),
      0,
    );

    const cash = startingBalance + realizedPnl - capitalDeployed;

    const positions = openTrades.map((t) => ({
      tradeId: t.id,
      marketId: t.marketId,
      marketName: t.marketName,
      direction: t.direction,
      quantity: Number(t.quantity),
      entryPrice: Number(t.entryPrice),
      costBasis: Number(t.entryPrice) * Number(t.quantity),
    }));

    res.json({
      startingBalance,
      cash,
      realizedPnl,
      capitalDeployed,
      openPositionCount: openTrades.length,
      closedTradeCount: closedTrades.length,
      positions,
    });
  } catch (error) {
    console.error("Failed to compute portfolio:", error);
    res.status(500).json({ error: "Failed to compute portfolio" });
  }
});

/**
 * GET /trades/:id — Get a single trade
 */
router.get("/:id", async (req: Request, res: Response) => {
  const idResult = idParamSchema.safeParse(req.params.id);
  if (!idResult.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  try {
    const trade = await prisma.paperTrade.findUnique({
      where: { id: idResult.data },
    });

    if (!trade) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }

    res.json(serializeTrade(trade));
  } catch (error) {
    console.error("Failed to fetch trade:", error);
    res.status(500).json({ error: "Failed to fetch trade" });
  }
});

export default router;
