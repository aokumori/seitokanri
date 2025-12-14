// Student detail management
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Student Detail DOM Content Loaded');
  
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      window.location.href = 'index.html';
      return;
    }
    console.log('✅ User authenticated:', user.uid);
    initStudentDetail();
  });

  function initStudentDetail() {
    console.log('🎯 Initializing student detail management');
    
    // Get student ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');
    
    if (!studentId) {
      console.error('❌ No student ID provided');
      window.location.href = 'classes.html';
      return;
    }
    
    console.log('📝 Loading student details for:', studentId);
    
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
            
            // Update UI
            studentName.textContent = data.name;
            studentCode.textContent = `Mã HS: ${data.studentId || 'Chưa có'}`;
            studentBirthdate.textContent = data.birthdate || 'Chưa cập nhật';
            studentGender.textContent = getGenderText(data.gender);
            studentPhone.textContent = data.phone || 'Chưa cập nhật';
            studentEmail.textContent = data.email || 'Chưa cập nhật';
            studentClass.textContent = data.className || 'Chưa có lớp';
            
            // Update page title
            document.getElementById('student-detail-title').textContent = data.name;
            
            // Update photo
            if (data.photoURL) {
              studentPhoto.innerHTML = `<img src="${data.photoURL}" alt="${data.name}">`;
            } else {
              studentPhoto.innerHTML = '<div class="no-photo">📷</div>';
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
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
          achievementList.innerHTML = '';
          
          if (snapshot.empty) {
            achievementList.innerHTML = '<div class="no-data">Chưa có thành tích nào</div>';
            return;
          }
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const achievementElement = document.createElement('div');
            achievementElement.className = 'achievement-item glass';
            achievementElement.innerHTML = `
              <div class="achievement-header">
                <h4>${data.title}</h4>
                <span class="achievement-date">${formatDate(data.date)}</span>
              </div>
              <div class="achievement-type">${getAchievementTypeText(data.type)}</div>
              <p>${data.description || ''}</p>
              <div class="achievement-actions">
                <button class="btn-small btn-edit edit-achievement" data-id="${doc.id}" type="button">Sửa</button>
                <button class="btn-small btn-delete delete-achievement" data-id="${doc.id}" type="button">Xóa</button>
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
          achievementList.innerHTML = '<div class="error">Lỗi tải thành tích</div>';
        });
    }
    
    // Load student conduct
    function loadStudentConduct() {
      const conductList = document.getElementById('conduct-list');
      if (!conductList) return;
      
      conductList.innerHTML = '<div class="loading">Đang tải hạnh kiểm...</div>';
      
      db.collection('student_conduct')
        .where('studentId', '==', currentStudentId)
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
          conductList.innerHTML = '';
          
          if (snapshot.empty) {
            conductList.innerHTML = '<div class="no-data">Chưa có đánh giá hạnh kiểm</div>';
            return;
          }
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const conductElement = document.createElement('div');
            conductElement.className = 'conduct-item glass';
            conductElement.innerHTML = `
              <div class="conduct-header">
                <h4>${getConductTypeText(data.type)}</h4>
                <span class="conduct-date">${formatDate(data.date)}</span>
              </div>
              <p>${data.description || ''}</p>
              <div class="conduct-actions">
                <button class="btn-small btn-edit edit-conduct" data-id="${doc.id}" type="button">Sửa</button>
                <button class="btn-small btn-delete delete-conduct" data-id="${doc.id}" type="button">Xóa</button>
              </div>
            `;
            conductList.appendChild(conductElement);
          });
        })
        .catch(error => {
          console.error('❌ Error loading conduct:', error);
          conductList.innerHTML = '<div class="error">Lỗi tải hạnh kiểm</div>';
        });
    }
    
    // Load student scores
    function loadStudentScores() {
      const subjectScores = document.getElementById('subject-scores');
      if (!subjectScores) return;
      
      subjectScores.innerHTML = '<div class="loading">Đang tải điểm số...</div>';
      
      db.collection('student_scores')
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
            
            // Calculate subject average
            const subjectAverage = calculateAverage(subjectScoresList.map(s => s.value));
            
            let scoresHTML = '';
            subjectScoresList.forEach(score => {
              scoresHTML += `
                <div class="score-item">
                  <span>${getScoreTypeText(score.type)}</span>
                  <span class="score-value">${score.value}</span>
                  <span class="score-date">${formatDate(score.date)}</span>
                </div>
              `;
            });
            
            subjectElement.innerHTML = `
              <div class="subject-header">
                <h4>${getSubjectText(subject)}</h4>
                <span class="subject-average">ĐTB: ${subjectAverage.toFixed(1)}</span>
              </div>
              <div class="scores-list">
                ${scoresHTML}
              </div>
              <div class="subject-actions">
                <button class="btn-small btn-add add-subject-score" data-subject="${subject}" type="button">Thêm điểm</button>
              </div>
            `;
            
            subjectScores.appendChild(subjectElement);
          }
          
          // Update summary
          updateScoreSummary(scores);
          
          // Attach event listeners for add score buttons
          subjectScores.querySelectorAll('.add-subject-score').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const subject = e.target.dataset.subject;
              document.getElementById('score-subject').value = subject;
              showModal('add-score-modal');
            });
          });
        })
        .catch(error => {
          console.error('❌ Error loading scores:', error);
          subjectScores.innerHTML = '<div class="error">Lỗi tải điểm số</div>';
        });
    }
    
    // Load student notes
    function loadStudentNotes() {
      const notesList = document.getElementById('notes-list');
      if (!notesList) return;
      
      notesList.innerHTML = '<div class="loading">Đang tải ghi chú...</div>';
      
      db.collection('student_notes')
        .where('studentId', '==', currentStudentId)
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
          notesList.innerHTML = '';
          
          if (snapshot.empty) {
            notesList.innerHTML = '<div class="no-data">Chưa có ghi chú nào</div>';
            return;
          }
          
          snapshot.forEach(doc => {
            const data = doc.data();
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item glass';
            noteElement.innerHTML = `
              <div class="note-content">
                <p>${data.content}</p>
              </div>
              <div class="note-footer">
                <span class="note-date">${formatDate(data.date)}</span>
                <div class="note-actions">
                  <button class="btn-small btn-edit edit-note" data-id="${doc.id}" type="button">Sửa</button>
                  <button class="btn-small btn-delete delete-note" data-id="${doc.id}" type="button">Xóa</button>
                </div>
              </div>
            `;
            notesList.appendChild(noteElement);
          });
        })
        .catch(error => {
          console.error('❌ Error loading notes:', error);
          notesList.innerHTML = '<div class="error">Lỗi tải ghi chú</div>';
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
        'geography': 'Địa lý'
      };
      return subjects[subject] || subject;
    }
    
    function calculateAverage(scores) {
      if (scores.length === 0) return 0;
      const sum = scores.reduce((a, b) => a + b, 0);
      return sum / scores.length;
    }
    
    function updateScoreSummary(scores) {
      if (scores.length === 0) {
        document.getElementById('average-score').textContent = '-';
        document.getElementById('academic-rank').textContent = '-';
        document.getElementById('classification').textContent = '-';
        return;
      }
      
      const average = calculateAverage(scores.map(s => s.value));
      document.getElementById('average-score').textContent = average.toFixed(1);
      
      // Determine academic rank
      let rank = '';
      let classification = '';
      
      if (average >= 8.0) {
        rank = 'Giỏi';
        classification = 'Xuất sắc';
      } else if (average >= 6.5) {
        rank = 'Khá';
        classification = 'Tốt';
      } else if (average >= 5.0) {
        rank = 'Trung bình';
        classification = 'Đạt';
      } else {
        rank = 'Yếu';
        classification = 'Cần cố gắng';
      }
      
      document.getElementById('academic-rank').textContent = rank;
      document.getElementById('classification').textContent = classification;
    }
    
    // Save functions
    async function saveAchievement() {
      const title = document.getElementById('achievement-title').value.trim();
      const description = document.getElementById('achievement-description').value.trim();
      const date = document.getElementById('achievement-date').value;
      const type = document.getElementById('achievement-type').value;
      
      if (!title) {
        alert('Vui lòng nhập tiêu đề thành tích!');
        return;
      }
      
      if (!type) {
        alert('Vui lòng chọn loại thành tích!');
        return;
      }
      
      try {
        await db.collection('student_achievements').add({
          studentId: currentStudentId,
          title: title,
          description: description,
          type: type,
          date: date || new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Thêm thành tích thành công!');
        hideModal('add-achievement-modal');
        loadStudentAchievements();
        
        // Reset form
        document.getElementById('achievement-title').value = '';
        document.getElementById('achievement-description').value = '';
        document.getElementById('achievement-date').value = '';
        document.getElementById('achievement-type').value = '';
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
    
    // Initialize
    loadStudentInfo();
  }
});