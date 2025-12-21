// Initialize Firebase app using compat SDK loaded from CDN
if (!window.firebase) {
  console.warn('Firebase SDK not found. Make sure firebase-app-compat script is loaded.');
} else {
  try {
    if (!window.firebase.apps || window.firebase.apps.length === 0) {
      window.firebase.initializeApp(window.firebaseConfig);
      console.log('Firebase initialized');
    } else {
      console.log('Firebase already initialized');
    }

    // Expose commonly used services
    try {
      window.db = window.firebase.firestore();
      console.log('Firestore is available on window.db');
    } catch (e) {
      console.warn('Firestore not available:', e);
    }
    
    try {
      window.auth = window.firebase.auth();
      console.log('Auth is available on window.auth');
    } catch (e) {
      console.warn('Auth not available:', e);
    }
    
    try {
      window.storage = window.firebase.storage();
      console.log('Storage is available on window.storage');
    } catch (e) {
      console.warn('Storage not available:', e);
    }
  } catch (err) {
    console.error('Error initializing Firebase:', err);
  }
}
