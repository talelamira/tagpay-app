import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function OnboardingWizard({
    isVisible,
    hasNotificationPermission,
    hasOverlayPermission,
    requestNotificationPermission,
    requestOverlayPermission,
    onSkip
}) {
    if (!isVisible) return null;

    const isStep1 = !hasNotificationPermission;
    const isStep2 = hasNotificationPermission && !hasOverlayPermission;

    return (
        <Modal visible={isVisible} animationType="fade" transparent={true}>
            <View className="flex-1 bg-black/95 justify-center items-center p-6">

                {/* En-tête / Logo */}
                <View className="mb-10 items-center">
                    <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-5 shadow-lg shadow-primary/50">
                        <MaterialIcons name="auto-awesome" size={40} color="white" />
                    </View>
                    <Text className="text-white text-3xl font-extrabold text-center tracking-tight mb-2">Bienvenue sur TagPay</Text>
                    <Text className="text-slate-400 text-base text-center leading-relaxed px-2">
                        Pour que la magie opère et capturer vos paiements en temps réel, deux permissions sont requises.
                    </Text>
                </View>

                {/* Étape 1 : Notifications */}
                {isStep1 && (
                    <View className="w-full bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 relative">
                        {/* Flèche façon "Bulle de BD" */}
                        <View className="absolute -top-3 left-1/2 -ml-3 w-6 h-6 bg-slate-800 border-l border-t border-slate-700 transform rotate-45"></View>

                        <View className="flex-row items-center mb-4">
                            <View className="w-12 h-12 bg-blue-500/20 rounded-full items-center justify-center border border-blue-500/30">
                                <Text className="text-blue-400 font-bold text-xl">1</Text>
                            </View>
                            <Text className="text-white text-xl font-bold ml-4 flex-1">Lecture des notifications</Text>
                        </View>
                        <Text className="text-slate-300 text-base leading-relaxed mb-8">
                            Nécessaire pour intercepter furtivement l'apparition de vos paiements via Google Pay et vous permettre de les classer.
                        </Text>
                        <TouchableOpacity
                            onPress={requestNotificationPermission}
                            className="w-full bg-primary py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-primary/30"
                        >
                            <Text className="text-white font-bold text-lg mr-2">Autoriser l'accès</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Étape 2 : Superposition */}
                {isStep2 && (
                    <View className="w-full bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 relative">
                        {/* Flèche façon "Bulle de BD" */}
                        <View className="absolute -top-3 left-1/2 -ml-3 w-6 h-6 bg-slate-800 border-l border-t border-slate-700 transform rotate-45"></View>

                        <View className="flex-row items-center mb-4">
                            <View className="w-12 h-12 bg-orange-500/20 rounded-full items-center justify-center border border-orange-500/30">
                                <Text className="text-orange-400 font-bold text-xl">2</Text>
                            </View>
                            <Text className="text-white text-xl font-bold ml-4 flex-1">Superposition d'écran</Text>
                        </View>
                        <Text className="text-slate-300 text-base leading-relaxed mb-8">
                            Dernière étape ! Autorisez TagPay à "Afficher par-dessus les autres applis" pour faire apparaître la modale lors d'un achat sans vous interrompre.
                        </Text>
                        <TouchableOpacity
                            onPress={requestOverlayPermission}
                            className="w-full bg-orange-600 py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-orange-600/30"
                        >
                            <Text className="text-white font-bold text-lg mr-2">Ouvrir les réglages</Text>
                            <MaterialIcons name="done-all" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Secondary Action */}
                <View className="flex-row justify-center mt-8">
                    <TouchableOpacity onPress={onSkip} className="p-2">
                        <Text className="text-slate-400 text-sm font-bold tracking-wide">Ignorer cet assistant (Non recommandé)</Text>
                    </TouchableOpacity>
                </View>

                {/* Indicateurs de progression (Pills) */}
                <View className="flex-row mt-6 gap-3 w-full px-12">
                    <View className={`h-1.5 flex-1 rounded-full ${isStep1 ? 'bg-primary' : 'bg-green-500'}`}></View>
                    <View className={`h-1.5 flex-1 rounded-full ${isStep1 ? 'bg-slate-700' : isStep2 ? 'bg-orange-500' : 'bg-green-500'}`}></View>
                </View>
            </View>
        </Modal>
    );
}
