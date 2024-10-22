// ---
// data-62814357 = Encrypted email (mailto:...).
// data-81609423 = Encrypted HTML content.
// ---
// AstroMailObfuscation - Client
// This class handles the decoding and display of obfuscated
// email addresses stored in encrypted form in the HTML.
// It uses a simple XOR-based decryption method and transforms
// the obfuscated emails into anchor tags ('<a>') with 'mailto' links.
// ---
class AstroMailObfuscation {
  // ---
  // Constructor
  // Initializes the script and sets up the DOMContentLoaded listener.
  // ---
  constructor() {
    document.addEventListener("DOMContentLoaded", () => this.obfuscateEmails());
  }
  // ---
  // Main method that finds all obfuscated email elements and decrypts them.
  // ---
  obfuscateEmails() {
    // Select all elements with the encrypted email attribute
    const emailElements = document.querySelectorAll("[data-62814357]");
    if (!emailElements.length) return; // If no elements are found, exit early
    // Get the encryption key
    const encryptionKey = this.getEncryptionKey();
    if (!encryptionKey) {
      console.error("astro-mail-obfuscation: missing or invalid encryption key.");
      return;
    }
    // Loop through all found email elements
    emailElements.forEach((el) => {
      const encryptedEmail = el.getAttribute("data-62814357");
      const encryptedHtml = el.getAttribute("data-81609423");
      // If encrypted email or HTML is missing, skip this element
      if (!encryptedEmail || !encryptedHtml) {
        console.warn("astro-mail-obfuscation: missing email or HTML data.");
        return;
      }
      // Decrypt the email and HTML content
      const email = this.decryptContent(encryptedEmail, encryptionKey);
      const originalHtml = this.decryptContent(encryptedHtml, encryptionKey);
      if (!email || !originalHtml) return; // If decryption failed, skip further processing
      // Find the closest anchor tag to the current element and update the href
      const anchor = el.closest("a");
      if (anchor) {
        // Set the mailto link
        anchor.href = `mailto:${email}`;
        // Replace the encrypted HTML with the decrypted content (interpreted as HTML)
        anchor.innerHTML = originalHtml;
      } else {
        console.warn("astro-mail-obfuscation: no valid anchor tag found.");
      }
    });
  }
  // ---
  // Retrieves the encryption key from the meta tag.
  // @returns {string|null} The encryption key or null if not found.
  // ---
  getEncryptionKey() {
    const metaTag = document.querySelector('meta[name="26435710"]');
    const key = metaTag ? metaTag.getAttribute("content") : null;
    if (!key) {
      console.error("astro-mail-obfuscation: encryption key is missing or malformed.");
    }
    return key;
  }
  // ---
  // Decrypts the given encrypted string using the provided key.
  // The decryption is performed using a simple XOR-based algorithm.
  // @param {string} encrypted - The encrypted string (hex-encoded).
  // @param {string} key - The encryption key.
  // @returns {string|null} The decrypted text or null if decryption fails.
  // ---
  decryptContent(encrypted, key) {
    if (!encrypted || !key) {
      console.error("astro-mail-obfuscation: invalid input for decryption.");
      return null;
    }
    try {
      let result = "";
      for (let i = 0; i < encrypted.length; i += 2) {
        const encryptedCharCode = parseInt(encrypted.substring(i, i + 2), 16);
        const keyCharCode = key.charCodeAt((i / 2) % key.length);
        result += String.fromCharCode(encryptedCharCode ^ (keyCharCode & 0xff));
      }
      return result;
    } catch (err) {
      console.error("astro-mail-obfuscation: decryption failed.", err);
      return null;
    }
  }
}
// Initialize and activate the obfuscation logic
new AstroMailObfuscation();
