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
      window.storage = window.firebase.storage();
      window.auth = window.firebase.auth && window.firebase.auth();
      console.log('Firestore, Storage and Auth are available on window.db/window.storage/window.auth');
    } catch (e) {
      console.warn('Could not initialize some Firebase services (maybe not included):', e);
    }
  } catch (err) {
    console.error('Error initializing Firebase:', err);
  }
}
