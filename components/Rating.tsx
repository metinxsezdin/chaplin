import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  small?: boolean;
  disabled?: boolean;
  size?: number;
}

export function Rating({ rating, onRate, small, disabled, size }: RatingProps) {
  const iconSize = size || (small ? 16 : 24);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => !disabled && onRate?.(star)}
          disabled={disabled}
          style={small ? styles.smallStarContainer : styles.starContainer}
        >
          <MaterialCommunityIcons
            name={star <= rating ? "star" : "star-outline"}
            size={iconSize}
            color="#FFD700"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  starContainer: {
    padding: 4,
  },
  smallStarContainer: {
    padding: 2,
  },
}); 