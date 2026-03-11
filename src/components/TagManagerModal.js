import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ScrollView, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tagpay_custom_tags';

export default function TagManagerModal({ visible, onClose, tags, onTagsChange }) {
  const [newTagText, setNewTagText] = useState('');

  const addTag = async () => {
    const trimmed = newTagText.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const updated = [...tags, trimmed];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    onTagsChange(updated);
    setNewTagText('');
  };

  const deleteTag = async (tag) => {
    Alert.alert(
      'Supprimer le tag',
      `Supprimer "${tag}" ? Les transactions existantes conserveront ce tag mais il n'apparaîtra plus dans la liste.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const updated = tags.filter(t => t !== tag);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            onTagsChange(updated);
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-10 shadow-2xl max-h-3/4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Tags personnalisés</Text>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Champ ajout */}
          <View className="flex-row gap-3 mb-6">
            <TextInput
              value={newTagText}
              onChangeText={setNewTagText}
              placeholder="Nouveau tag (ex: Restaurant)"
              placeholderTextColor="#94a3b8"
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-base"
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={addTag}
              disabled={!newTagText.trim()}
              className={`w-12 h-12 rounded-xl items-center justify-center ${newTagText.trim() ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <MaterialIcons name="add" size={22} color={newTagText.trim() ? 'white' : '#94a3b8'} />
            </TouchableOpacity>
          </View>

          {/* Liste tags */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {tags.length === 0 && (
              <Text className="text-slate-400 text-center py-6">Aucun tag encore. Crée le premier !</Text>
            )}
            {tags.map((tag) => (
              <View key={tag} className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center gap-3">
                  <MaterialIcons name="label" size={18} color="#2563eb" />
                  <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">{tag}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteTag(tag)} className="p-2">
                  <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
