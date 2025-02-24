import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilter: () => void;
  onViewToggle: () => void;
  isGridView: boolean;
}

export function SearchBar({ value, onChangeText, onFilter, onViewToggle, isGridView }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={24} 
            color="#666" 
          />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder="Search movies..."
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.filterButton} onPress={onFilter}>
            <MaterialCommunityIcons 
              name="filter-variant" 
              size={24} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={onViewToggle}>
          <MaterialCommunityIcons
            name={isGridView ? "view-list" : "view-grid"}
            size={24}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: '#000',
    fontSize: 16,
  },
  filterButton: {
    padding: 4,
  },
  viewToggle: {
    padding: 4,
  },
}); 