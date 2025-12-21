// Dashboard functionality - FIXED with correct collection name
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard DOM Content Loaded');
  
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
      console.log('📋 User doc fetch result:', !!doc.exists);
      
      if (doc.exists) {
        const userData = doc.data();
        console.log('👨‍🏫 User role:', userData.role);
        
        // Redirect students to their own profile
        if (userData.role === 'student') {
          db.collection('students').where('email', '==', userData.email).get().then(snapshot => {
            if (!snapshot.empty) {
              const studentId = snapshot.docs[0].id;
              window.location.href = `student-detail.html?studentId=${studentId}`;
            } else {
              alert('Không tìm thấy hồ sơ học sinh. Vui lòng liên hệ giáo viên.');
              window.location.href = 'index.html';
            }
          }).catch(err => {
            console.error('❌ Error finding student:', err);
            window.location.href = 'index.html';
          });
          return;
        }
        
        // Nếu là giáo viên/admin - load dashboard
        console.log('👨‍🏫 Loading teacher dashboard');
        loadDashboardContent();
      } else {
        console.log('⚠️ User doc not found, loading dashboard anyway');
        loadDashboardContent();
      }
    }).catch(err => {
      console.error('❌ Error getting user data:', err);
      // Vẫn load dashboard ngay cả khi lỗi
      console.log('⚠️ Error loading user, but still loading dashboard');
      loadDashboardContent();
    });
  });

  function loadDashboardContent() {
    // Update user info
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      if (auth.currentUser) {
        userInfo.innerHTML = `<i class="fa-solid fa-user"></i> ${auth.currentUser.email}`;
      }
    }
    
    // Load all statistics
    loadAllStatistics();
    
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
          window.location.href = 'index.html';
        });
      });
    }
  }

  async function loadAllStatistics() {
    console.log('📊 Loading all statistics...');
    
    try {
      // Load from system_stats collection with real-time listener
      console.log('📈 Setting up real-time listener for system_stats collection...');
      
      const unsubscribe = db.collection('system_stats').onSnapshot({
        next: async (snapshot) => {
          if (!snapshot.empty) {
            // Get the first document (assuming there's only one)
            const systemStatsDoc = snapshot.docs[0];
            const systemData = systemStatsDoc.data();
            
            console.log('✅ Found system_stats:', systemData);
            
            // Update statistics from system_stats
            document.getElementById('total-classes').textContent = systemData.totalClasses || 0;
            document.getElementById('total-students').textContent = systemData.totalStudents || 0;
            
            // Calculate recent activities (count from activity_logs in last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            let recentActivities = 0;
            try {
              const logsSnapshot = await db.collection('activity_logs').get();
              logsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.createdAt) {
                  const createdAt = convertToDate(data.createdAt);
                  if (createdAt >= oneWeekAgo) {
                    recentActivities++;
                  }
                }
              });
            } catch (error) {
              console.warn('Error calculating recent activities:', error);
              recentActivities = 0;
            }
            
            document.getElementById('recent-activities').textContent = recentActivities;
            
            console.log('✅ Updated from system_stats:', {
              classes: systemData.totalClasses,
              students: systemData.totalStudents,
              recent: recentActivities
            });
          }
          
          // Load recent classes and students
          await loadRecentClasses();
          await loadRecentStudents();
        },
        error: (error) => {
          console.error('❌ Error in system_stats listener:', error);
          showErrorMessage(error.message);
        }
      });
      
      // Store unsubscribe function for cleanup
      window.systemStatsUnsubscribe = unsubscribe;
      
      // Sync counts on load
      await initializeSystemStats();
      
    } catch (error) {
      console.error('❌ Error setting up statistics listener:', error);
      showErrorMessage(error.message);
    }
  }

  async function initializeSystemStats() {
    console.log('🔄 Syncing system_stats...');
    
    try {
      // Count actual data from collections
      const classesCount = await db.collection('classes').get().then(snap => snap.size);
      const studentsCount = await db.collection('students').get().then(snap => snap.size);
      
      console.log('📊 Current counts:', { classesCount, studentsCount });
      
      // Update or create system_stats document
      const statsRef = db.collection('system_stats').doc('current');
      
      await statsRef.set({
        totalClasses: classesCount,
        totalStudents: studentsCount,
        studentsAdded: 0,
        studentsDeleted: 0,
        studentsEdited: 0,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('✅ System_stats synced');
      
    } catch (error) {
      console.error('❌ Error syncing system_stats:', error);
      throw error;
    }
  }

  async function loadRecentClasses() {
    console.log('📚 Loading recent classes...');
    
    try {
      let query = db.collection('classes');
      
      // Try ordering by createdAt if it exists
      const sampleQuery = await db.collection('classes').limit(1).get();
      if (!sampleQuery.empty) {
        const sampleData = sampleQuery.docs[0].data();
        if (sampleData.createdAt) {
          query = query.orderBy('createdAt', 'desc');
        }
      }
      
      const snapshot = await query.limit(5).get();
      const container = document.getElementById('recent-classes');
      container.innerHTML = '';
      
      if (snapshot.empty) {
        container.innerHTML = '<div class="no-data">Chưa có lớp học nào</div>';
        return;
      }
      
      const classesList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        classesList.push({
          id: doc.id,
          name: data.name || 'Chưa có tên',
          grade: data.grade || '',
          createdAt: data.createdAt
        });
      });
      
      // Sort by date if possible
      classesList.sort((a, b) => {
        const dateA = convertToDate(a.createdAt);
        const dateB = convertToDate(b.createdAt);
        return dateB - dateA;
      });
      
      classesList.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'content-list-item';
        itemElement.innerHTML = `
          <span><strong>${item.name}</strong></span>
          <small>${item.grade ? `Khối ${item.grade}` : 'Chưa có khối'}</small>
        `;
        
        itemElement.style.cursor = 'pointer';
        itemElement.addEventListener('click', () => {
          window.location.href = `classes.html?classId=${item.id}`;
        });
        
        container.appendChild(itemElement);
      });
      
      console.log('✅ Recent classes loaded:', classesList.length);
      
    } catch (error) {
      console.error('❌ Error loading recent classes:', error);
      const container = document.getElementById('recent-classes');
      container.innerHTML = '<div class="error">Lỗi tải lớp học</div>';
    }
  }

  async function loadRecentStudents() {
    console.log('👨‍🎓 Loading recent students...');
    
    try {
      let query = db.collection('students');
      
      // Try ordering by createdAt if it exists
      const sampleQuery = await db.collection('students').limit(1).get();
      if (!sampleQuery.empty) {
        const sampleData = sampleQuery.docs[0].data();
        if (sampleData.createdAt) {
          query = query.orderBy('createdAt', 'desc');
        }
      }
      
      const snapshot = await query.limit(5).get();
      const container = document.getElementById('recent-students');
      container.innerHTML = '';
      
      if (snapshot.empty) {
        container.innerHTML = '<div class="no-data">Chưa có học sinh nào</div>';
        return;
      }
      
      const studentsList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        studentsList.push({
          id: doc.id,
          name: data.name || 'Chưa có tên',
          className: data.className || 'Chưa có lớp',
          createdAt: data.createdAt
        });
      });
      
      // Sort by date if possible
      studentsList.sort((a, b) => {
        const dateA = convertToDate(a.createdAt);
        const dateB = convertToDate(b.createdAt);
        return dateB - dateA;
      });
      
      studentsList.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'content-list-item';
        itemElement.innerHTML = `
          <span><strong>${item.name}</strong></span>
          <small>${item.className}</small>
        `;
        
        itemElement.style.cursor = 'pointer';
        itemElement.addEventListener('click', () => {
          window.location.href = `student-detail.html?studentId=${item.id}`;
        });
        
        container.appendChild(itemElement);
      });
      
      console.log('✅ Recent students loaded:', studentsList.length);
      
    } catch (error) {
      console.error('❌ Error loading recent students:', error);
      const container = document.getElementById('recent-students');
      container.innerHTML = '<div class="error">Lỗi tải học sinh</div>';
    }
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

  function showErrorMessage(errorMsg) {
    console.error('❌ Dashboard error:', errorMsg);
    
    // Update stat numbers with error indication
    const statIds = ['total-classes', 'total-students', 'recent-activities'];
    statIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    
    // Show error in lists
    const listContainers = {
      'recent-classes': 'lớp học',
      'recent-students': 'học sinh'
    };
    
    Object.entries(listContainers).forEach(([id, name]) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `<div class="error">Không thể tải ${name}</div>`;
      }
    });
  }

  // Create manual update button for system_stats
  function createUpdateSystemStatsButton() {
    // Check if button already exists
    if (document.getElementById('update-stats-btn')) return;
    
    const updateBtn = document.createElement('button');
    updateBtn.id = 'update-stats-btn';
    updateBtn.innerHTML = '<i class="fa-solid fa-refresh"></i> Cập nhật thống kê';
    updateBtn.className = 'btn-primary';
    updateBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 10px 15px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    updateBtn.addEventListener('click', async () => {
      updateBtn.disabled = true;
      updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang cập nhật...';
      
      try {
        // Count actual data from collections
        const classesCount = await db.collection('classes').get().then(snap => snap.size);
        const studentsCount = await db.collection('students').get().then(snap => snap.size);
        
        console.log('🔄 Updating system_stats with:', { classesCount, studentsCount });
        
        // Update or create system_stats document
        const statsRef = db.collection('system_stats').doc('current');
        
        await statsRef.set({
          totalClasses: classesCount,
          totalStudents: studentsCount,
          studentsAdded: 0,
          studentsDeleted: 0,
          studentsEdited: 0,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Show success message
        const message = document.createElement('div');
        message.textContent = `✓ Đã cập nhật: ${classesCount} lớp, ${studentsCount} học sinh`;
        message.style.cssText = `
          position: fixed;
          bottom: 70px;
          right: 20px;
          background: #2c5530;
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          z-index: 9999;
        `;
        document.body.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => message.remove(), 3000);
        
        // Reload dashboard data
        await loadAllStatistics();
        
      } catch (error) {
        console.error('❌ Error updating system_stats:', error);
        alert('Lỗi cập nhật: ' + error.message);
      } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fa-solid fa-refresh"></i> Cập nhật thống kê';
      }
    });
    
    document.body.appendChild(updateBtn);
  }
  
  // Add update button
  createUpdateSystemStatsButton();

  // Real-time updates are handled by the listener above

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (window.systemStatsUnsubscribe) {
      window.systemStatsUnsubscribe();
    }
  });
});