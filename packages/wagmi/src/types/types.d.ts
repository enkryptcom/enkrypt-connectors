import { Ethereum } from "@wagmi/core";

export interface EnkryptEthereum extends Ethereum {
  isEnkrypt?: boolean;
}
