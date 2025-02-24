import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { useTheme } from '../../contexts/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/auth';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  settings: {
    profileVisible: boolean;
    showRatings: boolean;
  };
  onUpdate: () => void;
}

export function PrivacyModal({ visible, onClose, settings, onUpdate }: PrivacyModalProps) {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const [privacy, setPrivacy] = useState(settings);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleToggle = async (key: keyof typeof settings) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const newSettings = {
        ...privacy,
        [key]: !privacy[key],
      };

      const dbSettings = {
        user_id: user.id,
        profile_visible: newSettings.profileVisible,
        show_ratings: newSettings.showRatings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('privacy_settings')
        .upsert(dbSettings);

      if (error) throw error;
      setPrivacy(newSettings);
      onUpdate();
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              await signOut();
            } catch (error) {
              console.error('Error deleting account:', error);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Animated.View style={[
          styles.content,
          {
            backgroundColor: colors.surface,
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Privacy</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[{ color: colors.text, fontSize: 20 }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settings}>
            <View style={styles.settingItem}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Profile Visibility</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Allow others to see your profile
                </Text>
              </View>
              <Switch
                value={privacy.profileVisible}
                onValueChange={() => handleToggle('profileVisible')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Show Ratings</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Show your movie ratings to others
                </Text>
              </View>
              <Switch
                value={privacy.showRatings}
                onValueChange={() => handleToggle('showRatings')}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 