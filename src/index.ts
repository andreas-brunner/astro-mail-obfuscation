// ---
// data-62814357 = Encrypted email (mailto:..., tel:...).
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
// Generates a random encryption key used for obfuscating emails/phones.
// This key will be used to encrypt/decrypt emails/phones content via XOR.
// @returns {string} 16-byte random key as a hex string.
// ---
function generateUserKey(): string {
  return randomBytes(16).toString("hex");
}
// Interface for obfuscation plugin options.
interface AstroMailObfuscationOptions {
  fallbackText?: string; // Fallback text shown if JavaScript is disabled.
  userKey?: string; // Encryption key used for obfuscation.
}
// Default options for the obfuscation process.
const defaultOptions: AstroMailObfuscationOptions = {
  fallbackText: "Please enable JavaScript.",
  userKey: generateUserKey(),
};
// ---
// AstroMailObfuscation - BUILD:
// Astro integration for emails/phones obfuscation using a simple XOR encryption scheme.
// @param {Partial<AstroMailObfuscationOptions>} userOptions - Custom user options for obfuscation.
// @returns {AstroIntegration} Integration object for the Astro build lifecycle.
// ---
export default function astroMailObfuscation(userOptions: Partial<AstroMailObfuscationOptions> = {}): AstroIntegration {
  const options = { ...defaultOptions, ...userOptions };
  return {
    name: "astro-mail-obfuscation",
    hooks: {
      // Inject the decryption script into each HTML page during the Astro build process.
      "astro:config:setup": ({ injectScript }) => {
        try {
          const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "scripts", "decodation.js");
          injectScript("page", `import "${scriptPath}";`);
        } catch (err) {
          console.error("Astro-Mail-Obfuscation: Failed to inject script.", err);
        }
      },
      // After the build is completed, process each HTML file to replace "mailto:"/"tel:" links
      // with encrypted versions that are decoded client-side.
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
                console.error(`Astro-Mail-Obfuscation: Error processing file ${filePath}.`, err);
              }
            })
          );
          console.log("Astro-Mail-Obfuscation: Done.");
        } catch (err) {
          console.error("Astro-Mail-Obfuscation: Error during build.", err);
        }
      },
    },
  };
}
// ---
// Modify the HTML content by obfuscating all "mailto:"/"tel:" links.
// It replaces each "mailto:"/"tel:" link with an encrypted span element
// that can be decrypted client-side using the provided key.
// @param {string} html - The original HTML content.
// @param {AstroMailObfuscationOptions} options - The plugin options.
// @returns {Promise<string>} The modified HTML string with obfuscated emails/phones.
// ---
async function modifyHtml(html: string, options: AstroMailObfuscationOptions): Promise<string> {
  const $ = cheerio.load(html);
  // Find all anchor tags with data-obfuscation="1" and a "mailto:"/"tel:" href.
  $("a[data-obfuscation='1'][href^='mailto:'], a[data-obfuscation='1'][href^='tel:']").each((_, element) => {
    const $element = $(element);
    const href = $element.attr("href");
    if (href && (/^mailto:.+@.+\..+$/.test(href) || /^tel:\+?[0-9\s-]+$/.test(href))) {
      const isEmail = href.startsWith("mailto:");
      const contactInfo = href.replace(isEmail ? "mailto:" : "tel:", "");
      const encryptedContact = encryptDecryptContent(contactInfo, options.userKey!);
      const originalHtml = $element.html();
      const encryptedHtml = encryptDecryptContent(originalHtml, options.userKey!);
      if (encryptedContact && encryptedHtml) {
        $element.removeAttr("href").html(`
          <noscript>${options.fallbackText}</noscript>
          <span data-62814357="${encryptedContact}" data-81609423="${encryptedHtml}"></span>
        `);
      } else {
        console.error("Astro-Mail-Obfuscation: Encryption failed for contact info or content.");
      }
    } else {
      console.error("Astro-Mail-Obfuscation: Invalid contact format in href attribute.");
    }
  });
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
    console.error("Astro-Mail-Obfuscation: Invalid input for encryption/decryption.");
    return;
  }
  try {
    return content
      .split("")
      .map((char, i) => (char.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, "0"))
      .join("");
  } catch (err) {
    console.error("Astro-Mail-Obfuscation: Error during encryption/decryption.", err);
    return;
  }
}
