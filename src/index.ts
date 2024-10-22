// ---
// data-62814357 = Encrypted email (mailto:...).
// data-81609423 = Encrypted HTML content.
// data-26435710 = Automatically generated or user-set key for encryption.
// ---
import type { AstroIntegration } from "astro";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { globby } from "globby";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import * as cheerio from "cheerio";
// ---
// Generates a random encryption key used for obfuscating emails.
// This key will be used to encrypt/decrypt email content via XOR.
// @returns {string} 16-byte random key as a hex string.
// ---
export function generateUserKey(): string {
  return randomBytes(16).toString("hex");
}
// Interface for obfuscation plugin options
interface AstroMailObfuscationOptions {
  fallbackText?: string; // Fallback text shown if JavaScript is disabled
  userKey?: string; // Encryption key used for obfuscation
}
// Default options for the obfuscation process
const defaultOptions: AstroMailObfuscationOptions = {
  fallbackText: "Please enable JavaScript!",
  userKey: generateUserKey(),
};
// ---
// AstroMailObfuscation - Server/build
// Astro integration for email obfuscation using a simple XOR encryption scheme.
// The plugin replaces 'mailto' links with encrypted content, which is decoded
// client-side using a provided JavaScript file.
// @param {Partial<AstroMailObfuscationOptions>} userOptions - Custom user options for obfuscation.
// @returns {AstroIntegration} Integration object for Astro build lifecycle.
// ---
export default function astroMailObfuscation(userOptions: Partial<AstroMailObfuscationOptions> = {}): AstroIntegration {
  const options = { ...defaultOptions, ...userOptions };
  return {
    name: "astro-mail-obfuscation",
    hooks: {
      // ---
      // Inject the decryption script into each HTML page during the Astro build process.
      // ---
      "astro:config:setup": ({ injectScript }) => {
        try {
          const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "scripts", "decodation.js");
          injectScript("page", `import "${scriptPath}";`);
        } catch (err) {
          console.error("astro-mail-obfuscation: failed to inject script.", err);
        }
      },
      // ---
      // After the build is completed, process each HTML file to replace mailto links
      // with encrypted versions that are decoded client-side.
      // @param {object} param.dir - Directory of the built files.
      // ---
      "astro:build:done": async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        try {
          const htmlFiles = await globby("**/*.html", { cwd: outDir });
          await Promise.all(
            htmlFiles.map(async (file) => {
              const filePath = join(outDir, file);
              try {
                const html = await fs.readFile(filePath, "utf-8");
                const modifiedHtml = await modifyHtml(html, options);
                await fs.writeFile(filePath, modifiedHtml, "utf-8");
              } catch (err) {
                console.error(`astro-mail-obfuscation: error processing file ${filePath}.`, err);
              }
            })
          );
          console.log("astro-mail-obfuscation: all email obfuscation completed.");
        } catch (err) {
          console.error("astro-mail-obfuscation: error during build.", err);
        }
      },
    },
  };
}
// ---
// Modify the HTML content by obfuscating all 'mailto' links.
// It replaces each 'mailto' link with an encrypted span element
// that can be decrypted client-side using the provided key.
// @param {string} html - The original HTML content.
// @param {AstroMailObfuscationOptions} options - The plugin options.
// @returns {Promise<string>} The modified HTML string with obfuscated emails.
// ---
async function modifyHtml(html: string, options: AstroMailObfuscationOptions): Promise<string> {
  const $ = cheerio.load(html);
  // Find all anchor tags with data-obfuscation="1" and a "mailto" href
  $("a[data-obfuscation='1'][href^='mailto:']").each((_, element) => {
    const $element = $(element);
    const href = $element.attr("href");
    if (href && /^mailto:.+@.+\..+$/.test(href)) {
      const email = href.replace("mailto:", "");
      const encryptedEmail = encryptDecryptContent(email, options.userKey!);
      // Encrypt the entire inner HTML (not just the text, but the full structure)
      const originalHtml = $element.html();
      const encryptedHtml = encryptDecryptContent(originalHtml, options.userKey!);
      // Replace href and the inner HTML with encrypted spans
      if (encryptedEmail && encryptedHtml) {
        $element.removeAttr("href").html(`<noscript>${options.fallbackText}</noscript><span data-62814357="${encryptedEmail}" data-81609423="${encryptedHtml}"></span>`);
      } else {
        console.error("astro-mail-obfuscation: encryption failed for email or content.");
      }
    } else {
      console.error("astro-mail-obfuscation: invalid email format in href attribute.");
    }
  });
  // Append the encryption key as meta tag if any email was obfuscated
  if ($("[data-62814357]").length > 0) {
    $("head").append(`<meta name="26435710" content="${options.userKey}">`);
  }
  return $.html();
}
// ---
// Encrypt or decrypt content using XOR with the provided key.
// The same function handles both encryption and decryption.
// @param {string} content - The content to be encrypted or decrypted.
// @param {string} key - The encryption key.
// @returns {string | undefined} The resulting encrypted/decrypted string, or undefined in case of error.
// ---
function encryptDecryptContent(content: string, key: string): string | undefined {
  if (!content || !key) {
    console.error("astro-mail-obfuscation: invalid input for encryption/decryption.");
    return;
  }
  try {
    return content
      .split("")
      .map((char, i) => (char.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, "0"))
      .join("");
  } catch (err) {
    console.error("astro-mail-obfuscation: error during encryption/decryption.", err);
    return;
  }
}
