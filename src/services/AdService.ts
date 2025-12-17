import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// AdMob App ID: ca-app-pub-3077343286183537~3751908633
// 
// After publishing to Play Store, create 3 rewarded ad units:
// 1. Play Again Ad
// 2. Blurry Pictures Ad  
// 3. Find People Ad
//
// For now, using test IDs. Replace with real ad unit IDs after creating them in AdMob.
const AD_UNIT_IDS = {
  playAgain: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3077343286183537/XXXXXXXXXX',
  blurryPictures: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3077343286183537/XXXXXXXXXX',
  findPeople: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3077343286183537/XXXXXXXXXX',
};

// Use a single test ID for now (all 3 will use the same test ad)
const AD_UNIT_ID = __DEV__ 
  ? TestIds.REWARDED 
  : AD_UNIT_IDS.playAgain;

class AdService {
  private rewardedAd: RewardedAd | null = null;
  private isLoading: boolean = false;
  private isLoaded: boolean = false;

  constructor() {
    this.loadAd();
  }

  private loadAd() {
    if (this.isLoading || this.isLoaded) return;

    this.isLoading = true;
    this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('Rewarded ad loaded');
        this.isLoaded = true;
        this.isLoading = false;
      }
    );

    const unsubscribeError = this.rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log('Rewarded ad error:', error);
        this.isLoading = false;
        this.isLoaded = false;
        // Retry loading after 30 seconds
        setTimeout(() => this.loadAd(), 30000);
      }
    );

    const unsubscribeClosed = this.rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('Rewarded ad closed');
        this.isLoaded = false;
        // Preload next ad
        setTimeout(() => this.loadAd(), 1000);
      }
    );

    this.rewardedAd.load();
  }

  async showRewardedAd(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.rewardedAd || !this.isLoaded) {
        console.log('Ad not loaded yet');
        // If ad isn't ready, just proceed without showing
        resolve(true);
        // Try to load for next time
        this.loadAd();
        return;
      }

      let rewarded = false;

      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('User earned reward:', reward);
          rewarded = true;
        }
      );

      const unsubscribeClosed = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubscribeEarned();
          unsubscribeClosed();
          this.isLoaded = false;
          resolve(rewarded);
          // Preload next ad
          setTimeout(() => this.loadAd(), 1000);
        }
      );

      this.rewardedAd.show().catch((error) => {
        console.log('Error showing ad:', error);
        unsubscribeEarned();
        unsubscribeClosed();
        resolve(true); // Proceed anyway on error
      });
    });
  }

  isAdReady(): boolean {
    return this.isLoaded;
  }
}

// Singleton instance
export const adService = new AdService();
