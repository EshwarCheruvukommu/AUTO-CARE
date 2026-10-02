import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FeedbackSubmission } from '../types';
import { sanitizeFirestoreData } from '../utils/firestore';

export async function submitUserFeedback(
  feedbackData: Omit<FeedbackSubmission, 'id' | 'submittedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const cleanData = sanitizeFirestoreData({
    userId: feedbackData.userId,
    submittedAt: now,
    easeOfUse: feedbackData.easeOfUse,
    mostUsefulFeature: feedbackData.mostUsefulFeature,
    fuelExpenseHelpful: feedbackData.fuelExpenseHelpful,
    maintenanceRemindersHelpful: feedbackData.maintenanceRemindersHelpful,
    documentManagementHelpful: feedbackData.documentManagementHelpful,
    multipleVehiclesInterest: feedbackData.multipleVehiclesInterest,
    additionalFeatureRequest: feedbackData.additionalFeatureRequest?.trim() || '',
    improvementSuggestions: feedbackData.improvementSuggestions?.trim() || '',
    appVersion: '1.2.0',
    devicePlatform: typeof navigator !== 'undefined' ? (navigator.userAgent.slice(0, 100)) : 'Unknown',
  });

  const docRef = await addDoc(collection(db, 'feedback'), cleanData);
  return docRef.id;
}
