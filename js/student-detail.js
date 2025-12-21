// Student detail management - FIXED VERSION
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Student Detail DOM Content Loaded');
  
  // Use Firebase auth only - no localStorage
  
  // Nếu không phải học sinh - check Firebase auth
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
        initStudentDetail(userData.role);
      } else {
        initStudentDetail('teacher');
      }
    });
  });

  // Clean up orphaned students (students with non-existent classId) to prevent duplicate emails
  async function cleanupOrphanedStudents() {
    try {
      console.log('🧹 Cleaning up orphaned students...');
      
      // Get all classes
      const classesSnapshot = await db.collection('classes').get();
      const validClassIds = new Set();
      classesSnapshot.forEach(doc => {
        validClassIds.add(doc.id);
      });
      
      // Get all students
      const studentsSnapshot = await db.collection('students').get();
      let orphanedCount = 0;
      
      const deletePromises = [];
      studentsSnapshot.forEach(doc => {
        const studentData = doc.data();
        // If student has a classId that doesn't exist in classes, delete it
        if (studentData.classId && !validClassIds.has(studentData.classId)) {
          console.log(`🗑️ Deleting orphaned student ${doc.id} (classId: ${studentData.classId} not found)`);
          deletePromises.push(db.collection('students').doc(doc.id).delete());
          orphanedCount++;
        }
      });
      
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
        console.log(`✅ Cleaned up ${orphanedCount} orphaned students`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up orphaned students:', error);
    }
  }

  // Trim navbar for student view - only show logout
  function trimStudentNavbar() {
    console.log('🔧 Trimming navbar for student view');
    
    // Hide all nav items except logout
    const navItems = document.querySelectorAll('nav a, nav button, nav li');
    navItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const id = item.id ? item.id.toLowerCase() : '';
      
      // Show logout button/link
      if (text.includes('đăng xuất') || text.includes('logout') || id.includes('logout')) {
        item.style.display = 'inline-block';
      } else {
        item.style.display = 'none';
      }
    });
    
    // Make sure logout button is visible
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-block';
    }
  }

  function initStudentDetail(userRole) {
    console.log('🎯 Initializing student detail management');
    console.log('👤 User role:', userRole);
    
    // Get student ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');
    
    if (!studentId) {
      console.error('❌ No student ID provided');
      window.location.href = 'classes.html';
      return;
    }
    
    // Initialize after cleanup
    async function setupStudentDetail() {
      try {
        // Clean up orphaned students first
        await cleanupOrphanedStudents();
        console.log('✅ Cleanup complete, proceeding with initialization');
        
        // Check if student is trying to view someone else's profile
        if (userRole === 'student') {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.error('❌ No current Firebase user');
            window.location.href = 'dashboard.html';
            return;
          }
          
          const userDoc = await db.collection('users').doc(currentUser.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            // Find student record for this user
            const studentSnapshot = await db.collection('students').where('email', '==', userData.email).get();
            if (!studentSnapshot.empty) {
              const studentDoc = studentSnapshot.docs[0];
              if (studentId !== studentDoc.id) {
                console.error('❌ Student can only view their own profile');
                alert('Bạn chỉ có thể xem thông tin của chính mình!');
                window.location.href = 'student-detail.html?studentId=' + studentDoc.id;
                return;
              }
            }
          }
        }
        
        console.log('📝 Loading student details for:', studentId);
        continueInitialization(studentId);
      } catch (error) {
        console.error('❌ Error during setup:', error);
        alert('Lỗi khởi tạo trang: ' + error.message);
      }
    }
    
    function continueInitialization(studentId) {
      console.log('📝 Continuing student detail initialization for:', studentId);
      
      // If student, trim navbar to only show logout
      if (userRole === 'student') {
        console.log('👨‍🎓 Setting up student view - trimming navbar');
        trimStudentNavbar();
      }
    
    // Elements
    const btnBack = document.getElementById('btn-back-to-class');
    const studentName = document.getElementById('student-name');
    const studentCode = document.getElementById('student-code');
    const studentBirthdate = document.getElementById('student-birthdate');
    const studentGender = document.getElementById('student-gender');
    const studentPhone = document.getElementById('student-phone');
    const studentEmail = document.getElementById('student-email');
    const studentClass = document.getElementById('student-class');
    const studentPhoto = document.getElementById('student-photo');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    // Button elements
    const btnAddAchievement = document.getElementById('btn-add-achievement');
    const btnAddConduct = document.getElementById('btn-add-conduct');
    const btnAddScore = document.getElementById('btn-add-score');
    const btnAddNote = document.getElementById('btn-add-note');
    
    // Modal elements
    const saveAchievementBtn = document.getElementById('save-achievement');
    const closeAchievementModalBtn = document.getElementById('close-achievement-modal');
    const saveConductBtn = document.getElementById('save-conduct');
    const closeConductModalBtn = document.getElementById('close-conduct-modal');
    const saveScoreBtn = document.getElementById('save-score');
    const closeScoreModalBtn = document.getElementById('close-score-modal');
    const saveNoteBtn = document.getElementById('save-note');
    const closeNoteModalBtn = document.getElementById('close-note-modal');
    
    let currentStudentId = studentId;
    
    // =========================
    // Event Listeners
    // =========================
    btnBack.addEventListener('click', function(e) {
      e.preventDefault();
      window.history.back();
    });
    
    // Tab switching
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        
        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Show corresponding tab pane
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // Load data for the tab if needed
        if (tabId === 'scores') {
          loadStudentScores();
        } else if (tabId === 'achievement') {
          loadStudentAchievements();
        } else if (tabId === 'conduct') {
          loadStudentConduct();
        } else if (tabId === 'notes') {
          loadStudentNotes();
        }
      });
    });
    
    // Modal buttons
    if (btnAddAchievement) {
      btnAddAchievement.addEventListener('click', function() {
        showModal('add-achievement-modal');
      });
    }
    
    if (btnAddConduct) {
      btnAddConduct.addEventListener('click', function() {
        showModal('add-conduct-modal');
      });
    }
    
    if (btnAddScore) {
      btnAddScore.addEventListener('click', function() {
        showModal('add-score-modal');
      });
    }
    
    if (btnAddNote) {
      btnAddNote.addEventListener('click', function() {
        showModal('add-note-modal');
      });
    }
    
    // Modal close buttons
    if (closeAchievementModalBtn) {
      closeAchievementModalBtn.addEventListener('click', function() {
        hideModal('add-achievement-modal');
      });
    }
    
    if (closeConductModalBtn) {
      closeConductModalBtn.addEventListener('click', function() {
        hideModal('add-conduct-modal');
      });
    }
    
    if (closeScoreModalBtn) {
      closeScoreModalBtn.addEventListener('click', function() {
        hideModal('add-score-modal');
      });
    }
    
    if (closeNoteModalBtn) {
      closeNoteModalBtn.addEventListener('click', function() {
        hideModal('add-note-modal');
      });
    }
    
    // Save buttons
    if (saveAchievementBtn) {
      saveAchievementBtn.addEventListener('click', saveAchievement);
    }
    
    if (saveConductBtn) {
      saveConductBtn.addEventListener('click', saveConduct);
    }
    
    if (saveScoreBtn) {
      saveScoreBtn.addEventListener('click', saveScore);
    }
    
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', saveNote);
    }
    
    // =========================
    // Core Functions
    // =========================
    
    // Load student basic info
    function loadStudentInfo() {
      db.collection('students').doc(currentStudentId).get()
        .then(doc => {
          if (doc.exists) {
            const data = doc.data();
            console.log('📋 Student data loaded:', data);
            
            // Update user info in navbar
            if (userRole === 'student') {
              const userInfo = document.getElementById('user-info');
              if (userInfo && data.name) {
                userInfo.innerHTML = `<i class="fa-solid fa-user"></i> ${data.name}`;
              }
            }
            
            // Update UI - FIXED: Ensure all fields are properly set
            studentName.textContent = data.name || 'Chưa có tên';
            studentCode.textContent = `Mã HS: ${data.studentId || 'Chưa có'}`;
            studentBirthdate.textContent = data.birthdate || 'Chưa cập nhật';
            studentGender.textContent = getGenderText(data.gender);
            studentPhone.textContent = data.phone || 'Chưa cập nhật';
            studentEmail.textContent = data.email || 'Chưa cập nhật';
            studentClass.textContent = data.className || 'Chưa có lớp';
            
            // Update page title
            document.getElementById('student-detail-title').textContent = data.name || 'Chi tiết học sinh';
            
            // Update photo - FIXED: Properly handle photo display
            if (data.photoURL) {
              studentPhoto.innerHTML = `<img src="${data.photoURL}" alt="${data.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            } else {
              studentPhoto.innerHTML = '<div class="no-photo" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:60px;border-radius:50%;">📷</div>';
            }
            
            // Load additional data for active tab
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
              const tabId = activeTab.getAttribute('data-tab');
              if (tabId === 'scores') {
                loadStudentScores();
              } else if (tabId === 'achievement') {
                loadStudentAchievements();
              } else if (tabId === 'conduct') {
                loadStudentConduct();
              } else if (tabId === 'notes') {
                loadStudentNotes();
              }
            }
          } else {
            alert('Không tìm thấy thông tin học sinh!');
            window.location.href = 'classes.html';
          }
        })
        .catch(error => {
          console.error('❌ Error loading student data:', error);
          alert('Lỗi tải thông tin học sinh: ' + error.message);
        });
    }
    
    function getGenderText(gender) {
      switch(gender) {
        case 'male': return 'Nam';
        case 'female': return 'Nữ';
        default: return 'Chưa cập nhật';
      }
    }
    
    // Load student achievements
    function loadStudentAchievements() {
      const achievementList = document.getElementById('achievement-list');
      if (!achievementList) return;
      
      achievementList.innerHTML = '<div class="loading">Đang tải thành tích...</div>';
      
      db.collection('student_achievements')
        .where('studentId', '==', currentStudentId)
        .get()
        .then(snapshot => {
          achievementList.innerHTML = '';
          
          if (snapshot.empty) {
            achievementList.innerHTML = '<div class="no-data">Chưa có thành tích nào</div>';
            return;
          }
          
          // Sort client-side instead of server-side
          let achievements = [];
          snapshot.forEach(doc => {
            achievements.push({ id: doc.id, ...doc.data() });
          });
          
          achievements.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
          });
          
          achievements.forEach(data => {
            const achievementElement = document.createElement('div');
            achievementElement.className = 'achievement-item glass';
            const subjectText = getSubjectText(data.subject);
            const coefficientText = `Hệ số ${data.coefficient || 1}`;
            
            achievementElement.innerHTML = `
              <div class="achievement-header">
                <h4 style="color:#2c5530;">${subjectText}: ${data.score}/10</h4>
                <span class="achievement-date">${formatDate(data.date)}</span>
              </div>
              <div class="achievement-type" style="background:rgba(44,85,48,0.2);color:#2c5530;padding:4px 12px;border-radius:20px;font-size:14px;margin-bottom:15px;display:inline-block;">
                ${coefficientText}
              </div>
              <div class="achievement-actions">
                <button class="btn-small btn-edit edit-achievement" data-id="${data.id}" type="button">Sửa</button>
                <button class="btn-small btn-delete delete-achievement" data-id="${data.id}" type="button">Xóa</button>
              </div>
            `;
            achievementList.appendChild(achievementElement);
          });
          
          // Attach event listeners
          achievementList.querySelectorAll('.edit-achievement').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const achievementId = e.target.dataset.id;
              console.log('✏️ Edit achievement clicked:', achievementId);
              // Implement edit functionality
            });
          });
          
          achievementList.querySelectorAll('.delete-achievement').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const achievementId = e.target.dataset.id;
              if (confirm('Bạn có chắc muốn xóa thành tích này?')) {
                deleteAchievement(achievementId);
              }
            });
          });
        })
        .catch(error => {
          console.error('❌ Error loading achievements:', error);
          achievementList.innerHTML = '<div class="error">Lỗi tải thành tích: ' + error.message + '</div>';
        });
    }
    
    // Load student conduct
    function loadStudentConduct() {
      const conductList = document.getElementById('conduct-list');
      if (!conductList) return;
      
      conductList.innerHTML = '<div class="loading">Đang tải hạnh kiểm...</div>';
      
      db.collection('student_conduct')
        .where('studentId', '==', currentStudentId)
        .get()
        .then(snapshot => {
          conductList.innerHTML = '';
          
          if (snapshot.empty) {
            conductList.innerHTML = '<div class="no-data">Chưa có đánh giá hạnh kiểm</div>';
            return;
          }
          
          // Sort client-side
          let conducts = [];
          snapshot.forEach(doc => {
            conducts.push({ id: doc.id, ...doc.data() });
          });
          
          conducts.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
          });
          
          conducts.forEach(data => {
            const conductElement = document.createElement('div');
            conductElement.className = 'conduct-item glass';
            conductElement.innerHTML = `
              <div class="conduct-header">
                <h4 style="color:#2c5530;">${getConductTypeText(data.type)}</h4>
                <span class="conduct-date">${formatDate(data.date)}</span>
              </div>
              <p style="color:#2c5530;">${data.description || ''}</p>
              <div class="conduct-actions">
                <button class="btn-small btn-edit edit-conduct" data-id="${data.id}" type="button">Sửa</button>
                <button class="btn-small btn-delete delete-conduct" data-id="${data.id}" type="button">Xóa</button>
              </div>
            `;
            conductList.appendChild(conductElement);
          });
        })
        .catch(error => {
          console.error('❌ Error loading conduct:', error);
          conductList.innerHTML = '<div class="error">Lỗi tải hạnh kiểm: ' + error.message + '</div>';
        });
    }
    
    // Load student scores
    function loadStudentScores() {
      const subjectScores = document.getElementById('subject-scores');
      if (!subjectScores) return;
      
      subjectScores.innerHTML = '<div class="loading">Đang tải điểm số...</div>';
      
      db.collection('student_achievements')
        .where('studentId', '==', currentStudentId)
        .get()
        .then(snapshot => {
          subjectScores.innerHTML = '';
          
          if (snapshot.empty) {
            subjectScores.innerHTML = '<div class="no-data">Chưa có điểm số nào</div>';
            updateScoreSummary([]);
            return;
          }
          
          const scores = [];
          const scoresBySubject = {};
          
          snapshot.forEach(doc => {
            const data = doc.data();
            scores.push(data);
            
            // Group by subject
            if (!scoresBySubject[data.subject]) {
              scoresBySubject[data.subject] = [];
            }
            scoresBySubject[data.subject].push(data);
          });
          
          // Display scores by subject
          for (const [subject, subjectScoresList] of Object.entries(scoresBySubject)) {
            const subjectElement = document.createElement('div');
            subjectElement.className = 'subject-scores glass';
            
            // Calculate weighted subject average
            const subjectAverage = calculateWeightedAverage(subjectScoresList);
            
            let scoresHTML = '';
            subjectScoresList.forEach(score => {
              const weighting = score.coefficient || 1;
              scoresHTML += `
                <div class="score-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:8px;">
                  <span style="color:#2c5530;">${getSubjectText(score.subject)} (${score.score}/10)</span>
                  <span class="score-value" style="font-weight:600;font-size:18px;color:#2c5530;">x${weighting}</span>
                  <span class="score-date" style="color:#2c5530;">${formatDate(score.date)}</span>
                </div>
              `;
            });
            
            subjectElement.innerHTML = `
              <div class="subject-header">
                <h4 style="color:#2c5530;">${getSubjectText(subject)}</h4>
                <span class="subject-average" style="color:#2c5530;">ĐTB: ${subjectAverage.toFixed(1)}</span>
              </div>
              <div class="scores-list">
                ${scoresHTML}
              </div>
            `;
            
            subjectScores.appendChild(subjectElement);
          }
          
          // Update summary with calculations
          updateScoreSummary(scores);
          
          // Setup charts
          setupCharts(scores);
        })
        .catch(error => {
          console.error('❌ Error loading scores:', error);
          subjectScores.innerHTML = '<div class="error">Lỗi tải điểm số: ' + error.message + '</div>';
          updateScoreSummary([]);
        });
    }
    
    // Load student notes
    function loadStudentNotes() {
      const notesList = document.getElementById('notes-list');
      if (!notesList) return;
      
      notesList.innerHTML = '<div class="loading">Đang tải ghi chú...</div>';
      
      db.collection('student_notes')
        .where('studentId', '==', currentStudentId)
        .get()
        .then(snapshot => {
          notesList.innerHTML = '';
          
          if (snapshot.empty) {
            notesList.innerHTML = '<div class="no-data">Chưa có ghi chú nào</div>';
            return;
          }
          
          // Sort client-side
          let notes = [];
          snapshot.forEach(doc => {
            notes.push({ id: doc.id, ...doc.data() });
          });
          
          notes.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
          });
          
          notes.forEach(data => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item glass';
            noteElement.innerHTML = `
              <div class="note-content">
                <p style="color:#2c5530;line-height:1.6;font-size:15px;">${data.content}</p>
              </div>
              <div class="note-footer" style="display:flex;justify-content:space-between;align-items:center;margin-top:15px;padding-top:15px;border-top:1px solid rgba(44,85,48,0.1);">
                <span class="note-date" style="color:#2c5530;">${formatDate(data.date)}</span>
                <div class="note-actions">
                  <button class="btn-small btn-edit edit-note" data-id="${data.id}" type="button">Sửa</button>
                  <button class="btn-small btn-delete delete-note" data-id="${data.id}" type="button">Xóa</button>
                </div>
              </div>
            `;
            notesList.appendChild(noteElement);
          });
          
          // Attach event listeners
          notesList.querySelectorAll('.delete-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const noteId = e.target.dataset.id;
              if (confirm('Bạn có chắc muốn xóa ghi chú này?')) {
                deleteNote(noteId);
              }
            });
          });
        })
        .catch(error => {
          console.error('❌ Error loading notes:', error);
          notesList.innerHTML = '<div class="error">Lỗi tải ghi chú: ' + error.message + '</div>';
        });
    }
    
    // Helper functions
    function formatDate(dateString) {
      if (!dateString) return 'Chưa có ngày';
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    }
    
    function getAchievementTypeText(type) {
      const types = {
        'academic': 'Học tập',
        'sport': 'Thể thao',
        'art': 'Nghệ thuật',
        'community': 'Hoạt động cộng đồng'
      };
      return types[type] || type;
    }
    
    function getConductTypeText(type) {
      const types = {
        'good': 'Tốt',
        'average': 'Khá',
        'poor': 'Yếu',
        'warning': 'Cảnh cáo'
      };
      return types[type] || type;
    }
    
    function getScoreTypeText(type) {
      const types = {
        '15min': '15 phút',
        '45min': '45 phút',
        'midterm': 'Giữa kỳ',
        'final': 'Cuối kỳ'
      };
      return types[type] || type;
    }
    
    function getSubjectText(subject) {
      const subjects = {
        'math': 'Toán',
        'literature': 'Ngữ văn',
        'english': 'Tiếng Anh',
        'physics': 'Vật lý',
        'chemistry': 'Hóa học',
        'biology': 'Sinh học',
        'history': 'Lịch sử',
        'geography': 'Địa lý',
        'pe': 'Thể dục',
        'music': 'Âm nhạc',
        'art': 'Mỹ thuật'
      };
      return subjects[subject] || subject;
    }
    
    function calculateAverage(scores) {
      if (scores.length === 0) return 0;
      const sum = scores.reduce((a, b) => a + b, 0);
      return sum / scores.length;
    }
    
    function calculateWeightedAverage(scoreList) {
      if (scoreList.length === 0) return 0;
      let totalWeighted = 0;
      let totalWeight = 0;
      
      scoreList.forEach(score => {
        const coefficient = score.coefficient || 1;
        totalWeighted += score.score * coefficient;
        totalWeight += coefficient;
      });
      
      return totalWeight === 0 ? 0 : totalWeighted / totalWeight;
    }
    
    function calculateOverallAverage(scores) {
      if (scores.length === 0) return 0;
      
      // Group by subject
      const bySubject = {};
      scores.forEach(score => {
        if (!bySubject[score.subject]) {
          bySubject[score.subject] = [];
        }
        bySubject[score.subject].push(score);
      });
      
      // Calculate weighted average for each subject
      let totalAverage = 0;
      let subjectCount = 0;
      
      for (const [subject, scoreList] of Object.entries(bySubject)) {
        const avg = calculateWeightedAverage(scoreList);
        totalAverage += avg;
        subjectCount++;
      }
      
      return subjectCount === 0 ? 0 : totalAverage / subjectCount;
    }
    
    function getAcademicRank(average) {
      if (average >= 8.5) return 'Tốt';
      if (average >= 7) return 'Khá';
      if (average >= 5) return 'Đạt';
      return 'Trung bình';
    }
    
    function getClassification(average) {
      if (average >= 9) return 'Xuất sắc';
      if (average >= 8) return 'Giỏi';
      if (average >= 7) return 'Tiên tiến';
      if (average >= 6) return 'Khá';
      return 'Trung bình';
    }
    
    function updateScoreSummary(scores) {
      const averageScoreEl = document.getElementById('average-score');
      const academicRankEl = document.getElementById('academic-rank');
      const classificationEl = document.getElementById('classification');
      
      if (scores.length === 0) {
        averageScoreEl.textContent = '-';
        academicRankEl.textContent = '-';
        classificationEl.textContent = '-';
        return;
      }
      
      const overallAverage = calculateOverallAverage(scores);
      const academicRank = getAcademicRank(overallAverage);
      const classification = getClassification(overallAverage);
      
      averageScoreEl.textContent = overallAverage.toFixed(1);
      averageScoreEl.style.color = '#2c5530';
      
      academicRankEl.textContent = academicRank;
      academicRankEl.style.color = '#2c5530';
      classificationEl.textContent = classification;
      classificationEl.style.color = '#2c5530';
    }
    
    let lineChart = null;
    let scoreDistChart = null;
    
    function setupCharts(scores) {
      // Setup chart type buttons
      const chartBtns = document.querySelectorAll('.chart-type-btn');
      chartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          chartBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          const chartType = btn.dataset.chart;
          document.getElementById('line-chart-container').style.display = chartType === 'line' ? 'block' : 'none';
          document.getElementById('score-dist-chart-container').style.display = chartType === 'line' ? 'none' : 'block';
          
          if (chartType === 'line') {
            drawLineChart(scores);
          } else if (chartType === 'score-pie') {
            drawScoreDistChart(scores, 'doughnut');
          } else if (chartType === 'score-bar') {
            drawScoreDistChart(scores, 'bar');
          }
        });
      });
      
      // Draw initial line chart
      drawLineChart(scores);
    }
    
    function drawLineChart(scores) {
      if (scores.length === 0) return;
      
      // Sort scores by date
      const sortedScores = [...scores].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
      });
      
      // Prepare data
      const labels = sortedScores.map(s => formatDate(s.date)).slice(-10);
      const scoreData = sortedScores.map(s => s.score).slice(-10);
      
      const ctx = document.getElementById('lineChart');
      if (!ctx) return;
      
      if (lineChart) lineChart.destroy();
      
      lineChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Điểm',
            data: scoreData,
            borderColor: '#2c5530',
            backgroundColor: 'rgba(44,85,48,0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#2c5530'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              labels: { color: '#2c5530' }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 10,
              ticks: { color: '#2c5530' },
              grid: { color: 'rgba(44,85,48,0.1)' }
            },
            x: {
              ticks: { color: '#2c5530' },
              grid: { color: 'rgba(44,85,48,0.1)' }
            }
          }
        }
      });
    }
    
    function drawScoreDistChart(scores, type) {
      if (scores.length === 0) return;
      
      // Categorize scores
      const distribution = {
        'Yếu (<5)': 0,
        'Trung bình (5-6)': 0,
        'Khá (7-8)': 0,
        'Giỏi (9-10)': 0
      };
      
      scores.forEach(s => {
        const score = s.score;
        if (score === undefined || score === null) return;
        if (score < 5) distribution['Yếu (<5)']++;
        else if (score < 7) distribution['Trung bình (5-6)']++;
        else if (score < 9) distribution['Khá (7-8)']++;
        else distribution['Giỏi (9-10)']++;
      });
      
      const ctx = document.getElementById('scoreDistChart');
      if (!ctx) return;
      
      if (scoreDistChart) scoreDistChart.destroy();
      
      const colors = ['#d32f2f', '#ffa726', '#66bb6a', '#42a5f5'];
      
      const chartConfig = {
        type: type,
        data: {
          labels: Object.keys(distribution),
          datasets: [{
            data: Object.values(distribution),
            backgroundColor: colors,
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          }
        }
      };
      
      // Add scales config for bar chart
      if (type === 'bar') {
        chartConfig.options.scales = {
          y: {
            beginAtZero: true,
            ticks: { color: '#2c5530' },
            grid: { color: 'rgba(44,85,48,0.1)' }
          },
          x: {
            ticks: { color: '#2c5530' },
            grid: { color: 'rgba(44,85,48,0.1)' }
          }
        };
      }
      
      scoreDistChart = new Chart(ctx, chartConfig);
    }
    
    
    // Save functions
    async function saveAchievement() {
      const subject = document.getElementById('achievement-subject').value.trim();
      const score = parseFloat(document.getElementById('achievement-score').value);
      const coefficient = document.getElementById('achievement-coefficient').value;
      const date = document.getElementById('achievement-date').value;
      
      if (!subject) {
        alert('Vui lòng chọn môn học!');
        return;
      }
      
      if (isNaN(score) || score < 0 || score > 10) {
        alert('Vui lòng nhập điểm hợp lệ (0-10)!');
        return;
      }
      
      if (!coefficient) {
        alert('Vui lòng chọn hệ số!');
        return;
      }
      
      try {
        await db.collection('student_achievements').add({
          studentId: currentStudentId,
          subject: subject,
          score: score,
          coefficient: parseInt(coefficient),
          date: date || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Thêm thành tích thành công!');
        hideModal('add-achievement-modal');
        loadStudentAchievements();
        
        // Reset form
        document.getElementById('achievement-subject').value = '';
        document.getElementById('achievement-score').value = '';
        document.getElementById('achievement-coefficient').value = '';
        document.getElementById('achievement-date').value = '';
      } catch (error) {
        console.error('❌ Error saving achievement:', error);
        alert('Lỗi thêm thành tích: ' + error.message);
      }
    }
    
    async function saveConduct() {
      const type = document.getElementById('conduct-type').value;
      const description = document.getElementById('conduct-description').value.trim();
      const date = document.getElementById('conduct-date').value;
      
      if (!type) {
        alert('Vui lòng chọn loại đánh giá!');
        return;
      }
      
      if (!description) {
        alert('Vui lòng nhập chi tiết đánh giá!');
        return;
      }
      
      try {
        await db.collection('student_conduct').add({
          studentId: currentStudentId,
          type: type,
          description: description,
          date: date || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Thêm đánh giá hạnh kiểm thành công!');
        hideModal('add-conduct-modal');
        loadStudentConduct();
        
        // Reset form
        document.getElementById('conduct-type').value = '';
        document.getElementById('conduct-description').value = '';
        document.getElementById('conduct-date').value = '';
      } catch (error) {
        console.error('❌ Error saving conduct:', error);
        alert('Lỗi thêm đánh giá: ' + error.message);
      }
    }
    
    async function saveScore() {
      const subject = document.getElementById('score-subject').value;
      const value = parseFloat(document.getElementById('score-value').value);
      const type = document.getElementById('score-type').value;
      const date = document.getElementById('score-date').value;
      
      if (!subject) {
        alert('Vui lòng chọn môn học!');
        return;
      }
      
      if (isNaN(value) || value < 0 || value > 10) {
        alert('Vui lòng nhập điểm hợp lệ (0-10)!');
        return;
      }
      
      if (!type) {
        alert('Vui lòng chọn loại điểm!');
        return;
      }
      
      try {
        await db.collection('student_scores').add({
          studentId: currentStudentId,
          subject: subject,
          value: value,
          type: type,
          date: date || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Thêm điểm thành công!');
        hideModal('add-score-modal');
        loadStudentScores();
        
        // Reset form
        document.getElementById('score-subject').value = '';
        document.getElementById('score-value').value = '';
        document.getElementById('score-type').value = '';
        document.getElementById('score-date').value = '';
      } catch (error) {
        console.error('❌ Error saving score:', error);
        alert('Lỗi thêm điểm: ' + error.message);
      }
    }
    
    async function saveNote() {
      const content = document.getElementById('note-content').value.trim();
      const date = document.getElementById('note-date').value;
      
      if (!content) {
        alert('Vui lòng nhập nội dung ghi chú!');
        return;
      }
      
      try {
        await db.collection('student_notes').add({
          studentId: currentStudentId,
          content: content,
          date: date || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Thêm ghi chú thành công!');
        hideModal('add-note-modal');
        loadStudentNotes();
        
        // Reset form
        document.getElementById('note-content').value = '';
        document.getElementById('note-date').value = '';
      } catch (error) {
        console.error('❌ Error saving note:', error);
        alert('Lỗi thêm ghi chú: ' + error.message);
      }
    }
    
    // Delete functions
    async function deleteAchievement(achievementId) {
      try {
        await db.collection('student_achievements').doc(achievementId).delete();
        alert('Xóa thành tích thành công!');
        loadStudentAchievements();
      } catch (error) {
        console.error('❌ Error deleting achievement:', error);
        alert('Lỗi xóa thành tích: ' + error.message);
      }
    }
    
    // Modal functions
    function showModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove('hidden');
        console.log('✅ Modal shown:', id);
      } else {
        console.error('❌ Modal not found:', id);
      }
    }
    
    function hideModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add('hidden');
        console.log('❌ Modal hidden:', id);
      }
    }
    
    // Call setup
    setupStudentDetail();
    }
  }
});