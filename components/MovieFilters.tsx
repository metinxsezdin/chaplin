import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Slider } from '@rneui/themed';
import { FilterOptions } from '../types/movies';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MovieFiltersProps {
  visible: boolean;
  filters: FilterOptions;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
}

export function MovieFilters({ visible, filters, onClose, onApply }: MovieFiltersProps) {
  const [tempFilters, setTempFilters] = React.useState(filters);

  const handleApply = () => {
    onApply(tempFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      year: { min: 1900, max: new Date().getFullYear() },
      genre: [],
      imdbRating: { min: 0, max: 10 },
      userRating: { min: 0, max: 5 }
    };
    setTempFilters(resetFilters);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Yıl Filtresi */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Release Year</Text>
            <View style={styles.sliderContainer}>
              <Slider
                value={tempFilters.year.min}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  year: { ...prev.year, min: Math.floor(value) }
                }))}
                minimumValue={1900}
                maximumValue={new Date().getFullYear()}
                step={1}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>From: {tempFilters.year.min}</Text>
              <Slider
                value={tempFilters.year.max}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  year: { ...prev.year, max: Math.floor(value) }
                }))}
                minimumValue={1900}
                maximumValue={new Date().getFullYear()}
                step={1}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>To: {tempFilters.year.max}</Text>
            </View>
          </View>

          {/* IMDb Puanı Filtresi */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>IMDb Rating</Text>
            <View style={styles.sliderContainer}>
              <Slider
                value={tempFilters.imdbRating.min}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  imdbRating: { ...prev.imdbRating, min: value }
                }))}
                minimumValue={0}
                maximumValue={10}
                step={0.1}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>From: {tempFilters.imdbRating.min.toFixed(1)}</Text>
              <Slider
                value={tempFilters.imdbRating.max}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  imdbRating: { ...prev.imdbRating, max: value }
                }))}
                minimumValue={0}
                maximumValue={10}
                step={0.1}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>To: {tempFilters.imdbRating.max.toFixed(1)}</Text>
            </View>
          </View>

          {/* Kullanıcı Puanı Filtresi */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Your Rating</Text>
            <View style={styles.sliderContainer}>
              <Slider
                value={tempFilters.userRating.min}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  userRating: { ...prev.userRating, min: value }
                }))}
                minimumValue={0}
                maximumValue={5}
                step={0.5}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>From: {tempFilters.userRating.min.toFixed(1)}</Text>
              <Slider
                value={tempFilters.userRating.max}
                onValueChange={(value) => setTempFilters(prev => ({
                  ...prev,
                  userRating: { ...prev.userRating, max: value }
                }))}
                minimumValue={0}
                maximumValue={5}
                step={0.5}
                thumbStyle={styles.thumbStyle}
                trackStyle={styles.trackStyle}
              />
              <Text style={styles.sliderValue}>To: {tempFilters.userRating.max.toFixed(1)}</Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalContent: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sliderContainer: {
    marginHorizontal: 8,
  },
  thumbStyle: {
    height: 20,
    width: 20,
    backgroundColor: '#007AFF',
  },
  trackStyle: {
    height: 4,
  },
  sliderValue: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#666',
  },
  applyButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 