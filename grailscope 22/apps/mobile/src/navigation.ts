import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Tabs: undefined;
  Detail: { id: string };
  Login: undefined;
};

export type Nav = NativeStackNavigationProp<RootStackParamList>;
