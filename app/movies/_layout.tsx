import { Stack } from 'expo-router';
import { createSharedElementStackNavigator } from 'react-navigation-shared-element';
import MovieDetailScreen from './[id]';

// Tip tanımlamaları
interface RouteParams {
  id: string;
}

const SharedStack = createSharedElementStackNavigator();

export default function MoviesLayout() {
  return (
    <SharedStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <SharedStack.Screen
        name="[id]"
        component={MovieDetailScreen}
        options={{
          gestureEnabled: false,
          cardStyleInterpolator: ({ current: { progress } }: { 
            current: { progress: number } 
          }) => {
            return {
              cardStyle: {
                opacity: progress,
              },
            };
          },
          sharedElements: (route: { params: RouteParams }) => {
            const { id } = route.params;
            return [
              {
                id: `movie.${id}.poster`,
                animation: 'move',
                resize: 'clip',
                align: 'center-top',
              },
              {
                id: `movie.${id}.title`,
                animation: 'fade',
                resize: 'clip',
                align: 'left-center',
              },
            ];
          },
        }}
      />
    </SharedStack.Navigator>
  );
} 