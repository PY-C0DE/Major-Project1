/**
 * AlphaQuant AI - Universal Multilingual Internationalization (i18n) Engine
 * Provides reactive language state, persistent storage, locale-aware formatting,
 * and comprehensive translations across 8 major international languages:
 * 1. English (en) - Default Global Financial Language
 * 2. Hindi (hi) - हिन्दी (Primary Indian Equities Language)
 * 3. Gujarati (gu) - ગુજરાતી (Dalal Street & Regional Equity Hub)
 * 4. Spanish (es) - Español
 * 5. French (fr) - Français
 * 6. German (de) - Deutsch
 * 7. Japanese (ja) - 日本語
 * 8. Chinese (zh) - 简体中文
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { getCurrencySymbol } from '../utils/currency';

export type LanguageCode = 'en' | 'hi' | 'gu' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', locale: 'gu-IN' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', locale: 'zh-CN' }
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 ML Core',
    'nav.dashboard': 'Dashboard',
    'nav.analysis': 'Stock Analysis',
    'nav.portfolio': 'Portfolio',
    'nav.watchlist': 'Watchlist',
    'nav.markets': 'Markets & Correlation',
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.innovations': 'Innovations',
    'nav.safety': 'Model Safety',
    'nav.tour': 'Tour',
    'nav.language': 'Language',
    'nav.select_language': 'Select Language',
    'nav.options': 'Options & Greeks',
    'nav.backtest': 'Backtest Strategy',
    'nav.broker': 'Broker Gateway',
    'nav.social': 'Social & Copy-Trade',
    'nav.optimizer': 'Portfolio Optimizer',
    'nav.accuracy': 'Model Accuracy',
    'nav.drift': 'Drift Monitor',
    'nav.account': 'Account & Settings',
    'nav.guide': 'Investor Guide',
    'nav.logout': 'Sign Out',
    'nav.login': 'Sign In',
    'nav.signup': 'Sign Up',
    'nav.search_placeholder': 'Search ticker or company...',
    'nav.demo_mode': 'Demo Mode',
    'nav.profile': 'My Profile',
    'nav.quant_tools': 'Quantitative Tools',
    'nav.quant_desc': 'Machine learning, options pricing, strategy simulation, and portfolio tools.',

    // Common Verbs & UI Controls
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.close': 'Close',
    'action.export': 'Export',
    'action.filter': 'Filter',
    'action.refresh': 'Refresh',
    'action.search': 'Search',
    'action.show_all': 'Show All',
    'action.hide_all': 'Hide All',
    'action.hide_option': 'Hide Option',
    'action.active': 'ACTIVE',
    'action.off': 'OFF',
    'action.learn_more': 'Learn More',
    'action.get_started': 'Get Started',
    'action.view_details': 'View Details',
    'action.try_demo': 'Try Demo',

    // Stock Detail Page - Header & Actions
    'stock.today': 'Today',
    'stock.quick_alert': 'Quick Alert',
    'stock.add_watchlist': 'Watchlist',
    'stock.add_portfolio': 'Add to Portfolio',
    'stock.export_factsheet': 'Export Factsheet',
    'stock.vol_surface': 'Vol Surface',
    'stock.options_terminal': 'Options Terminal',
    'stock.log_forecast': 'Log Forecast',
    'stock.forecast_logged': 'Forecast Logged!',
    'stock.switch_company': 'Switch company (e.g. Tata, Reliance, Apple)...',

    // Stock Detail Page - Valuation Tape (Always Visible)
    'stock.valuation_title': 'Valuation & 52-Week Trading Range Statistics',
    'stock.valuation_subtitle': 'Fundamental & Range Metrics',
    'stock.high_52w': '52-Week High',
    'stock.low_52w': '52-Week Low',
    'stock.day_range': 'Day Range',
    'stock.volume': 'Volume (Shares)',
    'stock.pe_ratio': 'P/E Ratio',
    'stock.market_cap': 'Market Cap',

    // Stock Detail Page - Optional Analytical Modules Bar
    'stock.additional_modules': 'Additional Analytical Modules (Optional Deep Dive)',
    'stock.modules_subtitle': 'Only the daily candle chart, statistics, and prediction are visible by default. Click any module below to inspect deeper quantitative factors.',
    'stock.visible_of': 'visible',

    // Analytical Modules Grid Buttons
    'stock.mod_regime_title': 'HMM Market Regime',
    'stock.mod_regime_sub': '2-State Latent Model',
    'stock.mod_decision_title': 'Decision Support & Signals',
    'stock.mod_decision_sub': 'Target, Stop Loss & Signals',
    'stock.mod_audit_title': 'Previous-Day Stats Audit',
    'stock.mod_audit_sub': 'Forecast Accuracy & Bounds',
    'stock.mod_events_title': 'Classified Events',
    'stock.mod_events_sub': 'Catalysts & Price Impact',
    'stock.mod_sentiment_title': 'News & FinBERT Sentiment',
    'stock.mod_sentiment_sub': 'NLP Sentiment Scoring',
    'stock.mod_drift_title': 'Concept Drift Monitor',
    'stock.mod_drift_sub': 'KS 2-Sample Non-Stationarity',
    'stock.mod_surface_title': '3D Vol Surface & Smile',
    'stock.mod_surface_sub': 'D3 Implied Volatility Surface',
    'stock.mod_seasonality_title': 'Seasonality Alpha',
    'stock.mod_seasonality_sub': 'Monthly Return Heatmap',

    // Revealed Modules Titles
    'stock.section_regime': 'HMM Market Regime Detection & Latent State Dynamics',
    'stock.section_decision': 'Algorithmic Decision Support & Position Signals',
    'stock.section_audit': 'Previous-Day Stats Audit & Forecast Accuracy Ledger',
    'stock.section_events': 'Classified Financial Events & Corporate Catalysts',
    'stock.section_sentiment_drift': 'News Sentiment & Concept Drift Monitoring',
    'stock.section_surface': 'D3 Implied Volatility Surface & Volatility Smile Engine',
    'stock.section_seasonality': 'Seasonality & Calendar Alpha Analysis',

    // Audit Card Details
    'audit.today_active_title': "Today's Active Session Audit",
    'audit.previous_completed_title': 'Previous Completed Session Audit',
    'audit.today_active_desc': "Real-time audit comparing today's live market price against the quantitative ensemble forecast generated from prior session data.",
    'audit.previous_completed_desc': "Audit how this session's actual closing price compared to the quantitative ensemble forecast and conformal bounds.",
    'audit.current_traded_price': 'Current / Traded Price',
    'audit.actual_close': 'Actual Close',
    'audit.session_forecast': 'Session Forecast',
    'audit.prediction_error': 'Prediction Error',
    'audit.hit_rate_5d': '5-Day Hit Rate',
    'audit.channel': 'Channel',
    'audit.range': 'Range',
    'audit.bound_hit': '90% Conformal Bound Hit',
    'audit.bound_miss': 'Boundary Miss',
    'audit.ledger_title': 'Trailing Sessions Accuracy Ledger (Actual Close vs Forecast)',
    'audit.ledger_sub': 'Ensemble v4.0 Calibrated',
    'audit.session_date': 'Session Date',
    'audit.model_forecast': 'Model Forecast',
    'audit.conformal_channel': 'Conformal Channel',
    'audit.abs_error': 'Abs Error',
    'audit.error_pct': 'Error %',
    'audit.status': 'Status',
    'audit.hit': 'HIT',
    'audit.miss': 'MISS',
    'audit.coverage_alignment': '100% Coverage Alignment',

    // Moving Averages & Chart
    'chart.moving_averages': 'Moving Averages',
    'chart.trend_analysis': 'Trend Analysis',
    'chart.sma50': 'SMA 50',
    'chart.sma200': 'SMA 200',
    'chart.sma20': 'SMA 20',
    'chart.bb': 'Bollinger Bands',
    'chart.golden_cross': 'Golden Cross / Bullish Trend',
    'chart.death_cross': 'Death Cross / Bearish Trend',
    'chart.consolidation': 'Consolidation / Macro Support',
    'chart.counter_trend': 'Counter-Trend Recovery',
    'chart.above': 'Above',
    'chart.below': 'Below',
    'chart.candle_chart': 'Daily Candlestick & Technical Overlays',

    // Conformal Prediction Card
    'conformal.title': 'Conformal Prediction Interval',
    'conformal.predicted_price': 'Predicted Price',
    'conformal.predicted_return': 'Predicted Return',
    'conformal.lower_bound': 'Lower Conformal Bound',
    'conformal.upper_bound': 'Upper Conformal Bound',
    'conformal.confidence': 'Nominal Confidence',
    'conformal.horizon': 'Forecast Horizon',
    'conformal.days': 'days',
    'conformal.target_date': 'Target Date',
    'conformal.methodology': 'Methodology',

    // Market Regime Card
    'regime.bullish_low_vol': 'Bullish / Low Volatility',
    'regime.bullish_high_vol': 'Bullish / High Volatility',
    'regime.bearish_low_vol': 'Bearish / Low Volatility',
    'regime.bearish_high_vol': 'Bearish / High Volatility',
    'regime.confidence': 'Confidence',
    'regime.latent_state': 'Latent Markov State',

    // Decision Signals
    'decision.strong_buy': 'STRONG BUY',
    'decision.buy': 'BUY',
    'decision.hold': 'HOLD',
    'decision.sell': 'SELL',
    'decision.strong_sell': 'STRONG SELL',
    'decision.target_price': 'Profit Target Price',
    'decision.stop_loss': 'Stop Loss Trigger',
    'decision.risk_reward': 'Risk-to-Reward Ratio',

    // Classified Events
    'events.title': 'Classified Catalysts & Structural Events',
    'events.fed_into': 'Fed into Conformal Feature Weights',
    'events.expected_impact': 'Expected Price Impact',
    'events.no_events': 'No recent high-impact corporate actions recorded for this asset.',

    // Footer & Disclaimer
    'footer.disclaimer': 'AlphaQuant AI is an educational and quantitative research platform. Conformal prediction intervals and algorithmic signals do not constitute individual financial advice.',
    'footer.rights': 'All rights reserved. Real-time market data sourced via public exchange feeds.'
  },

  hi: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 एमएल कोर',
    'nav.dashboard': 'डैशबोर्ड',
    'nav.analysis': 'स्टॉक विश्लेषण',
    'nav.portfolio': 'पोर्टफोलियो',
    'nav.watchlist': 'वॉचलिस्ट',
    'nav.markets': 'बाजार और सहसंबंध',
    'nav.home': 'होम',
    'nav.features': 'विशेषताएं',
    'nav.innovations': 'नवाचार',
    'nav.safety': 'मॉडल सुरक्षा',
    'nav.tour': 'टूर',
    'nav.language': 'भाषा',
    'nav.select_language': 'भाषा चुनें',
    'nav.options': 'ऑप्शंस और ग्रीक्स',
    'nav.backtest': 'बैकटेस्ट रणनीति',
    'nav.broker': 'ब्रोकर गेटवे',
    'nav.social': 'सोशल व कॉपी-ट्रेड',
    'nav.optimizer': 'पोर्टफोलियो ऑप्टिमाइज़र',
    'nav.accuracy': 'मॉडल सटीकता',
    'nav.drift': 'ड्रिफ्ट मॉनिटर',
    'nav.account': 'खाता और सेटिंग्स',
    'nav.guide': 'निवेशक गाइड',
    'nav.logout': 'लॉग आउट',
    'nav.login': 'साइन इन',
    'nav.signup': 'साइन अप',
    'nav.search_placeholder': 'टिकर या कंपनी खोजें...',
    'nav.demo_mode': 'डेमो मोड',
    'nav.profile': 'मेरी प्रोफाइल',
    'nav.quant_tools': 'मात्रात्मक टूल्स',
    'nav.quant_desc': 'मशीन लर्निंग, ऑप्शंस मूल्य निर्धारण, रणनीति अनुकरण एवं पोर्टफोलियो उपकरण।',

    // Common Verbs & UI Controls
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'action.delete': 'हटाएं',
    'action.edit': 'संपादित करें',
    'action.close': 'बंद करें',
    'action.export': 'निर्यात करें',
    'action.filter': 'फ़िल्टर',
    'action.refresh': 'ताज़ा करें',
    'action.search': 'खोजें',
    'action.show_all': 'सभी दिखाएं',
    'action.hide_all': 'सभी छिपाएं',
    'action.hide_option': 'विकल्प छिपाएं',
    'action.active': 'सक्रिय',
    'action.off': 'बंद',
    'action.learn_more': 'अधिक जानें',
    'action.get_started': 'आरंभ करें',
    'action.view_details': 'विवरण देखें',
    'action.try_demo': 'डेमो आज़माएं',

    // Stock Detail Page - Header & Actions
    'stock.today': 'आज',
    'stock.quick_alert': 'त्वरित अलर्ट',
    'stock.add_watchlist': 'वॉचलिस्ट',
    'stock.add_portfolio': 'पोर्टफोलियो में जोड़ें',
    'stock.export_factsheet': 'फैक्टशीट निर्यात',
    'stock.vol_surface': 'अस्थिरता सतह',
    'stock.options_terminal': 'ऑप्शंस टर्मिनल',
    'stock.log_forecast': 'पूर्वानुमान सहेजें',
    'stock.forecast_logged': 'पूर्वानुमान सहेजा गया!',
    'stock.switch_company': 'कंपनी बदलें (उदा. टाटा, रिलायंस, इंफोसिस)...',

    // Stock Detail Page - Valuation Tape
    'stock.valuation_title': 'मूल्यांकन और 52-सप्ताह ट्रेडिंग रेंज आंकड़े',
    'stock.valuation_subtitle': 'मौलिक और मूल्य सीमा मेट्रिक्स',
    'stock.high_52w': '52-सप्ताह का उच्चतम',
    'stock.low_52w': '52-सप्ताह का न्यूनतम',
    'stock.day_range': 'दिन की सीमा',
    'stock.volume': 'मात्रा (शेयर)',
    'stock.pe_ratio': 'पी/ई अनुपात',
    'stock.market_cap': 'बाज़ार पूंजीकरण',

    // Stock Detail Page - Modules Bar
    'stock.additional_modules': 'अतिरिक्त विश्लेषणात्मक मॉड्यूल (गहन विश्लेषण)',
    'stock.modules_subtitle': 'डिफ़ॉल्ट रूप से केवल दैनिक कैंडल चार्ट, आंकड़े और पूर्वानुमान दिखाई देते हैं। विस्तृत जानकारी के लिए नीचे क्लिक करें।',
    'stock.visible_of': 'दृश्यमान',

    // Grid Buttons
    'stock.mod_regime_title': 'एचएमएम बाज़ार व्यवस्था',
    'stock.mod_regime_sub': '2-अवस्था लेटेंट मॉडल',
    'stock.mod_decision_title': 'निर्णय समर्थन और संकेत',
    'stock.mod_decision_sub': 'टारगेट, स्टॉप लॉस व सिग्नल्स',
    'stock.mod_audit_title': 'पिछले दिन का सांख्यिकी ऑडिट',
    'stock.mod_audit_sub': 'पूर्वानुमान सटीकता व सीमाएं',
    'stock.mod_events_title': 'वर्गीकृत घटनाएँ',
    'stock.mod_events_sub': 'कॉर्पोरेट उत्प्रेरक व मूल्य प्रभाव',
    'stock.mod_sentiment_title': 'समाचार और भावनाएं',
    'stock.mod_sentiment_sub': 'FinBERT एनएलपी भावना स्कोरिंग',
    'stock.mod_drift_title': 'कॉन्सेप्ट ड्रिफ्ट मॉनिटर',
    'stock.mod_drift_sub': 'केएस 2-सैंपल नॉन-स्टेशनरिटी',
    'stock.mod_surface_title': '3D अस्थिरता सतह',
    'stock.mod_surface_sub': 'D3 निहित अस्थिरता स्माइल',
    'stock.mod_seasonality_title': 'मौसमी अल्फा विश्लेषण',
    'stock.mod_seasonality_sub': 'मासिक रिटर्न हीटमैप',

    // Revealed Modules Titles
    'stock.section_regime': 'एचएमएम बाज़ार व्यवस्था पहचान व लेटेंट स्टेट गतिशीलता',
    'stock.section_decision': 'एल्गोरिद्मिक निर्णय समर्थन और स्थिति संकेत',
    'stock.section_audit': 'पिछले दिन का सांख्यिकी ऑडिट और पूर्वानुमान बहीखाता',
    'stock.section_events': 'वर्गीकृत वित्तीय घटनाएँ और कॉर्पोरेट उत्प्रेरक',
    'stock.section_sentiment_drift': 'समाचार भावना और कॉन्सेप्ट ड्रिफ्ट मॉनिटरिंग',
    'stock.section_surface': 'D3 निहित अस्थिरता सतह और वोलेटिलिटी स्माइल इंजन',
    'stock.section_seasonality': 'मौसमी और कैलेंडर अल्फा विश्लेषण',

    // Audit Card Details
    'audit.today_active_title': 'आज के सक्रिय सत्र का ऑडिट',
    'audit.previous_completed_title': 'पिछले पूर्ण सत्र का ऑडिट',
    'audit.today_active_desc': 'आज के वास्तविक बाज़ार मूल्य की पिछले सत्र के डेटा से बने मॉडल पूर्वानुमान से तुलना।',
    'audit.previous_completed_desc': 'इस सत्र के वास्तविक बंद भाव की मॉडल पूर्वानुमान और कन्फॉर्मल सीमाओं से तुलना।',
    'audit.current_traded_price': 'वर्तमान / कारोबार मूल्य',
    'audit.actual_close': 'वास्तविक बंद भाव',
    'audit.session_forecast': 'सत्र पूर्वानुमान',
    'audit.prediction_error': 'पूर्वानुमान त्रुटि',
    'audit.hit_rate_5d': '5-दिवसीय सफलता दर',
    'audit.channel': 'कन्फॉर्मल चैनल',
    'audit.range': 'सीमा',
    'audit.bound_hit': '90% कन्फॉर्मल बाउंड हिट',
    'audit.bound_miss': 'सीमा से बाहर',
    'audit.ledger_title': 'पिछले सत्रों का सटीकता बहीखाता (वास्तविक बंद बनाम पूर्वानुमान)',
    'audit.ledger_sub': 'Ensemble v4.0 कैलिब्रेटेड',
    'audit.session_date': 'सत्र दिनांक',
    'audit.model_forecast': 'मॉडल पूर्वानुमान',
    'audit.conformal_channel': 'कन्फॉर्मल चैनल',
    'audit.abs_error': 'पूर्ण त्रुटि',
    'audit.error_pct': 'त्रुटि %',
    'audit.status': 'स्थिति',
    'audit.hit': 'हिट',
    'audit.miss': 'चूक',
    'audit.coverage_alignment': '100% कवरेज संरेखण',

    // Moving Averages & Chart
    'chart.moving_averages': 'मूविंग एवरेज (औसत)',
    'chart.trend_analysis': 'रुझान विश्लेषण',
    'chart.sma50': 'एसएमए 50',
    'chart.sma200': 'एसएमए 200',
    'chart.sma20': 'एसएमए 20',
    'chart.bollinger': 'बोलिंगर बैंड्स',
    'chart.golden_cross': 'गोल्डन क्रॉस / तेजी का रुख',
    'chart.death_cross': 'डेथ क्रॉस / मंदी का रुख',
    'chart.consolidation': 'कंसोलिडेशन / मैक्रो सपोर्ट',
    'chart.counter_trend': 'काउंटर-ट्रेंड रिकवरी',
    'chart.above': 'ऊपर',
    'chart.below': 'नीचे',
    'chart.candle_chart': 'दैनिक कैंडलस्टिक व तकनीकी ओवरले',

    // Conformal Prediction Card
    'conformal.title': 'कन्फॉर्मल प्रेडिक्शन इंटरवल',
    'conformal.predicted_price': 'अनुमानित मूल्य',
    'conformal.predicted_return': 'अनुमानित रिटर्न',
    'conformal.lower_bound': 'निचली कन्फॉर्मल सीमा',
    'conformal.upper_bound': 'ऊपरी कन्फॉर्मल सीमा',
    'conformal.confidence': 'सांख्यिकीय विश्वास',
    'conformal.horizon': 'पूर्वानुमान अवधि',
    'conformal.days': 'दिन',
    'conformal.target_date': 'लक्षित तिथि',
    'conformal.methodology': 'पद्धति',

    // Market Regime Card
    'regime.bullish_low_vol': 'तेजी / कम अस्थिरता',
    'regime.bullish_high_vol': 'तेजी / उच्च अस्थिरता',
    'regime.bearish_low_vol': 'मंदी / कम अस्थिरता',
    'regime.bearish_high_vol': 'मंदी / उच्च अस्थिरता',
    'regime.confidence': 'विश्वास स्तर',
    'regime.latent_state': 'लेटेंट मार्कोव अवस्था',

    // Decision Signals
    'decision.strong_buy': 'मजबूत खरीद',
    'decision.buy': 'खरीदें',
    'decision.hold': 'होल्ड रखें',
    'decision.sell': 'बेचें',
    'decision.strong_sell': 'मजबूत बिक्री',
    'decision.target_price': 'लाभ लक्ष्य मूल्य',
    'decision.stop_loss': 'स्टॉप लॉस स्तर',
    'decision.risk_reward': 'जोखिम-इनाम अनुपात',

    // Classified Events
    'events.title': 'वर्गीकृत उत्प्रेरक और कॉर्पोरेट घटनाएँ',
    'events.fed_into': 'मॉडल फीचर भार में शामिल',
    'events.expected_impact': 'अपेक्षित मूल्य प्रभाव',
    'events.no_events': 'इस शेयर के लिए कोई हालिया महत्वपूर्ण कॉर्पोरेट कार्रवाई दर्ज नहीं है।',

    // Footer & Disclaimer
    'footer.disclaimer': 'AlphaQuant AI एक मात्रात्मक शोध एवं शैक्षिक मंच है। कन्फॉर्मल पूर्वानुमान व्यक्तिगत निवेश सलाह नहीं हैं।',
    'footer.rights': 'सर्वाधिकार सुरक्षित। सार्वजनिक एक्सचेंज डेटा द्वारा संचालित।'
  },

  gu: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 ML કોર',
    'nav.dashboard': 'ડેશબોર્ડ',
    'nav.analysis': 'શેર વિશ્લેષણ',
    'nav.portfolio': 'પોર્ટફોલિયો',
    'nav.watchlist': 'વોચલિસ્ટ',
    'nav.markets': 'બજારો અને સહસંબંધ',
    'nav.home': 'હોમ',
    'nav.features': 'સુવિધાઓ',
    'nav.innovations': 'નવીનતાઓ',
    'nav.safety': 'મોડલ સુરક્ષા',
    'nav.tour': 'ટૂર',
    'nav.language': 'ભાષા',
    'nav.select_language': 'ભાષા પસંદ કરો',
    'nav.options': 'ઓપ્શન્સ અને ગ્રીક્સ',
    'nav.backtest': 'બેકટેસ્ટ વ્યૂહરચના',
    'nav.broker': 'બ્રોકર ગેટવે',
    'nav.social': 'સોશિયલ અને કોપી-ટ્રેડ',
    'nav.optimizer': 'પોર્ટફોલિયો ઓપ્ટિમાઇઝર',
    'nav.accuracy': 'મોડલ ચોકસાઈ',
    'nav.drift': 'ડ્રિફ્ટ મોનિટર',
    'nav.account': 'ખાતું અને સેટિંગ્સ',
    'nav.guide': 'રોકાણકાર માર્ગદર્શિકા',
    'nav.logout': 'સાઇન આઉટ',
    'nav.login': 'સાઇન ઇન',
    'nav.signup': 'સાઇન અપ',
    'nav.search_placeholder': 'શેર અથવા કંપની શોધો...',
    'nav.demo_mode': 'ડેમો મોડ',
    'nav.profile': 'મારી પ્રોફાઇલ',
    'nav.quant_tools': 'ક્વોન્ટિટેટિવ ટૂલ્સ',
    'nav.quant_desc': 'મશીન લર્નિંગ, ઓપ્શન્સ કિંમત નિર્ધારણ અને પોર્ટફોલિયો ટૂલ્સ.',

    // Common Verbs & UI Controls
    'action.save': 'સાચવો',
    'action.cancel': 'રદ કરો',
    'action.delete': 'કાઢી નાખો',
    'action.edit': 'સંપાદિત કરો',
    'action.close': 'બંધ કરો',
    'action.export': 'નિકાસ કરો',
    'action.filter': 'ફિલ્ટર',
    'action.refresh': 'તાજું કરો',
    'action.search': 'શોધો',
    'action.show_all': 'બધું બતાવો',
    'action.hide_all': 'બધું છુપાવો',
    'action.hide_option': 'વિકલ્પ છુપાવો',
    'action.active': 'સક્રિય',
    'action.off': 'બંધ',
    'action.learn_more': 'વધુ જાણો',
    'action.get_started': 'શરૂ કરો',
    'action.view_details': 'વિગતો જુઓ',
    'action.try_demo': 'ડેમો અજમાવો',

    // Stock Detail Page - Header & Actions
    'stock.today': 'આજે',
    'stock.quick_alert': 'ઝડપી ચેતવણી',
    'stock.add_watchlist': 'વોચલિસ્ટ',
    'stock.add_portfolio': 'પોર્ટફોલિયોમાં ઉમેરો',
    'stock.export_factsheet': 'ફેક્ટશીટ નિકાસ',
    'stock.vol_surface': 'વોલેટિલિટી સરફેસ',
    'stock.options_terminal': 'ઓપ્શન્સ ટર્મિનલ',
    'stock.log_forecast': 'અનુમાન નોંધો',
    'stock.forecast_logged': 'અનુમાન નોંધાયું!',
    'stock.switch_company': 'કંપની બદલો (દા.ત. ટાટા, રિલાયન્સ, ઇન્ફોસિસ)...',

    // Stock Detail Page - Valuation Tape
    'stock.valuation_title': 'વેલ્યુએશન અને 52-અઠવાડિયાની ટ્રેડિંગ રેન્જ આંકડા',
    'stock.valuation_subtitle': 'મૂળભૂત અને ભાવ રેન્જ મેટ્રિક્સ',
    'stock.high_52w': '52-અઠવાડિયાની ટોચ',
    'stock.low_52w': '52-અઠવાડિયાનું તળિયું',
    'stock.day_range': 'દિવસની રેન્જ',
    'stock.volume': 'વોલ્યુમ (શેર)',
    'stock.pe_ratio': 'પી/ઈ રેશિયો',
    'stock.market_cap': 'માર્કેટ કેપ',

    // Modules Bar
    'stock.additional_modules': 'વધારાના વિશ્લેષણાત્મક મોડ્યુલ્સ (ઊંડાણપૂર્વક વિશ્લેષણ)',
    'stock.modules_subtitle': 'મૂળભૂત રીતે ફક્ત કેન્ડલ ચાર્ટ, આંકડા અને અનુમાન દૃશ્યમાન છે. વિગતો માટે નીચે ક્લિક કરો.',
    'stock.visible_of': 'દૃશ્યમાન',

    // Grid Buttons
    'stock.mod_regime_title': 'એચએમએમ માર્કેટ રેજીમ',
    'stock.mod_regime_sub': '2-સ્ટેટ લેટેન્ટ મોડલ',
    'stock.mod_decision_title': 'નિર્ણય સપોર્ટ અને સિગ્નલ્સ',
    'stock.mod_decision_sub': 'ટાર્ગેટ, સ્ટોપ લોસ અને સિગ્નલ',
    'stock.mod_audit_title': 'ગત દિવસનું ઓડિટ',
    'stock.mod_audit_sub': 'ચોકસાઈ અને બાઉન્ડ્રી ઓડિટ',
    'stock.mod_events_title': 'વર્ગીકૃત ઘટનાઓ',
    'stock.mod_events_sub': 'ઈવેન્ટ્સ અને ભાવ અસર',
    'stock.mod_sentiment_title': 'સમાચાર અને સેન્ટિમેન્ટ',
    'stock.mod_sentiment_sub': 'FinBERT એનએલપી સેન્ટિમેન્ટ',
    'stock.mod_drift_title': 'કન્સેપ્ટ ડ્રિફ્ટ મોનિટર',
    'stock.mod_drift_sub': 'KS 2-સેમ્પલ ટેસ્ટ',
    'stock.mod_surface_title': '3D વોલેટિલિટી સરફેસ',
    'stock.mod_surface_sub': 'ઈમ્પ્લાઇડ વોલેટિલિટી સ્માઇલ',
    'stock.mod_seasonality_title': 'મોસમી આલ્ફા',
    'stock.mod_seasonality_sub': 'માસિક રિટર્ન હીટમેપ',

    // Revealed Modules Titles
    'stock.section_regime': 'એચએમએમ માર્કેટ રેજીમ ડિટેક્શન',
    'stock.section_decision': 'એલ્ગોરિધમિક નિર્ણય સપોર્ટ અને સિગ્નલ',
    'stock.section_audit': 'ગત સત્ર ઓડિટ અને ચોકસાઈ ખાતાવહી',
    'stock.section_events': 'વર્ગીકૃત નાણાકીય ઘટનાઓ',
    'stock.section_sentiment_drift': 'સમાચાર સેન્ટિમેન્ટ અને કન્સેપ્ટ ડ્રિફ્ટ',
    'stock.section_surface': 'D3 વોલેટિલિટી સરફેસ એન્જિન',
    'stock.section_seasonality': 'મોસમી અને કેલેન્ડર આલ્ફા વિશ્લેષણ',

    // Audit Card Details
    'audit.today_active_title': 'આજના સક્રિય સત્રનું ઓડિટ',
    'audit.previous_completed_title': 'ગત પૂર્ણ થયેલ સત્રનું ઓડિટ',
    'audit.today_active_desc': 'આજના જીવંત બજાર ભાવની અગાઉના સત્રના મોડલ અનુમાન સાથે સરખામણી.',
    'audit.previous_completed_desc': 'આ સત્રના વાસ્તવિક બંધ ભાવની મોડલ અનુમાન સાથે સરખામણી.',
    'audit.current_traded_price': 'વર્તમાન ટ્રેડેડ ભાવ',
    'audit.actual_close': 'વાસ્તવિક બંધ ભાવ',
    'audit.session_forecast': 'સત્ર અનુમાન',
    'audit.prediction_error': 'અનુમાન ભૂલ',
    'audit.hit_rate_5d': '5-દિવસીય સચોટતા',
    'audit.channel': 'ચેનલ',
    'audit.range': 'રેન્જ',
    'audit.bound_hit': '90% કોન્ફોર્મલ બાઉન્ડ હિટ',
    'audit.bound_miss': 'બાઉન્ડ્રી ચૂકી ગયા',
    'audit.ledger_title': 'ચોકસાઈ ખાતાવહી (વાસ્તવિક બંધ વિરુદ્ધ અનુમાન)',
    'audit.ledger_sub': 'Ensemble v4.0 કેલિબ્રેટેડ',
    'audit.session_date': 'સત્ર તારીખ',
    'audit.model_forecast': 'મોડલ અનુમાન',
    'audit.conformal_channel': 'ચેનલ રેન્જ',
    'audit.abs_error': 'ચોખ્ખી ભૂલ',
    'audit.error_pct': 'ભૂલ %',
    'audit.status': 'સ્થિતિ',
    'audit.hit': 'હિટ',
    'audit.miss': 'મિસ',
    'audit.coverage_alignment': '100% કવરેજ એલાઈનમેન્ટ',

    // Moving Averages & Chart
    'chart.moving_averages': 'મુવિંગ એવરેજ',
    'chart.trend_analysis': 'ટ્રેન્ડ વિશ્લેષણ',
    'chart.sma50': 'એસએમએ 50',
    'chart.sma200': 'એસએમએ 200',
    'chart.sma20': 'એસએમએ 20',
    'chart.bollinger': 'બોલિંગર બેન્ડ્સ',
    'chart.golden_cross': 'ગોલ્ડન ક્રોસ / તેજીનું વલણ',
    'chart.death_cross': 'ડેથ ક્રોસ / મંદીનું વલણ',
    'chart.consolidation': 'કન્સોલિડેશન / મેક્રો સપોર્ટ',
    'chart.counter_trend': 'કાઉન્ટર-ટ્રેન્ડ રિકવરી',
    'chart.above': 'ઉપર',
    'chart.below': 'નીચે',
    'chart.candle_chart': 'દૈનિક કેન્ડલસ્ટિક અને ટેકનિકલ ઓવરલે',

    // Conformal Prediction Card
    'conformal.title': 'કોન્ફોર્મલ અનુમાન રેન્જ',
    'conformal.predicted_price': 'અનુમાનિત ભાવ',
    'conformal.predicted_return': 'અનુમાનિત વળતર',
    'conformal.lower_bound': 'નીચલી મર્યાદા',
    'conformal.upper_bound': 'ઉપલી મર્યાદા',
    'conformal.confidence': 'વિશ્વાસ સ્તર',
    'conformal.horizon': 'સમયગાળો',
    'conformal.days': 'દિવસ',
    'conformal.target_date': 'લક્ષ્ય તારીખ',
    'conformal.methodology': 'પદ્ધતિ',

    // Market Regime Card
    'regime.bullish_low_vol': 'તેજી / ઓછી વોલેટિલિટી',
    'regime.bullish_high_vol': 'તેજી / ઊંચી વોલેટિલિટી',
    'regime.bearish_low_vol': 'મંદી / ઓછી વોલેટિલિટી',
    'regime.bearish_high_vol': 'મંદી / ઊંચી વોલેટિલિટી',
    'regime.confidence': 'વિશ્વાસ સ્તર',
    'regime.latent_state': 'લેટેન્ટ માર્કોવ સ્ટેટ',

    // Decision Signals
    'decision.strong_buy': 'મજબૂત ખરીદી',
    'decision.buy': 'ખરીદો',
    'decision.hold': 'હોલ્ડ',
    'decision.sell': 'વેચો',
    'decision.strong_sell': 'મજબૂત વેચાણ',
    'decision.target_price': 'નફા લક્ષ્ય ભાવ',
    'decision.stop_loss': 'સ્ટોપ લોસ',
    'decision.risk_reward': 'રિસ્ક-ટુ-રિવોર્ડ ગુણોત્તર',

    // Classified Events
    'events.title': 'વર્ગીકૃત ઘટનાઓ અને ઉત્પ્રેરકો',
    'events.fed_into': 'મોડલમાં સમાવિષ્ટ',
    'events.expected_impact': 'અપેક્ષિત ભાવ અસર',
    'events.no_events': 'આ શેર માટે કોઈ તાજેતરની કોર્પોરેટ ઘટના નોંધાયેલી નથી.',

    // Footer & Disclaimer
    'footer.disclaimer': 'AlphaQuant AI એક ક્વોન્ટિટેટિવ સંશોધન પ્લેટફોર્મ છે. આ રોકાણ સલાહ નથી.',
    'footer.rights': 'સર્વાધિકાર સુરક્ષિત.'
  },

  es: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'Núcleo ML v2.1',
    'nav.dashboard': 'Panel de Control',
    'nav.analysis': 'Análisis de Acciones',
    'nav.portfolio': 'Portafolio',
    'nav.watchlist': 'Lista de Seguimiento',
    'nav.markets': 'Mercados y Correlación',
    'nav.home': 'Inicio',
    'nav.features': 'Características',
    'nav.innovations': 'Innovaciones',
    'nav.safety': 'Seguridad del Modelo',
    'nav.tour': 'Guía Interactiva',
    'nav.language': 'Idioma',
    'nav.select_language': 'Seleccionar Idioma',
    'nav.options': 'Opciones y Griegas',
    'nav.backtest': 'Estrategia de Backtest',
    'nav.broker': 'Enrutador de Bróker',
    'nav.social': 'Trading Social y Copia',
    'nav.optimizer': 'Optimizador de Portafolio',
    'nav.accuracy': 'Precisión del Modelo',
    'nav.drift': 'Monitor de Deriva',
    'nav.account': 'Cuenta y Ajustes',
    'nav.guide': 'Guía del Inversor',
    'nav.logout': 'Cerrar Sesión',
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Registrarse',
    'nav.search_placeholder': 'Buscar símbolo o empresa...',
    'nav.demo_mode': 'Modo Demo',
    'nav.profile': 'Mi Perfil',
    'nav.quant_tools': 'Herramientas Cuantitativas',
    'nav.quant_desc': 'Machine learning, valoración de opciones, simulación algorítmica y gestión de carteras.',

    // Common Verbs & UI Controls
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'action.delete': 'Eliminar',
    'action.edit': 'Editar',
    'action.close': 'Cerrar',
    'action.export': 'Exportar',
    'action.filter': 'Filtrar',
    'action.refresh': 'Actualizar',
    'action.search': 'Buscar',
    'action.show_all': 'Mostrar Todo',
    'action.hide_all': 'Ocultar Todo',
    'action.hide_option': 'Ocultar Opción',
    'action.active': 'ACTIVO',
    'action.off': 'DESACTIVADO',
    'action.learn_more': 'Más Información',
    'action.get_started': 'Comenzar',
    'action.view_details': 'Ver Detalles',
    'action.try_demo': 'Probar Demo',

    // Stock Detail Page - Header & Actions
    'stock.today': 'Hoy',
    'stock.quick_alert': 'Alerta Rápida',
    'stock.add_watchlist': 'Seguimiento',
    'stock.add_portfolio': 'Añadir al Portafolio',
    'stock.export_factsheet': 'Exportar Ficha',
    'stock.vol_surface': 'Superficie Vol',
    'stock.options_terminal': 'Terminal de Opciones',
    'stock.log_forecast': 'Registrar Pronóstico',
    'stock.forecast_logged': '¡Pronóstico Guardado!',
    'stock.switch_company': 'Cambiar empresa (ej. Tata, Apple, Nvidia)...',

    // Stock Detail Page - Valuation Tape
    'stock.valuation_title': 'Estadísticas de Valoración y Rango de 52 Semanas',
    'stock.valuation_subtitle': 'Métricas Fundamentales y de Rango',
    'stock.high_52w': 'Máximo 52 Semanas',
    'stock.low_52w': 'Mínimo 52 Semanas',
    'stock.day_range': 'Rango del Día',
    'stock.volume': 'Volumen (Acciones)',
    'stock.pe_ratio': 'Ratio P/E',
    'stock.market_cap': 'Capitalización de Mercado',

    // Stock Detail Page - Modules Bar
    'stock.additional_modules': 'Módulos Analíticos Adicionales (Análisis Profundo)',
    'stock.modules_subtitle': 'Por defecto solo son visibles el gráfico de velas, estadísticas y predicción. Haga clic abajo para profundizar.',
    'stock.visible_of': 'visibles',

    // Grid Buttons
    'stock.mod_regime_title': 'Régimen de Mercado HMM',
    'stock.mod_regime_sub': 'Modelo Latente de 2 Estados',
    'stock.mod_decision_title': 'Soporte de Decisión y Señales',
    'stock.mod_decision_sub': 'Objetivos, Stop Loss y Señales',
    'stock.mod_audit_title': 'Auditoría del Día Anterior',
    'stock.mod_audit_sub': 'Precisión de Pronóstico y Límites',
    'stock.mod_events_title': 'Eventos Clasificados',
    'stock.mod_events_sub': 'Catalizadores e Impacto en Precio',
    'stock.mod_sentiment_title': 'Noticias y Sentimiento',
    'stock.mod_sentiment_sub': 'Puntuación NLP con FinBERT',
    'stock.mod_drift_title': 'Monitor de Deriva Conceptual',
    'stock.mod_drift_sub': 'Prueba KS de No Estacionariedad',
    'stock.mod_surface_title': 'Superficie Vol 3D y Sonrisa',
    'stock.mod_surface_sub': 'Volatilidad Implícita D3',
    'stock.mod_seasonality_title': 'Alfa de Estacionalidad',
    'stock.mod_seasonality_sub': 'Mapa de Calor Mensual',

    // Revealed Modules Titles
    'stock.section_regime': 'Detección de Régimen de Mercado HMM y Dinámica Latente',
    'stock.section_decision': 'Soporte de Decisión Algorítmica y Señales de Posición',
    'stock.section_audit': 'Auditoría Estadística y Libro de Precisión de Pronósticos',
    'stock.section_events': 'Eventos Financieros Clasificados y Catalizadores Corporativos',
    'stock.section_sentiment_drift': 'Sentimiento de Noticias y Monitoreo de Deriva',
    'stock.section_surface': 'Superficie de Volatilidad Implícita D3 y Sonrisa de Volatilidad',
    'stock.section_seasonality': 'Análisis de Estacionalidad y Alfa de Calendario',

    // Audit Card Details
    'audit.today_active_title': 'Auditoría de Sesión Activa de Hoy',
    'audit.previous_completed_title': 'Auditoría de Sesión Previa Completada',
    'audit.today_active_desc': 'Comparación en tiempo real del precio de mercado actual con el pronóstico cuantitativo del modelo.',
    'audit.previous_completed_desc': 'Auditoría del precio de cierre real de esta sesión frente al pronóstico y los límites conformes.',
    'audit.current_traded_price': 'Precio Actual / Negociado',
    'audit.actual_close': 'Cierre Real',
    'audit.session_forecast': 'Pronóstico de Sesión',
    'audit.prediction_error': 'Error de Pronóstico',
    'audit.hit_rate_5d': 'Tasa de Acierto en 5 Días',
    'audit.channel': 'Canal Conforme',
    'audit.range': 'Rango',
    'audit.bound_hit': 'Impacto dentro de Límite Conforme 90%',
    'audit.bound_miss': 'Fuera de Límites',
    'audit.ledger_title': 'Libro Histórico de Precisión (Cierre Real vs Pronóstico)',
    'audit.ledger_sub': 'Calibrado con Ensamble v4.0',
    'audit.session_date': 'Fecha de Sesión',
    'audit.model_forecast': 'Pronóstico del Modelo',
    'audit.conformal_channel': 'Canal Conforme',
    'audit.abs_error': 'Error Absoluto',
    'audit.error_pct': '% de Error',
    'audit.status': 'Estado',
    'audit.hit': 'ACIERTO',
    'audit.miss': 'FALLO',
    'audit.coverage_alignment': '100% de Alineación de Cobertura',

    // Moving Averages & Chart
    'chart.moving_averages': 'Medias Móviles',
    'chart.trend_analysis': 'Análisis de Tendencia',
    'chart.sma50': 'SMA 50',
    'chart.sma200': 'SMA 200',
    'chart.sma20': 'SMA 20',
    'chart.bollinger': 'Bandas de Bollinger',
    'chart.golden_cross': 'Cruce Dorado / Tendencia Alcista',
    'chart.death_cross': 'Cruce de la Muerte / Tendencia Bajista',
    'chart.consolidation': 'Consolidación / Soporte Macro',
    'chart.counter_trend': 'Recuperación Contra-Tendencia',
    'chart.above': 'Por encima',
    'chart.below': 'Por debajo',
    'chart.candle_chart': 'Velas Diarias y Superposiciones Técnicas',

    // Conformal Prediction Card
    'conformal.title': 'Intervalo de Predicción Conforme',
    'conformal.predicted_price': 'Precio Pronosticado',
    'conformal.predicted_return': 'Retorno Pronosticado',
    'conformal.lower_bound': 'Límite Conforme Inferior',
    'conformal.upper_bound': 'Límite Conforme Superior',
    'conformal.confidence': 'Confianza Estadística',
    'conformal.horizon': 'Horizonte de Pronóstico',
    'conformal.days': 'días',
    'conformal.target_date': 'Fecha Objetivo',
    'conformal.methodology': 'Metodología',

    // Market Regime Card
    'regime.bullish_low_vol': 'Alcista / Baja Volatilidad',
    'regime.bullish_high_vol': 'Alcista / Alta Volatilidad',
    'regime.bearish_low_vol': 'Bajista / Baja Volatilidad',
    'regime.bearish_high_vol': 'Bajista / Alta Volatilidad',
    'regime.confidence': 'Nivel de Confianza',
    'regime.latent_state': 'Estado Oculto de Markov',

    // Decision Signals
    'decision.strong_buy': 'COMPRA FUERTE',
    'decision.buy': 'COMPRAR',
    'decision.hold': 'MANTENER',
    'decision.sell': 'VENDER',
    'decision.strong_sell': 'VENTA FUERTE',
    'decision.target_price': 'Precio Objetivo de Ganancia',
    'decision.stop_loss': 'Disparador de Stop Loss',
    'decision.risk_reward': 'Relación Riesgo-Beneficio',

    // Classified Events
    'events.title': 'Catalizadores Clasificados y Eventos Estructurales',
    'events.fed_into': 'Integrado en Factores del Modelo',
    'events.expected_impact': 'Impacto Esperado en Precio',
    'events.no_events': 'No hay eventos corporativos recientes de alto impacto registrados.',

    // Footer & Disclaimer
    'footer.disclaimer': 'AlphaQuant AI es una plataforma de investigación cuantitativa y educativa. Los intervalos de predicción no constituyen asesoramiento financiero individual.',
    'footer.rights': 'Todos los derechos reservados. Datos de mercado en tiempo real vía bolsas oficiales.'
  },

  fr: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'Cœur ML v2.1',
    'nav.dashboard': 'Tableau de bord',
    'nav.analysis': 'Analyse boursière',
    'nav.portfolio': 'Portefeuille',
    'nav.watchlist': 'Liste de suivi',
    'nav.markets': 'Marchés & Corrélations',
    'nav.home': 'Accueil',
    'nav.features': 'Fonctionnalités',
    'nav.innovations': 'Innovations',
    'nav.safety': 'Sécurité du modèle',
    'nav.tour': 'Visite guidée',
    'nav.language': 'Langue',
    'nav.select_language': 'Choisir la langue',
    'nav.options': 'Options & Grecques',
    'nav.backtest': 'Stratégie de backtest',
    'nav.broker': 'Passerelle courtier',
    'nav.social': 'Trading social',
    'nav.optimizer': 'Optimiseur de portefeuille',
    'nav.accuracy': 'Précision du modèle',
    'nav.drift': 'Dérive du modèle',
    'nav.account': 'Compte & Paramètres',
    'nav.guide': 'Guide investisseur',
    'nav.logout': 'Déconnexion',
    'nav.login': 'Connexion',
    'nav.signup': 'Inscription',
    'nav.search_placeholder': 'Rechercher un symbole...',
    'nav.demo_mode': 'Mode démo',
    'nav.profile': 'Mon profil',
    'nav.quant_tools': 'Outils quantitatifs',
    'nav.quant_desc': 'Machine learning, valorisation d’options et gestion de portefeuille.',

    'action.save': 'Enregistrer',
    'action.cancel': 'Annuler',
    'action.delete': 'Supprimer',
    'action.edit': 'Modifier',
    'action.close': 'Fermer',
    'action.export': 'Exporter',
    'action.filter': 'Filtrer',
    'action.refresh': 'Actualiser',
    'action.search': 'Rechercher',
    'action.show_all': 'Tout afficher',
    'action.hide_all': 'Tout masquer',
    'action.hide_option': 'Masquer l’option',
    'action.active': 'ACTIF',
    'action.off': 'DÉSACTIVÉ',
    'action.learn_more': 'En savoir plus',
    'action.get_started': 'Commencer',
    'action.view_details': 'Voir détails',
    'action.try_demo': 'Tester la démo',

    'stock.today': "Aujourd'hui",
    'stock.quick_alert': 'Alerte rapide',
    'stock.add_watchlist': 'Liste de suivi',
    'stock.add_portfolio': 'Ajouter au portefeuille',
    'stock.export_factsheet': 'Exporter fiche',
    'stock.vol_surface': 'Surface vol',
    'stock.options_terminal': 'Terminal d’options',
    'stock.log_forecast': 'Enregistrer prévision',
    'stock.forecast_logged': 'Prévision enregistrée !',
    'stock.switch_company': 'Changer d’entreprise (ex. Tata, Apple, LVMH)...',

    'stock.valuation_title': 'Valorisation et statistiques de négociation sur 52 semaines',
    'stock.valuation_subtitle': 'Métriques fondamentales et de range',
    'stock.high_52w': 'Plus haut 52 sem.',
    'stock.low_52w': 'Plus bas 52 sem.',
    'stock.day_range': 'Plage du jour',
    'stock.volume': 'Volume (actions)',
    'stock.pe_ratio': 'Ratio C/B (P/E)',
    'stock.market_cap': 'Cap. boursière',

    'stock.additional_modules': 'Modules analytiques supplémentaires (Analyse approfondie)',
    'stock.modules_subtitle': 'Par défaut, seuls le graphique journalier, les statistiques et les prévisions sont affichés. Cliquez ci-dessous pour approfondir.',
    'stock.visible_of': 'visibles',

    'stock.mod_regime_title': 'Régime de marché HMM',
    'stock.mod_regime_sub': 'Modèle latent à 2 états',
    'stock.mod_decision_title': 'Aide à la décision et signaux',
    'stock.mod_decision_sub': 'Objectifs, stop-loss & signaux',
    'stock.mod_audit_title': 'Audit du jour précédent',
    'stock.mod_audit_sub': 'Précision & bornes de prévision',
    'stock.mod_events_title': 'Événements classifiés',
    'stock.mod_events_sub': 'Catalyseurs & impact sur le cours',
    'stock.mod_sentiment_title': 'Actualités & Sentiment',
    'stock.mod_sentiment_sub': 'Score NLP FinBERT',
    'stock.mod_drift_title': 'Dérive de concept (KS)',
    'stock.mod_drift_sub': 'Test KS de non-stationnarité',
    'stock.mod_surface_title': 'Surface de volatilité 3D',
    'stock.mod_surface_sub': 'Smile de volatilité implicite D3',
    'stock.mod_seasonality_title': 'Alpha de saisonnalité',
    'stock.mod_seasonality_sub': 'Carte thermique mensuelle',

    'stock.section_regime': 'Détection du régime de marché HMM & dynamique d’états',
    'stock.section_decision': 'Aide à la décision algorithmique & signaux de position',
    'stock.section_audit': 'Audit statistique de session & livre de précision',
    'stock.section_events': 'Événements financiers classifiés & catalyseurs',
    'stock.section_sentiment_drift': 'Sentiment des actualités & surveillance de dérive',
    'stock.section_surface': 'Surface de volatilité implicite 3D & smile D3',
    'stock.section_seasonality': 'Saisonnalité & analyse de l’alpha de calendrier',

    'audit.today_active_title': "Audit de la session active d'aujourd'hui",
    'audit.previous_completed_title': 'Audit de la session précédente',
    'audit.today_active_desc': 'Comparaison en direct du cours actuel avec la prévision quantitative du modèle.',
    'audit.previous_completed_desc': 'Audit du cours de clôture réel par rapport aux bornes conformes du modèle.',
    'audit.current_traded_price': 'Prix actuel / négocié',
    'audit.actual_close': 'Clôture réelle',
    'audit.session_forecast': 'Prévision de la session',
    'audit.prediction_error': 'Erreur de prévision',
    'audit.hit_rate_5d': 'Taux de réussite sur 5 j',
    'audit.channel': 'Canal',
    'audit.range': 'Plage',
    'audit.bound_hit': 'Borne conforme à 90 % respectée',
    'audit.bound_miss': 'Hors limites',
    'audit.ledger_title': 'Historique de précision (Clôture réelle vs Prévision)',
    'audit.ledger_sub': 'Calibré avec Ensemble v4.0',
    'audit.session_date': 'Date de session',
    'audit.model_forecast': 'Prévision du modèle',
    'audit.conformal_channel': 'Canal conforme',
    'audit.abs_error': 'Erreur absolue',
    'audit.error_pct': 'Erreur %',
    'audit.status': 'Statut',
    'audit.hit': 'SUCCÈS',
    'audit.miss': 'ÉCHEC',
    'audit.coverage_alignment': 'Alignement de couverture à 100 %',

    'chart.moving_averages': 'Moyennes mobiles',
    'chart.trend_analysis': 'Analyse de tendance',
    'chart.sma50': 'SMA 50',
    'chart.sma200': 'SMA 200',
    'chart.sma20': 'SMA 20',
    'chart.bollinger': 'Bandes de Bollinger',
    'chart.golden_cross': 'Croix dorée / Tendance haussière',
    'chart.death_cross': 'Croix de la mort / Tendance baissière',
    'chart.consolidation': 'Consolidation / Support macro',
    'chart.counter_trend': 'Rebond contre-tendance',
    'chart.above': 'Au-dessus',
    'chart.below': 'En-dessous',
    'chart.candle_chart': 'Chandelier journalier & indicateurs techniques',

    'conformal.title': 'Intervalle de prédiction conforme',
    'conformal.predicted_price': 'Cours prévisionnel',
    'conformal.predicted_return': 'Rendement prévu',
    'conformal.lower_bound': 'Borne inférieure conforme',
    'conformal.upper_bound': 'Borne supérieure conforme',
    'conformal.confidence': 'Confiance nominale',
    'conformal.horizon': 'Horizon prévisionnel',
    'conformal.days': 'jours',
    'conformal.target_date': 'Date cible',
    'conformal.methodology': 'Méthodologie',

    'regime.bullish_low_vol': 'Haussier / Faible volatilité',
    'regime.bullish_high_vol': 'Haussier / Forte volatilité',
    'regime.bearish_low_vol': 'Baissier / Faible volatilité',
    'regime.bearish_high_vol': 'Baissier / Forte volatilité',
    'regime.confidence': 'Niveau de confiance',
    'regime.latent_state': 'État markovien latent',

    'decision.strong_buy': 'ACHAT FORT',
    'decision.buy': 'ACHETER',
    'decision.hold': 'CONSERVER',
    'decision.sell': 'VENDRE',
    'decision.strong_sell': 'VENTE FORTE',
    'decision.target_price': 'Objectif de gain',
    'decision.stop_loss': 'Déclencheur stop-loss',
    'decision.risk_reward': 'Ratio risque-rendement',

    'events.title': 'Catalyseurs & événements structurels',
    'events.fed_into': 'Intégré aux facteurs du modèle',
    'events.expected_impact': 'Impact estimé sur le cours',
    'events.no_events': 'Aucun événement majeur récent enregistré.',

    'footer.disclaimer': 'AlphaQuant AI est une plateforme de recherche quantitative et éducative.',
    'footer.rights': 'Tous droits réservés.'
  },

  de: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 ML-Kern',
    'nav.dashboard': 'Dashboard',
    'nav.analysis': 'Aktienanalyse',
    'nav.portfolio': 'Portfolio',
    'nav.watchlist': 'Beobachtungsliste',
    'nav.markets': 'Märkte & Korrelation',
    'nav.home': 'Startseite',
    'nav.features': 'Funktionen',
    'nav.innovations': 'Innovationen',
    'nav.safety': 'Modellsicherheit',
    'nav.tour': 'Tour',
    'nav.language': 'Sprache',
    'nav.select_language': 'Sprache wählen',
    'nav.options': 'Optionen & Griechen',
    'nav.backtest': 'Backtest-Strategie',
    'nav.broker': 'Broker-Gateway',
    'nav.social': 'Social & Copy-Trading',
    'nav.optimizer': 'Portfolio-Optimierer',
    'nav.accuracy': 'Modellgenauigkeit',
    'nav.drift': 'Drift-Monitor',
    'nav.account': 'Konto & Einstellungen',
    'nav.guide': 'Anleger-Leitfaden',
    'nav.logout': 'Abmelden',
    'nav.login': 'Anmelden',
    'nav.signup': 'Registrieren',
    'nav.search_placeholder': 'Ticker oder Firma suchen...',
    'nav.demo_mode': 'Demo-Modus',
    'nav.profile': 'Mein Profil',
    'nav.quant_tools': 'Quantitative Werkzeuge',
    'nav.quant_desc': 'Machine Learning, Optionsbewertung, algorithmische Simulation und Portfoliomanagement.',

    'action.save': 'Speichern',
    'action.cancel': 'Abbrechen',
    'action.delete': 'Löschen',
    'action.edit': 'Bearbeiten',
    'action.close': 'Schließen',
    'action.export': 'Exportieren',
    'action.filter': 'Filtern',
    'action.refresh': 'Aktualisieren',
    'action.search': 'Suchen',
    'action.show_all': 'Alle anzeigen',
    'action.hide_all': 'Alle ausblenden',
    'action.hide_option': 'Option ausblenden',
    'action.active': 'AKTIV',
    'action.off': 'AUS',
    'action.learn_more': 'Mehr erfahren',
    'action.get_started': 'Jetzt starten',
    'action.view_details': 'Details anzeigen',
    'action.try_demo': 'Demo testen',

    'stock.today': 'Heute',
    'stock.quick_alert': 'Schnellalarm',
    'stock.add_watchlist': 'Watchlist',
    'stock.add_portfolio': 'Zum Portfolio',
    'stock.export_factsheet': 'Factsheet exportieren',
    'stock.vol_surface': 'Vol-Oberfläche',
    'stock.options_terminal': 'Optionen-Terminal',
    'stock.log_forecast': 'Prognose loggen',
    'stock.forecast_logged': 'Prognose gespeichert!',
    'stock.switch_company': 'Unternehmen wechseln (z.B. Tata, SAP, Apple)...',

    'stock.valuation_title': 'Bewertung & 52-Wochen-Handelsspanne',
    'stock.valuation_subtitle': 'Fundamentaldaten & Kursspannen-Metriken',
    'stock.high_52w': '52-Wochen-Hoch',
    'stock.low_52w': '52-Wochen-Tief',
    'stock.day_range': 'Tagesspanne',
    'stock.volume': 'Volumen (Aktien)',
    'stock.pe_ratio': 'KGV (P/E)',
    'stock.market_cap': 'Marktkapitalisierung',

    'stock.additional_modules': 'Zusätzliche Analysemodule (Deep Dive)',
    'stock.modules_subtitle': 'Standardmäßig sind nur Tageskerzenchart, Statistiken und Vorhersagen sichtbar. Klicken Sie unten für Detailanalysen.',
    'stock.visible_of': 'sichtbar',

    'stock.mod_regime_title': 'HMM-Marktregime',
    'stock.mod_regime_sub': '2-Zustände-Latentmodell',
    'stock.mod_decision_title': 'Entscheidungshilfe & Signale',
    'stock.mod_decision_sub': 'Kursziel, Stop-Loss & Signale',
    'stock.mod_audit_title': 'Audit des Vortages',
    'stock.mod_audit_sub': 'Prognosegenauigkeit & Grenzen',
    'stock.mod_events_title': 'Klassifizierte Ereignisse',
    'stock.mod_events_sub': 'Katalysatoren & Kurseffekt',
    'stock.mod_sentiment_title': 'Nachrichten & Sentiment',
    'stock.mod_sentiment_sub': 'FinBERT-NLP-Sentimentanalyse',
    'stock.mod_drift_title': 'Konzept-Drift-Monitor',
    'stock.mod_drift_sub': 'KS 2-Stichproben-Nichtstationarität',
    'stock.mod_surface_title': '3D-Volatilitätsoberfläche',
    'stock.mod_surface_sub': 'D3 Implizites Volatilitätslächeln',
    'stock.mod_seasonality_title': 'Saisonalitäts-Alpha',
    'stock.mod_seasonality_sub': 'Monatliche Rendite-Heatmap',

    'stock.section_regime': 'HMM-Marktregime-Erkennung & Zustandstransitionen',
    'stock.section_decision': 'Algorithmische Entscheidungshilfe & Positionssignale',
    'stock.section_audit': 'Statistisches Sitzungsaudit & Genauigkeitsbuch',
    'stock.section_events': 'Klassifizierte Finanzereignisse & Unternehmenskatalysatoren',
    'stock.section_sentiment_drift': 'Nachrichten-Sentiment & Konzeptdrift-Überwachung',
    'stock.section_surface': 'D3 Implizite Volatilitätsoberfläche & Smile-Engine',
    'stock.section_seasonality': 'Saisonalität & Kalender-Alpha-Analyse',

    'audit.today_active_title': 'Audit der heutigen aktiven Sitzung',
    'audit.previous_completed_title': 'Audit der vorherigen abgeschlossenen Sitzung',
    'audit.today_active_desc': 'Echtzeitabgleich des aktuellen Marktpreises mit der quantitativen Modellprognose.',
    'audit.previous_completed_desc': 'Audit des tatsächlichen Schlusskurses im Vergleich zur Modellprognose.',
    'audit.current_traded_price': 'Aktueller / Gehandelter Preis',
    'audit.actual_close': 'Tatsächlicher Schluss',
    'audit.session_forecast': 'Sitzungsprognose',
    'audit.prediction_error': 'Prognosefehler',
    'audit.hit_rate_5d': '5-Tage-Trefferquote',
    'audit.channel': 'Kanal',
    'audit.range': 'Spanne',
    'audit.bound_hit': '90% Konforme Grenze getroffen',
    'audit.bound_miss': 'Grenze verfehlt',
    'audit.ledger_title': 'Genauigkeitsbuch (Tatsächlicher Schluss vs. Prognose)',
    'audit.ledger_sub': 'Ensemble v4.0 Kalibriert',
    'audit.session_date': 'Sitzungsdatum',
    'audit.model_forecast': 'Modellprognose',
    'audit.conformal_channel': 'Konformer Kanal',
    'audit.abs_error': 'Absoluter Fehler',
    'audit.error_pct': 'Fehler %',
    'audit.status': 'Status',
    'audit.hit': 'TREFFER',
    'audit.miss': 'VERFEHLT',
    'audit.coverage_alignment': '100% Abdeckungsübereinstimmung',

    'chart.moving_averages': 'Gleitende Durchschnitte',
    'chart.trend_analysis': 'Trendanalyse',
    'chart.sma50': 'SMA 50',
    'chart.sma200': 'SMA 200',
    'chart.sma20': 'SMA 20',
    'chart.bollinger': 'Bollinger-Bänder',
    'chart.golden_cross': 'Golden Cross / Bullischer Trend',
    'chart.death_cross': 'Death Cross / Bärischer Trend',
    'chart.consolidation': 'Konsolidierung / Makro-Unterstützung',
    'chart.counter_trend': 'Gegentrend-Erholung',
    'chart.above': 'Über',
    'chart.below': 'Unter',
    'chart.candle_chart': 'Tageskerzen & Technische Indikatoren',

    'conformal.title': 'Konformes Vorhersageintervall',
    'conformal.predicted_price': 'Prognostizierter Kurs',
    'conformal.predicted_return': 'Prognostizierte Rendite',
    'conformal.lower_bound': 'Untere Konforme Grenze',
    'conformal.upper_bound': 'Obere Konforme Grenze',
    'conformal.confidence': 'Nominales Vertrauen',
    'conformal.horizon': 'Prognosehorizont',
    'conformal.days': 'Tage',
    'conformal.target_date': 'Zieldatum',
    'conformal.methodology': 'Methodik',

    'regime.bullish_low_vol': 'Bullisch / Geringe Volatilität',
    'regime.bullish_high_vol': 'Bullisch / Hohe Volatilität',
    'regime.bearish_low_vol': 'Bärisch / Geringe Volatilität',
    'regime.bearish_high_vol': 'Bärisch / Hohe Volatilität',
    'regime.confidence': 'Vertrauensniveau',
    'regime.latent_state': 'Latenter Markov-Zustand',

    'decision.strong_buy': 'STARKER KAUF',
    'decision.buy': 'KAUFEN',
    'decision.hold': 'HALTEN',
    'decision.sell': 'VERKAUFEN',
    'decision.strong_sell': 'STARKER VERKAUF',
    'decision.target_price': 'Gewinnzielkurs',
    'decision.stop_loss': 'Stop-Loss-Schwelle',
    'decision.risk_reward': 'Chance-Risiko-Verhältnis',

    'events.title': 'Klassifizierte Katalysatoren & Strukturereignisse',
    'events.fed_into': 'In Modellfaktoren eingeflossen',
    'events.expected_impact': 'Erwarteter Kurseffekt',
    'events.no_events': 'Keine aktuellen relevanten Unternehmensereignisse verzeichnet.',

    'footer.disclaimer': 'AlphaQuant AI dient zu quantitativen Forschungs- und Bildungszwecken.',
    'footer.rights': 'Alle Rechte vorbehalten.'
  },

  ja: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 機械学習コア',
    'nav.dashboard': 'ダッシュボード',
    'nav.analysis': '銘柄詳細分析',
    'nav.portfolio': 'ポートフォリオ',
    'nav.watchlist': 'ウォッチリスト',
    'nav.markets': '市場動向・相関性',
    'nav.home': 'ホーム',
    'nav.features': '機能紹介',
    'nav.innovations': '革新技術',
    'nav.safety': 'モデル安全性',
    'nav.tour': '製品ツアー',
    'nav.language': '言語',
    'nav.select_language': '言語を選択',
    'nav.options': 'オプション・グリークス',
    'nav.backtest': 'バックテスト検証',
    'nav.broker': '証券連携ゲートウェイ',
    'nav.social': 'コピートレード',
    'nav.optimizer': 'ポートフォリオ最適化',
    'nav.accuracy': 'モデル精度分析',
    'nav.drift': 'ドリフト監視',
    'nav.account': 'アカウント設定',
    'nav.guide': '初心者ガイド',
    'nav.logout': 'ログアウト',
    'nav.login': 'ログイン',
    'nav.signup': '新規登録',
    'nav.search_placeholder': 'ティッカーまたは企業名を検索...',
    'nav.demo_mode': 'デモモード',
    'nav.profile': 'マイプロフィール',
    'nav.quant_tools': 'クオンツ分析ツール',
    'nav.quant_desc': '機械学習、オプション価格算定、バックテスト、ポートフォリオ最適化ツール。',

    'action.save': '保存',
    'action.cancel': 'キャンセル',
    'action.delete': '削除',
    'action.edit': '編集',
    'action.close': '閉じる',
    'action.export': 'エクスポート',
    'action.filter': '絞り込み',
    'action.refresh': '更新',
    'action.search': '検索',
    'action.show_all': 'すべて表示',
    'action.hide_all': 'すべて非表示',
    'action.hide_option': '非表示にする',
    'action.active': '有効',
    'action.off': '無効',
    'action.learn_more': '詳細を見る',
    'action.get_started': '今すぐ始める',
    'action.view_details': '詳細を表示',
    'action.try_demo': 'デモを体験',

    'stock.today': '本日',
    'stock.quick_alert': 'クイックアラート',
    'stock.add_watchlist': 'ウォッチリスト',
    'stock.add_portfolio': 'ポートフォリオに追加',
    'stock.export_factsheet': 'ファクトシート出力',
    'stock.vol_surface': 'ボラ曲面',
    'stock.options_terminal': 'オプション端末',
    'stock.log_forecast': '予測を記録',
    'stock.forecast_logged': '予測を記録しました！',
    'stock.switch_company': '銘柄を切り替え（例: トヨタ、Apple、Tata Motors）...',

    'stock.valuation_title': 'バリュエーション＆52週取引レンジ統計',
    'stock.valuation_subtitle': 'ファンダメンタルズと株価レンジ指標',
    'stock.high_52w': '52週最高値',
    'stock.low_52w': '52週最安値',
    'stock.day_range': '当日の値幅',
    'stock.volume': '出来高（株数）',
    'stock.pe_ratio': 'PER（株価収益率）',
    'stock.market_cap': '時価総額',

    'stock.additional_modules': '追加分析モジュール（詳細定量的インサイト）',
    'stock.modules_subtitle': '日足チャート・統計・予測のみが標準表示されます。高度な要因を確認するには各モジュールをクリックしてください。',
    'stock.visible_of': '件表示中',

    'stock.mod_regime_title': 'HMM市場レジーム',
    'stock.mod_regime_sub': '2状態潜在マルコフモデル',
    'stock.mod_decision_title': '意思決定支援・シグナル',
    'stock.mod_decision_sub': '目標値、損切り、売買シグナル',
    'stock.mod_audit_title': '前日予測精度監査',
    'stock.mod_audit_sub': '予測誤差と信頼区間判定',
    'stock.mod_events_title': '分類済み重要イベント',
    'stock.mod_events_sub': 'カタリストと想定価格インパクト',
    'stock.mod_sentiment_title': 'ニュース・感情分析',
    'stock.mod_sentiment_sub': 'FinBERT 自然言語処理',
    'stock.mod_drift_title': 'コンセプトドリフト監視',
    'stock.mod_drift_sub': 'KS非定常性検定',
    'stock.mod_surface_title': '3Dボラティリティ曲面',
    'stock.mod_surface_sub': 'D3インプライド・ボラティリティ',
    'stock.mod_seasonality_title': 'アノマリー・季節性',
    'stock.mod_seasonality_sub': '月次リターンヒートマップ',

    'stock.section_regime': 'HMM市場レジーム分類と潜在状態ダイナミクス',
    'stock.section_decision': '定量的売買シグナル・ポジション管理',
    'stock.section_audit': '前セッション予測精度監査台帳',
    'stock.section_events': '分類済みカタリスト・構造的市場イベント',
    'stock.section_sentiment_drift': 'ニュースセンチメント＆データドリフト監視',
    'stock.section_surface': '3Dインプライド・ボラティリティ曲面＆スマイル',
    'stock.section_seasonality': '季節性・カレンダーアノマリー分析',

    'audit.today_active_title': '本日のセッション監査',
    'audit.previous_completed_title': '前回完了セッション監査',
    'audit.today_active_desc': '直前データに基づいて生成されたモデル予測値と現在の取引価格のリアルタイム比較。',
    'audit.previous_completed_desc': '実際の終値がモデルの共形信頼区間内に収まったかを客観的に監査。',
    'audit.current_traded_price': '現在値・約定価格',
    'audit.actual_close': '実際の終値',
    'audit.session_forecast': 'セッション予測値',
    'audit.prediction_error': '予測誤差',
    'audit.hit_rate_5d': '直近5日的中率',
    'audit.channel': '信頼区間',
    'audit.range': 'レンジ',
    'audit.bound_hit': '90%信頼区間内的中',
    'audit.bound_miss': '信頼区間外れ',
    'audit.ledger_title': '直近セッション精度監査台帳（実測終値 vs 予測値）',
    'audit.ledger_sub': 'Ensemble v4.0 キャリブレーション済み',
    'audit.session_date': 'セッション日付',
    'audit.model_forecast': 'モデル予測値',
    'audit.conformal_channel': '共形信頼区間',
    'audit.abs_error': '絶対誤差',
    'audit.error_pct': '誤差率 %',
    'audit.status': '判定',
    'audit.hit': '的中',
    'audit.miss': '乖離',
    'audit.coverage_alignment': '100% カバレッジ整合性',

    'chart.moving_averages': '移動平均線',
    'chart.trend_analysis': 'トレンド判定',
    'chart.sma50': 'SMA 50（中期）',
    'chart.sma200': 'SMA 200（長期）',
    'chart.sma20': 'SMA 20（短期）',
    'chart.bollinger': 'ボリンジャーバンド',
    'chart.golden_cross': 'ゴールデンクロス / 強気トレンド',
    'chart.death_cross': 'デッドクロス / 弱気トレンド',
    'chart.consolidation': '保ち合い / マクロ支持線',
    'chart.counter_trend': '逆トレンド反発',
    'chart.above': '上回り',
    'chart.below': '下回り',
    'chart.candle_chart': '日足ローソク足＆テクニカル指標',

    'conformal.title': '共形予測区間（Conformal Interval）',
    'conformal.predicted_price': '予測株価',
    'conformal.predicted_return': '予測リターン',
    'conformal.lower_bound': '下限信頼境界',
    'conformal.upper_bound': '上限信頼境界',
    'conformal.confidence': '名目信頼水準',
    'conformal.horizon': '予測期間',
    'conformal.days': '日間',
    'conformal.target_date': '対象期日',
    'conformal.methodology': '計算手法',

    'regime.bullish_low_vol': '強気 / 低ボラティリティ',
    'regime.bullish_high_vol': '強気 / 高ボラティリティ',
    'regime.bearish_low_vol': '弱気 / 低ボラティリティ',
    'regime.bearish_high_vol': '弱気 / 高ボラティリティ',
    'regime.confidence': '判定確信度',
    'regime.latent_state': '潜在マルコフ状態',

    'decision.strong_buy': '強力買い',
    'decision.buy': '買い',
    'decision.hold': '保有（ホールド）',
    'decision.sell': '売り',
    'decision.strong_sell': '強力売り',
    'decision.target_price': '利確目標価格',
    'decision.stop_loss': '損切りトリガー',
    'decision.risk_reward': 'リスク・リワード比',

    'events.title': '構造的イベント＆カタリスト分析',
    'events.fed_into': 'クオンツモデル特徴量に反映',
    'events.expected_impact': '想定価格インパクト',
    'events.no_events': '記録された直近の重要企業イベントはありません。',

    'footer.disclaimer': 'AlphaQuant AIは定量分析・研究・学習プラットフォームです。個別の投資助言を構成するものではありません。',
    'footer.rights': '無断転載を禁じます。'
  },

  zh: {
    // Nav & App Chrome
    'nav.brand': 'AlphaQuant AI',
    'nav.tagline': 'v2.1 机器学习内核',
    'nav.dashboard': '量化仪表板',
    'nav.analysis': '个股深度分析',
    'nav.portfolio': '投资组合',
    'nav.watchlist': '自选关注列表',
    'nav.markets': '全市场与相关性',
    'nav.home': '首页',
    'nav.features': '核心功能',
    'nav.innovations': '技术创新',
    'nav.safety': '模型安全性',
    'nav.tour': '产品导览',
    'nav.language': '语言',
    'nav.select_language': '选择语言',
    'nav.options': '期权与希腊值',
    'nav.backtest': '策略回测模拟',
    'nav.broker': '券商网关',
    'nav.social': '跟单与社交交易',
    'nav.optimizer': '资产组合优化器',
    'nav.accuracy': '模型准确度审计',
    'nav.drift': '概念漂移监控',
    'nav.account': '账户与设置',
    'nav.guide': '新手量化指南',
    'nav.logout': '退出登录',
    'nav.login': '登录',
    'nav.signup': '注册账号',
    'nav.search_placeholder': '搜索代码或公司名称...',
    'nav.demo_mode': '演示模式',
    'nav.profile': '个人资料',
    'nav.quant_tools': '量化工具箱',
    'nav.quant_desc': '机器学习预测、期权定价、策略回测与资产组合前沿优化工具。',

    'action.save': '保存',
    'action.cancel': '取消',
    'action.delete': '删除',
    'action.edit': '编辑',
    'action.close': '关闭',
    'action.export': '导出',
    'action.filter': '筛选',
    'action.refresh': '刷新',
    'action.search': '搜索',
    'action.show_all': '显示全部',
    'action.hide_all': '隐藏全部',
    'action.hide_option': '隐藏选项',
    'action.active': '已启用',
    'action.off': '已关闭',
    'action.learn_more': '了解更多',
    'action.get_started': '立即开启',
    'action.view_details': '查看详情',
    'action.try_demo': '体验演示',

    'stock.today': '今日',
    'stock.quick_alert': '快速预警',
    'stock.add_watchlist': '加入自选',
    'stock.add_portfolio': '加入组合',
    'stock.export_factsheet': '导出简报',
    'stock.vol_surface': '波动率曲面',
    'stock.options_terminal': '期权终端',
    'stock.log_forecast': '记录预测',
    'stock.forecast_logged': '已记录预测！',
    'stock.switch_company': '切换股票（例如 Tata, 苹果, 微软）...',

    'stock.valuation_title': '估值与52周交易区间统计',
    'stock.valuation_subtitle': '基本面与价格区间指标',
    'stock.high_52w': '52周最高价',
    'stock.low_52w': '52周最低价',
    'stock.day_range': '当日波动区间',
    'stock.volume': '成交量（股）',
    'stock.pe_ratio': '市盈率 (P/E)',
    'stock.market_cap': '总市值',

    'stock.additional_modules': '附加量化分析模块 (深度分析)',
    'stock.modules_subtitle': '默认仅显示日K线图、估值统计与共形预测。点击下方模块即可展开深度因子分析。',
    'stock.visible_of': '项已显示',

    'stock.mod_regime_title': 'HMM市场体制',
    'stock.mod_regime_sub': '2状态隐马尔可夫模型',
    'stock.mod_decision_title': '决策支持与交易信号',
    'stock.mod_decision_sub': '目标价、止损位与信号',
    'stock.mod_audit_title': '前一日预测审计',
    'stock.mod_audit_sub': '预测误差与置信边界判定',
    'stock.mod_events_title': '结构化金融事件',
    'stock.mod_events_sub': '催化剂与预期价格影响',
    'stock.mod_sentiment_title': '新闻与情绪分析',
    'stock.mod_sentiment_sub': 'FinBERT 自然语言量化评分',
    'stock.mod_drift_title': '概念漂移监控',
    'stock.mod_drift_sub': 'KS双样本非平稳性检验',
    'stock.mod_surface_title': '3D波动率曲面与微笑',
    'stock.mod_surface_sub': 'D3隐含波动率曲面',
    'stock.mod_seasonality_title': '季节性日历Alpha',
    'stock.mod_seasonality_sub': '月度收益率热力图',

    'stock.section_regime': 'HMM市场体制识别与潜在状态动态',
    'stock.section_decision': '算法决策支持与仓位建议信号',
    'stock.section_audit': '前一时段统计审计与预测准确度台账',
    'stock.section_events': '结构化金融事件与公司催化剂',
    'stock.section_sentiment_drift': '新闻舆情情绪与特征概念漂移监测',
    'stock.section_surface': 'D3隐含波动率曲面与波动率微笑引擎',
    'stock.section_seasonality': '季节性与日历效应Alpha分析',

    'audit.today_active_title': '今日活跃交易时段审计',
    'audit.previous_completed_title': '前一已完成交易时段审计',
    'audit.today_active_desc': '实时比对今日当前市场价格与模型昨日生成的量化预测边界。',
    'audit.previous_completed_desc': '审计该时段实际收盘价是否落于模型共形预测置信区间内。',
    'audit.current_traded_price': '当前交易价格',
    'audit.actual_close': '实际收盘价',
    'audit.session_forecast': '时段预测价格',
    'audit.prediction_error': '预测误差',
    'audit.hit_rate_5d': '近5日命中率',
    'audit.channel': '置信通道',
    'audit.range': '区间',
    'audit.bound_hit': '命中90%共形置信区间',
    'audit.bound_miss': '偏离边界',
    'audit.ledger_title': '往期交易时段准确度台账（实测收盘价 vs 预测值）',
    'audit.ledger_sub': '集成模型 v4.0 校准',
    'audit.session_date': '交易日期',
    'audit.model_forecast': '模型预测值',
    'audit.conformal_channel': '共形通道',
    'audit.abs_error': '绝对误差',
    'audit.error_pct': '误差率 %',
    'audit.status': '判定',
    'audit.hit': '命中',
    'audit.miss': '未命中',
    'audit.coverage_alignment': '100% 覆盖率对齐',

    'chart.moving_averages': '技术均线',
    'chart.trend_analysis': '趋势判定',
    'chart.sma50': '50日均线 (中期)',
    'chart.sma200': '200日均线 (长期)',
    'chart.sma20': '20日均线 (短期)',
    'chart.bollinger': '布林带',
    'chart.golden_cross': '金叉 / 强劲看涨趋势',
    'chart.death_cross': '死叉 / 弱势下行趋势',
    'chart.consolidation': '盘整震荡 / 宏观支撑',
    'chart.counter_trend': '超跌反弹',
    'chart.above': '高于',
    'chart.below': '低于',
    'chart.candle_chart': '日K线与技术指标叠加',

    'conformal.title': '共形预测置信区间',
    'conformal.predicted_price': '预测目标价',
    'conformal.predicted_return': '预期收益率',
    'conformal.lower_bound': '下限置信边界',
    'conformal.upper_bound': '上限置信边界',
    'conformal.confidence': '名义置信度',
    'conformal.horizon': '预测周期',
    'conformal.days': '天',
    'conformal.target_date': '目标日期',
    'conformal.methodology': '计算方法',

    'regime.bullish_low_vol': '看涨 / 低波动率',
    'regime.bullish_high_vol': '看涨 / 高波动率',
    'regime.bearish_low_vol': '看跌 / 低波动率',
    'regime.bearish_high_vol': '看跌 / 高波动率',
    'regime.confidence': '置信水平',
    'regime.latent_state': '潜在马尔可夫状态',

    'decision.strong_buy': '强力买入',
    'decision.buy': '买入',
    'decision.hold': '持有 (HOLD)',
    'decision.sell': '卖出',
    'decision.strong_sell': '强力卖出',
    'decision.target_price': '止盈目标价',
    'decision.stop_loss': '止损阈值',
    'decision.risk_reward': '风险收益比',

    'events.title': '结构化催化剂与公司大事件',
    'events.fed_into': '已计入模型特征权重',
    'events.expected_impact': '预期股价影响',
    'events.no_events': '近期该资产未记录重大高影响公司事件。',

    'footer.disclaimer': 'AlphaQuant AI 是定量金融研究与学习平台，预测区间不构成个别投资建议。',
    'footer.rights': '版权所有。行情数据来源于公开交易所接口。'
  }
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  languages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
  t: (key: string, defaultVal?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatPercent: (value: number, decimals?: number) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('alphaquant_language') as LanguageCode | null;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
      // Detect browser language if supported
      if (typeof navigator !== 'undefined' && navigator.language) {
        const langCode = navigator.language.split('-')[0].toLowerCase() as LanguageCode;
        if (SUPPORTED_LANGUAGES.some(l => l.code === langCode)) {
          return langCode;
        }
      }
    } catch (e) {
      // LocalStorage access error fallback
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('alphaquant_language', lang);
      document.documentElement.lang = lang;
    } catch (e) {
      // Ignore localStorage write error
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch (e) {}
  }, [language]);

  const currentLanguageMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const t = (key: string, defaultVal?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fall back to English
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return defaultVal || key;
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
    try {
      return new Intl.NumberFormat(currentLanguageMeta.locale, options).format(value);
    } catch (e) {
      return value.toLocaleString();
    }
  };

  const formatCurrency = (value: number, currency = 'INR'): string => {
    try {
      const symbol = getCurrencySymbol(currency);
      const isZeroDecimal = currency.toUpperCase() === 'KRW' || currency.toUpperCase() === 'JPY' || symbol === '₩' || symbol === '¥';
      const formatted = new Intl.NumberFormat(currentLanguageMeta.locale, {
        minimumFractionDigits: isZeroDecimal ? 0 : 2,
        maximumFractionDigits: isZeroDecimal ? 0 : 2
      }).format(value);
      return `${symbol}${formatted}`;
    } catch (e) {
      const symbol = getCurrencySymbol(currency);
      return `${symbol}${value.toFixed(2)}`;
    }
  };

  const formatPercent = (value: number, decimals = 2): string => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  };

  const formatDate = (date: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      return new Intl.DateTimeFormat(currentLanguageMeta.locale, options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(d);
    } catch (e) {
      return String(date);
    }
  };

  const value = {
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    currentLanguageMeta,
    t,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatDate
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
