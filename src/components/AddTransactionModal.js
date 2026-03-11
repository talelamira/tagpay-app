import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const CURRENCIES = ['€', '$', 'CAD', '£', 'CHF'];

export default function AddTransactionModal({ visible, onClose, onSave, customTags = [] }) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('€');
  const [type, setType] = useState(null); // 'Perso' | 'Pro' | null
  const [category, setCategory] = useState('');

  const handleSave = () => {
    if (!merchant.trim() || !amount.trim()) return;
    const parsedAmount = -Math.abs(parseFloat(amount.replace(',', '.')));
    if (isNaN(parsedAmount)) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} `;
    const dateOptions = { day: 'numeric', month: 'short' };
    const dateStr = `Today, ${now.toLocaleDateString('en-GB', dateOptions)}`;

    onSave({
      id: Date.now().toString(),
      merchant: merchant.trim(),
      amount: parsedAmount,
      currency,
      time: timeStr,
      date: dateStr,
      type,
      category,
      logo: 'https://cdn-icons-png.flaticon.com/512/825/825561.png',
    });

    // Reset
    setMerchant('');
    setAmount('');
    setCurrency('€');
    setType(null);
    setCategory('');
    onClose();
  };

  const isValid = merchant.trim().length > 0 && amount.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        className="flex-1 bg-black/70 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-10 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">Nouvelle transaction</Text>
            <TouchableOpacity onPress={onClose} className="w-9 h-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Marchand */}
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Marchand</Text>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Ex: Tim Hortons"
              placeholderTextColor="#94a3b8"
              className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-base mb-4"
            />

            {/* Montant + Devise */}
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Montant</Text>
            <View className="flex-row gap-3 mb-4">
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 text-base"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {CURRENCIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    className={`h-12 px-4 rounded-xl items-center justify-center mr-2 ${currency === c ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                  >
                    <Text className={`font-bold ${currency === c ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Type Perso/Pro */}
            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Classification</Text>
            <View className="flex-row gap-3 mb-4">
              {['Perso', 'Pro'].map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(prev => prev === t ? null : t)}
                  className={`flex-1 flex-row items-center justify-center h-12 rounded-xl ${type === t ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                >
                  <MaterialIcons
                    name={t === 'Perso' ? 'person' : 'work'}
                    size={18}
                    color={type === t ? 'white' : '#64748b'}
                  />
                  <Text className={`font-bold ml-2 ${type === t ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags personnalisés */}
            {customTags.length > 0 && (
              <>
                <Text className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                  {customTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => setCategory(prev => prev === tag ? '' : tag)}
                      className={`h-9 px-4 rounded-lg items-center justify-center mr-2 ${category === tag ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                      <Text className={`text-sm font-semibold ${category === tag ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </ScrollView>

          {/* Bouton Sauvegarder */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid}
            className={`mt-4 py-4 rounded-2xl items-center ${isValid ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <Text className={`font-bold text-base ${isValid ? 'text-white' : 'text-slate-500'}`}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
