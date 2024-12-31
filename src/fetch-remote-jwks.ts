import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

import { getOtelTracer, OTEL_CORE_SERVICE_NAME } from "./open-telemetry";
import { getJwksUrlFromHolipolyApiUrl } from "./urls";

export const fetchRemoteJwks = async (holipolyApiUrl: string) => {
  const tracer = getOtelTracer();

  return tracer.startActiveSpan(
    "fetchRemoteJwks",
    {
      kind: SpanKind.CLIENT,
      attributes: { holipolyApiUrl, [SemanticAttributes.PEER_SERVICE]: OTEL_CORE_SERVICE_NAME },
    },
    async (span) => {
      try {
        const jwksResponse = await fetch(getJwksUrlFromHolipolyApiUrl(holipolyApiUrl));

        const jwksText = await jwksResponse.text();

        span.setStatus({ code: SpanStatusCode.OK });

        return jwksText;
      } catch (err) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });

        throw err;
      } finally {
        span.end();
      }
    }
  );
};
