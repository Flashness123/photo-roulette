import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { PhotoSelectionScreen } from './src/screens/PhotoSelectionScreen';
import { VideoSelectionScreen } from './src/screens/VideoSelectionScreen';
import { GameScreen } from './src/screens/GameScreen';
import { VideoGameScreen } from './src/screens/VideoGameScreen';
import { FinalResultsScreen } from './src/screens/FinalResultsScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#E91E63"
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Room" component={RoomScreen} />
        <Stack.Screen name="PhotoSelection" component={PhotoSelectionScreen} />
        <Stack.Screen name="VideoSelection" component={VideoSelectionScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="VideoGame" component={VideoGameScreen} />
        <Stack.Screen name="FinalResults" component={FinalResultsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
