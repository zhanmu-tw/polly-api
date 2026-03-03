import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import type { PaperTradeWhereInput } from "../generated/prisma/models/PaperTrade";
import type { PaperTrade } from "../generated/prisma/client";

const router = Router();

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

const createTradeSchema = z.object({
  marketId: z.string(),
  marketName: z.string().optional(),
  tokenId: z.string().optional(),
  conditionId: z.string().optional(),
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

// ─── Routes ────────────────────────────────────────────────────────────────────

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
    res.status(201).json(trade);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create trade", details: String(error) });
  }
});

/**
 * PATCH /trades/:id/close — Close an open trade
 */
router.patch("/:id/close", async (req: Request, res: Response) => {
  const parsed = closeTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const id = parseInt(req.params.id as string, 10);

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
    const entryPrice = parseFloat(existing.entryPrice.toString());
    const quantity = parseFloat(existing.quantity.toString());
    const fees = inputFees ?? parseFloat((existing.fees ?? 0).toString());

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

    res.json(trade);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to close trade", details: String(error) });
  }
});

/**
 * GET /trades — List trades, optionally filtered
 */
router.get("/", async (req: Request, res: Response) => {
  const parsed = tradeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({
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

    res.json(trades);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch trades", details: String(error) });
  }
});

/**
 * GET /trades/portfolio — Derived portfolio state from trades
 */
router.get("/portfolio", async (req: Request, res: Response) => {
  const parsed = portfolioQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({
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
      (sum: number, t: PaperTrade) =>
        sum + (t.pnl ? parseFloat(t.pnl.toString()) : 0),
      0,
    );

    const capitalDeployed = openTrades.reduce(
      (sum: number, t: PaperTrade) =>
        sum +
        parseFloat(t.entryPrice.toString()) * parseFloat(t.quantity.toString()),
      0,
    );

    const cash = startingBalance + realizedPnl - capitalDeployed;

    const positions = openTrades.map((t: PaperTrade) => ({
      tradeId: t.id,
      marketId: t.marketId,
      marketName: t.marketName,
      direction: t.direction,
      quantity: t.quantity,
      entryPrice: t.entryPrice,
      costBasis:
        parseFloat(t.entryPrice.toString()) * parseFloat(t.quantity.toString()),
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
    res
      .status(500)
      .json({ error: "Failed to compute portfolio", details: String(error) });
  }
});

/**
 * GET /trades/:id — Get a single trade
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const trade = await prisma.paperTrade.findUnique({
      where: { id: parseInt(req.params.id as string, 10) },
    });

    if (!trade) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }

    res.json(trade);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch trade", details: String(error) });
  }
});

export default router;
