import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useTheme } from '../../contexts/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: {
    newMatches: boolean;
    newMessages: boolean;
    movieSuggestions: boolean;
  };
  onUpdate: () => void;
}

export function NotificationsModal({ visible, onClose, settings, onUpdate }: NotificationsModalProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState(settings);

  const handleToggle = async (key: keyof typeof settings) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const newSettings = {
        ...notifications,
        [key]: !notifications[key],
      };

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setNotifications(newSettings);
      onUpdate();
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.settings}>
            <View style={styles.settingItem}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>New Matches</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get notified when you match with someone
                </Text>
              </View>
              <Switch
                value={notifications.newMatches}
                onValueChange={() => handleToggle('newMatches')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>New Messages</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get notified when you receive a message
                </Text>
              </View>
              <Switch
                value={notifications.newMessages}
                onValueChange={() => handleToggle('newMessages')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Movie Suggestions</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get personalized movie recommendations
                </Text>
              </View>
              <Switch
                value={notifications.movieSuggestions}
                onValueChange={() => handleToggle('movieSuggestions')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settings: {
    gap: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
}); 