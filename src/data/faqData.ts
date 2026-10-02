export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'who-is-autocare-for',
    category: 'General',
    question: 'Who is AutoCare for?',
    answer: 'AutoCare is designed for vehicle owners who want to manage their vehicle information in one place.'
  },
  {
    id: 'what-can-i-track',
    category: 'General',
    question: 'What can I track in AutoCare?',
    answer: 'You can track fuel, mileage, maintenance, expenses, reminders, and documents.'
  },
  {
    id: 'manage-multiple-vehicles',
    category: 'Vehicles',
    question: 'Can I manage multiple vehicles?',
    answer: 'Yes, AutoCare is designed to support multiple vehicles under one account.'
  },
  {
    id: 'mechanical-diagnosis',
    category: 'Maintenance',
    question: 'Does AutoCare provide mechanical diagnosis?',
    answer: 'No. AutoCare helps organize and understand vehicle records but does not replace a professional mechanic.'
  },
  {
    id: 'ai-features',
    category: 'AI Assistant',
    question: 'Will AutoCare have AI features?',
    answer: 'AutoCare includes AI-powered features such as an AI assistant and vehicle insights.'
  }
];
