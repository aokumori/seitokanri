// Authentication handling
let redirectInProgress = false; // Flag to prevent redirect loops

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
        // Check if email already exists in student list
        const existingStudent = await db.collection('students').where('email', '==', email).get();
        if (!existingStudent.empty) {
          alert('Email này đã tồn tại trong danh sách học sinh!');
          return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user profile to Firestore
        await db.collection('users').doc(user.uid).set({
          name: name,
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // If student role, create or update student record
        if (role === 'student') {
          // Create new student record
          await db.collection('students').add({
            name: name,
            email: email,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ Student record created');
        }

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
        // Kiểm tra xem email có phải học sinh không
        const studentSnapshot = await db.collection('students').where('email', '==', email).get();

        if (!studentSnapshot.empty) {
          // Đây là học sinh - kiểm tra mã xác nhận thay vì password
          const studentDoc = studentSnapshot.docs[0];
          const studentData = studentDoc.data();
          const verificationCode = studentData.verificationCode;

          if (!verificationCode) {
            alert('❌ Lỗi: Tài khoản chưa được kích hoạt. Vui lòng liên hệ giáo viên.');
            return;
          }

          if (password !== verificationCode) {
            alert('❌ Mã xác nhận không đúng. Vui lòng kiểm tra email của bạn.');
            return;
          }

          // Mã xác nhận đúng - đăng nhập Firebase
          console.log('✅ Mã xác nhận đúng, đang đăng nhập học sinh:', email);
          
          try {
            // Tạo hoặc đăng nhập Firebase user
            let authUser = null;
            try {
              // Thử đăng nhập trước
              const result = await auth.signInWithEmailAndPassword(email, password);
              authUser = result.user;
            } catch (signInError) {
              // Nếu user không tồn tại, tạo mới
              if (signInError.code === 'auth/user-not-found') {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                authUser = result.user;
              } else {
                throw signInError;
              }
            }
            
            // Tạo user doc trong users collection với role='student'
            await db.collection('users').doc(authUser.uid).set({
              email: email,
              name: studentData.name,
              role: 'student',
              studentId: studentDoc.id,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Đăng nhập học sinh thành công');
            window.location.href = `student-detail.html?studentId=${studentDoc.id}`;
          } catch (error) {
            console.error('❌ Lỗi đăng nhập Firebase:', error);
            alert('❌ Lỗi đăng nhập: ' + error.message);
          }
          return;
        } else {
          // Đây là giáo viên - đăng nhập bình thường
          await auth.signInWithEmailAndPassword(email, password);
          
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        alert('❌ Lỗi đăng nhập: ' + error.message);
      }
    });
  }

  // Logout functionality
  const logoutButtons = document.querySelectorAll('#btn-logout');
  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', function() {
        // Đăng xuất Firebase
        auth.signOut().then(() => {
          window.location.href = 'index.html';
        }).catch(() => {
          // Nếu lỗi Firebase (e.g. student không có Firebase auth), vẫn chuyển về login
          window.location.href = 'index.html';
        });
      });
    }
  });

  // Auth state observer
  auth.onAuthStateChanged(user => {
    // Tránh redirect lặp lại
    if (redirectInProgress) {
      console.log('⏳ Redirect already in progress, skipping...');
      return;
    }
    
    // Parse current page - handle full paths
    const fullPath = window.location.pathname;
    let currentPage = fullPath.split('/').pop();
    if (!currentPage || currentPage === '') {
      currentPage = 'index.html';
    }
    
    console.log('📍 Full path:', fullPath);
    console.log('📄 Current page:', currentPage);
    
    // Chỉ check Firebase auth - không dùng localStorage
    const isLoggedIn = !!user;
    
    console.log('🔐 Auth check:', {
      user: !!user,
      isLoggedIn,
      currentPage
    });
    
    // LOGIC: Redirect nếu cần thiết
    const isIndexPage = currentPage === 'index.html' || currentPage === '';
    const isDashboardPage = currentPage.includes('dashboard') || currentPage.includes('classes') || currentPage.includes('students') || currentPage.includes('activities');
    
    if (isLoggedIn && isIndexPage) {
      // ✅ Đã đăng nhập nhưng ở login page → chuyển dashboard
      console.log('✅ Logged in on login page, redirecting to dashboard...');
      redirectInProgress = true;
      window.location.href = 'dashboard.html';
      return;
    } 
    
    if (!isLoggedIn && !isIndexPage) {
      // ❌ Chưa đăng nhập nhưng ở page khác login → chuyển login
      console.log('❌ Not logged in on protected page, redirecting to login...');
      redirectInProgress = true;
      window.location.href = 'index.html';
      return;
    }
    
    if (isLoggedIn && isDashboardPage) {
      // ✅ Đã đăng nhập ở dashboard → load thông tin
      console.log('✅ Logged in, displaying user info...');
      
      if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            const userInfoEl = document.getElementById('user-info');
            if (userInfoEl) {
              let roleText = 'Giáo viên';
              if (userData.role === 'admin') roleText = 'Quản trị';
              else if (userData.role === 'student') roleText = 'Học sinh';
              userInfoEl.textContent = `${userData.name} (${roleText})`;
            }
            console.log('👨‍🏫 User:', userData.name);
          }
        });
      }
    }
  });
});