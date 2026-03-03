import { Router } from "express";
import tradeRoutes from "./trade.routes";

const router = Router();

router.use("/trades", tradeRoutes);

export default router;
