import { Router } from "express";

import { WorkspaceMemberController } from "../controllers/workspace-member.controller";

const router = Router();

const controller = new WorkspaceMemberController();

router.post("/:id/members", controller.addMember);

router.get("/:id/members", controller.listMembers);

router.patch("/:id/members/:memberId", controller.updateRole);

router.delete("/:id/members/:memberId", controller.removeMember);
router.get("/:id/members/:memberId", controller.getMember);

export default router;
