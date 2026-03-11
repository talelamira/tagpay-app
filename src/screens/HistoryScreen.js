import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, NativeModules, Alert, AppState, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingWizard from '../components/OnboardingWizard';
import AddTransactionModal from '../components/AddTransactionModal';
import TagManagerModal from '../components/TagManagerModal';

const { NotificationPermissionModule } = NativeModules;

export default function HistoryScreen({
    transactions = [],
    customTags = [],
    onEditTransaction,
    onAddTransaction,
    onDeleteTransaction,
    onTagsChange,
}) {
    const [sortDesc, setSortDesc] = useState(true);
    const [tagFilter, setTagFilter] = useState('All');
    const [showSansTag, setShowSansTag] = useState(false);
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
    const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
    const [isCheckingPerms, setIsCheckingPerms] = useState(true);

    const [calStartDate, setCalStartDate] = useState(null);
    const [calEndDate, setCalEndDate] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [tempStart, setTempStart] = useState(null);
    const [tempEnd, setTempEnd] = useState(null);

    // Feature #3 - Modale ajout
    const [showAddModal, setShowAddModal] = useState(false);
    // Feature #4 - Modale tags
    const [showTagManager, setShowTagManager] = useState(false);
    // Feature #5 - Modale reçu fullscreen
    const [receiptFullscreen, setReceiptFullscreen] = useState(null);

    const checkPerms = async () => {
        setIsCheckingPerms(true);
        if (NotificationPermissionModule) {
            const notifStatus = await NotificationPermissionModule.checkPermission();
            setHasNotificationPermission(notifStatus);
            if (NotificationPermissionModule.checkOverlayPermission) {
                const overlayStatus = await NotificationPermissionModule.checkOverlayPermission();
                setHasOverlayPermission(overlayStatus);
            }
        }
        setIsCheckingPerms(false);
    };

    useEffect(() => {
        checkPerms();
        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem('@tagpay_onboarding_done');
                setHasCompletedOnboarding(completed === 'true');
            } catch (e) { }
            setIsCheckingOnboarding(false);
        };
        checkOnboarding();
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') checkPerms();
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!isCheckingPerms && !isCheckingOnboarding) {
            if (hasNotificationPermission && hasOverlayPermission && !hasCompletedOnboarding) {
                AsyncStorage.setItem('@tagpay_onboarding_done', 'true');
                setHasCompletedOnboarding(true);
            }
        }
    }, [hasNotificationPermission, hasOverlayPermission, isCheckingOnboarding, isCheckingPerms, hasCompletedOnboarding]);

    const requestPermission = () => {
        if (NotificationPermissionModule) {
            Alert.alert(
                "Permission Requise",
                "Pour détecter automatiquement vos paiements Google Pay, TagPay a besoin d'accéder à vos notifications.",
                [
                    { text: "Plus tard", style: "cancel" },
                    { text: "Ouvrir les paramètres", onPress: () => NotificationPermissionModule.requestPermission() }
                ]
            );
        }
    };

    const exportCSV = async () => {
        try {
            if (!filteredTransactions || filteredTransactions.length === 0) {
                Alert.alert("Vide", "Aucune transaction à exporter.");
                return;
            }
            const header = "Date,Heure,Marchand,Montant,Devise,Type,Categorie\n";
            const rows = filteredTransactions.map(tx =>
                `"${tx.date}","${tx.time}","${tx.merchant}","${tx.amount}","${tx.currency || '€'}","${tx.type || ''}","${tx.category || ''}"`
            ).join("\n");
            const csvString = '\uFEFF' + header + rows;
            const fileUri = FileSystem.documentDirectory + "tagpay_transactions_" + Date.now() + ".csv";
            await FileSystem.writeAsStringAsync(fileUri, csvString);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    dialogTitle: 'Exporter les transactions TagPay',
                    mimeType: 'text/csv',
                    UTI: 'public.comma-separated-values-text'
                });
            } else {
                Alert.alert("Erreur", "Le partage n'est pas disponible sur cet appareil.");
            }
        } catch (e) {
            Alert.alert("Erreur d'export", e.message);
        }
    };

    // Tous les tags actifs pour le filtre : Perso, Pro + custom
    const allFilterableTags = ['Perso', 'Pro', ...customTags];

    // Filter and Sort Logic
    const filteredTransactions = useMemo(() => {
        let result = transactions.filter(tx => {
            if (showSansTag) return !tx.type && !tx.category;
            if (tagFilter !== 'All') {
                // Filtre sur le type (Perso/Pro) OU sur la catégorie custom
                return tx.type === tagFilter || tx.category === tagFilter;
            }
            return true;
        });

        if (calStartDate) {
            const [y, m, d] = calStartDate.split('-');
            const startLimit = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime();
            result = result.filter(tx => {
                const txDate = tx.id && tx.id.length > 5 ? parseInt(tx.id) : Date.now();
                return txDate >= startLimit;
            });
        }

        if (calEndDate || calStartDate) {
            const endStr = calEndDate ? calEndDate : calStartDate;
            const [y, m, d] = endStr.split('-');
            const endLimit = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime() + 86400000;
            result = result.filter(tx => {
                const txDate = tx.id && tx.id.length > 5 ? parseInt(tx.id) : 0;
                return txDate <= endLimit;
            });
        }

        return result.sort((a, b) => {
            const timeA = a.id && a.id.length > 5 ? parseInt(a.id) : 0;
            const timeB = b.id && b.id.length > 5 ? parseInt(b.id) : 0;
            return sortDesc ? timeB - timeA : timeA - timeB;
        });
    }, [transactions, sortDesc, tagFilter, showSansTag, calStartDate, calEndDate]);

    const handleTagFilterPress = () => {
        if (showSansTag) setShowSansTag(false);
        // Cycle : All → Perso → Pro → custom1 → custom2 → ... → All
        const idx = allFilterableTags.indexOf(tagFilter);
        if (tagFilter === 'All') {
            setTagFilter(allFilterableTags[0] || 'All');
        } else if (idx >= 0 && idx < allFilterableTags.length - 1) {
            setTagFilter(allFilterableTags[idx + 1]);
        } else {
            setTagFilter('All');
        }
    };

    const handleSansTagToggle = () => {
        const newState = !showSansTag;
        setShowSansTag(newState);
        if (newState) setTagFilter('All');
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header Section */}
            <View className="flex-col border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 pt-4">
                <View className="flex-row items-center p-4 justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 items-center justify-center rounded-xl bg-primary">
                            <MaterialIcons name="receipt-long" size={24} color="white" />
                        </View>
                        <Text className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 ml-3">Transactions</Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {/* Feature #4 - Gestionnaire de tags */}
                        <TouchableOpacity
                            onPress={() => setShowTagManager(true)}
                            className="flex-row items-center justify-center rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <MaterialIcons name="label" size={20} color="#64748b" />
                        </TouchableOpacity>

                        {/* Feature #3 - Bouton Ajout */}
                        <TouchableOpacity
                            onPress={() => setShowAddModal(true)}
                            className="flex-row items-center justify-center rounded-lg px-3 py-2 bg-primary"
                        >
                            <MaterialIcons name="add" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={exportCSV} className="flex-row items-center justify-center rounded-lg px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <MaterialIcons name="file-download" size={20} color="#0f172a" />
                            <Text className="text-slate-900 dark:text-slate-100 text-sm font-bold ml-2">CSV</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters & Toggles */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 px-4 pb-4">
                    <TouchableOpacity
                        onPress={() => {
                            if (calStartDate) {
                                setCalStartDate(null);
                                setCalEndDate(null);
                            } else {
                                setTempStart(null);
                                setTempEnd(null);
                                setShowCalendar(true);
                            }
                        }}
                        className={`flex-row h-9 items-center justify-center gap-2 rounded-lg px-3 mr-3 ${calStartDate ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="date-range" size={16} color={calStartDate ? '#2563eb' : '#64748b'} />
                        <Text className={`text-sm font-semibold ml-1 ${calStartDate ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {calStartDate ? (calEndDate ? 'Plage Filtrée' : '1 Jour Filtré') : 'Dates'}
                        </Text>
                        {calStartDate ? (
                            <MaterialIcons name="close" size={16} color="#2563eb" />
                        ) : (
                            <MaterialIcons name={sortDesc ? "expand-more" : "expand-less"} size={16} color="#64748b" onPress={() => setSortDesc(!sortDesc)} />
                        )}
                    </TouchableOpacity>

                    {/* Filtre Tag (cycle Perso → Pro → customs) */}
                    <TouchableOpacity
                        onPress={handleTagFilterPress}
                        className={`flex-row h-9 items-center justify-center gap-2 rounded-lg px-3 mr-3 ${tagFilter !== 'All' ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="sell" size={16} color={tagFilter !== 'All' ? '#2563eb' : '#64748b'} />
                        <Text className={`text-sm font-semibold ml-1 ${tagFilter !== 'All' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {tagFilter === 'All' ? 'Tag' : tagFilter}
                        </Text>
                        {tagFilter !== 'All' && <MaterialIcons name="close" size={14} color="#2563eb" onPress={() => setTagFilter('All')} />}
                    </TouchableOpacity>

                    <View className="h-9 w-[1px] bg-slate-300 dark:bg-slate-700 self-center mx-2"></View>

                    <TouchableOpacity
                        onPress={handleSansTagToggle}
                        className={`flex-row h-9 items-center justify-center gap-2 rounded-lg px-4 shadow-lg ml-2 ${showSansTag ? 'bg-primary shadow-primary/20' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="label-off" size={16} color={showSansTag ? 'white' : '#64748b'} />
                        <Text className={`text-sm font-bold ml-1 ${showSansTag ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>Sans tag</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Bannières permissions */}
            {hasCompletedOnboarding && !hasNotificationPermission && (
                <TouchableOpacity onPress={requestPermission} className="bg-red-500 flex-row items-center justify-between px-4 py-3 shadow-md">
                    <View className="flex-row items-center flex-1 pr-2">
                        <MaterialIcons name="error-outline" size={20} color="white" />
                        <Text className="text-white text-xs font-bold ml-2 leading-tight">Autorisez l'accès aux notifications pour capturer vos dépenses</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="white" />
                </TouchableOpacity>
            )}

            {hasCompletedOnboarding && !hasOverlayPermission && (
                <TouchableOpacity onPress={() => NotificationPermissionModule.requestOverlayPermission()} className="bg-orange-500 flex-row items-center justify-between px-4 py-3 shadow-md border-t border-orange-600">
                    <View className="flex-row items-center flex-1 pr-2">
                        <MaterialIcons name="layers" size={20} color="white" />
                        <Text className="text-white text-xs font-bold ml-2 leading-tight">Autorisez TagPay à s'afficher par-dessus les autres applications</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="white" />
                </TouchableOpacity>
            )}

            {/* List Content */}
            <ScrollView className="flex-1 px-4 py-4 space-y-6">
                {filteredTransactions.length === 0 && (
                    <View className="items-center justify-center py-10 opacity-50">
                        <MaterialIcons name="search-off" size={48} color="#94a3b8" />
                        <Text className="text-slate-500 dark:text-slate-400 mt-4 text-center">Aucune transaction trouvée avec ces filtres.</Text>
                    </View>
                )}

                {Object.entries(
                    filteredTransactions.reduce((acc, tx) => {
                        if (!acc[tx.date]) acc[tx.date] = [];
                        acc[tx.date].push(tx);
                        return acc;
                    }, {})
                ).map(([date, items], sectionIndex) => (
                    <View key={date} className={`mb-6 ${sectionIndex > 0 ? 'pt-2' : ''}`}>
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">{date}</Text>

                        <View className="space-y-2 flex-col gap-2">
                            {items.map((tx) => (
                                <TouchableOpacity
                                    key={tx.id}
                                    onPress={() => onEditTransaction && onEditTransaction(tx)}
                                    onLongPress={() => onDeleteTransaction && onDeleteTransaction(tx.id)}
                                    activeOpacity={0.7}
                                    className="flex-row items-center gap-4 bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-transparent mt-2"
                                >
                                    {/* Logo ou reçu miniature */}
                                    <TouchableOpacity
                                        onPress={() => tx.receiptUri ? setReceiptFullscreen(tx.receiptUri) : null}
                                        className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-xl items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700"
                                    >
                                        {tx.receiptUri ? (
                                            <>
                                                <Image source={{ uri: tx.receiptUri }} className="w-full h-full" resizeMode="cover" />
                                                <View className="absolute bottom-0 right-0 bg-blue-600 rounded-tl-md p-0.5">
                                                    <MaterialIcons name="receipt" size={9} color="white" />
                                                </View>
                                            </>
                                        ) : (
                                            <Image source={{ uri: tx.logo }} className="w-full h-full" resizeMode="cover" />
                                        )}
                                    </TouchableOpacity>

                                    <View className="flex-1 flex-col ml-3">
                                        <View className="flex-row justify-between items-start">
                                            <Text className="text-base font-bold text-slate-900 dark:text-slate-100 flex-1 pr-2" numberOfLines={1}>{tx.merchant}</Text>
                                            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">{tx.amount.toFixed(2).replace('.', ',')} {tx.currency || '€'}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{tx.time}</Text>

                                            {(tx.type || tx.category) && (
                                                <View className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1"></View>
                                            )}

                                            {tx.type && (
                                                <View className={`px-2 py-0.5 rounded border ${tx.type === 'Pro' ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800' : 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800'}`}>
                                                    <Text className={`text-[10px] font-bold uppercase ${tx.type === 'Pro' ? 'text-purple-600 dark:text-purple-300' : 'text-blue-600 dark:text-blue-300'}`}>{tx.type}</Text>
                                                </View>
                                            )}
                                            {tx.category && (
                                                <View className="px-2 py-0.5 rounded border border-primary/20 bg-primary/10">
                                                    <Text className="text-[10px] font-bold text-primary">{tx.category}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Calendrier modal */}
            {showCalendar && (
                <Modal visible={true} transparent={true} animationType="fade">
                    <View className="flex-1 bg-black/70 justify-center p-4">
                        <View className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
                            <View className="p-4 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center">
                                <Text className="text-lg font-bold text-slate-900 dark:text-slate-100">Filtrer par dates</Text>
                                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                    <MaterialIcons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            <Calendar
                                markingType={'period'}
                                markedDates={{
                                    ...(tempStart ? { [tempStart]: { startingDay: true, color: '#2563eb', textColor: 'white', endingDay: !tempEnd } } : {}),
                                    ...(tempEnd && tempStart && tempEnd !== tempStart ? { [tempEnd]: { endingDay: true, color: '#2563eb', textColor: 'white' } } : {}),
                                }}
                                onDayPress={day => {
                                    if (!tempStart || (tempStart && tempEnd)) {
                                        setTempStart(day.dateString);
                                        setTempEnd(null);
                                    } else if (tempStart && !tempEnd) {
                                        if (day.dateString > tempStart) setTempEnd(day.dateString);
                                        else if (day.dateString < tempStart) setTempStart(day.dateString);
                                        else { setTempStart(day.dateString); setTempEnd(day.dateString); }
                                    }
                                }}
                                theme={{
                                    backgroundColor: 'transparent',
                                    calendarBackground: 'transparent',
                                    textSectionTitleColor: '#64748b',
                                    selectedDayBackgroundColor: '#2563eb',
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: '#2563eb',
                                    dayTextColor: '#0f172a',
                                    textDisabledColor: '#cbd5e1',
                                    monthTextColor: '#0f172a',
                                    arrowColor: '#2563eb',
                                }}
                            />
                            <View className="flex-row p-4 border-t border-slate-200 dark:border-slate-800 gap-3">
                                <TouchableOpacity className="flex-1 py-3 rounded-lg items-center bg-slate-100 dark:bg-slate-800" onPress={() => setShowCalendar(false)}>
                                    <Text className="font-bold text-slate-600 dark:text-slate-400">Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`flex-1 py-3 rounded-lg items-center ${tempStart ? 'bg-primary' : 'bg-blue-300'}`}
                                    disabled={!tempStart}
                                    onPress={() => {
                                        setCalStartDate(tempStart);
                                        setCalEndDate(tempEnd);
                                        setShowCalendar(false);
                                    }}
                                >
                                    <Text className="font-bold text-white">Valider</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Feature #3 - Modale d'ajout */}
            <AddTransactionModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={onAddTransaction}
                customTags={customTags}
            />

            {/* Feature #4 - Gestionnaire de tags */}
            <TagManagerModal
                visible={showTagManager}
                onClose={() => setShowTagManager(false)}
                tags={customTags}
                onTagsChange={onTagsChange}
            />

            {/* Feature #5 - Reçu fullscreen */}
            {receiptFullscreen && (
                <Modal visible={true} transparent animationType="fade">
                    <TouchableOpacity className="flex-1 bg-black items-center justify-center" onPress={() => setReceiptFullscreen(null)}>
                        <Image source={{ uri: receiptFullscreen }} className="w-full h-full" resizeMode="contain" />
                        <View className="absolute top-12 right-4 bg-white/20 rounded-full p-2">
                            <MaterialIcons name="close" size={28} color="white" />
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Modale d'Onboarding */}
            {!isCheckingOnboarding && !isCheckingPerms && (
                <OnboardingWizard
                    isVisible={!hasCompletedOnboarding && (!hasNotificationPermission || !hasOverlayPermission)}
                    hasNotificationPermission={hasNotificationPermission}
                    hasOverlayPermission={hasOverlayPermission}
                    requestNotificationPermission={requestPermission}
                    requestOverlayPermission={() => NotificationPermissionModule.requestOverlayPermission()}
                    onSkip={() => {
                        AsyncStorage.setItem('@tagpay_onboarding_done', 'true');
                        setHasCompletedOnboarding(true);
                    }}
                />
            )}

        </SafeAreaView>
    );
}
