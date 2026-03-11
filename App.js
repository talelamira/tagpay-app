import './global.css';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Modal, Platform, Text, Alert, ToastAndroid, BackHandler, LogBox } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HistoryScreen from './src/screens/HistoryScreen';
import CapturePopup from './src/components/CapturePopup';
import analytics from '@react-native-firebase/analytics';

// Wrapper sécurisé pour l'Analytique (Évite de faire crasher l'app en Dev/Expo Go)
const safeLogEvent = async (eventName, params = {}) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (e) {
    console.log(`[Analytics Blocked in Dev] ${eventName}`, params);
  }
};

LogBox.ignoreLogs(['SafeAreaView has been deprecated']);

const formatTodayDate = () => {
  const date = new Date();
  const options = { day: 'numeric', month: 'short' };
  return `Today, ${date.toLocaleDateString('en-GB', options)}`;
};

export default function App() {
  const [showPopup, setShowPopup] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [customTags, setCustomTags] = useState([]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      try {
        const [txData, tagsData] = await Promise.all([
          AsyncStorage.getItem('@tagpay_transactions'),
          AsyncStorage.getItem('@tagpay_custom_tags'),
        ]);
        if (txData) setTransactions(JSON.parse(txData));
        if (tagsData) setCustomTags(JSON.parse(tagsData));
      } catch (e) {
        console.error('Erreur chargement données:', e);
      }
      setIsLoaded(true);
    };
    loadData();
  }, []);

  // Sauvegarde à chaque modification (si chargé)
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem('@tagpay_transactions', JSON.stringify(transactions));
    }
  }, [transactions, isLoaded]);

  const handleDeepLink = (url) => {
    if (!url) return;
    try {
      const parsedUrl = Linking.parse(url);

      // Dans Expo, le nom peut atterrir dans path ou hostname en fonction de l'app de test
      if (parsedUrl.hostname === 'capture' || parsedUrl.path === 'capture') {

        // Tracking: Notification Réceptionnée
        safeLogEvent('notification_received', { source: 'google_pay' });

        const title = parsedUrl.queryParams?.title || 'Via Notification';
        const rawText = parsedUrl.queryParams?.text || '';
        const rawSubText = parsedUrl.queryParams?.subtext || '';
        const rawBigText = parsedUrl.queryParams?.bigtext || '';
        const text = rawText.replace(/_/g, ' ');
        const subText = rawSubText.replace(/_/g, ' ');
        const bigText = rawBigText.replace(/_/g, ' ');
        const fullContent = `${text} ${bigText}`.trim();

        // Tente d'extraire le montant
        let amountParsed = -0.00;
        const amountMatch = fullContent.match(/([$€£A-Z]{1,3})?\s*(\d+[.,]\d{2})\s*([$€£A-Z]{1,3})?/i);
        let currency = '€';

        if (amountMatch) {
          amountParsed = -parseFloat(amountMatch[2].replace(',', '.'));
          if (amountMatch[1] && amountMatch[1].trim() && amountMatch[1].trim().match(/^[$€£A-Z]+$/)) {
            currency = amountMatch[1].trim().toUpperCase();
          } else if (amountMatch[3] && amountMatch[3].trim() && amountMatch[3].trim().match(/^[$€£A-Z]+$/)) {
            currency = amountMatch[3].trim().toUpperCase();
          }
        }

        // Bug #1 - Extraction améliorée du nom du commerçant
        let merchantName = '';
        const genericTitles = ['google pay', 'wallet', 'transaction', 'paiement', 'payment', ''];
        const titleNormalized = title.toLowerCase().trim();
        if (title && !genericTitles.some(g => titleNormalized.includes(g))) {
          merchantName = title.trim();
        }
        if (!merchantName && subText && subText.trim().length > 1) {
          merchantName = subText.trim();
        }
        if (!merchantName) {
          const atMatch = fullContent.split(/ à | chez | to | at | chez\s/i);
          if (atMatch.length > 1) {
            merchantName = atMatch[atMatch.length - 1].trim().replace(/[.,!?].*$/, '').trim();
          }
        }
        if (!merchantName) {
          merchantName = 'Google Pay Transaction';
        }

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} `;

        setPendingTransaction({
          merchant: merchantName,
          amount: amountParsed,
          currency: currency,
          time: timeStr,
          date: formatTodayDate(),
          logo: 'https://cdn-icons-png.flaticon.com/512/825/825561.png'
        });

        // Tracking: Affichage de la Popup
        safeLogEvent('popup_displayed');

        setShowPopup(true);
      }
    } catch (e) {
      Alert.alert('Erreur TagPay', 'Impossible de parser le DeepLink: ' + e.message);
    }
  };

  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    const sub = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => sub.remove();
  }, []);

  // Feature #3 - Ajout manuel
  const handleAddTransaction = (newTx) => {
    setTransactions(prev => [newTx, ...prev]);
  };

  // Feature #3 - Suppression
  const handleDeleteTransaction = (id) => {
    Alert.alert(
      'Supprimer la transaction',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setTransactions(prev => prev.filter(tx => tx.id !== id))
        }
      ]
    );
  };

  // Feature #4 - Mise à jour des tags depuis HistoryScreen
  const handleTagsChange = async (updatedTags) => {
    setCustomTags(updatedTags);
    await AsyncStorage.setItem('@tagpay_custom_tags', JSON.stringify(updatedTags));
  };

  const handleClassify = (type, category = '', receiptUri = null) => {
    if (!pendingTransaction) return;

    setTransactions(prev => {
      // Mode Édition
      if (pendingTransaction.id) {
        return prev.map(tx => {
          if (tx.id === pendingTransaction.id) {
            return {
              ...tx,
              ...pendingTransaction,
              type: type,
              category: category || tx.category,
              receiptUri: receiptUri || tx.receiptUri,
            };
          }
          return tx;
        });
      }

      // Mode Ajout (DeepLink)
      const newTx = {
        ...pendingTransaction,
        id: Date.now().toString(),
        type: type,
        category: category,
        receiptUri: receiptUri,
      };
      return [newTx, ...prev];
    });

    const isNewTransaction = !pendingTransaction.id;
    setShowPopup(false);
    setPendingTransaction(null);

    // Tracking: Confirmation du Tag (uniquement si ce n'est pas une annulation)
    if (type) {
      safeLogEvent('tag_confirmed', { tag_type: type, is_new: isNewTransaction });
    }

    if (Platform.OS === 'android') {
      const toastMsg = type ? `Transaction enregistrée comme ${type.toLowerCase()}` : 'Transaction enregistrée sans classification';
      ToastAndroid.show(toastMsg, ToastAndroid.SHORT);
      if (isNewTransaction) {
        setTimeout(() => BackHandler.exitApp(), 200);
      }
    }
  };

  return (
    <SafeAreaProvider>
      <View className={`flex-1 bg-background-light dark:bg-background-dark overflow-hidden ${Platform.OS === 'web' ? 'w-full max-w-md mx-auto md:border-x md:border-slate-200 shadow-2xl h-screen' : ''}`}>
        <HistoryScreen
          transactions={transactions}
          customTags={customTags}
          onEditTransaction={(tx) => {
            setPendingTransaction(tx);
            setShowPopup(true);
          }}
          onAddTransaction={handleAddTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onTagsChange={handleTagsChange}
        />

        <Modal visible={showPopup && !!pendingTransaction} transparent={true} animationType="fade">
          <View className="flex-1 bg-black/70 justify-center">
            <CapturePopup
              transaction={pendingTransaction}
              customTags={customTags}
              onClose={() => {
                const isNew = !pendingTransaction?.id;
                setShowPopup(false);
                setPendingTransaction(null);
                if (Platform.OS === 'android' && isNew) BackHandler.exitApp();
              }}
              onClassify={handleClassify}
            />
          </View>
        </Modal>

        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
  );
}
