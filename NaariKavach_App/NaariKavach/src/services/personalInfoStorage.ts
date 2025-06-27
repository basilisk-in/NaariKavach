import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  lastUpdated?: string;
}

export class PersonalInfoStorage {
  private static getStorageKey(userEmail: string): string {
    return `personal_info_${userEmail || 'default'}`;
  }

  static async savePersonalInfo(userEmail: string, data: PersonalInfo): Promise<boolean> {
    try {
      const key = this.getStorageKey(userEmail);
      const dataWithTimestamp = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(dataWithTimestamp));
      return true;
    } catch (error) {
      console.error('Error saving personal information:', error);
      return false;
    }
  }

  static async getPersonalInfo(userEmail: string): Promise<PersonalInfo | null> {
    try {
      const key = this.getStorageKey(userEmail);
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        return JSON.parse(storedData) as PersonalInfo;
      }
      return null;
    } catch (error) {
      console.error('Error loading personal information:', error);
      return null;
    }
  }

  static async clearPersonalInfo(userEmail: string): Promise<boolean> {
    try {
      const key = this.getStorageKey(userEmail);
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error clearing personal information:', error);
      return false;
    }
  }

  static async getAllStoredUsers(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys
        .filter(key => key.startsWith('personal_info_'))
        .map(key => key.replace('personal_info_', ''));
    } catch (error) {
      console.error('Error getting stored users:', error);
      return [];
    }
  }
}
