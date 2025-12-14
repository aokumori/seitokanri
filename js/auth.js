// Authentication handling
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on login page
  if (document.getElementById('btn-login')) {
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    // Switch between login and register forms
    showRegister.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('register-form').classList.remove('hidden');
    });

    showLogin.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('login-form').classList.remove('hidden');
      document.getElementById('register-form').classList.add('hidden');
    });

    // Register new user
    btnRegister.addEventListener('click', async function() {
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;

      if (!name || !email || !password) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
      }

      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user profile to Firestore
        await db.collection('users').doc(user.uid).set({
          name: name,
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = 'dashboard.html';
      } catch (error) {
        alert('Lỗi đăng ký: ' + error.message);
      }
    });

    // Login user
    btnLogin.addEventListener('click', async function() {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'dashboard.html';
      } catch (error) {
        alert('Lỗi đăng nhập: ' + error.message);
      }
    });
  }

  // Logout functionality
  const logoutButtons = document.querySelectorAll('#btn-logout');
  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', function() {
        auth.signOut().then(() => {
          window.location.href = 'index.html';
        });
      });
    }
  });

  // Auth state observer
  auth.onAuthStateChanged(user => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (user && currentPage === 'index.html') {
      window.location.href = 'dashboard.html';
    } else if (!user && currentPage !== 'index.html') {
      window.location.href = 'index.html';
    } else if (user && currentPage !== 'index.html') {
      // Load user info
      db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
          const userData = doc.data();
          const userInfoEl = document.getElementById('user-info');
          if (userInfoEl) {
            userInfoEl.textContent = `${userData.name} (${userData.role === 'admin' ? 'Quản trị' : 'Giáo viên'})`;
          }
        }
      });
    }
  });
});