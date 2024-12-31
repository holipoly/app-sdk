import { NextApiHandler } from "next";

import { SyncWebhookEventType } from "../../../types";
import { HolipolyWebhook, NextWebhookApiHandler, WebhookConfig } from "./holipoly-webhook";
import { buildSyncWebhookResponsePayload } from "./sync-webhook-response-builder";

type InjectedContext<TEvent extends SyncWebhookEventType> = {
  buildResponse: typeof buildSyncWebhookResponsePayload<TEvent>;
};

export class HolipolySyncWebhook<
  TPayload = unknown,
  TEvent extends SyncWebhookEventType = SyncWebhookEventType
> extends HolipolyWebhook<TPayload, InjectedContext<TEvent>> {
  readonly event: TEvent;

  protected readonly eventType = "sync" as const;

  protected extraContext = {
    buildResponse: buildSyncWebhookResponsePayload,
  };

  constructor(configuration: WebhookConfig<TEvent>) {
    super(configuration);

    this.event = configuration.event;
  }

  createHandler(
    handlerFn: NextWebhookApiHandler<
      TPayload,
      {
        buildResponse: typeof buildSyncWebhookResponsePayload<TEvent>;
      }
    >
  ): NextApiHandler {
    return super.createHandler(handlerFn);
  }
}
