import { APL, AplReadyResult } from "./APL";

export interface HasAPL {
  apl: APL;
}

export interface HolipolyAppParams {
  apl: APL;
  requiredEnvVars?: string[];
}

export class HolipolyApp implements HasAPL {
  readonly apl: APL;

  readonly requiredEnvVars: string[];

  constructor(options: HolipolyAppParams) {
    this.apl = options.apl;
    this.requiredEnvVars = options.requiredEnvVars ?? [];
  }

  isReady(): Promise<AplReadyResult> {
    return this.apl.isReady();
  }
}
