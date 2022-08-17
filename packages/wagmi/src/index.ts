import {
  InjectedConnector,
  InjectedConnectorOptions,
  Chain,
  ConnectorNotFoundError,
  UserRejectedRequestError,
  ResourceUnavailableError,
  RpcError,
} from "@wagmi/core";
import { EnkryptEthereum } from "./types/types.d";

type EnkryptConnectorOptions = Pick<
  InjectedConnectorOptions,
  "shimChainChangedDisconnect" | "shimDisconnect"
> & {
  /**
   * While "disconnected" with `shimDisconnect`, allows user to select a different MetaMask account (than the currently connected account) when trying to connect.
   */
  UNSTABLE_shimOnConnectSelectAccount?: boolean;
};

interface EnkryptConnectorConstructor {
  chains: Chain[];
  options?: EnkryptConnectorOptions;
}

export class EnkryptConnector extends InjectedConnector {
  readonly id = "enkrypt";

  readonly ready = true;

  private provider: EnkryptEthereum | undefined;

  private UNSTABLE_shimOnConnectSelectAccount: EnkryptConnectorOptions["UNSTABLE_shimOnConnectSelectAccount"];

  constructor({ chains, options }: EnkryptConnectorConstructor) {
    const _options = {
      name: "Enkrypt",
      shimDisconnect: false,
      shimChainChangeDisconnect: false,
      ...options,
    };

    super({ chains, options: _options });

    this.UNSTABLE_shimOnConnectSelectAccount =
      _options.UNSTABLE_shimOnConnectSelectAccount;
  }

  async connect(connectionOptions?: { chainId?: number }): Promise<{
    account: string;
    chain: { id: number; unsupported: boolean };
    provider: EnkryptEthereum;
  }> {
    try {
      const provider = await this.getProvider();
      if (!provider) {
        if (window) {
          window.open("https://www.enkrypt.com", "_blank");
          throw new ConnectorNotFoundError();
        }
      }

      if (provider.on) {
        provider.on("accountsChanged", this.onAccountsChanged);
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect);
      }

      this.emit("message", { type: "connecting" });

      // Attempt to show wallet select prompt with `wallet_requestPermissions` when
      // `shimDisconnect` is active and account is in disconnected state (flag in storage)
      if (
        this.UNSTABLE_shimOnConnectSelectAccount &&
        this.options?.shimDisconnect
      ) {
        const accounts = await provider
          .request({
            method: "eth_accounts",
          })
          .catch(() => []);
        const isConnected = !!accounts[0];
        if (isConnected)
          await provider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
      }

      const account = await this.getAccount();
      // Switch to chain if provided
      let id = await this.getChainId();
      let unsupported = this.isChainUnsupported(id);
      if (connectionOptions?.chainId && id !== connectionOptions.chainId) {
        const chain = await this.switchChain(connectionOptions.chainId);
        id = chain.id;
        unsupported = this.isChainUnsupported(id);
      }

      return { account, chain: { id, unsupported }, provider };
    } catch (error) {
      if (this.isUserRejectedRequestError(error))
        throw new UserRejectedRequestError(error);
      if ((<RpcError>error).code === -32002)
        throw new ResourceUnavailableError(error);
      throw error;
    }
  }

  async getProvider() {
    if (typeof window !== "undefined") {
      const maybeProvider = this.findProvider(
        (window as any).enkrypt?.providers.ethereum
      );

      if (typeof maybeProvider !== "boolean") {
        this.provider = maybeProvider;
      }
    }
    return this.provider;
  }

  // eslint-disable-next-line class-methods-use-this
  private getReady(ethereum?: EnkryptEthereum): EnkryptEthereum | boolean {
    const isEnkrypt = !!ethereum?.isEnkrypt;
    if (!isEnkrypt) return true;
    return ethereum;
  }

  private findProvider(ethereum?: EnkryptEthereum): EnkryptEthereum | boolean {
    if (ethereum?.providers) return ethereum.providers.find(this.getReady);
    return this.getReady(ethereum);
  }
}
