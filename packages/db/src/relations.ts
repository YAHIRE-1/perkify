import {
  authRelations,
  questRelations,
  disputesRelations,
  transactionsRelations,
} from "./schema";

export const relations = {
  ...authRelations,
  ...questRelations,
  ...disputesRelations,
  ...transactionsRelations,
};