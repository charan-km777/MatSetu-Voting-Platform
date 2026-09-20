import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matsetuRouter from "./matsetu";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matsetuRouter);

export default router;
