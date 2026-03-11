import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CapturePopup({ onClose, onClassify, transaction, customTags = [] }) {
    const [selectedCategory, setSelectedCategory] = useState(transaction?.category || '');
    const [receiptUri, setReceiptUri] = useState(transaction?.receiptUri || null);

    if (!transaction) return null;

    const handleClassify = (type) => {
        onClassify(type, selectedCategory, receiptUri);
    };

    const pickImage = async (useCamera) => {
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission refusée', 'L\'accès à la caméra est requis.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    quality: 0.7,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission refusée', 'L\'accès à la galerie est requis.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 0.7,
                });
            }
            if (!result.canceled && result.assets?.[0]?.uri) {
                setReceiptUri(result.assets[0].uri);
            }
        } catch (e) {
            Alert.alert('Erreur', e.message);
        }
    };

    const showReceiptOptions = () => {
        Alert.alert('Ajouter un reçu', 'Choisir la source', [
            { text: '📷 Prendre une photo', onPress: () => pickImage(true) },
            { text: '🖼️ Choisir depuis la galerie', onPress: () => pickImage(false) },
            ...(receiptUri ? [{ text: '🗑️ Supprimer le reçu', onPress: () => setReceiptUri(null), style: 'destructive' }] : []),
            { text: 'Annuler', style: 'cancel' },
        ]);
    };

    return (
        <View className="items-center justify-center p-4">
            {/* Modal Container */}
            <View className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

                {/* Header / Close */}
                <View className="flex-row items-center p-4 pb-2 justify-between">
                    <TouchableOpacity onPress={onClose} className="flex-row w-12 h-12 items-center justify-center rounded-lg">
                        <MaterialIcons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                    <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight flex-1 text-center">
                        Transaction Notification
                    </Text>
                    {/* Bouton reçu */}
                    <TouchableOpacity onPress={showReceiptOptions} className="w-12 h-12 items-center justify-center rounded-lg">
                        <MaterialIcons
                            name="receipt"
                            size={24}
                            color={receiptUri ? '#2563eb' : '#64748b'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Aperçu miniature du reçu (si photo choisie) */}
                {receiptUri && (
                    <TouchableOpacity onPress={showReceiptOptions} className="mx-4 mb-2 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800">
                        <Image source={{ uri: receiptUri }} className="w-full h-24" resizeMode="cover" />
                        <View className="absolute top-1 right-1 bg-blue-600 rounded-full px-2 py-0.5">
                            <Text className="text-white text-[10px] font-bold">Reçu ✓</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Merchant Info Section */}
                <View className="flex-row p-4">
                    <View className="flex-col w-full gap-4 items-center">
                        <View className="flex-col gap-4 items-center">
                            {/* Merchant Logo */}
                            <View className="bg-slate-100 dark:bg-slate-800 items-center justify-center rounded-full h-24 w-24 border-4 border-primary/10 overflow-hidden">
                                <Image
                                    source={{ uri: transaction.logo }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            </View>
                            <View className="flex-col items-center justify-center">
                                <Text className="text-slate-900 dark:text-slate-100 text-[24px] font-bold leading-tight text-center">{transaction.merchant}</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal text-center mt-1">Aujourd'hui, {transaction.time}</Text>
                                <View className="flex-row items-center gap-1 mt-1">
                                    <MaterialIcons name="contactless" size={16} color="#64748b" />
                                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-normal text-center">Google Pay</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Amount */}
                <Text className="text-slate-900 dark:text-slate-100 tracking-tight text-[48px] font-extrabold leading-tight px-4 text-center pb-2 pt-4">
                    {Math.abs(transaction.amount).toFixed(2).replace('.', ',')} {transaction.currency || '€'}
                </Text>

                {/* Tags personnalisés */}
                {customTags.length > 0 && (
                    <View className="px-6 pb-2">
                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Catégorie</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {customTags.map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => setSelectedCategory(prev => prev === tag ? '' : tag)}
                                    className={`h-8 px-3 rounded-lg items-center justify-center mr-2 ${selectedCategory === tag ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                                >
                                    <Text className={`text-xs font-bold ${selectedCategory === tag ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Category Prompt */}
                <View className="px-6 py-4">
                    <Text className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-normal tracking-widest uppercase text-center mb-6">
                        Classifier la transaction
                    </Text>
                    {/* Quick Action Buttons */}
                    <View className="flex-row gap-4 justify-center w-full mt-2">
                        <TouchableOpacity onPress={() => handleClassify('Perso')} className="flex-1 flex-row items-center justify-center rounded-xl h-16 bg-slate-200 dark:bg-slate-800">
                            <MaterialIcons name="person" size={24} color="#0f172a" />
                            <Text className="text-slate-900 dark:text-slate-100 text-lg font-bold ml-2">Perso</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleClassify('Pro')} className="flex-1 flex-row items-center justify-center rounded-xl h-16 bg-primary shadow-lg shadow-primary/20">
                            <MaterialIcons name="work" size={24} color="#ffffff" />
                            <Text className="text-white text-lg font-bold ml-2">Pro</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Secondary Action */}
                <View className="flex-row justify-center pb-8 pt-2">
                    <TouchableOpacity onPress={() => handleClassify(null)} className="flex-row items-center justify-center p-2 rounded">
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-wide">Enregistrer sans classification</Text>
                    </TouchableOpacity>
                </View>

                {/* Accent strip */}
                <View className="absolute bottom-0 left-0 w-full h-1 bg-primary/50"></View>
            </View>
        </View>
    );
}
