class AstroMailObfuscation {
  private decryptionPerformed = false;
  constructor() {
    const init = () => {
      if (!this.decryptionPerformed) {
        this.obfuscateEmails();
        this.decryptionPerformed = true;
      }
    };
    // Initialize decryption on page load.
    document.addEventListener("DOMContentLoaded", init);
    // Re-initialize on Astro page transitions.
    document.addEventListener("astro:page-load", () => {
      this.decryptionPerformed = false;
      init();
    });
  }
  /**
   * Finds obfuscated elements in the DOM and decrypts them.
   */
  obfuscateEmails(): void {
    const elements = document.querySelectorAll("[data-62814357]");
    if (!elements.length) return;
    const { key, salt } = this.getKeyAndSalt();
    if (!key) return;
    elements.forEach((el) => {
      const encryptedContact = el.getAttribute("data-62814357");
      const encryptedContent = el.getAttribute("data-81609423");
      const type = el.getAttribute("data-obfuscation");
      if (!encryptedContact || !encryptedContent || !type) return;
      const decrypt = this.decryptionMethods[type];
      if (!decrypt) return;
      let contact: string | null = null;
      let content: string | null = null;
      if (type === "3") {
        if (!salt) {
          console.error("Astro-Mail-Obfuscation: Salt is missing for method 3.");
          return;
        }
        contact = decrypt(encryptedContact, key, salt);
        content = decrypt(encryptedContent, key, salt);
      } else {
        contact = decrypt(encryptedContact, key);
        content = decrypt(encryptedContent, key);
      }
      if (!contact || !content) return;
      const anchor = el.closest("a");
      if (anchor) {
        // Update the anchor's href and content based on decrypted data.
        (anchor as HTMLAnchorElement).href = contact.includes("@") ? `mailto:${contact}` : `tel:${contact}`;
        anchor.innerHTML = content;
      }
    });
  }
  /**
   * Retrieves the encryption key and salt from the meta tag in the document head.
   * @returns {Object} An object containing the key and salt.
   */
  getKeyAndSalt(): { key?: string; salt?: string } {
    const meta = document.querySelector('meta[name="26435710"]');
    if (!meta) return {};
    const content = meta.getAttribute("content");
    if (!content) return {};
    const saltLength = 5;
    const key = content.slice(0, -saltLength);
    const salt = content.slice(-saltLength);
    return { key, salt };
  }
  /**
   * Map of decryption methods corresponding to the encryption methods used.
   */
  decryptionMethods: {
    [key: string]: (data: string, key: string, salt?: string) => string | null;
  } = {
    /**
     * Method 1: Decrypts hex-encoded XOR encrypted data using the key.
     */
    "1": (data: string, key: string): string | null => {
      try {
        const dataBytes = this.hexStringToUint8Array(data);
        const resultBytes = new Uint8Array(dataBytes.length);
        // XOR each byte with the key to decrypt.
        for (let i = 0; i < dataBytes.length; i++) {
          resultBytes[i] = dataBytes[i] ^ key.charCodeAt(i % key.length);
        }
        const decoder = new TextDecoder();
        return decoder.decode(resultBytes);
      } catch {
        return null;
      }
    },
    /**
     * Method 2: Decrypts Base64-encoded XOR encrypted data, possibly reversed.
     */
    "2": (data: string, key: string): string | null => {
      try {
        const shouldReverse = key.charCodeAt(key.length - 1) > key.charCodeAt(key.length - 2);
        const base64 = shouldReverse ? [...data].reverse().join("") : data;
        const dataBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const resultBytes = new Uint8Array(dataBytes.length);
        // XOR each byte with the key to decrypt.
        for (let i = 0; i < dataBytes.length; i++) {
          resultBytes[i] = dataBytes[i] ^ key.charCodeAt(i % key.length);
        }
        const decoder = new TextDecoder();
        return decoder.decode(resultBytes);
      } catch {
        return null;
      }
    },
    /**
     * Method 3: Decrypts Base62-encoded double XOR encrypted data using key and salt.
     */
    "3": (data: string, key: string, salt?: string): string | null => {
      if (!salt) {
        console.error("Astro-Mail-Obfuscation: Salt is required for method 3.");
        return null;
      }
      try {
        const dataBytes = this.base62Decode(data);
        const resultBytes = new Uint8Array(dataBytes.length);
        // Double XOR with key and salt to decrypt.
        for (let i = 0; i < dataBytes.length; i++) {
          resultBytes[i] = dataBytes[i] ^ key.charCodeAt(i % key.length) ^ salt.charCodeAt(i % salt.length);
        }
        const decoder = new TextDecoder();
        return decoder.decode(resultBytes);
      } catch {
        return null;
      }
    },
  };
  /**
   * Converts a hex string into a Uint8Array of bytes.
   * @param {string} hexString - The hex string to convert.
   * @returns {Uint8Array} The resulting byte array.
   */
  hexStringToUint8Array(hexString: string): Uint8Array {
    const length = hexString.length / 2;
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
    }
    return array;
  }
  /**
   * Decodes a Base62-encoded string into a Uint8Array of bytes.
   * @param {string} str - The Base62 string to decode.
   * @returns {Uint8Array} The resulting byte array.
   */
  base62Decode(str: string): Uint8Array {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const charMap = new Map<string, number>();
    for (let i = 0; i < chars.length; i++) {
      charMap.set(chars[i], i);
    }
    let value = BigInt(0);
    const base = BigInt(62);
    // Convert Base62 string back to numeric value.
    for (const char of str) {
      const index = charMap.get(char);
      if (index === undefined) throw new Error("Invalid character in Base62 string");
      value = value * base + BigInt(index);
    }
    let hex = value.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    const length = hex.length / 2;
    const bytes = new Uint8Array(length);
    // Convert hex string to bytes.
    for (let i = 0; i < length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
}
// Instantiate the class to start the obfuscation process.
new AstroMailObfuscation();
