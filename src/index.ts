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
 * Default allowed tags for obfuscation.
 */
const defaultAllowedTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "label", "ul", "ol", "li", "strong", "b", "em", "i", "span"];
/**
 * Interface defining the options for the Astro Mail Obfuscation integration.
 */
interface AstroMailObfuscationOptions {
  fallbackText?: string;
  userKey?: string;
  userSalt?: string;
  allowedTags?: string[];
  concurrencyLimit?: number;
}
/**
 * Astro integration function to obfuscate content in the HTML output.
 * @param {Partial<AstroMailObfuscationOptions>} userOptions - Optional user-defined settings.
 * @returns {AstroIntegration} The configured Astro integration.
 */
export default function astroMailObfuscation(userOptions: Partial<AstroMailObfuscationOptions> = {}): AstroIntegration {
  // Use provided userKey and userSalt or generate new ones.
  const userKey = userOptions.userKey || generateUserKey();
  // saltLength.
  const userSalt = userOptions.userSalt || generateUserSalt(8);
  const options: Required<AstroMailObfuscationOptions> = {
    fallbackText: userOptions.fallbackText || "[PROTECTED!]",
    userKey,
    userSalt,
    concurrencyLimit: userOptions.concurrencyLimit || 5,
    allowedTags: mergeAllowedTags(userOptions.allowedTags),
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
       * After the build is done, processes all HTML files to obfuscate content.
       */
      "astro:build:done": async ({ dir }) => {
        try {
          const outDir = fileURLToPath(dir);
          const htmlFiles = await globby("**/*.html", {
            cwd: outDir,
            absolute: true,
          });
          const limit = pLimit(options.concurrencyLimit);
          const tasks = htmlFiles.map((file: string) => limit(() => processHtmlFile(file, options)));
          await Promise.all(tasks);
          console.log("Astro-Mail-Obfuscation: Completed.");
        } catch (err) {
          console.error("Astro-Mail-Obfuscation: Error during build.", err);
        }
      },
    },
  };
}
/**
 * Merges the default allowed tags with the user-provided tags, ensuring no duplicates and case-insensitivity.
 * @param {string[] | undefined} userTags - User-provided tags.
 * @returns {string[]} The combined list of allowed tags.
 */
function mergeAllowedTags(userTags?: string[]): string[] {
  const combinedTags = new Set<string>();
  // Add default tags to the set (converted to lowercase).
  defaultAllowedTags.forEach((tag) => combinedTags.add(tag.toLowerCase()));
  // Add user-provided tags to the set (converted to lowercase).
  if (userTags) {
    userTags.forEach((tag) => combinedTags.add(tag.toLowerCase()));
  }
  return Array.from(combinedTags);
}
/**
 * Processes an individual HTML file to obfuscate content.
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
 * Modifies the HTML content by obfuscating tags with 'data-obfuscation'.
 * @param {string} html - The original HTML content.
 * @param {Required<AstroMailObfuscationOptions>} options - The obfuscation options.
 * @returns {Promise<string>} The modified HTML content.
 */
async function modifyHtml(html: string, options: Required<AstroMailObfuscationOptions>): Promise<string> {
  const $ = cheerio.load(html);
  const selector = "[data-obfuscation]";
  const allowedTags = options.allowedTags;
  $(selector).each((_, element) => {
    const $el = $(element);
    const tagName = $el[0].tagName.toLowerCase();
    // Check if tag is in allowedTags.
    if (!allowedTags.includes(tagName)) {
      console.warn(`Astro-Mail-Obfuscation: <${tagName}> is not allowed. Element is skipped.`);
      return;
    }
    const href = $el.attr("href") || "";
    const type = $el.attr("data-obfuscation") || "";
    const validTypes = ["1", "2", "3"];
    const method = validTypes.includes(type) ? type : (Math.floor(Math.random() * 3) + 1).toString();
    const content = $el.html() || "";
    const { userKey: key, userSalt: salt } = options;
    const { encrypt } = encryptionMethods[method];
    const encryptedHref = href ? encrypt(href, key, salt) : null;
    const encryptedContent = encrypt(content, key, salt);
    if (encryptedContent) {
      $el.empty();
      $el.append(`<noscript>${options.fallbackText}</noscript>`);
      $el.attr("data-7391", encryptedContent);
      $el.attr("data-obfuscation", method);
      if (encryptedHref) {
        $el.attr("data-5647", encryptedHref).removeAttr("href");
      }
    } else {
      console.error(`Astro-Mail-Obfuscation: Encryption failed for element: ${$.html($el)}`);
    }
  });
  if ($("[data-5647]").length || $("[data-7391]").length) {
    $("head").append(`<meta name="4758" content="${options.userKey}${options.userSalt}">`);
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
        console.error("Astro-Mail-Obfuscation: Encryption error in method 1.", err);
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
        const base64 = xorResult.toString("base64");
        // Optionally reverse the Base64 string based on key characters.
        const shouldReverse = key.charCodeAt(key.length - 1) > key.charCodeAt(key.length - 2);
        return shouldReverse ? base64.split("").reverse().join("") : base64;
      } catch (err) {
        console.error("Astro-Mail-Obfuscation: Encryption error in method 2.", err);
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
        const encrypted = Buffer.alloc(contentBuffer.length);
        // Double XOR with key and salt.
        for (let i = 0; i < contentBuffer.length; i++) {
          encrypted[i] = contentBuffer[i] ^ keyBuffer[i % keyBuffer.length] ^ saltBuffer[i % saltBuffer.length];
        }
        return base62Encode(encrypted);
      } catch (err) {
        console.error("Astro-Mail-Obfuscation: Encryption error in method 3.", err);
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
