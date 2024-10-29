# Astro Mail Obfuscation

> 🔥 **v2.2.0 is here!** _Introducing two new methods and an automatic mode._

Protect **email addresses and phone numbers** in your [Astro](https://astro.build/) app's source code from bots using XOR-based obfuscation. This ensures that contact information remains accessible to real users but hidden from most bots.

**Astro Mail Obfuscation** is simple and developer-friendly, making it easy to implement without complex setup. It provides effective obfuscation with three methods or an automatic mode, adding variability and making it even harder for bots to scrape data. The integration seamlessly supports Astro `ViewTransition` and is built for stable, robust deployment.

> **Note:** _Server-Side Rendering (SSR) is currently not supported._

## Installation

Recommended installation using the Astro CLI:

```bash
npx astro add astro-mail-obfuscation
```

## Usage

Add the `data-obfuscation` attribute to your links:

```html
<a href="mailto:mail@..." data-obfuscation="1">mail@...</a>
<a href="tel:0123..." data-obfuscation="2">0123...</a>
<!-- <a href="tel:0123..." data-obfuscation="3">0123...</a> -->
```

Set `data-obfuscation` to `1`, `2`, or `3` to select a specific method (see below).

> **Note:** Links without the `data-obfuscation` attribute will not be obfuscated, which may be relevant for compliance considerations (e.g., GDPR).

### Automatic Mode

Alternatively, set it to `0` to let the integration randomly assign a method during the build process, increasing variability and making it harder for bots to decode the obfuscation:

```html
<a href="mailto:mail@..." data-obfuscation="0">mail@...</a> <a href="tel:0123..." data-obfuscation="0">0123...</a>
```

## Configuration

Configuration is optional, as the integration works **out of the box**. During the build, `userKey` and `userSalt` are **generated automatically**, so manual configuration of these values is typically unnecessary.

However, you may set `fallbackText` in your `astro.config.mjs` file to customize the message shown to users who have JavaScript disabled:

```js
// astro.config.mjs
export default defineConfig({
  integrations: [
    mailObfuscation({
      fallbackText: "...", // Default: "[PROTECTED!]"
      // userKey: "...", // Not recommended to change
      // userSalt: "...", // Not recommended to change
    }),
  ],
});
```

> **Note:** _The_ `userSalt` _must be exactly five characters long if you choose to set it manually._

## Obfuscation Methods

The integration provides three XOR-based methods for obfuscation:

- **Method 1:** XOR with `userKey`, hexadecimal encoding.
- **Method 2:** XOR with `userKey`, Base64 encoding (dynamically reversed).
- **Method 3:** XOR with `userKey` and `userSalt`, Base62 encoding.

Each method offers a similar level of security. For added variability, it’s recommended to use the **automatic mode** (`data-obfuscation="0"`), which randomly assigns a method during the build, making it even harder for bots to detect and decode obfuscated contact information.

## Limitations

While this integration provides protection against simple bots, it’s important to note that bots capable of executing JavaScript can still extract obfuscated data. However, **most bots do not execute JavaScript** due to performance and cost constraints. The integration raises the barrier for data scraping but does not guarantee complete security against all bots.
