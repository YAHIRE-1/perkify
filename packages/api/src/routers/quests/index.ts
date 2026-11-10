import { o } from "../../index";
import { archive } from "./archive";
import { claimReward } from "./claim-reward";
import { confirm } from "./confirm";
import { create } from "./create";
import { getEvidence } from "./get-evidence";
import { get } from "./get";
import { join } from "./join";
import { list } from "./list";
import { review } from "./review";
import { submitEvidence } from "./submit-evidence";
import { update } from "./update";
import { uploadUrl } from "./upload-url";
import { confirmPayout } from "./confirm-payout";

export const questsRouter = o
  .prefix("/quests")
  .tag("Quests")
  .router({
    list,
    get,
    create,
    update,
    archive,
    confirm,
    claimReward,
    getEvidence,
    join,
    review,
    submitEvidence,
    uploadUrl,
    confirmPayout,
  });