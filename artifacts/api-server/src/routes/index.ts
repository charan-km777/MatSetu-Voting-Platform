import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { createMatSetuRouter } from "./matsetu";
import { createInMemoryMatSetuRepository } from "../matsetu-store";

const router: IRouter = Router();

router.use(healthRouter);
router.use(createMatSetuRouter(createInMemoryMatSetuRepository()));

export default router;
