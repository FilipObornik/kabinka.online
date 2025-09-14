// Cache management utilities
class CacheManager {
  static async clearOldCache() {
    try {
      const storage = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });
      
      const cacheKeys = Object.keys(storage).filter(key => key.startsWith('cache_'));
      console.log(`🧹 Found ${cacheKeys.length} cached items`);
      
      if (cacheKeys.length > 5) {
        // Keep only the 5 most recent cache entries
        const keysToRemove = cacheKeys.slice(0, -5);
        await new Promise(resolve => {
          chrome.storage.local.remove(keysToRemove, resolve);
        });
        console.log(`🗑️ Removed ${keysToRemove.length} old cache entries`);
      }
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }
  
  static async getStorageUsage() {
    try {
      const usage = await new Promise(resolve => {
        chrome.storage.local.getBytesInUse(null, resolve);
      });
      console.log(`💾 Storage usage: ${usage} bytes`);
      return usage;
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return 0;
    }
  }
}