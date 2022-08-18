# wagmi

A wagmi compatible wallet connector for [Enkrypt](https://www.enkrypt.com).

## Usage

```
import { EnkryptConnector } from "@enkryptcom/connector-wagmi";
import {
  createClient,
  defaultChains,
} from 'wagmi'

const client = createClient({
  autoConnect: true,
  connectors: [
    new EnkryptConnector({ chains: defaultChains })
});
```
