/**
 * This file adds a wrapper to the CreatedMessageWithContent to allow runtime
 * validation.
 */

import * as t from "io-ts";
import { number, string } from "io-ts";
import { FiscalCode } from "../api/FiscalCode";
import { MessageContent } from "../api/MessageContent";

// required attributes
const CreatedMessageWithContentR = t.interface({
  content: MessageContent,
  fiscalCode: FiscalCode,
  senderServiceId: string
});

// optional attributes
const CreatedMessageWithContentO = t.partial({
  id: string,
  timeToLive: number
});

export const CreatedMessageWithContent = t.intersection([
  CreatedMessageWithContentR,
  CreatedMessageWithContentO
]);

export type CreatedMessageWithContent = t.TypeOf<
  typeof CreatedMessageWithContent
>;
