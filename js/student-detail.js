// Student detail management - COMPLETE VERSION
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Student Detail DOM Content Loaded');

  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('studentId');

  if (!studentId) {
    console.error('❌ No student ID provided');
    window.location.href = 'classes.html';
    return;
  }

  let currentStudentId = studentId;
  let currentUserRole = 'teacher';
  let studentData = null;
  
  // Chart variables
  let scoresData = [];
  let lineChartInstance = null;
  let scoreDistChartInstance = null;
  let subjectChartInstance = null;
  let currentChartType = 'line';

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      window.location.href = 'index.html';
      return;
    }

    console.log('✅ User authenticated:', user.uid);

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      currentUserRole = userDoc.exists ? ((userDoc.data() || {}).role || 'teacher') : 'teacher';

      await initStudentDetail();
    } catch (error) {
      console.error('❌ Error initializing page:', error);
      alert('Lỗi khởi tạo trang: ' + error.message);
    }
  });

  // =========================
  // KHỞI TẠO CHÍNH
  // =========================
  
  async function initStudentDetail() {
    console.log('🎯 Initializing student detail management');
    console.log('👤 User role:', currentUserRole);

    // Cấu hình giao diện theo vai trò
    if (currentUserRole === 'student') {
      hideAddButtons();
    }

    // Ẩn nút thêm điểm trong tab điểm số
    const btnAddScore = document.getElementById('btn-add-score');
    if (btnAddScore) btnAddScore.style.display = 'none';

    // Khởi tạo các thành phần
    await loadStudentInfo();
    setupEventListeners();
    
    // Tải dữ liệu tab đầu tiên (Thành tích)
    await loadAllAchievements();
    
    // Thêm CSS động
    addDynamicStyles();
    
    // Thêm nút xóa nếu là giáo viên
    if (currentUserRole === 'teacher') {
      addDeleteButton();
    }
  }

  function addDeleteButton() {
    const headerLeft = document.querySelector('.header-left');
    if (!headerLeft) return;
    
    // Kiểm tra nếu nút đã tồn tại
    if (document.getElementById('btn-delete-student')) return;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'btn-delete-student';
    deleteBtn.className = 'btn-danger';
    deleteBtn.style.marginLeft = '10px';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Xóa học sinh';
    
    deleteBtn.addEventListener('click', deleteStudent);
    headerLeft.appendChild(deleteBtn);
  }

  async function deleteStudent() {
    if (!confirm('⚠️ Bạn có chắc chắn muốn xóa học sinh này? Hành động này sẽ xóa tất cả dữ liệu liên quan và không thể hoàn tác!')) {
      return;
    }
    
    try {
      // Lấy thông tin email của học sinh trước khi xóa
      const studentDoc = await db.collection('students').doc(currentStudentId).get();
      const studentEmail = studentDoc.exists ? studentDoc.data().email : null;
      
      // Xóa tất cả dữ liệu liên quan trong batch
      const batch = db.batch();
      
      // 1. Xóa thành tích
      const achievementsSnapshot = await db.collection('student_achievements')
        .where('studentId', '==', currentStudentId)
        .get();
      achievementsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 2. Xóa hạnh kiểm
      const conductSnapshot = await db.collection('student_conduct')
        .where('studentId', '==', currentStudentId)
        .get();
      conductSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 3. Xóa ghi chú
      const notesSnapshot = await db.collection('student_notes')
        .where('studentId', '==', currentStudentId)
        .get();
      notesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 4. Xóa điểm số (nếu có collection riêng)
      try {
        const scoresSnapshot = await db.collection('scores')
          .where('studentId', '==', currentStudentId)
          .get();
        scoresSnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
      } catch (e) {
        console.log('Không có collection scores hoặc lỗi:', e.message);
      }
      
      // 5. Xóa tài khoản người dùng (nếu là student)
      if (studentEmail) {
        try {
          // Tìm user có email này
          const userSnapshot = await db.collection('users')
            .where('email', '==', studentEmail)
            .where('role', '==', 'student')
            .get();
          
          if (!userSnapshot.empty) {
            userSnapshot.forEach(doc => {
              batch.delete(doc.ref);
              console.log(`✅ Đã xóa tài khoản user: ${doc.id}`);
            });
          }
        } catch (error) {
          console.error('❌ Lỗi khi xóa tài khoản user:', error);
        }
      }
      
      // 6. Cuối cùng xóa học sinh
      const studentRef = db.collection('students').doc(currentStudentId);
      batch.delete(studentRef);
      
      // Thực thi batch
      await batch.commit();
      
      alert('✅ Đã xóa học sinh thành công! Tất cả dữ liệu liên quan đã được xóa.');
      window.location.href = 'students.html';
      
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      alert('❌ Lỗi khi xóa học sinh: ' + error.message);
    }
  }

  function hideAddButtons() {
    const btnAddAchievement = document.getElementById('btn-add-achievement');
    const btnAddConduct = document.getElementById('btn-add-conduct');
    const btnAddNote = document.getElementById('btn-add-note');

    if (btnAddAchievement) btnAddAchievement.style.display = 'none';
    if (btnAddConduct) btnAddConduct.style.display = 'none';
    if (btnAddNote) btnAddNote.style.display = 'none';
  }

  function setupEventListeners() {
    console.log('🔗 Setting up event listeners...');
    
    // Back button
    const btnBack = document.getElementById('btn-back-to-class');
    if (btnBack) {
      btnBack.addEventListener('click', function (e) {
        e.preventDefault();
        window.history.back();
      });
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabBtns.length > 0) {
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', function () {
          const tabId = this.getAttribute('data-tab');
          console.log(`📑 Tab clicked: ${tabId}`);

          // Update active tab
          tabBtns.forEach((b) => b.classList.remove('active'));
          this.classList.add('active');

          tabPanes.forEach((pane) => pane.classList.remove('active'));
          const pane = document.getElementById(`${tabId}-tab`);
          if (pane) pane.classList.add('active');

          // Load data for the selected tab
          switch(tabId) {
            case 'scores':
              loadStudentScoresFromAchievements();
              break;
            case 'achievement':
              loadAllAchievements();
              break;
            case 'conduct':
              loadStudentConduct();
              break;
            case 'notes':
              loadStudentNotes();
              break;
          }
        });
      });
    }

    // Modal buttons
    setupModalButtons();
    
    // Form handlers
    setupFormHandlers();
    
    // Chart buttons
    setupChartButtons();
  }

  // =========================
  // FORM HANDLERS
  // =========================
  
  async function handleSaveAchievement(e) {
    e.preventDefault();
    
    console.log('💾 Saving achievement/score...');
    
    const subjectInput = document.getElementById('achievement-subject');
    const scoreInput = document.getElementById('achievement-score');
    const coefficientInput = document.getElementById('achievement-coefficient');
    const dateInput = document.getElementById('achievement-date');
    const saveAchievementBtn = document.getElementById('save-achievement');
    
    if (!subjectInput || !scoreInput || !coefficientInput || !dateInput || !saveAchievementBtn) {
      console.error('❌ Achievement form elements not found!');
      alert('Lỗi: Không tìm thấy các trường trong form thành tích.');
      return;
    }
    
    const subject = subjectInput.value.trim();
    const scoreValue = scoreInput.value.trim();
    const coefficient = coefficientInput.value;
    const date = dateInput.value;
    
    console.log('📊 Achievement/Score form data:', { subject, scoreValue, coefficient, date });
    
    if (!subject || !scoreValue || !coefficient || !date) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    
    const score = parseFloat(scoreValue);
    if (isNaN(score)) {
      alert('Điểm phải là số!');
      return;
    }
    
    if (score < 0 || score > 10) {
      alert('Điểm phải từ 0 đến 10!');
      return;
    }
    
    saveAchievementBtn.disabled = true;
    saveAchievementBtn.textContent = 'Đang lưu...';
    
    try {
      const achievementData = {
        studentId: currentStudentId,
        studentName: studentData?.name || 'Học sinh',
        title: `Điểm ${subject} - Hệ số ${coefficient}`,
        description: `Điểm ${subject} hệ số ${coefficient}`,
        type: 'academic',
        category: 'score',
        score: score,
        coefficient: parseFloat(coefficient),
        subject: subject,
        date: firebase.firestore.Timestamp.fromDate(new Date(date + 'T00:00:00')),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        createdByName: auth.currentUser?.displayName || 'Giáo viên'
      };
      
      console.log('💾 Saving achievement/score to Firestore:', achievementData);
      
      // Lưu vào student_achievements
      await db.collection('student_achievements').add(achievementData);
      
      console.log('✅ Achievement/Score saved successfully');
      alert('✅ Đã thêm điểm thành công!');
      
      hideModal('add-achievement-modal');
      
      // Reset form
      subjectInput.value = '';
      scoreInput.value = '';
      coefficientInput.value = '';
      dateInput.value = new Date().toISOString().split('T')[0];
      
      // Reload cả achievements và scores
      await loadAllAchievements();
      await loadStudentScoresFromAchievements();
      
    } catch (error) {
      console.error('❌ Error saving achievement/score:', error);
      alert('❌ Lỗi khi thêm điểm: ' + error.message);
    } finally {
      saveAchievementBtn.disabled = false;
      saveAchievementBtn.textContent = 'Lưu';
    }
  }

  async function handleSaveConduct(e) {
    e.preventDefault();
    
    console.log('💾 Saving conduct...');
    
    const typeInput = document.getElementById('conduct-type');
    const descriptionInput = document.getElementById('conduct-description');
    const dateInput = document.getElementById('conduct-date');
    const saveConductBtn = document.getElementById('save-conduct');
    
    if (!typeInput || !descriptionInput || !dateInput || !saveConductBtn) {
      console.error('❌ Conduct form elements not found!');
      alert('Lỗi: Không tìm thấy các trường trong form hạnh kiểm.');
      return;
    }
    
    const type = typeInput.value.trim();
    const description = descriptionInput.value.trim();
    const date = dateInput.value;
    
    console.log('📊 Conduct form data:', { type, description, date });
    
    if (!type || !description || !date) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    
    // Map giá trị loại đánh giá thành tên hiển thị
    const gradeMap = {
      'good': 'Tốt',
      'average': 'Khá',
      'poor': 'Yếu',
      'warning': 'Cảnh cáo'
    };
    
    const grade = gradeMap[type] || type;
    
    saveConductBtn.disabled = true;
    saveConductBtn.textContent = 'Đang lưu...';
    
    try {
      const conductData = {
        studentId: currentStudentId,
        studentName: studentData?.name || 'Học sinh',
        grade: grade,
        comments: description,
        date: firebase.firestore.Timestamp.fromDate(new Date(date + 'T00:00:00')),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        createdByName: auth.currentUser?.displayName || 'Giáo viên'
      };
      
      console.log('💾 Saving conduct to Firestore:', conductData);
      
      await db.collection('student_conduct').add(conductData);
      
      console.log('✅ Conduct saved successfully');
      alert('✅ Đã thêm đánh giá hạnh kiểm thành công!');
      
      hideModal('add-conduct-modal');
      
      // Reset form
      typeInput.value = '';
      descriptionInput.value = '';
      dateInput.value = new Date().toISOString().split('T')[0];
      
      // Reload conduct
      await loadStudentConduct();
      
    } catch (error) {
      console.error('❌ Error saving conduct:', error);
      alert('❌ Lỗi khi thêm hạnh kiểm: ' + error.message);
    } finally {
      saveConductBtn.disabled = false;
      saveConductBtn.textContent = 'Lưu';
    }
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    
    console.log('💾 Saving note...');
    
    const contentInput = document.getElementById('note-content');
    const dateInput = document.getElementById('note-date');
    const saveNoteBtn = document.getElementById('save-note');
    
    if (!contentInput || !dateInput || !saveNoteBtn) {
      console.error('❌ Note form elements not found!');
      alert('Lỗi: Không tìm thấy các trường trong form ghi chú.');
      return;
    }
    
    const content = contentInput.value.trim();
    const date = dateInput.value;
    
    console.log('📊 Note form data:', { content, date });
    
    if (!content || !date) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    
    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Đang lưu...';
    
    try {
      const noteData = {
        studentId: currentStudentId,
        studentName: studentData?.name || 'Học sinh',
        content: content,
        date: firebase.firestore.Timestamp.fromDate(new Date(date + 'T00:00:00')),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        createdByName: auth.currentUser?.displayName || 'Giáo viên'
      };
      
      console.log('💾 Saving note to Firestore:', noteData);
      
      await db.collection('student_notes').add(noteData);
      
      console.log('✅ Note saved successfully');
      alert('✅ Đã thêm ghi chú thành công!');
      
      hideModal('add-note-modal');
      
      // Reset form
      contentInput.value = '';
      dateInput.value = new Date().toISOString().split('T')[0];
      
      // Reload notes
      await loadStudentNotes();
      
    } catch (error) {
      console.error('❌ Error saving note:', error);
      alert('❌ Lỗi khi thêm ghi chú: ' + error.message);
    } finally {
      saveNoteBtn.disabled = false;
      saveNoteBtn.textContent = 'Lưu';
    }
  }

  // =========================
  // LOAD DATA FUNCTIONS
  // =========================
  
  async function loadStudentInfo() {
    console.log('📋 Loading student info...');
    
    const studentName = document.getElementById('student-name');
    const studentCode = document.getElementById('student-code');
    const studentBirthdate = document.getElementById('student-birthdate');
    const studentGender = document.getElementById('student-gender');
    const studentPhone = document.getElementById('student-phone');
    const studentEmail = document.getElementById('student-email');
    const studentClass = document.getElementById('student-class');
    const studentPhoto = document.getElementById('student-photo');

    try {
      const doc = await db.collection('students').doc(currentStudentId).get();
      if (!doc.exists) {
        alert('Không tìm thấy thông tin học sinh!');
        window.location.href = 'classes.html';
        return;
      }

      const data = doc.data() || {};
      studentData = data;

      // Update UI
      if (studentName) studentName.textContent = data.name || 'Chưa có tên';
      if (studentCode) studentCode.textContent = `Mã HS: ${data.studentId || 'Chưa có'}`;
      if (studentBirthdate) studentBirthdate.textContent = data.birthdate || 'Chưa cập nhật';
      if (studentGender) studentGender.textContent = getGenderText(data.gender);
      if (studentPhone) studentPhone.textContent = data.phone || 'Chưa cập nhật';
      if (studentEmail) studentEmail.textContent = data.email || 'Chưa cập nhật';
      if (studentClass) studentClass.textContent = data.className || 'Chưa có lớp';

      const titleEl = document.getElementById('student-detail-title');
      if (titleEl) titleEl.textContent = data.name || 'Chi tiết học sinh';

      // Update photo
      if (studentPhoto) {
        if (data.photoURL) {
          studentPhoto.innerHTML = `<img src="${data.photoURL}" alt="${data.name || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
          const initials = data.name ? data.name.charAt(0).toUpperCase() : '?';
          studentPhoto.innerHTML = `<div class="no-photo" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:40px;border-radius:50%;">${initials}</div>`;
        }
      }

      console.log('✅ Student info loaded:', data);
    } catch (error) {
      console.error('❌ Error loading student data:', error);
      alert('Lỗi tải thông tin học sinh: ' + error.message);
    }
  }

  async function loadStudentScoresFromAchievements() {
    const scoresContainer = document.getElementById('subject-scores');
    if (!scoresContainer) {
      console.error('❌ subject-scores container not found');
      return;
    }

    try {
      scoresContainer.innerHTML = '<div class="loading">Đang tải điểm số...</div>';

      // Lấy dữ liệu từ student_achievements
      const snapshot = await db.collection('student_achievements')
        .where('studentId', '==', currentStudentId)
        .get();
      
      scoresData = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.score && data.score > 0 && data.subject) {
          scoresData.push({
            id: doc.id,
            ...data,
            coefficient: parseFloat(data.coefficient) || 1
          });
        }
      });
      
      if (scoresData.length === 0) {
        scoresContainer.innerHTML = '<div class="no-data">Chưa có điểm số nào</div>';
        destroyCharts();
        updateSummary(null, 0);
        return;
      }

      // Tính toán thống kê
      let totalScore = 0;
      let totalWeightedScore = 0;
      let totalCoefficient = 0;
      let count = 0;
      
      scoresData.forEach(score => {
        const coefficient = score.coefficient || 1;
        const weightedScore = score.score * coefficient;
        
        totalScore += score.score;
        totalWeightedScore += weightedScore;
        totalCoefficient += coefficient;
        count++;
      });

      // Sort by date
      scoresData.sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
        const dateB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
        return dateB - dateA;
      });

      // Display scores table
      let html = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Điểm</th>
                <th>Hệ số</th>
                <th>Điểm có hệ số</th>
                <th>Ngày</th>
                <th>Loại</th>
              </tr>
            </thead>
            <tbody>
      `;

      scoresData.forEach(score => {
        const date = formatDate(score.date);
        
        let scoreClass = 'score-';
        if (score.score >= 8) scoreClass += 'good';
        else if (score.score >= 6.5) scoreClass += 'medium';
        else if (score.score >= 5) scoreClass += 'average';
        else scoreClass += 'bad';
        
        html += `
          <tr>
            <td>${score.subject || 'N/A'}</td>
            <td><span class="score-badge ${scoreClass}">${score.score || 'N/A'}</span></td>
            <td>${score.coefficient || '1'}</td>
            <td><span class="score-badge ${scoreClass}">${(score.score * (score.coefficient || 1)).toFixed(2)}</span></td>
            <td>${date}</td>
            <td>${score.type || 'Điểm'}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      scoresContainer.innerHTML = html;
      console.log(`✅ Loaded ${scoresData.length} scores from achievements`);

      // Update summary
      const averageScore = count > 0 ? (totalScore / count).toFixed(2) : 0;
      const weightedAverage = totalCoefficient > 0 ? (totalWeightedScore / totalCoefficient).toFixed(2) : 0;
      
      updateSummary(averageScore, weightedAverage);

      // Draw charts
      drawCharts();

    } catch (error) {
      console.error('❌ Error loading scores:', error);
      scoresContainer.innerHTML = '<div class="error">Lỗi khi tải điểm số: ' + error.message + '</div>';
    }
  }

  async function loadAllAchievements() {
    const achievementsContainer = document.getElementById('achievement-list');
    if (!achievementsContainer) {
      console.error('❌ achievement-list container not found');
      return;
    }

    try {
      achievementsContainer.innerHTML = '<div class="loading">Đang tải thành tích...</div>';

      // Load all achievements
      const snapshot = await db.collection('student_achievements')
        .where('studentId', '==', currentStudentId)
        .get();

      if (snapshot.empty) {
        achievementsContainer.innerHTML = '<div class="no-data">Chưa có thành tích nào</div>';
        return;
      }

      let achievements = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        achievements.push({
          id: doc.id,
          ...data
        });
      });

      // Sort by date
      achievements.sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
        const dateB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
        return dateB - dateA;
      });

      let html = '<div class="achievements-grid">';

      achievements.forEach(achievement => {
        const date = formatDate(achievement.date);
        const typeClass = achievement.type ? achievement.type.toLowerCase().replace(/\s+/g, '-') : 'other';
        
        // Check if this is a score achievement
        const isScore = achievement.score && achievement.subject;
        
        html += `
          <div class="achievement-card glass">
            <div class="achievement-header">
              <h3>${achievement.title || achievement.subject || 'Không có tiêu đề'}</h3>
              <span class="achievement-type ${typeClass}">${isScore ? 'Điểm số' : (achievement.type || 'Thành tích')}</span>
            </div>
            <div class="achievement-body">
              <p>${achievement.description || 'Không có mô tả'}</p>
              ${achievement.score ? `<p><strong>Điểm:</strong> ${achievement.score}</p>` : ''}
              ${achievement.coefficient ? `<p><strong>Hệ số:</strong> ${achievement.coefficient}</p>` : ''}
              ${achievement.subject ? `<p><strong>Môn:</strong> ${achievement.subject}</p>` : ''}
            </div>
            <div class="achievement-footer">
              <span class="achievement-date">📅 ${date}</span>
              <span class="achievement-author">👤 ${achievement.createdByName || 'N/A'}</span>
            </div>
          </div>
        `;
      });

      html += '</div>';
      achievementsContainer.innerHTML = html;
      console.log(`✅ Loaded ${achievements.length} achievements`);

    } catch (error) {
      console.error('❌ Error loading achievements:', error);
      achievementsContainer.innerHTML = '<div class="error">Lỗi khi tải thành tích: ' + error.message + '</div>';
    }
  }

  async function loadStudentConduct() {
    const conductContainer = document.getElementById('conduct-list');
    if (!conductContainer) {
      console.error('❌ conduct-list container not found');
      return;
    }

    try {
      conductContainer.innerHTML = '<div class="loading">Đang tải hạnh kiểm...</div>';

      const snapshot = await db.collection('student_conduct')
        .where('studentId', '==', currentStudentId)
        .get();

      if (snapshot.empty) {
        conductContainer.innerHTML = '<div class="no-data">Chưa có đánh giá hạnh kiểm nào</div>';
        return;
      }

      let conductRecords = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        conductRecords.push({
          id: doc.id,
          ...data
        });
      });

      // Sort by date
      conductRecords.sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
        const dateB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
        return dateB - dateA;
      });

      let html = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Học kỳ</th>
                <th>Hạnh kiểm</th>
                <th>Nhận xét</th>
                <th>Ngày đánh giá</th>
                <th>Người đánh giá</th>
              </tr>
            </thead>
            <tbody>
      `;

      conductRecords.forEach(record => {
        const date = formatDate(record.date);
        
        let gradeClass = 'grade-';
        if (record.grade === 'Tốt') gradeClass += 'good';
        else if (record.grade === 'Khá') gradeClass += 'medium';
        else if (record.grade === 'Trung bình') gradeClass += 'average';
        else if (record.grade === 'Yếu') gradeClass += 'bad';
        else gradeClass += 'unknown';
        
        html += `
          <tr>
            <td>${record.semester || '1'}</td>
            <td><span class="grade-badge ${gradeClass}">${record.grade || 'N/A'}</span></td>
            <td>${record.comments || 'Không có nhận xét'}</td>
            <td>${date}</td>
            <td>${record.createdByName || 'N/A'}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      conductContainer.innerHTML = html;
      console.log(`✅ Loaded ${conductRecords.length} conduct records`);

    } catch (error) {
      console.error('❌ Error loading conduct:', error);
      conductContainer.innerHTML = '<div class="error">Lỗi khi tải hạnh kiểm: ' + error.message + '</div>';
    }
  }

  async function loadStudentNotes() {
    const notesContainer = document.getElementById('notes-list');
    if (!notesContainer) {
      console.error('❌ notes-list container not found');
      return;
    }

    try {
      notesContainer.innerHTML = '<div class="loading">Đang tải ghi chú...</div>';

      const snapshot = await db.collection('student_notes')
        .where('studentId', '==', currentStudentId)
        .get();

      if (snapshot.empty) {
        notesContainer.innerHTML = '<div class="no-data">Chưa có ghi chú nào</div>';
        return;
      }

      let notes = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          ...data
        });
      });

      // Sort by date
      notes.sort((a, b) => {
        const dateA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
        const dateB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
        return dateB - dateA;
      });

      let html = '<div class="notes-grid">';

      notes.forEach(note => {
        const date = formatDate(note.date);
        
        html += `
          <div class="note-card glass">
            <div class="note-header">
              <h3>${note.title || 'Không có tiêu đề'}</h3>
              <span class="note-date">📅 ${date}</span>
            </div>
            <div class="note-body">
              <p>${note.content || 'Không có nội dung'}</p>
            </div>
            <div class="note-footer">
              <span class="note-author">👤 ${note.createdByName || 'N/A'}</span>
            </div>
          </div>
        `;
      });

      html += '</div>';
      notesContainer.innerHTML = html;
      console.log(`✅ Loaded ${notes.length} notes`);

    } catch (error) {
      console.error('❌ Error loading notes:', error);
      notesContainer.innerHTML = '<div class="error">Lỗi khi tải ghi chú: ' + error.message + '</div>';
    }
  }

  // =========================
  // HÀM TIỆN ÍCH
  // =========================
  
  function getGenderText(gender) {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      default: return 'Chưa cập nhật';
    }
  }

  function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') {
      try {
        return new Date(date).toLocaleDateString('vi-VN');
      } catch {
        return date;
      }
    }
    if (date.toDate) {
      return date.toDate().toLocaleDateString('vi-VN');
    }
    return 'N/A';
  }

  function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // =========================
  // CHART FUNCTIONS - SỬA CHIỀU CAO
  // =========================
  
  function drawCharts() {
    console.log('📊 Drawing charts...');
    
    if (scoresData.length === 0) {
      console.log('⚠️ No data for charts');
      destroyCharts();
      return;
    }

    destroyCharts();

    switch(currentChartType) {
      case 'line':
        drawLineChart();
        break;
      case 'score-pie':
        drawScoreDistributionChart('pie');
        break;
      case 'score-bar':
        drawSubjectComparisonChart();
        break;
    }
  }

  function drawLineChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    const sortedScores = [...scoresData].sort((a, b) => {
      const dateA = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
      const dateB = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
      return dateA - dateB;
    });

    const labels = sortedScores.map(score => {
      const date = score.date ? (score.date.toDate ? score.date.toDate() : new Date(score.date)) : new Date();
      return date.toLocaleDateString('vi-VN');
    });

    const scores = sortedScores.map(score => score.score || 0);

    lineChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Điểm số theo thời gian',
          data: scores,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            title: {
              display: true,
              text: 'Điểm'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            title: {
              display: true,
              text: 'Ngày'
            }
          }
        }
      }
    });
  }

  function drawScoreDistributionChart(chartType) {
    const ctx = document.getElementById('scoreDistChart');
    if (!ctx) return;

    const scoreRanges = {
      'Yếu (<5)': { min: 0, max: 5, color: '#F44336', count: 0 },
      'Trung bình (5-6.5)': { min: 5, max: 6.5, color: '#FF9800', count: 0 },
      'Khá (6.5-8)': { min: 6.5, max: 8, color: '#4CAF50', count: 0 },
      'Giỏi (8-10)': { min: 8, max: 10.1, color: '#2196F3', count: 0 }
    };

    scoresData.forEach(score => {
      const scoreValue = score.score || 0;
      for (const [range, data] of Object.entries(scoreRanges)) {
        if (scoreValue >= data.min && scoreValue < data.max) {
          data.count++;
          break;
        }
      }
    });

    const labels = Object.keys(scoreRanges);
    const data = Object.values(scoreRanges).map(range => range.count);
    const backgroundColors = Object.values(scoreRanges).map(range => range.color);

    scoreDistChartInstance = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: 'Số lượng điểm',
          data: data,
          backgroundColor: backgroundColors,
          borderColor: chartType === 'pie' ? '#ffffff' : backgroundColors,
          borderWidth: chartType === 'pie' ? 2 : 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: chartType === 'pie'
          }
        }
      }
    });
  }

  function drawSubjectComparisonChart() {
    const ctx = document.getElementById('subjectChart');
    if (!ctx) return;

    const subjectData = {};
    scoresData.forEach(score => {
      const subject = score.subject || 'Không xác định';
      if (!subjectData[subject]) {
        subjectData[subject] = {
          scores: [],
          count: 0,
          total: 0
        };
      }
      subjectData[subject].scores.push(score.score);
      subjectData[subject].count++;
      subjectData[subject].total += score.score;
    });

    const subjects = Object.keys(subjectData);
    const averages = subjects.map(subject => 
      (subjectData[subject].total / subjectData[subject].count).toFixed(2)
    );

    const generateColors = (count) => {
      const colors = [];
      const hueStep = 360 / count;
      for (let i = 0; i < count; i++) {
        const hue = (i * hueStep) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
      }
      return colors;
    };

    const backgroundColors = generateColors(subjects.length);

    subjectChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: subjects,
        datasets: [{
          label: 'Điểm trung bình',
          data: averages,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('60%)', '40%)')),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            title: {
              display: true,
              text: 'Điểm trung bình'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            title: {
              display: true,
              text: 'Môn học'
            }
          }
        }
      }
    });
  }

  // =========================
  // SETUP FUNCTIONS
  // =========================
  
  function setupModalButtons() {
    const modalButtons = {
      'btn-add-achievement': 'add-achievement-modal',
      'btn-add-conduct': 'add-conduct-modal',
      'btn-add-note': 'add-note-modal'
    };
    
    for (const [btnId, modalId] of Object.entries(modalButtons)) {
      const button = document.getElementById(btnId);
      if (button) {
        button.addEventListener('click', () => {
          // Set default date to today
          const dateInput = document.getElementById(modalId.replace('add-', '').replace('-modal', '-date'));
          if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
          }
          
          showModal(modalId);
        });
      }
    }

    // Close buttons
    const closeButtons = {
      'close-achievement-modal': 'add-achievement-modal',
      'close-conduct-modal': 'add-conduct-modal',
      'close-note-modal': 'add-note-modal'
    };
    
    for (const [btnId, modalId] of Object.entries(closeButtons)) {
      const button = document.getElementById(btnId);
      if (button) {
        button.addEventListener('click', () => hideModal(modalId));
      }
    }
  }

  function setupChartButtons() {
    const chartButtons = document.querySelectorAll('.chart-type-btn');
    if (chartButtons.length > 0) {
      chartButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          const chartType = this.getAttribute('data-chart');
          console.log(`📊 Switching to ${chartType} chart`);
          
          // Update active button
          chartButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          // Switch chart display
          currentChartType = chartType;
          updateChartDisplay();
          
          // Draw the chart
          if (scoresData.length > 0) {
            drawCharts();
          }
        });
      });
    }
  }

  function setupFormHandlers() {
    // Achievement form
    const saveAchievementBtn = document.getElementById('save-achievement');
    if (saveAchievementBtn) {
      saveAchievementBtn.addEventListener('click', handleSaveAchievement);
    }

    // Conduct form
    const saveConductBtn = document.getElementById('save-conduct');
    if (saveConductBtn) {
      saveConductBtn.addEventListener('click', handleSaveConduct);
    }

    // Note form
    const saveNoteBtn = document.getElementById('save-note');
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', handleSaveNote);
    }
  }

  function updateChartDisplay() {
    const lineContainer = document.getElementById('line-chart-container');
    const distContainer = document.getElementById('score-dist-chart-container');
    const subjectContainer = document.getElementById('subject-chart-container');
    
    // Hide all
    if (lineContainer) lineContainer.style.display = 'none';
    if (distContainer) distContainer.style.display = 'none';
    if (subjectContainer) subjectContainer.style.display = 'none';
    
    // Show selected
    switch(currentChartType) {
      case 'line':
        if (lineContainer) lineContainer.style.display = 'block';
        break;
      case 'score-pie':
        if (distContainer) distContainer.style.display = 'block';
        break;
      case 'score-bar':
        if (subjectContainer) subjectContainer.style.display = 'block';
        break;
    }
  }

  function destroyCharts() {
    if (lineChartInstance) {
      lineChartInstance.destroy();
      lineChartInstance = null;
    }
    if (scoreDistChartInstance) {
      scoreDistChartInstance.destroy();
      scoreDistChartInstance = null;
    }
    if (subjectChartInstance) {
      subjectChartInstance.destroy();
      subjectChartInstance = null;
    }
  }

  function updateSummary(averageScore, weightedAverage) {
    const averageScoreElement = document.getElementById('average-score');
    const academicRankElement = document.getElementById('academic-rank');
    const classificationElement = document.getElementById('classification');
    
    if (averageScore === null) {
      if (averageScoreElement) averageScoreElement.textContent = '-';
      if (academicRankElement) academicRankElement.textContent = '-';
      if (classificationElement) classificationElement.textContent = '-';
      return;
    }
    
    if (averageScoreElement) {
      averageScoreElement.textContent = `${averageScore} (TB có hệ số: ${weightedAverage})`;
    }
    
    // Determine academic rank
    let rank = '';
    let classification = '';
    
    const score = parseFloat(weightedAverage || averageScore);
    
    if (score >= 8) {
      rank = 'Giỏi';
      classification = 'Xuất sắc';
    } else if (score >= 6.5) {
      rank = 'Khá';
      classification = 'Tốt';
    } else if (score >= 5) {
      rank = 'Trung bình';
      classification = 'Đạt yêu cầu';
    } else {
      rank = 'Yếu';
      classification = 'Cần cố gắng';
    }
    
    if (academicRankElement) academicRankElement.textContent = rank;
    if (classificationElement) classificationElement.textContent = classification;
  }

  // =========================
  // DYNAMIC STYLES - SỬA CHIỀU CAO BIỂU ĐỒ
  // =========================
  
  function addDynamicStyles() {
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .score-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: bold;
          color: white;
          min-width: 50px;
          text-align: center;
        }
        
        .score-good { background: #4CAF50; }
        .score-medium { background: #FF9800; }
        .score-average { background: #9E9E9E; }
        .score-bad { background: #F44336; }
        
        .grade-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: bold;
          color: white;
          min-width: 80px;
          text-align: center;
        }
        
        .grade-good { background: #4CAF50; }
        .grade-medium { background: #FF9800; }
        .grade-average { background: #9E9E9E; }
        .grade-bad { background: #F44336; }
        .grade-unknown { background: #9E9E9E; }
        
        .achievement-type {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          color: white;
          margin-left: 10px;
        }
        
        .academic { background: #2196F3; }
        .sports { background: #4CAF50; }
        .art { background: #9C27B0; }
        .social { background: #FF9800; }
        .other { background: #9E9E9E; }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-style: italic;
        }
        
        .no-data {
          text-align: center;
          padding: 40px;
          color: #666;
          border: 1px dashed rgba(0,0,0,0.2);
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .error {
          text-align: center;
          padding: 40px;
          color: #F44336;
          border: 1px solid rgba(244, 67, 54, 0.2);
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .achievements-grid, .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }
        
        .achievement-card, .note-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.3s ease;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .achievement-card:hover, .note-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .achievement-header, .note-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .achievement-header h3, .note-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
          flex: 1;
        }
        
        .achievement-body, .note-body {
          margin-bottom: 12px;
          color: #666;
          line-height: 1.6;
        }
        
        .achievement-footer, .note-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid rgba(0,0,0,0.1);
          padding-top: 12px;
        }
        
        .table-container {
          overflow-x: auto;
          border-radius: 8px;
          margin-top: 20px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(255, 255, 255, 0.9);
        }
        
        .data-table th {
          background: rgba(33, 150, 243, 0.1);
          padding: 12px;
          text-align: left;
          color: #333;
          font-weight: 600;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .data-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          color: #333;
        }
        
        .data-table tr:hover {
          background: rgba(33, 150, 243, 0.05);
        }
        
        .score-summary {
          padding: 20px;
          margin-top: 30px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        
        .summary-item {
          background: rgba(255, 255, 255, 0.9);
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .summary-item strong {
          display: block;
          color: #666;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .summary-item span {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .chart-type-btn.active {
          background: #4CAF50 !important;
          color: white !important;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        /* Sửa chiều cao biểu đồ */
        #lineChart, #scoreDistChart, #subjectChart {
          height: 350px !important;
          max-height: 350px !important;
          width: 100% !important;
        }
        
        .btn-danger {
          background: #f44336;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.3s;
        }
        
        .btn-danger:hover {
          background: #d32f2f;
        }
        
        .btn-danger:disabled {
          background: #ffcdd2;
          cursor: not-allowed;
        }
      `;
      document.head.appendChild(style);
      console.log('✅ Dynamic styles added');
    }
  }
});