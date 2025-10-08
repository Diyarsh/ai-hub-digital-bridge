import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'kk' | 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  kk: {
    // Navigation
    'nav.login': 'Кіру',
    
    // Hero Section
    'hero.subtitle': 'Цифрлық егемендік үшін орталықтандырылған AI платформасы',
    'hero.description': 'Жасанды интеллект мүмкіндіктеріне бірыңғай қол жеткізу нүктесі. Идеядан технологиялық егемендікпен өнеркәсіптік енгізуге дейін.',
    'hero.cta': 'AI-HUB',
    'hero.learn-more': 'Толығырақ білу',
    
    // Services Section
    'services.title': 'Өзара әрекеттесу модельдері',
    'services.subtitle': 'Платформамен жұмыс істеудің қолайлы тәсілін таңдаңыз',
    'services.self-service.title': 'Self-Service',
    'services.self-service.description': 'AI құралдары мен платформасымен өз бетінше жұмыс',
    'services.self-service.feature1': 'GPU кластеріне қол жеткізу',
    'services.self-service.feature2': 'Модельдер кітапханасы',
    'services.self-service.feature3': 'Автономды әзірлеу',
    'services.ai-service.title': 'AI-as-a-Service',
    'services.ai-service.description': 'Сарапшы қолдауымен идеядан енгізуге дейін толық қолдау',
    'services.ai-service.feature1': 'Сарапшылардың кеңестері',
    'services.ai-service.feature2': 'Теңшелген әзірлеу',
    'services.ai-service.feature3': 'Техникалық қолдау',
    
    // Advantages Section
    'advantages.title': 'Негізгі артықшылықтар',
    'advantages.subtitle': 'Толық бақылау мен қауіпсіздікпен заманауи AI технологиялары',
    'advantages.sovereignty.title': 'Цифрлық егемендік',
    'advantages.sovereignty.description': 'Технологиялық тәуелсіздік және AI шешімдерін бақылау',
    'advantages.scalability.title': 'Масштабталу',
    'advantages.scalability.description': 'Прототиптен шектеусіз өнеркәсіптік енгізуге дейін',
    'advantages.security.title': 'Қауіпсіздік',
    'advantages.security.description': 'Деректерді жоғары деңгейде қорғаумен ұлттық IT контуры',
    
    // Platform Section
    'platform.title': 'AI-HUB платформасы туралы',
    'platform.subtitle': 'Деректер мен процестерді толық бақылаумен жасанды интеллект шешімдерін әзірлеу, үйрету және орналастыруға арналған заманауи бұлтты платформа',
    'platform.compute.title': 'Қуатты есептеулер',
    'platform.compute.description': 'AI модельдерін оқыту және инференс үшін жоғары өнімді GPU және CPU',
    'platform.data.title': 'Қауіпсіз деректер',
    'platform.data.description': 'Қауіпсіздік талаптарына сәйкес деректерді қорғалған сақтау және өңдеу',
    'platform.infrastructure.title': 'Сенімді инфрақұрылым',
    'platform.infrastructure.description': 'Қызметтердің жоғары қол жетімділік деңгейімен ақауларға төзімді архитектура',
    
    // Footer
    'footer.description': 'Құралдар мен қызметтердің толық жинағымен AI шешімдерін әзірлеу және орналастыруға арналған платформа.',
    'footer.products': 'Өнімдер',
    'footer.products.studio': 'AI Studio',
    'footer.products.projects': 'Жобалар',
    'footer.products.history': 'Тарих',
    'footer.products.lab': 'Зертхана',
    'footer.company': 'Компания',
    'footer.company.about': 'Біз туралы',
    'footer.company.contact': 'Байланыстар',
    'footer.company.docs': 'Құжаттама',
    'footer.company.support': 'Қолдау',
    'footer.copyright': '© 2024 QazCloud AI-HUB. Барлық құқықтар қорғалған.',
    
    // Header
    'language.kk': 'Қазақша',
    'language.ru': 'Орысша',  
    'language.en': 'Ағылшынша',
    
    // Sidebar
    'sidebar.chat': 'Сөйлесу',
    'sidebar.ai-studio': 'AI-Студия',
    'sidebar.projects': 'Менің жобаларым',
    'sidebar.history': 'Тарих',
    'sidebar.recent-prompts': 'Соңғы сұраулар',
    'sidebar.lab': 'Зертхана',
    'sidebar.developer': 'Әзірлеуші режимі',
    
    // Dashboard
    'dashboard.title': 'AI-HUB',
    'dashboard.input.placeholder': 'Дауыстық хабарламаны жазу...',
    'dashboard.documents.title': 'Құжаттарды өңдеу',
    'dashboard.documents.desc': 'Талдау және деректерді алу',
    'dashboard.bots.title': 'Боттар',
    'dashboard.bots.desc': 'Автоматтандыру және чат-боттар',
    'dashboard.developers.title': 'Әзірлеушілерден',
    'dashboard.developers.desc': 'Дайын шешімдер және модельдер',
    
    // AI Studio
    'ai-studio.title': 'AI-Студия',
    'ai-studio.subtitle': 'AI шешімдерінің кітапханасы',
    'ai-studio.search': 'Модельдер мен шешімдерді іздеу...',
    'ai-studio.filters': 'Сүзгілер',
    'ai-studio.all': 'Барлығы',
    'ai-studio.language': 'Тілдік модельдер',
    'ai-studio.assistant': 'Корпоративтік көмекші',
    'ai-studio.documents': 'Құжаттар',
    'ai-studio.code': 'Код',
    'ai-studio.industrial': 'Өнеркәсіптік',
    'ai-studio.agents': 'Агенттер',
    'ai-studio.developers': 'Әзірлеушілерден',
    'ai-studio.use': 'Пайдалану',
    
    // Projects
    'projects.title': 'Жобалар',
    'projects.create': 'Жоба құру',
    'projects.my': 'Менің жобаларым',
    'projects.shared': 'Менімен бөлісілген',
    'projects.search': 'Іздеу',
    
    // History
    'history.title': 'Тарих',
    'history.search': 'Іздеу',
    'history.name': 'Атауы',
    'history.type': 'Түрі',
    'history.model': 'Модель',
    'history.updated': 'Жаңартылған',
    'history.chat-prompt': 'Чат сұрауы',
    'history.veo-prompt': 'Veo сұрауы',
    'history.hours-ago': 'сағат бұрын',
    'history.week-ago': 'апта бұрын',
    'history.weeks-ago': 'апта бұрын',
    'history.days-ago': 'күн бұрын',
    'history.open-new-tab': 'Жаңа қойындыда ашу',
    'history.rename': 'Атауын өзгерту',
    'history.delete': 'Жою',
    
    // Auth
    'auth.title': 'AI-HUB',
    'auth.subtitle': 'Кіріңіз немесе тіркеліңіз',
    'auth.requiredFields': '* Міндетті өрістер',
    'auth.loginTab': 'Кіру',
    'auth.registerTab': 'Тіркелу',
    'auth.username': 'Пайдаланушы аты',
    'auth.password': 'Құпия сөз',
    'auth.confirmPassword': 'Құпия сөзді растаңыз',
    'auth.email': 'Email',
    'auth.firstName': 'Аты',
    'auth.lastName': 'Тегі',
    'auth.loginButton': 'Кіру',
    'auth.registerButton': 'Тіркелу',
    'auth.forgotPassword': 'Құпия сөзді ұмыттыңыз ба?',
    'auth.backToLogin': '« Кіруге оралу',
    'auth.loginPlaceholder': 'admin'
  },
  ru: {
    // Navigation
    'nav.login': 'Войти',
    
    // Hero Section
    'hero.subtitle': 'Централизованная платформа ИИ для цифрового суверенитета',
    'hero.description': 'Единая точка доступа к возможностям искусственного интеллекта. От идеи до промышленного внедрения с технологическим суверенитетом.',
    'hero.cta': 'AI-HUB',
    'hero.learn-more': 'Узнать больше',
    
    // Services Section
    'services.title': 'Модели взаимодействия',
    'services.subtitle': 'Выберите подходящий способ работы с платформой',
    'services.self-service.title': 'Self-Service',
    'services.self-service.description': 'Самостоятельная работа с платформой и инструментами ИИ',
    'services.self-service.feature1': 'Доступ к GPU кластеру',
    'services.self-service.feature2': 'Библиотека моделей',
    'services.self-service.feature3': 'Автономная разработка',
    'services.ai-service.title': 'AI-as-a-Service',
    'services.ai-service.description': 'Полное сопровождение от идеи до внедрения с экспертной поддержкой',
    'services.ai-service.feature1': 'Консультации экспертов',
    'services.ai-service.feature2': 'Кастомная разработка',
    'services.ai-service.feature3': 'Техническая поддержка',
    
    // Advantages Section
    'advantages.title': 'Ключевые преимущества',
    'advantages.subtitle': 'Современные технологии ИИ с полным контролем и безопасностью',
    'advantages.sovereignty.title': 'Цифровой суверенитет',
    'advantages.sovereignty.description': 'Технологическая независимость и контроль над ИИ-решениями',
    'advantages.scalability.title': 'Масштабируемость',
    'advantages.scalability.description': 'От прототипа до промышленного внедрения без ограничений',
    'advantages.security.title': 'Безопасность',
    'advantages.security.description': 'Национальный ИТ-контур с высоким уровнем защиты данных',
    
    // Platform Section
    'platform.title': 'О платформе AI-HUB',
    'platform.subtitle': 'Современная облачная платформа для разработки, обучения и развертывания решений искусственного интеллекта с полным контролем над данными и процессами',
    'platform.compute.title': 'Мощные вычисления',
    'platform.compute.description': 'Высокопроизводительные GPU и CPU для обучения и инференса AI-моделей',
    'platform.data.title': 'Безопасные данные',
    'platform.data.description': 'Защищенное хранение и обработка данных в соответствии с требованиями безопасности',
    'platform.infrastructure.title': 'Надежная инфраструктура',
    'platform.infrastructure.description': 'Отказоустойчивая архитектура с высоким уровнем доступности сервисов',
    
    // Footer
    'footer.description': 'Платформа для разработки и развертывания AI-решений с полным набором инструментов и сервисов.',
    'footer.products': 'Продукты',
    'footer.products.studio': 'AI Studio',
    'footer.products.projects': 'Проекты',
    'footer.products.history': 'История',
    'footer.products.lab': 'Лаборатория',
    'footer.company': 'Компания',
    'footer.company.about': 'О нас',
    'footer.company.contact': 'Контакты',
    'footer.company.docs': 'Документация',
    'footer.company.support': 'Поддержка',
    'footer.copyright': '© 2024 QazCloud AI-HUB. Все права защищены.',
    
    // Header
    'language.kk': 'Казахский',
    'language.ru': 'Русский',
    'language.en': 'Английский',
    
    // Sidebar
    'sidebar.chat': 'Чат',
    'sidebar.ai-studio': 'AI-Студия',
    'sidebar.projects': 'Мои проекты',
    'sidebar.history': 'История',
    'sidebar.recent-prompts': 'Недавние запросы',
    'sidebar.lab': 'Лаборатория',
    'sidebar.developer': 'Режим разработчика',
    
    // Dashboard
    'dashboard.title': 'AI-HUB',
    'dashboard.input.placeholder': 'Записать голосовое сообщение...',
    'dashboard.documents.title': 'Обработка документов',
    'dashboard.documents.desc': 'Анализ и извлечение данных',
    'dashboard.bots.title': 'Боты',
    'dashboard.bots.desc': 'Автоматизация и чат-боты',
    'dashboard.developers.title': 'От Разработчиков',
    'dashboard.developers.desc': 'Готовые решения и модели',
    
    // AI Studio
    'ai-studio.title': 'AI-Студия',
    'ai-studio.subtitle': 'Библиотека AI-решений',
    'ai-studio.search': 'Поиск моделей и решений...',
    'ai-studio.filters': 'Фильтры',
    'ai-studio.all': 'Все',
    'ai-studio.language': 'Языковые модели',
    'ai-studio.assistant': 'Корпоративный ассистент',
    'ai-studio.documents': 'Документы',
    'ai-studio.code': 'Код',
    'ai-studio.industrial': 'Промышленные',
    'ai-studio.agents': 'Агенты',
    'ai-studio.developers': 'От Разработчиков',
    'ai-studio.use': 'Использовать',
    
    // Projects
    'projects.title': 'Проекты',
    'projects.create': 'Создать проект',
    'projects.my': 'Мои проекты',
    'projects.shared': 'Поделились со мной',
    'projects.search': 'Поиск',
    
    // History
    'history.title': 'История',
    'history.search': 'Поиск',
    'history.name': 'Название',
    'history.type': 'Тип',
    'history.model': 'Модель',
    'history.updated': 'Обновлено',
    'history.chat-prompt': 'Chat prompt',
    'history.veo-prompt': 'Veo prompt',
    'history.hours-ago': 'часов назад',
    'history.week-ago': 'неделю назад',
    'history.weeks-ago': 'недель назад',
    'history.days-ago': 'дней назад',
    'history.open-new-tab': 'Открыть в новой вкладке',
    'history.rename': 'Переименовать',
    'history.delete': 'Удалить',
    
    // Auth
    'auth.title': 'AI-HUB',
    'auth.subtitle': 'Войдите или зарегистрируйтесь',
    'auth.requiredFields': '* Обязательные поля',
    'auth.loginTab': 'Вход',
    'auth.registerTab': 'Регистрация',
    'auth.username': 'Имя пользователя',
    'auth.password': 'Пароль',
    'auth.confirmPassword': 'Подтвердите пароль',
    'auth.email': 'Email',
    'auth.firstName': 'Имя',
    'auth.lastName': 'Фамилия',
    'auth.loginButton': 'Войти',
    'auth.registerButton': 'Зарегистрироваться',
    'auth.forgotPassword': 'Забыли пароль?',
    'auth.backToLogin': '« Назад к входу',
    'auth.loginPlaceholder': 'admin'
  },
  en: {
    // Navigation
    'nav.login': 'Login',
    
    // Hero Section
    'hero.subtitle': 'Centralized AI platform for digital sovereignty',
    'hero.description': 'Single point of access to artificial intelligence capabilities. From idea to industrial implementation with technological sovereignty.',
    'hero.cta': 'AI-HUB',
    'hero.learn-more': 'Learn More',
    
    // Services Section
    'services.title': 'Interaction Models',
    'services.subtitle': 'Choose the right way to work with the platform',
    'services.self-service.title': 'Self-Service',
    'services.self-service.description': 'Independent work with platform and AI tools',
    'services.self-service.feature1': 'GPU cluster access',
    'services.self-service.feature2': 'Model library',
    'services.self-service.feature3': 'Autonomous development',
    'services.ai-service.title': 'AI-as-a-Service',
    'services.ai-service.description': 'Full support from idea to implementation with expert assistance',
    'services.ai-service.feature1': 'Expert consultations',
    'services.ai-service.feature2': 'Custom development',
    'services.ai-service.feature3': 'Technical support',
    
    // Advantages Section
    'advantages.title': 'Key Advantages',
    'advantages.subtitle': 'Modern AI technologies with full control and security',
    'advantages.sovereignty.title': 'Digital Sovereignty',
    'advantages.sovereignty.description': 'Technological independence and control over AI solutions',
    'advantages.scalability.title': 'Scalability',
    'advantages.scalability.description': 'From prototype to industrial deployment without limitations',
    'advantages.security.title': 'Security',
    'advantages.security.description': 'National IT perimeter with high-level data protection',
    
    // Platform Section
    'platform.title': 'About AI-HUB Platform',
    'platform.subtitle': 'Modern cloud platform for developing, training and deploying artificial intelligence solutions with full control over data and processes',
    'platform.compute.title': 'Powerful Computing',
    'platform.compute.description': 'High-performance GPU and CPU for AI model training and inference',
    'platform.data.title': 'Secure Data',
    'platform.data.description': 'Protected storage and processing of data in accordance with security requirements',
    'platform.infrastructure.title': 'Reliable Infrastructure',
    'platform.infrastructure.description': 'Fault-tolerant architecture with high availability of services',
    
    // Footer
    'footer.description': 'Platform for developing and deploying AI solutions with a complete set of tools and services.',
    'footer.products': 'Products',
    'footer.products.studio': 'AI Studio',
    'footer.products.projects': 'Projects',
    'footer.products.history': 'History',
    'footer.products.lab': 'Laboratory',
    'footer.company': 'Company',
    'footer.company.about': 'About Us',
    'footer.company.contact': 'Contact',
    'footer.company.docs': 'Documentation',
    'footer.company.support': 'Support',
    'footer.copyright': '© 2024 QazCloud AI-HUB. All rights reserved.',
    
    // Header
    'language.kk': 'Kazakh',
    'language.ru': 'Russian',
    'language.en': 'English',
    
    // Sidebar
    // Sidebar
    'sidebar.chat': 'Chat',
    'sidebar.ai-studio': 'AI Studio',
    'sidebar.projects': 'My Projects',
    'sidebar.history': 'History',
    'sidebar.recent-prompts': 'Recent Prompts',
    'sidebar.lab': 'Laboratory',
    'sidebar.developer': 'Developer Mode',
    
    // Dashboard
    'dashboard.title': 'AI-HUB',
    'dashboard.input.placeholder': 'Record a voice message...',
    'dashboard.documents.title': 'Document Processing',
    'dashboard.documents.desc': 'Analysis and data extraction',
    'dashboard.bots.title': 'Bots',
    'dashboard.bots.desc': 'Automation and chatbots',
    'dashboard.developers.title': 'From Developers',
    'dashboard.developers.desc': 'Ready solutions and models',
    
    // AI Studio
    'ai-studio.title': 'AI Studio',
    'ai-studio.subtitle': 'AI Solutions Library',
    'ai-studio.search': 'Search models and solutions...',
    'ai-studio.filters': 'Filters',
    'ai-studio.all': 'All',
    'ai-studio.language': 'Language Models',
    'ai-studio.assistant': 'Corporate Assistant',
    'ai-studio.documents': 'Documents',
    'ai-studio.code': 'Code',
    'ai-studio.industrial': 'Industrial',
    'ai-studio.agents': 'Agents',
    'ai-studio.developers': 'From Developers',
    'ai-studio.use': 'Use',
    
    // Projects
    'projects.title': 'Projects',
    'projects.create': 'Create project',
    'projects.my': 'My Projects',
    'projects.shared': 'Shared with me',
    'projects.search': 'Search',
    
    // History
    'history.title': 'History',
    'history.search': 'Search',
    'history.name': 'Name',
    'history.type': 'Type',
    'history.model': 'Model',
    'history.updated': 'Updated',
    'history.chat-prompt': 'Chat prompt',
    'history.veo-prompt': 'Veo prompt',
    'history.hours-ago': 'hours ago',
    'history.week-ago': 'week ago',
    'history.weeks-ago': 'weeks ago',
    'history.days-ago': 'days ago',
    'history.open-new-tab': 'Open in new tab',
    'history.rename': 'Rename',
    'history.delete': 'Delete',
    
    // Auth
    'auth.title': 'AI-HUB',
    'auth.subtitle': 'Login or register',
    'auth.requiredFields': '* Required fields',
    'auth.loginTab': 'Login',
    'auth.registerTab': 'Register',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.email': 'Email',
    'auth.firstName': 'First name',
    'auth.lastName': 'Last name',
    'auth.loginButton': 'Login',
    'auth.registerButton': 'Register',
    'auth.forgotPassword': 'Forgot password?',
    'auth.backToLogin': '« Back to Login',
    'auth.loginPlaceholder': 'admin'
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}