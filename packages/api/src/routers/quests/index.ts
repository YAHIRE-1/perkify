import { o } from "../../index";
import { archive } from "./archive";
import { create } from "./create";
import { get } from "./get";
import { list } from "./list";
import { update } from "./update";
import { confirm } from "./confirm";

export const questsRouter = o
  .prefix("/quests")
  .tag("Quests")
  .router({ list, get, create, update, archive, confirm });
