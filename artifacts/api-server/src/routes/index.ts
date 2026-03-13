import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users/index";
import guardiansRouter from "./guardians/index";
import moodRouter from "./mood/index";
import buddyRouter from "./buddy/index";
import geminiRouter from "./gemini/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/guardians", guardiansRouter);
router.use("/mood", moodRouter);
router.use("/buddy", buddyRouter);
router.use("/gemini", geminiRouter);

export default router;
