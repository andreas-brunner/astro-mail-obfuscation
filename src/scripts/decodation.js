// ---
// data-62814357 = Encrypted email (mailto:..., tel:...).
// data-81609423 = Encrypted HTML content.
// ---
// Astro-Mail-Obfuscation - CLIENT:
// This class handles the decoding and display of obfuscated
// emails/phones stored in encrypted form in the HTML.
// It uses a simple XOR-based decryption method and transforms
// the obfuscated emails/phones into anchor tags ("<a>") with "mailto:"/"tel:" links.
// ---
class AstroMailObfuscation {
  // ---
  // Constructor:
  // Initializes the script and sets up the DOMContentLoaded listener.
  // ---
  constructor() {
    document.addEventListener("DOMContentLoaded", () => this.obfuscateEmails());
    // Register astro:after-swap event to handle view transitions.
    document.addEventListener("astro:after-swap", () => this.obfuscateEmails());
  }
  // ---
  // Main method that finds all obfuscated emails/phones elements and decrypts them.
  // ---
  obfuscateEmails() {
    // Select all elements with the encrypted emails/phones attribute.
    const elements = document.querySelectorAll("[data-62814357]");
    if (!elements.length) return; // If no elements are found, exit early.
    // Get the encryption key.
    const encryptionKey = this.getEncryptionKey();
    if (!encryptionKey) {
      console.error("Astro-Mail-Obfuscation: Missing or invalid encryption key.");
      return;
    }
    // Loop through all found elements.
    elements.forEach((el) => {
      const encryptedContact = el.getAttribute("data-62814357");
      const encryptedHtml = el.getAttribute("data-81609423");
      // If encrypted contact or HTML is missing, skip this element.
      if (!encryptedContact || !encryptedHtml) {
        console.warn("Astro-Mail-Obfuscation: Missing contact or HTML data.");
        return;
      }
      // Decrypt the contact (emails/phones) and HTML content.
      const contactInfo = this.decryptContent(encryptedContact, encryptionKey);
      const originalHtml = this.decryptContent(encryptedHtml, encryptionKey);
      if (!contactInfo || !originalHtml) return; // If decryption failed, skip further processing.
      // Find the closest anchor tag to the current element and update the href.
      const anchor = el.closest("a");
      if (anchor) {
        // Set the "mailto:"/"tel:" link based on the contact info.
        const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(contactInfo);
        anchor.href = isEmail ? `mailto:${contactInfo}` : `tel:${contactInfo}`;
        // Replace the encrypted HTML with the decrypted content (interpreted as HTML).
        anchor.innerHTML = originalHtml;
      } else {
        console.warn("Astro-Mail-Obfuscation: No valid anchor tag found.");
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
      console.error("Astro-Mail-Obfuscation: Encryption key is missing or malformed.");
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
      console.error("Astro-Mail-Obfuscation: Invalid input for decryption.");
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
      console.error("Astro-Mail-Obfuscation: Decryption failed.", err);
      return null;
    }
  }
}
// Initialize/activate the obfuscation logic.
new AstroMailObfuscation();
