# Astro Mail Obfuscation

🛡️ **v2.3.0:** Now you can obfuscate any content you want!

Astro Mail Obfuscation allows you to protect email addresses, phone numbers, names, and other sensitive information in the source code of your Astro website from spam bots. You can manually select one of three obfuscation methods, or activate automatic mode for added variety and improved protection.

Currently, 17 HTML tags are officially supported (e.g., `a`, `p`, `span`, ...), though additional tags can be added to your configuration as needed. Developed with a focus on stability, reliability, and performance, this integration also seamlessly supports Astro’s `ViewTransition`.

> **Note:** Server-Side Rendering (SSR) is currently not supported.

## Installation

To install (recommended via Astro CLI):

```bash
npx astro add astro-mail-obfuscation
```

## Usage

To obfuscate content in HTML (`.astro` files), add the `data-obfuscation` attribute to each HTML tag containing the content you want to protect. Set the attribute value to `1`, `2`, or `3` to select a specific obfuscation method, or use `0` to allow a random method to be selected during the build process. This randomness further enhances the obfuscation, making it more difficult for bots to interpret.

Examples:

```html
<!-- Manually select obfuscation method: -->
<a href="mailto:info@..." data-obfuscation="1">info@...</a>
<a href="tel:0123..." data-obfuscation="2">0123...</a>
<p>...<span data-obfuscation="3">info@...</span>...</p>
<!-- Automatically select a random obfuscation method: -->
<ul data-obfuscation="0">
  <li>John Doe</li>
  <li>Jane Doe</li>
</ul>
<label data-obfuscation="0">info@...</label>
<!-- Additional content... -->
```

HTML tags without the `data-obfuscation` attribute will not be obfuscated.

Each obfuscation method relies on XOR-based encoding, augmented with additional keys. These methods vary in how the encoded content is represented, making it challenging for bots to recognize a consistent pattern in obfuscated text.

> **Supported HTML tags:** `h1` - `h6`, `p`, `a`, `label`, `ul`, `ol`, `li`, `strong`, `b`, `em`, `i`, `span`.

The `href` attribute in `a` tags is also obfuscated.

## Configuration

The integration works out of the box when `data-obfuscation` attributes are properly set on relevant tags.

However, there are a few configurable options:

```js
// astro.config.mjs
import mailObfuscation from "astro-mail-obfuscation";
export default defineConfig({
  integrations: [
    mailObfuscation({
      fallbackText: "Please enable JavaScript", // Default: "[PROTECTED!]"
      // userKey: "...", // Automatically generated
      // userSalt: "...", // Automatically generated (must be 8 characters if set manually)
      // concurrencyLimit: number, // Max concurrent tasks, default: 5 (p-limit)
      // allowedTags: ["button", "..."] // Add unsupported HTML tags to the whitelist
    }),
  ],
});
```

The `fallbackText` displays if JavaScript is disabled in the browser. During the build process, `userKey` and `userSalt` are automatically generated. If setting `userSalt` manually, ensure it is exactly 8 characters long. The `userKey` and `userSalt` values are stored as meta tags in the pages during the build, allowing the client-side script to unobfuscate the content.

Take care when adjusting `concurrencyLimit`; setting it too high can affect stability. By default, 17 HTML tags are supported, though additional tags can be added to the `allowedTags` array for extended obfuscation coverage.

> **Recommendation:** In most cases, only `fallbackText` needs customization. The default settings are optimized for reliable operation without further adjustments.

## Methods

The integration provides three XOR-based methods for obfuscation:

- **Method "1":** XOR with `userKey`, resulting in hexadecimal encoding.
- **Method "2":** XOR with `userKey`, resulting in Base64 encoding (dynamically reversed).
- **Method "3":** XOR with `userKey` and `userSalt`, resulting in Base62 encoding.

For enhanced variability, using automatic mode (`data-obfuscation="0"`) is recommended. This mode randomly selects a method during the build, which further complicates attempts by bots to interpret obfuscated content.

## Limitations

Astro Mail Obfuscation effectively prevents bots from extracting data directly from the page source code. However, bots capable of executing JavaScript might still access the obfuscated data. Fortunately, the majority of bots lack JavaScript execution capabilities, so this integration offers strong protection against the most common bots.
