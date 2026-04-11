import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import MapScreen     from './screens/MapScreen';
import ReportsScreen from './screens/ReportsScreen';
import ReportFormScreen from './screens/ReportFormScreen';
import SettingsScreen   from './screens/SettingsScreen';
import { COLORS } from './screens/MapScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, focused }) {
  const icons = {
    'Map':     'MAP',
    'Reports': 'LIST',
    'Report':  '+',
  };
  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 28,
      borderRadius: 8,
      backgroundColor: focused ? 'rgba(34,197,94,0.12)' : 'transparent',
    }}>
      <Text style={{
        fontSize:   label === 'Report' ? 20 : 11,
        fontWeight: '600',
        color:      focused ? COLORS.green : COLORS.text3,
        letterSpacing: 0.5,
      }}>
        {icons[label]}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  COLORS.bg2,
          borderTopColor:   COLORS.border,
          borderTopWidth:   1,
          height:           85,
          paddingBottom:    20,
          paddingTop:       10,
        },
        tabBarActiveTintColor:   COLORS.green,
        tabBarInactiveTintColor: COLORS.text3,
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '500',
          marginTop:  4,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Map"     component={MapScreen}        />
      <Tab.Screen name="Reports" component={ReportsScreen}    />
      <Tab.Screen name="Report"  component={ReportFormScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"     component={MainTabs}     />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}