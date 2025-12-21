// Activities log page
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Activities page DOM Content Loaded');
  
  // Check authentication
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      window.location.href = 'index.html';
      return;
    }
    
    console.log('✅ User authenticated:', user.uid);
    
    // Check user role
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        
        // Redirect students to their own profile
        if (userData.role === 'student') {
          db.collection('students').where('email', '==', userData.email).get().then(snapshot => {
            if (!snapshot.empty) {
              const studentId = snapshot.docs[0].id;
              window.location.href = `student-detail.html?studentId=${studentId}`;
            } else {
              alert('Không tìm thấy hồ sơ học sinh. Vui lòng liên hệ giáo viên.');
              window.location.href = 'dashboard.html';
            }
          }).catch(err => {
            console.error('❌ Error finding student:', err);
            window.location.href = 'dashboard.html';
          });
          return;
        }
      }
      
      // Update user info
      const userInfo = document.getElementById('user-info');
      if (userInfo) {
        userInfo.innerHTML = `<i class="fa-solid fa-user"></i> ${user.email}`;
      }
      
      // Load activities
      loadActivities();
      
      // Logout button handler
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
          e.preventDefault();

          auth.signOut().then(() => {
            console.log('✅ User signed out');
            window.location.href = 'index.html';
          }).catch(error => {
            console.error('❌ Error signing out:', error);
          });
        });
      }
    });
  });

  async function loadActivities() {
    console.log('📋 Loading activities...');
    
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const snapshot = await db.collection('activity_logs').get();
      
      const container = document.getElementById('activities-list');
      container.innerHTML = '';
      
      if (snapshot.empty) {
        container.innerHTML = '<div class="no-data">Chưa có hoạt động nào</div>';
        return;
      }
      
      // Filter and sort activities from last 7 days
      const activities = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const createdAt = convertToDate(data.createdAt);
          if (createdAt >= oneWeekAgo) {
            activities.push({
              ...data,
              createdAt: createdAt
            });
          }
        }
      });
      
      // Sort by date descending
      activities.sort((a, b) => b.createdAt - a.createdAt);
      
      if (activities.length === 0) {
        container.innerHTML = '<div class="no-data">Chưa có hoạt động nào trong 7 ngày qua</div>';
        return;
      }
      
      activities.forEach(data => {
        const activityElement = createActivityElement(data);
        container.appendChild(activityElement);
      });
      
      console.log('✅ Activities loaded:', snapshot.size);
      
    } catch (error) {
      console.error('❌ Error loading activities:', error);
      const container = document.getElementById('activities-list');
      container.innerHTML = '<div class="error">Lỗi tải nhật ký hoạt động: ' + error.message + '</div>';
    }
  }

  function createActivityElement(data) {
    const item = document.createElement('div');
    item.className = 'content-list-item activity-item';
    
    const timestamp = data.createdAt instanceof Date ? data.createdAt : convertToDate(data.createdAt);
    const timeString = timestamp.toLocaleString('vi-VN');
    
    let icon = 'fa-question';
    let color = '#666';
    let actionText = data.action;
    let details = '';
    
    switch(data.action) {
      case 'add_student':
        icon = 'fa-user-plus';
        color = '#2c5530';
        actionText = 'Thêm học sinh';
        details = `${data.details.name} vào lớp ${data.details.className}`;
        break;
      case 'edit_student':
        icon = 'fa-user-edit';
        color = '#2563eb';
        actionText = 'Sửa học sinh';
        details = `${data.details.name} trong lớp ${data.details.className}`;
        break;
      case 'remove_student_from_class':
        icon = 'fa-user-minus';
        color = '#dc2626';
        actionText = 'Xóa học sinh khỏi lớp';
        details = `Học sinh khỏi lớp`;
        break;
      case 'add_class':
        icon = 'fa-plus-circle';
        color = '#2c5530';
        actionText = 'Thêm lớp học';
        details = `${data.details.name} (Khối ${data.details.grade})`;
        break;
      case 'edit_class':
        icon = 'fa-edit';
        color = '#2563eb';
        actionText = 'Sửa lớp học';
        details = `${data.details.name} (Khối ${data.details.grade})`;
        break;
      case 'delete_class':
        icon = 'fa-trash';
        color = '#dc2626';
        actionText = 'Xóa lớp học';
        details = `${data.details.name} (Khối ${data.details.grade})`;
        break;
      default:
        actionText = data.action;
    }
    
    item.innerHTML = `
      <div class="activity-icon" style="color: ${color};">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${actionText}</div>
        <div class="activity-details">${details}</div>
        <div class="activity-time">${timeString}</div>
      </div>
    `;
    
    return item;
  }

  function convertToDate(timestamp) {
    if (!timestamp) return new Date(0);
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      } else if (timestamp._seconds !== undefined) {
        return new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp);
      } else if (timestamp instanceof Date) {
        return timestamp;
      } else if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000);
      } else {
        return new Date(0);
      }
    } catch (e) {
      console.warn('⚠️ Could not convert timestamp:', timestamp, e);
      return new Date(0);
    }
  }
});