-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ExitReason" AS ENUM ('TAKE_PROFIT', 'STOP_LOSS', 'MARKET_RESOLVED', 'SIGNAL', 'MANUAL');

-- CreateTable
CREATE TABLE "paper_trades" (
    "id" SERIAL NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "market_id" TEXT NOT NULL,
    "market_name" TEXT,
    "token_id" TEXT,
    "condition_id" TEXT,
    "strategy" TEXT,
    "direction" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "entry_price" DECIMAL(65,30) NOT NULL,
    "exit_price" DECIMAL(65,30),
    "fees" DECIMAL(65,30) DEFAULT 0,
    "pnl" DECIMAL(65,30),
    "probability_at_entry" DECIMAL(65,30),
    "probability_at_exit" DECIMAL(65,30),
    "entry_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit_at" TIMESTAMPTZ,
    "exit_reason" "ExitReason",
    "reasoning" TEXT,

    CONSTRAINT "paper_trades_pkey" PRIMARY KEY ("id")
);
