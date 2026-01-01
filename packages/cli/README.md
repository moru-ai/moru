# Moru CLI

This CLI tool allows you to build and manage your running Moru sandboxes and sandbox templates. Learn more in [our documentation](https://moru.io/docs).

### 1. Install the CLI

**Using Homebrew (on macOS)**

```bash
brew install moru
```

**Using NPM**

```bash
npm install -g @moru-ai/cli
```

### 2. Authenticate

```bash
moru auth login
```

> [!NOTE]
> To authenticate without the ability to open the browser, provide
> `MORU_ACCESS_TOKEN` as an environment variable. You can find your token
> in Account Settings under the Team selector at [moru.io/dashboard](https://moru.io/dashboard). Then use the CLI like this:
> `MORU_ACCESS_TOKEN=sk_moru_... moru template build`.

> [!IMPORTANT]
> Note the distinction between `MORU_ACCESS_TOKEN` and `MORU_API_KEY`.

### 3. Check out docs

Visit our [CLI documentation](https://moru.io/docs) to learn more.
