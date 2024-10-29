import type { AstroIntegration } from "astro";
import { fileURLToPath } from "url";
import { globby } from "globby";
import pLimit from "p-limit";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as cheerio from "cheerio";
/**
 * Generates a random user key for encryption purposes.
 * @returns {string} A hexadecimal string representing the user key.
 */
function generateUserKey(): string {
  return randomBytes(16).toString("hex");
}
/**
 * Generates a random user salt for encryption.
 * @param {number} length - The desired length of the salt.
 * @returns {string} A string consisting of random alphanumeric characters.
 */
function generateUserSalt(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
/**
 * Interface defining the options for the Astro Mail Obfuscation integration.
 */
interface AstroMailObfuscationOptions {
  fallbackText?: string;
  userKey?: string;
  userSalt?: string;
}
/**
 * Astro integration function to obfuscate email addresses and phone numbers in the HTML output.
 * @param {Partial<AstroMailObfuscationOptions>} userOptions - Optional user-defined settings.
 * @returns {AstroIntegration} The configured Astro integration.
 */
export default function astroMailObfuscation(userOptions: Partial<AstroMailObfuscationOptions> = {}): AstroIntegration {
  // Use provided userKey and userSalt or generate new ones.
  const userKey = userOptions.userKey || generateUserKey();
  const userSalt = userOptions.userSalt || generateUserSalt(5);
  const options: Required<AstroMailObfuscationOptions> = {
    fallbackText: userOptions.fallbackText || "[PROTECTED!]",
    userKey,
    userSalt,
  };
  return {
    name: "astro-mail-obfuscation",
    hooks: {
      /**
       * Injects the client-side script into each page during the setup phase.
       */
      "astro:config:setup": ({ injectScript }) => {
        try {
          const scriptUrl = new URL("./scripts/client.js", import.meta.url).href;
          injectScript("page", `import "${scriptUrl}";`);
        } catch (err) {
          console.error("Astro-Mail-Obfuscation: Failed to inject script.", err);
        }
      },
      /**
       * After the build is done, processes all HTML files to obfuscate contact information.
       */
      "astro:build:done": async ({ dir }) => {
        try {
          const outDir = fileURLToPath(dir);
          const htmlFiles = await globby("**/*.html", {
            cwd: outDir,
            absolute: true,
          });
          const limit = pLimit(5); // Limit concurrent file processing.
          const tasks = htmlFiles.map((file: string) => limit(() => processHtmlFile(file, options)));
          await Promise.all(tasks);
          console.log("Astro-Mail-Obfuscation: Done.");
        } catch (err) {
          console.error("Astro-Mail-Obfuscation: Error during build.", err);
        }
      },
    },
  };
}
/**
 * Processes an individual HTML file to obfuscate contact details.
 * @param {string} filePath - The path to the HTML file.
 * @param {Required<AstroMailObfuscationOptions>} options - The obfuscation options.
 */
async function processHtmlFile(filePath: string, options: Required<AstroMailObfuscationOptions>) {
  try {
    const html = await fs.readFile(filePath, "utf-8");
    const modifiedHtml = await modifyHtml(html, options);
    await fs.writeFile(filePath, modifiedHtml, "utf-8");
  } catch (err) {
    console.error(`Astro-Mail-Obfuscation: Error processing file ${filePath}.`, err);
  }
}
/**
 * Modifies the HTML content by obfuscating email and phone links.
 * @param {string} html - The original HTML content.
 * @param {Required<AstroMailObfuscationOptions>} options - The obfuscation options.
 * @returns {Promise<string>} The modified HTML content.
 */
async function modifyHtml(html: string, options: Required<AstroMailObfuscationOptions>): Promise<string> {
  const $ = cheerio.load(html);
  // Selector for anchor tags with 'data-obfuscation' and 'mailto:' or 'tel:' href.
  const selector = "a[data-obfuscation][href^='mailto:'], a[data-obfuscation][href^='tel:']";
  $(selector).each((_, element) => {
    const $el = $(element);
    const href = $el.attr("href");
    let type = $el.attr("data-obfuscation") || "";
    if (!href) return;
    const validTypes = ["1", "2", "3"];
    if (!validTypes.includes(type)) {
      // Assign a random encryption method if none is specified or invalid.
      type = (Math.floor(Math.random() * 3) + 1).toString();
    }
    const isEmail = href.startsWith("mailto:");
    const contact = href.slice(isEmail ? 7 : 4); // Remove 'mailto:' or 'tel:' prefix.
    const content = $el.html() || "";
    const { userKey: key, userSalt: salt } = options;
    const { encrypt } = encryptionMethods[type];
    const encryptedContact = encrypt(contact, key, salt);
    const encryptedContent = encrypt(content, key, salt);
    if (encryptedContact && encryptedContent) {
      // Replace the original content with encrypted data.
      $el.empty();
      $el.append(`<noscript>${options.fallbackText}</noscript>`);
      $el.append(`<span data-62814357="${encryptedContact}" data-81609423="${encryptedContent}" data-obfuscation="${type}"></span>`);
      $el.removeAttr("href");
    } else {
      console.error("Astro-Mail-Obfuscation: Encryption failed.");
    }
  });
  // If any elements were obfuscated, add the key and salt to a meta tag.
  if ($("[data-62814357]").length) {
    $("head").append(`<meta name="26435710" content="${options.userKey}${options.userSalt}">`);
  }
  return $.html();
}
/**
 * Map of encryption methods used for obfuscation.
 */
const encryptionMethods: Record<
  string,
  {
    encrypt: (content: string, key: string, salt?: string) => string | undefined;
  }
> = {
  /**
   * Method 1: Simple XOR encryption with the key, output in hexadecimal.
   */
  "1": {
    encrypt: (content, key) => {
      if (!content || !key) return;
      try {
        const contentBuffer = Buffer.from(content, "utf-8");
        const keyBuffer = Buffer.from(key, "utf-8");
        const encrypted = Buffer.alloc(contentBuffer.length);
        // XOR each byte of the content with the key.
        for (let i = 0; i < contentBuffer.length; i++) {
          encrypted[i] = contentBuffer[i] ^ keyBuffer[i % keyBuffer.length];
        }
        return encrypted.toString("hex");
      } catch (err) {
        console.error("Encryption error:", err);
      }
    },
  },
  /**
   * Method 2: XOR encryption with the key, output in Base64, possibly reversed.
   */
  "2": {
    encrypt: (content, key) => {
      if (!content || !key) return;
      try {
        const contentBuffer = Buffer.from(content, "utf-8");
        const keyBuffer = Buffer.from(key, "utf-8");
        const xorResult = Buffer.alloc(contentBuffer.length);
        // XOR each byte of the content with the key.
        for (let i = 0; i < contentBuffer.length; i++) {
          xorResult[i] = contentBuffer[i] ^ keyBuffer[i % keyBuffer.length];
        }
        let base64 = xorResult.toString("base64");
        // Optionally reverse the Base64 string based on key characters.
        const shouldReverse = key.charCodeAt(key.length - 1) > key.charCodeAt(key.length - 2);
        return shouldReverse ? base64.split("").reverse().join("") : base64;
      } catch (err) {
        console.error("Encryption error:", err);
      }
    },
  },
  /**
   * Method 3: Double XOR encryption with key and salt, output in Base62.
   */
  "3": {
    encrypt: (content, key, salt) => {
      if (!content || !key || !salt) return;
      try {
        const contentBuffer = Buffer.from(content, "utf-8");
        const keyBuffer = Buffer.from(key, "utf-8");
        const saltBuffer = Buffer.from(salt, "utf-8");
        const firstXOR = Buffer.alloc(contentBuffer.length);
        // First XOR with the salt.
        for (let i = 0; i < contentBuffer.length; i++) {
          firstXOR[i] = contentBuffer[i] ^ saltBuffer[i % saltBuffer.length];
        }
        const secondXOR = Buffer.alloc(firstXOR.length);
        // Second XOR with the key.
        for (let i = 0; i < firstXOR.length; i++) {
          secondXOR[i] = firstXOR[i] ^ keyBuffer[i % keyBuffer.length];
        }
        return base62Encode(secondXOR);
      } catch (err) {
        console.error("Encryption error:", err);
      }
    },
  },
};
/**
 * Encodes a buffer into a Base62 string.
 * @param {Buffer} buffer - The buffer to encode.
 * @returns {string} The Base62 encoded string.
 */
function base62Encode(buffer: Buffer): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let value = BigInt("0x" + buffer.toString("hex"));
  let result = "";
  const base = BigInt(62);
  if (value === BigInt(0)) return "0";
  // Convert the numeric value to Base62.
  while (value > 0) {
    result = chars[Number(value % base)] + result;
    value /= base;
  }
  return result;
}
