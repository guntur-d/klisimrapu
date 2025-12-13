const ExpiryStorage = (() => {
  const prefix = '__expirable__';

  return {
    set(key, value, ttl) {
      const now = Date.now();
      const item = {
        value,
        expiry: now + ttl,
      };
      localStorage.setItem(`${prefix}${key}`, JSON.stringify(item));
    },

    get(key) {
      const itemStr = localStorage.getItem(`${prefix}${key}`);
      if (!itemStr) return null;

      try {
        const item = JSON.parse(itemStr);
        if (Date.now() > item.expiry) {
          localStorage.removeItem(`${prefix}${key}`);
          return null;
        }
        return item.value;
      } catch (e) {
        return null;
      }
    },

    has(key) {
      const itemStr = localStorage.getItem(`${prefix}${key}`);
      if (!itemStr) return false;

      try {
        const item = JSON.parse(itemStr);
        return Date.now() <= item.expiry;
      } catch (e) {
        return false;
      }
    },

    remove(key) {
      localStorage.removeItem(`${prefix}${key}`);
    },

    cleanup() {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (!key.startsWith(prefix)) continue;

        try {
          const item = JSON.parse(localStorage.getItem(key));
          if (item?.expiry && Date.now() > item.expiry) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Ignore malformed or non-expiry items
        }
      }
    },

    init(ttl = 3600 * 1000, interval = null) {
      this.cleanup();

      if (interval && typeof interval === 'number') {
        setInterval(() => this.cleanup(), interval);
      } else {
        setTimeout(() => this.cleanup(), ttl + 1000); // buffer to ensure cleanup
      }
    }
  };
})();

export default ExpiryStorage;