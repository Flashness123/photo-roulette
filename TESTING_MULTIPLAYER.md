# Testing Multiplayer Scenarios

## Option 1: Use Two Physical Devices (Easiest)

1. **Device 1 (Host):**
   - Open the app
   - Enter your name
   - Tap "Create Game"
   - Note the 6-digit room code

2. **Device 2 (Player):**
   - Open the app on another device
   - Enter a different name
   - Tap "Join Game"
   - Enter the room code from Device 1

3. **Test Photo Selection:**
   - On either device, tap "Choose Pictures"
   - Grant photo permissions
   - Select 16 photos
   - Tap "Lock In Photos"
   - Go back to room lobby
   - You should see a green ✓ checkmark next to the player who locked in photos
   - The room auto-refreshes every 3 seconds, so you'll see updates

## Option 2: Use Android Emulator + Physical Device

### Setup Android Emulator:
```bash
# List available emulators
emulator -list-avds

# Start an emulator (replace with your AVD name)
emulator -avd Pixel_5_API_33 &

# Wait for emulator to boot, then install app
cd /home/lukas/Code/PhotoRoulette
npx react-native run-android
```

### Test Flow:
1. **Physical Device (Host):** Create a game
2. **Emulator (Player):** Join using the room code
3. Test photo selection on both devices

## Option 3: Test with Expo Go (If Needed Later)

For even easier testing, you could port to Expo in the future, which allows:
- Scan QR code to test on multiple devices
- Hot reload on all devices simultaneously
- Easier debugging

## Current Testing Status

✅ **Working Features:**
- Room creation
- Room joining with 6-digit code
- Player list with auto-refresh (3s)
- HOST badge for room creator
- Exit room functionality
- Photo selection (16 random from gallery)
- Green ✓ checkmark for players who locked in photos

📋 **Test Checklist:**
- [ ] Create room on Device 1
- [ ] Join room on Device 2
- [ ] Both players appear in lobby
- [ ] Choose photos on Device 1
- [ ] Green ✓ appears next to Device 1 player
- [ ] Choose photos on Device 2
- [ ] Green ✓ appears next to Device 2 player
- [ ] Exit room works correctly
- [ ] Empty rooms get deleted

## Quick Test Commands

```bash
# Check if Metro is running
ps aux | grep metro

# Restart Metro if needed
npx react-native start --reset-cache

# Install on device
npx react-native run-android

# Check device logs
adb logcat | grep -i "photoroulette\|ReactNative"

# Check backend health
curl https://photo-roulette-production-b12d.up.railway.app/health
```

## Simulating Multiple Players (Alternative)

If you don't have multiple devices, you can test the UI by:
1. Using Chrome DevTools to manually update the database
2. Using Supabase Dashboard to add players directly
3. Creating a test endpoint that adds fake players

Would you like me to create a debug endpoint for adding fake players?
