import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { databaseService } from './src/services/SQLiteService';
import { MushafScreen } from "./src/screens/MushafScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
SplashScreen.preventAutoHideAsync().catch(() => undefined);

SplashScreen.setOptions({ fade: true, duration: 1000 });

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    uthmanTn1Bold: require("./assets/fonts/UthmanTN1B-Ver20.ttf"),
  });
  
  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);
  
  if (fontError) {
    throw fontError;
  }
  
  useEffect(() => {
  const initializeApp = async () => {
    try {
      const db = await databaseService.getDb();
      await databaseService.initializeFTS5Table(db);
      await databaseService.populateFTS5Table(db);
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  };

  initializeApp();
}, []);
  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <SearchScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
