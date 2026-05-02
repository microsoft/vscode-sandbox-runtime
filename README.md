# vscode-sandbox-runtime

This is an npm module and CLI for applying OS-level filesystem and network restrictions to arbitrary processes. This repository is a fork of [Anthropic Sandbox Runtime](https://github.com/anthropic-experimental/sandbox-runtime), adapted for VS Code packaging and distribution.

## How it works

- Install the `@vscode/sandbox-runtime` package as a dependency or global CLI.
- Configure filesystem and network restrictions in `~/.srt-settings.json`, or pass a custom configuration with `srt --settings <path>`.
- Run commands through the `srt` CLI, or use the exported `SandboxManager` API to wrap commands programmatically.
- The runtime applies native sandboxing primitives: `sandbox-exec` on macOS and `bubblewrap`/seccomp-based isolation on Linux.
- Network access is mediated through local HTTP and SOCKS proxy helpers so allowed and denied domains can be enforced for the sandboxed process tree.

## Usage example

Install the package and run a command through the sandbox:

```bash
npm install -g @vscode/sandbox-runtime

cat > ~/.srt-settings.json <<'JSON'
{
  "network": {
    "allowedDomains": ["example.com"],
    "deniedDomains": []
  },
  "filesystem": {
    "denyRead": ["~/.ssh"],
    "allowRead": [],
    "allowWrite": ["."],
    "denyWrite": [".env"]
  }
}
JSON

srt "curl https://example.com"
```

Use the package from Node.js or TypeScript:

```ts
import { SandboxManager, type SandboxRuntimeConfig } from '@vscode/sandbox-runtime'
import { spawn } from 'node:child_process'

const config: SandboxRuntimeConfig = {
  network: {
    allowedDomains: ['example.com'],
    deniedDomains: [],
  },
  filesystem: {
    denyRead: ['~/.ssh'],
    allowRead: [],
    allowWrite: ['.'],
    denyWrite: ['.env'],
  },
}

await SandboxManager.initialize(config)

const command = await SandboxManager.wrapWithSandbox('curl https://example.com')
const child = spawn(command, { shell: true, stdio: 'inherit' })

child.on('exit', async () => {
  await SandboxManager.reset()
})
```

## Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to, and actually do, grant us the rights to use your contribution. For
details, visit [https://cla.opensource.microsoft.com](https://cla.opensource.microsoft.com/).

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or
services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must
not cause confusion or imply Microsoft sponsorship. Any use of third-party
trademarks or logos are subject to those third-party's policies.
