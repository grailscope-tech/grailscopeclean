import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import { StoreProvider, useStore } from "./src/store";
import { theme } from "./src/theme";
import { MarketScreen } from "./src/screens/MarketScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { SignalsScreen } from "./src/screens/SignalsScreen";
import { WatchScreen } from "./src/screens/WatchScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import type { RootStackParamList } from "./src/navigation";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabIcon = (label: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 18, color }}>{label}</Text>
);

function Tabs() {
  const { unread } = useStore();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { borderTopColor: theme.line, height: 84, paddingTop: 8, paddingBottom: 24 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Marché" component={MarketScreen} options={{ tabBarIcon: tabIcon("📈") }} />
      <Tab.Screen name="Recherche" component={SearchScreen} options={{ tabBarIcon: tabIcon("🔍") }} />
      <Tab.Screen name="Signaux" component={SignalsScreen} options={{ tabBarIcon: tabIcon("⚡") }} />
      <Tab.Screen name="Watchlist" component={WatchScreen} options={{ tabBarIcon: tabIcon("★") }} />
      <Tab.Screen
        name="Alertes"
        component={AlertsScreen}
        options={{ tabBarIcon: tabIcon("🔔"), tabBarBadge: unread > 0 ? unread : undefined }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{ title: "", headerBackTitle: "Retour", headerTintColor: theme.accent, headerShadowVisible: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Compte", presentation: "modal", headerTintColor: theme.accent, headerShadowVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}
