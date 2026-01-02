// Authentication handling with deleted account check (NO INDEX REQUIRED)
let redirectInProgress = false; // Flag to prevent redirect loops

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔐 Auth system initialized');
  
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

    // ========================================
    // REGISTER NEW USER - FIXED NO INDEX
    // ========================================
    btnRegister.addEventListener('click', async function() {
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;

      if (!name || !email || !password) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
      }

      // Kiểm tra định dạng email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Email không hợp lệ! Vui lòng nhập email đúng định dạng.');
        return;
      }

      try {
        // ========================================
        // KIỂM TRA EMAIL TRÙNG - KHÔNG DÙNG COMPOSITE INDEX
        // ========================================
        let emailExists = false;
        let emailExistsMessage = '';
        
        // 1. Kiểm tra trong students collection
        console.log(`🔍 Checking email in students: ${email}`);
        try {
          const studentSnapshot = await db.collection('students')
            .where('email', '==', email)
            .get();
          
          if (!studentSnapshot.empty) {
            // Lọc thủ công trên client để kiểm tra isDeleted
            studentSnapshot.forEach(doc => {
              const data = doc.data();
              if (!data.isDeleted || data.isDeleted === false) {
                emailExists = true;
                emailExistsMessage = 'Email này đã tồn tại trong danh sách học sinh!';
              }
            });
          }
        } catch (studentError) {
          console.error('❌ Error checking students:', studentError);
          // Vẫn tiếp tục kiểm tra users
        }
        
        // 2. Kiểm tra trong users collection (nếu chưa tồn tại)
        if (!emailExists) {
          console.log(`🔍 Checking email in users: ${email}`);
          try {
            const userSnapshot = await db.collection('users')
              .where('email', '==', email)
              .get();
            
            if (!userSnapshot.empty) {
              // Lọc thủ công trên client
              userSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.isDeleted || data.isDeleted === false) {
                  emailExists = true;
                  emailExistsMessage = 'Email này đã được đăng ký!';
                }
              });
            }
          } catch (userError) {
            console.error('❌ Error checking users:', userError);
          }
        }
        
        if (emailExists) {
          alert(`❌ ${emailExistsMessage}`);
          return;
        }

        // ========================================
        // TẠO TÀI KHOẢN MỚI
        // ========================================
        console.log('👤 Creating new user account...');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user profile to Firestore
        await db.collection('users').doc(user.uid).set({
          name: name,
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isDeleted: false
        });

        // If student role, create student record
        if (role === 'student') {
          console.log('🎓 Creating student record...');
          await db.collection('students').add({
            name: name,
            email: email,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isDeleted: false
          });
        }

        console.log('✅ User registered successfully');
        alert('✅ Đăng ký thành công!');
        window.location.href = 'dashboard.html';
        
      } catch (error) {
        console.error('❌ Registration error:', error);
        let errorMessage = 'Lỗi đăng ký: ';
        
        switch(error.code) {
          case 'auth/email-already-in-use':
            errorMessage += 'Email đã được sử dụng.';
            break;
          case 'auth/invalid-email':
            errorMessage += 'Email không hợp lệ.';
            break;
          case 'auth/weak-password':
            errorMessage += 'Mật khẩu quá yếu (ít nhất 6 ký tự).';
            break;
          default:
            errorMessage += error.message;
        }
        
        alert(errorMessage);
      }
    });

    // ========================================
    // LOGIN USER - FIXED NO INDEX
    // ========================================
    btnLogin.addEventListener('click', async function() {
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        alert('Vui lòng nhập email và mật khẩu!');
        return;
      }

      // Kiểm tra định dạng email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        alert('Email không hợp lệ! Vui lòng nhập email đúng định dạng.');
        return;
      }

      // Hàm gửi lại mã xác nhận
      async function resendStudentVerificationCode(studentDoc, studentData) {
        try {
          const response = await fetch('http://localhost:3000/send-verification-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentEmail: email,
              studentName: studentData.name || 'Học sinh'
            })
          });

          const result = await response.json();
          if (result.success && result.verificationCode) {
            await db.collection('students').doc(studentDoc.id).update({
              verificationCode: result.verificationCode,
              verificationCodeCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('✅ Đã gửi lại mã xác nhận qua email. Vui lòng kiểm tra Gmail và nhập mã làm mật khẩu.');
            return true;
          }

          alert('❌ Không thể gửi mã xác nhận: ' + (result.message || 'Unknown error'));
          return false;
        } catch (err) {
          console.error('❌ Error sending verification code:', err);
          alert('❌ Không thể gửi mã xác nhận: ' + err.message);
          return false;
        }
      }

      try {
        console.log(`🔐 Attempting login for: ${email}`);
        
        // ========================================
        // TRƯỚC TIÊN THỬ ĐĂNG NHẬP FIREBASE TRỰC TIẾP
        // ========================================
        try {
          // Thử đăng nhập như user bình thường (giáo viên/admin)
          const userCredential = await auth.signInWithEmailAndPassword(email, password);
          const user = userCredential.user;
          
          console.log('✅ Firebase login successful, checking user role...');
          
          // Kiểm tra user trong collection users
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (!userDoc.exists) {
            console.log('❌ User not found in users collection, signing out...');
            await auth.signOut();
            alert('❌ Tài khoản không tồn tại trong hệ thống!');
            return;
          }
          
          const userData = userDoc.data();
          
          // KIỂM TRA TÀI KHOẢN ĐÃ BỊ XÓA
          if (userData.isDeleted === true) {
            await auth.signOut();
            alert('❌ Tài khoản đã bị xóa! Vui lòng liên hệ quản trị viên.');
            return;
          }
          
          // Nếu là học sinh, chuyển hướng đến trang hồ sơ
          if (userData.role === 'student') {
            console.log('🎓 User is a student, finding student record...');
            
            // Tìm student record bằng email
            const studentSnapshot = await db.collection('students')
              .where('email', '==', email)
              .get();
            
            if (!studentSnapshot.empty) {
              // Lọc thủ công trên client
              let activeStudent = null;
              let studentId = null;
              
              studentSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.isDeleted || data.isDeleted === false) {
                  activeStudent = data;
                  studentId = doc.id;
                }
              });
              
              if (activeStudent) {
                window.location.href = `student-detail.html?studentId=${studentId}`;
                return;
              } else {
                await auth.signOut();
                alert('❌ Tài khoản học sinh đã bị xóa!');
                return;
              }
            } else {
              await auth.signOut();
              alert('❌ Không tìm thấy hồ sơ học sinh!');
              return;
            }
          }
          
          // Nếu là giáo viên/admin, chuyển đến dashboard
          console.log('👨‍🏫 User is teacher/admin, redirecting to dashboard');
          window.location.href = 'dashboard.html';
          return;
          
        } catch (firebaseError) {
          console.log('⚠️ Firebase auth failed:', firebaseError.code);
          
          // Nếu lỗi là user-not-found hoặc wrong-password, có thể là học sinh
          if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
            
            // ========================================
            // THỬ ĐĂNG NHẬP NHƯ HỌC SINH (DÙNG MÃ XÁC NHẬN)
            // ========================================
            console.log('🎓 Trying student login...');
            
            // Tìm student với email
            const studentSnapshot = await db.collection('students')
              .where('email', '==', email)
              .get();
            
            if (studentSnapshot.empty) {
              alert('❌ Email không tồn tại trong hệ thống!');
              return;
            }
            
            // Lọc thủ công trên client
            let activeStudent = null;
            let studentDoc = null;
            
            studentSnapshot.forEach(doc => {
              const data = doc.data();
              if (!data.isDeleted || data.isDeleted === false) {
                activeStudent = data;
                studentDoc = doc;
              }
            });
            
            if (!activeStudent) {
              alert('❌ Tài khoản học sinh đã bị xóa!');
              return;
            }
            
            const studentData = activeStudent;
            const verificationCode = studentData.verificationCode;
            
            if (!verificationCode) {
              const ok = confirm('Tài khoản học sinh chưa có mã xác nhận. Bạn muốn gửi mã qua email ngay bây giờ không?');
              if (ok) {
                await resendStudentVerificationCode(studentDoc, studentData);
              }
              return;
            }
            
            if (password !== verificationCode) {
              const ok = confirm('❌ Mã xác nhận không đúng. Bạn muốn gửi lại mã qua email không?');
              if (ok) {
                await resendStudentVerificationCode(studentDoc, studentData);
              }
              return;
            }
            
            // Mã xác nhận đúng - tạo/đăng nhập Firebase user
            console.log('✅ Verification code correct, creating Firebase account...');
            
            try {
              // Tạo Firebase account cho học sinh nếu chưa có
              let authUser = null;
              try {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                authUser = result.user;
                console.log('✅ Created new Firebase account for student');
              } catch (createError) {
                // Nếu đã tồn tại, thử đăng nhập với mã xác nhận
                if (createError.code === 'auth/email-already-in-use') {
                  const result = await auth.signInWithEmailAndPassword(email, password);
                  authUser = result.user;
                  console.log('✅ Logged into existing Firebase account');
                } else {
                  throw createError;
                }
              }
              
              // Tạo/update user document
              await db.collection('users').doc(authUser.uid).set({
                email: email,
                name: studentData.name,
                role: 'student',
                studentId: studentDoc.id,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isDeleted: false
              }, { merge: true });
              
              console.log('✅ Student login successful');
              alert('✅ Đăng nhập thành công!');
              window.location.href = `student-detail.html?studentId=${studentDoc.id}`;
              
            } catch (studentAuthError) {
              console.error('❌ Student auth error:', studentAuthError);
              alert('❌ Lỗi đăng nhập học sinh: ' + studentAuthError.message);
            }
            
          } else {
            // Các lỗi Firebase khác
            console.error('❌ Firebase auth error:', firebaseError);
            alert('❌ Lỗi đăng nhập: ' + firebaseError.message);
          }
        }
        
      } catch (error) {
        console.error('❌ Login error:', error);
        alert('❌ Lỗi đăng nhập: ' + error.message);
      }
    });
  }

  // ========================================
  // LOGOUT FUNCTIONALITY
  // ========================================
  const logoutButtons = document.querySelectorAll('#btn-logout');
  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Đăng xuất Firebase
        auth.signOut().then(() => {
          console.log('✅ User logged out successfully');
          window.location.href = 'index.html';
        }).catch((error) => {
          console.error('❌ Logout error:', error);
          // Vẫn chuyển về login page
          window.location.href = 'index.html';
        });
      });
    }
  });

  // ========================================
  // AUTH STATE OBSERVER - FIXED NO INDEX
  // ========================================
  auth.onAuthStateChanged(async (user) => {
    // Tránh redirect lặp lại
    if (redirectInProgress) {
      console.log('⏳ Redirect already in progress, skipping...');
      return;
    }
    
    // Parse current page
    const fullPath = window.location.pathname;
    let currentPage = fullPath.split('/').pop();
    if (!currentPage || currentPage === '') {
      currentPage = 'index.html';
    }
    
    console.log('📍 Current page:', currentPage);
    console.log('🔐 Auth state:', user ? 'Logged in' : 'Logged out');
    
    // Kiểm tra nếu đã đăng nhập
    if (user) {
      try {
        // Lấy thông tin user từ Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          console.log('❌ User not found in database, signing out...');
          await auth.signOut();
          return;
        }
        
        const userData = userDoc.data();
        
        // Kiểm tra tài khoản đã bị xóa
        if (userData.isDeleted === true) {
          console.log('❌ Account is deleted, signing out...');
          await auth.signOut();
          alert('❌ Tài khoản của bạn đã bị xóa!');
          return;
        }
        
        // Nếu đang ở trang login, redirect về đúng trang
        const isIndexPage = currentPage === 'index.html' || currentPage === '';
        if (isIndexPage) {
          redirectInProgress = true;
          
          if (userData.role === 'student') {
            // Tìm student record
            const studentSnapshot = await db.collection('students')
              .where('email', '==', userData.email)
              .get();
            
            if (!studentSnapshot.empty) {
              // Lọc thủ công
              let studentId = null;
              studentSnapshot.forEach(doc => {
                const data = doc.data();
                if (!data.isDeleted || data.isDeleted === false) {
                  studentId = doc.id;
                }
              });
              
              if (studentId) {
                console.log(`🔄 Redirecting student to detail page: ${studentId}`);
                window.location.href = `student-detail.html?studentId=${studentId}`;
                return;
              }
            }
          } else {
            // Giáo viên/admin
            console.log('🔄 Redirecting to dashboard');
            window.location.href = 'dashboard.html';
            return;
          }
        }
        
        // Hiển thị thông tin user nếu có element
        const userInfoEl = document.getElementById('user-info');
        if (userInfoEl && userData.name) {
          let roleText = '';
          switch(userData.role) {
            case 'admin': roleText = 'Quản trị'; break;
            case 'teacher': roleText = 'Giáo viên'; break;
            case 'student': roleText = 'Học sinh'; break;
            default: roleText = userData.role;
          }
          userInfoEl.textContent = `${userData.name} (${roleText})`;
        }
        
      } catch (error) {
        console.error('❌ Error in auth state observer:', error);
        // Nếu có lỗi, đăng xuất để an toàn
        try {
          await auth.signOut();
        } catch (signOutError) {
          console.error('❌ Error signing out:', signOutError);
        }
      }
      
    } else {
      // Người dùng chưa đăng nhập
      // Kiểm tra nếu đang ở trang cần đăng nhập thì redirect
      const protectedPages = [
        'dashboard.html', 
        'student-dashboard.html', 
        'students.html', 
        'classes.html',
        'student-detail.html',
        'activities.html'
      ];
      
      if (protectedPages.includes(currentPage)) {
        console.log('🔒 Access denied, redirecting to login');
        redirectInProgress = true;
        window.location.href = 'index.html';
      }
    }
  });
});