// Classes management - FIXED VERSION (NO INDEX REQUIRED)
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Classes Management Initialized');
  
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
        initClasses(userData.role || 'teacher');
      } else {
        initClasses('teacher');
      }
    });
  });

  function initClasses(userRole) {
    console.log('🎯 Initializing classes management');
    console.log('👤 User role:', userRole);
    
    // Redirect students to their own profile
    if (userRole === 'student') {
      db.collection('users').doc(auth.currentUser.uid).get().then(doc => {
        if (doc.exists) {
          const userData = doc.data();
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
        }
      });
      return;
    }
    
    // ========================================
    // ELEMENT REFERENCES
    // ========================================
    const classesList = document.getElementById('classes-list');
    const classStudentsList = document.getElementById('class-students-list');
    const btnAddClass = document.getElementById('btn-add-class');
    const btnBackToClasses = document.getElementById('btn-back-to-classes');
    const btnAddStudentToClass = document.getElementById('btn-add-student-to-class');
    const saveClassBtn = document.getElementById('save-class');
    const closeModalBtn = document.getElementById('close-modal');
    const saveNewStudentBtn = document.getElementById('save-new-student');
    const closeAddStudentModalBtn = document.getElementById('close-add-student-modal');
    const closeEditStudentModalBtn = document.getElementById('close-edit-student-modal');
    const saveEditStudentBtn = document.getElementById('save-edit-student');

    // ========================================
    // GLOBAL VARIABLES
    // ========================================
    let editingClassId = null;
    let currentClassId = null;
    let currentPhotoFile = null;
    let classStudentsUnsubscribe = null;
    let editingStudentId = null;

    // ========================================
    // CLOUDINARY CONFIG
    // ========================================
    const CLOUDINARY_CLOUD_NAME = 'dlcb3l2ec';
    const CLOUDINARY_UPLOAD_PRESET = 'student_photos';

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    async function uploadToCloudinary(file) {
      if (!file) return null;
      
      try {
        console.log('☁️ Uploading to Cloudinary:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          console.error('❌ Cloudinary upload failed:', response.status);
          return null;
        }
        
        const data = await response.json();
        console.log('✅ Cloudinary upload successful');
        return data.secure_url || data.url;
        
      } catch (err) {
        console.error('❌ Cloudinary upload error:', err);
        return null;
      }
    }

    async function uploadImage(file) {
      console.log('📤 Starting image upload...');
      
      if (!file) {
        console.log('⚠️ No file to upload');
        return null;
      }
      
      const url = await uploadToCloudinary(file);
      
      if (url) {
        console.log('✅ Upload successful, URL:', url);
        return url;
      } else {
        console.error('❌ Upload failed');
        throw new Error('Không thể upload ảnh');
      }
    }

    // ========================================
    // CHECK EMAIL EXISTS (NO INDEX VERSION)
    // ========================================
    async function checkEmailExists(email, excludeStudentId = null) {
      console.log(`🔍 Checking email: ${email}, exclude: ${excludeStudentId}`);
      
      try {
        // Query students với email
        const studentSnapshot = await db.collection('students')
          .where('email', '==', email.toLowerCase())
          .get();
        
        // Lọc thủ công trên client
        let emailExists = false;
        studentSnapshot.forEach(doc => {
          const data = doc.data();
          // Bỏ qua nếu là student đang edit và không bị xóa
          if (doc.id !== excludeStudentId && (!data.isDeleted || data.isDeleted === false)) {
            emailExists = true;
          }
        });
        
        return emailExists;
        
      } catch (error) {
        console.error('❌ Error checking email:', error);
        
        // Fallback: query không có where, lọc toàn bộ (chỉ dùng khi ít dữ liệu)
        if (error.code === 'failed-precondition') {
          console.log('⚠️ Using fallback email check method');
          try {
            const allStudents = await db.collection('students').get();
            let exists = false;
            
            allStudents.forEach(doc => {
              const data = doc.data();
              if (data.email && data.email.toLowerCase() === email.toLowerCase() && 
                  doc.id !== excludeStudentId && 
                  (!data.isDeleted || data.isDeleted === false)) {
                exists = true;
              }
            });
            
            return exists;
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            return false;
          }
        }
        
        return false;
      }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    if (btnAddClass) {
      btnAddClass.addEventListener('click', function(e) {
        e.preventDefault();
        openAddClassModal();
      });
    }
    
    if (btnBackToClasses) {
      btnBackToClasses.addEventListener('click', function(e) {
        e.preventDefault();
        showClassListView();
      });
    }
    
    if (btnAddStudentToClass) {
      btnAddStudentToClass.addEventListener('click', function(e) {
        e.preventDefault();
        openAddStudentModal();
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        hideModal('class-modal');
      });
    }
    
    if (saveClassBtn) {
      saveClassBtn.addEventListener('click', function(e) {
        e.preventDefault();
        saveClass();
      });
    }

    if (closeAddStudentModalBtn) {
      closeAddStudentModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeAddStudentModal();
      });
    }

    if (saveNewStudentBtn) {
      saveNewStudentBtn.addEventListener('click', function(e) {
        e.preventDefault();
        saveNewStudent();
      });
    }

    if (closeEditStudentModalBtn) {
      closeEditStudentModalBtn.addEventListener('click', function(e) {
        e.preventDefault();
        closeEditStudentModal();
      });
    }

    if (saveEditStudentBtn) {
      saveEditStudentBtn.addEventListener('click', function(e) {
        e.preventDefault();
        saveEditStudent();
      });
    }

    // Photo upload handlers
    document.getElementById('new-stu-photo')?.addEventListener('change', function(e) {
      currentPhotoFile = e.target.files[0];
      console.log('📸 New student photo selected:', currentPhotoFile?.name || 'None');
    });

    document.getElementById('edit-stu-photo')?.addEventListener('change', function(e) {
      currentPhotoFile = e.target.files[0];
      console.log('📸 Edit student photo selected:', currentPhotoFile?.name || 'None');
    });

    // ========================================
    // CORE FUNCTIONS
    // ========================================
    function renderPlaceholders(count = 3) {
      if (!classesList) return;
      
      classesList.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'class-card glass placeholder';
        placeholder.innerHTML = `
          <h3>Đang tải...</h3>
          <p>Khối: ...</p>
          <p>GVCN: ...</p>
          <p>Sĩ số: ...</p>
        `;
        classesList.appendChild(placeholder);
      }
    }

    function renderClasses(snapshot) {
      if (!classesList) {
        console.error('❌ classesList element not found');
        return;
      }
      
      console.log('🎨 Rendering classes...');
      classesList.innerHTML = '';

      if (snapshot.empty) {
        console.log('ℹ️ No classes found');
        classesList.innerHTML = '<div class="no-data">Chưa có lớp học nào</div>';
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        
        const classCard = document.createElement('div');
        classCard.className = 'class-card glass';
        classCard.innerHTML = `
          <div class="class-card-content">
            <h3>${data.name}</h3>
            <p>Khối: ${data.grade || 'Chưa cập nhật'}</p>
            <p>GVCN: ${data.teacher || 'Chưa cập nhật'}</p>
            <p>Sĩ số: <span class="student-count-${doc.id}">0</span> học sinh</p>
          </div>
          <div class="class-card-actions">
            <button class="btn-secondary view-class" data-id="${doc.id}" type="button">Xem học sinh</button>
            <button class="btn-secondary edit-class" data-id="${doc.id}" type="button">Sửa</button>
            <button class="btn-secondary delete-class" data-id="${doc.id}" type="button">Xóa</button>
          </div>
        `;
        classesList.appendChild(classCard);
        countStudentsInClass(doc.id);
      });

      attachClassEventListeners();
    }

    function attachClassEventListeners() {
      console.log('🔗 Attaching class event listeners...');
      
      // View class details
      document.querySelectorAll('.view-class').forEach(btn => {
        btn.addEventListener('click', e => {
          const classId = e.target.dataset.id;
          console.log('👆 View class clicked:', classId);
          
          db.collection('classes').doc(classId).get()
            .then(doc => {
              if (doc.exists) {
                showClassDetailView(classId, doc.data());
              } else {
                alert('Lớp học không tồn tại!');
              }
            })
            .catch(error => {
              console.error('❌ Error loading class:', error);
              alert('Lỗi tải thông tin lớp: ' + error.message);
            });
        });
      });

      // Edit class
      document.querySelectorAll('.edit-class').forEach(btn => {
        btn.addEventListener('click', e => {
          const classId = e.target.dataset.id;
          console.log('✏️ Edit class clicked:', classId);
          editClass(classId);
        });
      });

      // Delete class
      document.querySelectorAll('.delete-class').forEach(btn => {
        btn.addEventListener('click', e => {
          const classId = e.target.dataset.id;
          console.log('🗑️ Delete class clicked:', classId);
          deleteClass(classId);
        });
      });
    }

    function showClassListView() {
      console.log('📋 Showing class list view');
      
      document.getElementById('class-list-view')?.classList.remove('hidden');
      document.getElementById('class-detail-view')?.classList.add('hidden');
      
      // Unsubscribe from student listener
      if (classStudentsUnsubscribe) {
        console.log('🔴 Unsubscribing from student listener');
        classStudentsUnsubscribe();
        classStudentsUnsubscribe = null;
      }
      
      currentClassId = null;
    }

    function showClassDetailView(classId, classData) {
      console.log('🎯 Showing class detail view for:', classData.name);
      
      document.getElementById('class-list-view')?.classList.add('hidden');
      document.getElementById('class-detail-view')?.classList.remove('hidden');
      
      currentClassId = classId;
      
      // Update class info
      const titleEl = document.getElementById('class-detail-title');
      const nameEl = document.getElementById('class-detail-name');
      const gradeEl = document.getElementById('class-detail-grade');
      const teacherEl = document.getElementById('class-detail-teacher');
      
      if (titleEl) titleEl.textContent = classData.name;
      if (nameEl) nameEl.textContent = classData.name;
      if (gradeEl) gradeEl.textContent = classData.grade || 'Chưa cập nhật';
      if (teacherEl) teacherEl.textContent = classData.teacher || 'Chưa cập nhật';
      
      // Load students for this class
      loadClassStudents(classId);
    }

    function loadClassStudents(classId) {
      if (!classStudentsList) {
        console.error('❌ classStudentsList element not found');
        return;
      }
      
      console.log('👨‍🎓 Loading students for class:', classId);
      classStudentsList.innerHTML = '<div class="loading">Đang tải học sinh...</div>';

      // Unsubscribe from previous listener
      if (classStudentsUnsubscribe) {
        console.log('🔴 Unsubscribing from previous student listener');
        classStudentsUnsubscribe();
      }

      // Load students WITHOUT isDeleted filter (we'll filter manually)
      classStudentsUnsubscribe = db.collection('students')
        .where('classId', '==', classId)
        .onSnapshot({
          next: (snapshot) => {
            console.log('✅ Students loaded:', snapshot.size, 'total');
            
            classStudentsList.innerHTML = '';
            
            if (snapshot.empty) {
              console.log('ℹ️ No students found for this class');
              classStudentsList.innerHTML = '<div class="no-data">Chưa có học sinh nào trong lớp này</div>';
              updateStudentCount(0);
              return;
            }

            let studentCount = 0;
            snapshot.forEach(doc => {
              const data = doc.data();
              // Filter manually on client side
              if (!data.isDeleted || data.isDeleted === false) {
                studentCount++;
                renderStudentCard(doc.id, data);
              }
            });

            updateStudentCount(studentCount);
            attachStudentEventListeners();
            
            if (studentCount === 0) {
              classStudentsList.innerHTML = '<div class="no-data">Chưa có học sinh nào trong lớp này</div>';
            }
          },
          error: (error) => {
            console.error('❌ Error loading students:', error);
            classStudentsList.innerHTML = `
              <div class="error" style="grid-column: 1/-1; text-align: center; padding: 40px; color: white;">
                Lỗi tải danh sách học sinh: ${error.message}
              </div>
            `;
          }
        });
    }

    function renderStudentCard(studentId, data) {
      const studentCard = document.createElement('div');
      studentCard.className = 'student-card glass';
      
      // Tạo icon giới tính
      const genderIcon = data.gender === 'male' ? '♂️' : data.gender === 'female' ? '♀️' : '?';
      const genderClass = data.gender === 'male' ? 'gender-male' : data.gender === 'female' ? 'gender-female' : 'gender-unknown';
      
      studentCard.innerHTML = `
        <div class="student-header">
          ${data.photoURL ? 
            `<img src="${data.photoURL}" class="student-photo" alt="${data.name}">` : 
            '<div class="student-photo no-photo">📷</div>'
          }
          <div class="student-name-gender">
            <h3>${data.name}</h3>
            <span class="gender-icon ${genderClass}">${genderIcon}</span>
          </div>
        </div>
        <div class="student-info">
          <p><strong>Mã HS:</strong> ${data.studentId || 'Chưa có'}</p>
          <p><strong>Ngày sinh:</strong> ${data.birthdate || 'Chưa cập nhật'}</p>
          <p><strong>Giới tính:</strong> ${getGenderText(data.gender)}</p>
        </div>
        <div class="student-actions">
          <button class="btn-small btn-view view-student" data-id="${studentId}" type="button">Xem</button>
          <button class="btn-small btn-edit edit-student" data-id="${studentId}" type="button">Sửa</button>
          <button class="btn-small btn-delete remove-student" data-id="${studentId}" type="button">Xóa khỏi lớp</button>
        </div>
      `;
      classStudentsList.appendChild(studentCard);
    }

    function getGenderText(gender) {
      switch(gender) {
        case 'male': return 'Nam';
        case 'female': return 'Nữ';
        default: return 'Chưa cập nhật';
      }
    }

    function attachStudentEventListeners() {
      console.log('🔗 Attaching student event listeners...');
      
      // View student details
      classStudentsList.querySelectorAll('.view-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const studentId = e.target.dataset.id;
          console.log('👁️ View student clicked:', studentId);
          viewStudentDetail(studentId);
        });
      });

      // Edit student
      classStudentsList.querySelectorAll('.edit-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const studentId = e.target.dataset.id;
          console.log('✏️ Edit student clicked:', studentId);
          openEditStudentModal(studentId);
        });
      });

      // Remove student from class
      classStudentsList.querySelectorAll('.remove-student').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const studentId = e.target.dataset.id;
          console.log('🗑️ Remove student clicked:', studentId);
          removeStudentFromClass(studentId);
        });
      });
    }

    function viewStudentDetail(studentId) {
      console.log('👁️ Viewing student detail:', studentId);
      window.location.href = `student-detail.html?studentId=${studentId}`;
    }

    function updateStudentCount(count) {
      console.log('🔢 Updating student count:', count);
      
      const countElement = document.getElementById('class-detail-student-count');
      if (countElement) {
        countElement.textContent = `${count} học sinh`;
      }
      
      // Update count in class list view
      if (currentClassId) {
        const countElementInList = document.querySelector(`.student-count-${currentClassId}`);
        if (countElementInList) {
          countElementInList.textContent = count;
        }
      }
    }

    async function removeStudentFromClass(studentId) {
      if (confirm('Bạn có chắc muốn xóa học sinh này khỏi lớp?')) {
        console.log('🗑️ Removing student from class:', studentId);
        
        try {
          await db.collection('students').doc(studentId).update({
            classId: '',
            className: ''
          });
          
          console.log('✅ Student removed from class');
          alert('Đã xóa học sinh khỏi lớp!');
        } catch (error) {
          console.error('❌ Error removing student:', error);
          alert('Lỗi xóa học sinh: ' + error.message);
        }
      }
    }

    function openEditStudentModal(studentId) {
      editingStudentId = studentId;
      console.log('📝 Opening edit student modal for:', studentId);
      
      // Fetch student data
      db.collection('students').doc(studentId).get()
        .then(doc => {
          if (doc.exists) {
            const data = doc.data();
            console.log('📋 Student data loaded:', data);
            
            // Điền thông tin vào form
            document.getElementById('edit-stu-name').value = data.name || '';
            document.getElementById('edit-stu-id').value = data.studentId || '';
            document.getElementById('edit-stu-birthdate').value = data.birthdate || '';
            document.getElementById('edit-stu-phone').value = data.phone || '';
            document.getElementById('edit-stu-email').value = data.email || '';
            document.getElementById('edit-stu-gender').value = data.gender || '';
            
            // Hiển thị ảnh hiện tại
            const currentPhotoContainer = document.getElementById('edit-current-photo');
            if (currentPhotoContainer) {
              if (data.photoURL) {
                currentPhotoContainer.innerHTML = `
                  <p><strong>Ảnh hiện tại:</strong></p>
                  <img src="${data.photoURL}" style="max-width: 150px; border-radius: 8px; margin-top: 8px;" alt="Current photo">
                `;
              } else {
                currentPhotoContainer.innerHTML = '<p><strong>Ảnh hiện tại:</strong> Chưa có ảnh</p>';
              }
            }
            
            showModal('edit-student-modal');
          } else {
            alert('Không tìm thấy thông tin học sinh!');
          }
        })
        .catch(error => {
          console.error('❌ Error loading student data:', error);
          alert('Lỗi tải thông tin học sinh: ' + error.message);
        });
    }

    function closeEditStudentModal() {
      console.log('❌ Closing edit student modal');
      hideModal('edit-student-modal');
      editingStudentId = null;
      currentPhotoFile = null;
      
      // Reset form
      document.getElementById('edit-stu-photo').value = '';
      const currentPhotoContainer = document.getElementById('edit-current-photo');
      if (currentPhotoContainer) {
        currentPhotoContainer.innerHTML = '';
      }
    }

    async function saveEditStudent() {
      console.log('💾 Saving edited student...');
      
      if (!saveEditStudentBtn) return;
      
      // Disable button
      saveEditStudentBtn.disabled = true;
      const originalText = saveEditStudentBtn.textContent;
      saveEditStudentBtn.textContent = 'Đang lưu...';
      
      try {
        // Lấy giá trị từ form
        const name = document.getElementById('edit-stu-name').value.trim();
        const studentId = document.getElementById('edit-stu-id').value.trim();
        const birthdate = document.getElementById('edit-stu-birthdate').value;
        const phone = document.getElementById('edit-stu-phone').value.trim();
        const email = document.getElementById('edit-stu-email').value.trim().toLowerCase();
        const gender = document.getElementById('edit-stu-gender').value;

        console.log('📝 Edit form data:', { name, studentId, birthdate, phone, email, gender });

        if (!name) {
          alert('Vui lòng nhập họ tên học sinh!');
          return;
        }

        if (!email) {
          alert('Vui lòng nhập email học sinh!');
          return;
        }

        // 🔍 KIỂM TRA EMAIL TRÙNG (sử dụng hàm mới)
        const emailExists = await checkEmailExists(email, editingStudentId);
        if (emailExists) {
          alert('❌ Email đã tồn tại cho học sinh khác! Vui lòng sử dụng email khác.');
          document.getElementById('edit-stu-email').focus();
          return;
        }

        // Lấy dữ liệu học sinh hiện tại
        const studentDoc = await db.collection('students').doc(editingStudentId).get();
        const studentData = studentDoc.data();

        // Tạo object update
        const updateData = {
          name: name,
          studentId: studentId,
          birthdate: birthdate,
          phone: phone,
          email: email,
          gender: gender,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Nếu classId thay đổi, cập nhật className
        if (studentData.classId) {
          const classDoc = await db.collection('classes').doc(studentData.classId).get();
          if (classDoc.exists) {
            updateData.className = classDoc.data().name;
          }
        }

        // Upload ảnh mới nếu có
        if (currentPhotoFile) {
          console.log('📸 Uploading new photo...');
          
          try {
            const photoURL = await uploadImage(currentPhotoFile);
            if (photoURL) {
              console.log('✅ Photo uploaded successfully:', photoURL);
              updateData.photoURL = photoURL;
            }
          } catch (uploadError) {
            console.error('❌ Photo upload failed:', uploadError);
          }
        }

        console.log('🔥 Updating student with data:', updateData);
        
        // Update lên Firestore
        await db.collection('students').doc(editingStudentId).update(updateData);
        
        console.log('✅ Student updated successfully');
        
        alert('Cập nhật học sinh thành công!');
        closeEditStudentModal();
        
      } catch (error) {
        console.error('❌ Error saving student:', error);
        alert('Lỗi cập nhật học sinh: ' + error.message);
      } finally {
        // Restore button state
        saveEditStudentBtn.textContent = originalText;
        saveEditStudentBtn.disabled = false;
      }
    }

    function countStudentsInClass(classId) {
      db.collection('students')
        .where('classId', '==', classId)
        .get()
        .then(snapshot => {
          let count = 0;
          snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.isDeleted || data.isDeleted === false) {
              count++;
            }
          });
          
          const countElement = document.querySelector(`.student-count-${classId}`);
          if (countElement) {
            countElement.textContent = count;
            console.log(`📊 Student count for ${classId}: ${count}`);
          }
        })
        .catch(error => {
          console.error('❌ Error counting students:', error);
        });
    }

    function openAddClassModal() {
      console.log('➕ Opening add class modal');
      editingClassId = null;
      document.getElementById('modal-title').textContent = 'Thêm lớp mới';
      document.getElementById('class-name').value = '';
      document.getElementById('class-grade').value = '';
      document.getElementById('class-teacher').value = '';
      showModal('class-modal');
    }

    function openAddStudentModal() {
      console.log('➕ Opening add student modal');
      if (!currentClassId) {
        alert('Vui lòng chọn lớp trước khi thêm học sinh');
        return;
      }
      showModal('add-student-modal');
    }

    function closeAddStudentModal() {
      console.log('❌ Closing add student modal');
      hideModal('add-student-modal');
      resetNewStudentForm();
    }

    async function saveNewStudent() {
      console.log('💾 Saving new student...');
      
      if (!saveNewStudentBtn) return;
      
      // Disable button
      saveNewStudentBtn.disabled = true;
      const originalText = saveNewStudentBtn.textContent;
      saveNewStudentBtn.textContent = 'Đang thêm...';
      
      try {
        // Lấy giá trị từ form
        const name = document.getElementById('new-stu-name').value.trim();
        const studentIdInput = document.getElementById('new-stu-id').value.trim();
        const birthdate = document.getElementById('new-stu-birthdate').value;
        const phone = document.getElementById('new-stu-phone').value.trim();
        const email = document.getElementById('new-stu-email').value.trim().toLowerCase();
        const gender = document.getElementById('new-stu-gender').value;

        console.log('📝 Student form data:', {
          name, studentId: studentIdInput, birthdate, phone, email, gender, currentClassId
        });

        if (!name) {
          alert('Vui lòng nhập họ tên học sinh!');
          return;
        }

        if (!email) {
          alert('Vui lòng nhập email học sinh!');
          return;
        }

        if (!currentClassId) {
          alert('Lỗi: Không tìm thấy lớp học!');
          return;
        }

        // 🔍 KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          alert('❌ Email đã tồn tại trong hệ thống! Vui lòng sử dụng email khác.');
          document.getElementById('new-stu-email').focus();
          return;
        }

        // Lấy thông tin lớp
        const classDoc = await db.collection('classes').doc(currentClassId).get();
        if (!classDoc.exists) {
          alert('Lỗi: Lớp học không tồn tại!');
          return;
        }

        const classData = classDoc.data();
        const studentData = {
          name: name,
          studentId: studentIdInput,
          birthdate: birthdate,
          phone: phone,
          email: email,
          gender: gender,
          classId: currentClassId,
          className: classData.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isDeleted: false
        };

        console.log('💾 Saving student data:', studentData);

        // Upload photo nếu có
        if (currentPhotoFile) {
          console.log('📸 Uploading photo for new student...');
          
          try {
            const photoURL = await uploadImage(currentPhotoFile);
            if (photoURL) {
              console.log('✅ Photo uploaded successfully:', photoURL);
              studentData.photoURL = photoURL;
            }
          } catch (uploadError) {
            console.error('❌ Photo upload failed:', uploadError);
          }
        }

        // Lưu học sinh vào Firestore
        const docRef = await db.collection('students').add(studentData);
        
        console.log('✅ Student added successfully, ID:', docRef.id);

        // 🎯 Gửi mã xác nhận qua email
        try {
          console.log('📧 Gửi mã xác nhận đến:', email);
          
          const requestBody = JSON.stringify({
            studentEmail: email,
            studentName: name
          });
          
          const response = await fetch('http://localhost:3000/send-verification-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: requestBody
          });

          console.log('📬 Response status:', response.status);
          const result = await response.json();

          if (result.success && result.verificationCode) {
            // Lưu mã xác nhận vào Firestore
            console.log('💾 Lưu mã xác nhận vào Firestore:', result.verificationCode);
            await db.collection('students').doc(docRef.id).update({
              verificationCode: result.verificationCode,
              verificationCodeCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Mã xác nhận đã gửi và lưu thành công');
            alert('Thêm học sinh thành công!\n\n📧 Mã xác nhận: ' + result.verificationCode + '\n\nEmail: ' + email);
          } else {
            console.warn('⚠️ Không thể gửi mã xác nhận:', result.message);
            alert('Thêm học sinh thành công!\n\n⚠️ Cảnh báo: ' + (result.message || 'Lỗi gửi email'));
          }
        } catch (err) {
          console.error('❌ Lỗi gửi email (catch):', err);
          alert('Thêm học sinh thành công!\n\n⚠️ Không thể gửi email. Lỗi: ' + err.message);
        }
        
        // Đóng modal
        closeAddStudentModal();
        
      } catch (error) {
        console.error('❌ Error saving student:', error);
        alert('Lỗi thêm học sinh: ' + error.message);
      } finally {
        // Restore button state
        saveNewStudentBtn.textContent = originalText;
        saveNewStudentBtn.disabled = false;
      }
    }

    function resetNewStudentForm() {
      document.getElementById('new-stu-name').value = '';
      document.getElementById('new-stu-id').value = '';
      document.getElementById('new-stu-birthdate').value = '';
      document.getElementById('new-stu-phone').value = '';
      document.getElementById('new-stu-email').value = '';
      document.getElementById('new-stu-gender').value = '';
      document.getElementById('new-stu-photo').value = '';
      currentPhotoFile = null;
      console.log('🔄 New student form reset');
    }

    function editClass(classId) {
      console.log('✏️ Editing class:', classId);
      
      db.collection('classes').doc(classId).get().then(doc => {
        if (doc.exists) {
          const data = doc.data();
          editingClassId = classId;
          document.getElementById('modal-title').textContent = 'Sửa thông tin lớp';
          document.getElementById('class-name').value = data.name;
          document.getElementById('class-grade').value = data.grade || '';
          document.getElementById('class-teacher').value = data.teacher || '';
          showModal('class-modal');
        }
      });
    }

    async function saveClass() {
      console.log('💾 Saving class...');
      
      if (!saveClassBtn) return;
      
      // Disable button
      saveClassBtn.disabled = true;
      const originalText = saveClassBtn.textContent;
      saveClassBtn.textContent = 'Đang lưu...';
      
      const name = document.getElementById('class-name').value.trim();
      const grade = document.getElementById('class-grade').value.trim();
      const teacher = document.getElementById('class-teacher').value.trim();

      if (!name) {
        alert('Vui lòng nhập tên lớp!');
        return;
      }

      const classData = {
        name,
        grade,
        teacher,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('📝 Class data to save:', classData);

      hideModal('class-modal');

      try {
        if (editingClassId) {
          console.log('✏️ Updating existing class:', editingClassId);
          await db.collection('classes').doc(editingClassId).update(classData);
          alert('Cập nhật lớp thành công!');
        } else {
          console.log('➕ Adding new class');
          classData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('classes').add(classData);
          alert('Thêm lớp thành công!');
        }
        
      } catch (error) {
        console.error('❌ Error saving class:', error);
        alert('Lỗi thêm lớp: ' + error.message);
      } finally {
        saveClassBtn.textContent = originalText;
        saveClassBtn.disabled = false;
      }
    }

    async function deleteClass(classId) {
      console.log('🗑️ Deleting class:', classId);
      
      if (!confirm('Bạn có chắc muốn xóa lớp này? Tất cả học sinh trong lớp sẽ bị xóa.')) return;

      try {
        // Lấy thông tin lớp trước khi xóa
        const classDoc = await db.collection('classes').doc(classId).get();
        const classData = classDoc.data();
        
        // Tìm và đánh dấu tất cả học sinh trong lớp là đã xóa
        const snapshot = await db.collection('students')
          .where('classId', '==', classId)
          .get();
        
        const batch = db.batch();
        let studentCount = 0;
        snapshot.forEach(doc => {
          batch.update(doc.ref, {
            isDeleted: true,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          studentCount++;
        });
        await batch.commit();
        
        console.log(`✅ Marked ${studentCount} students as deleted`);
        
        // Delete class
        await db.collection('classes').doc(classId).delete();
        
        console.log('✅ Class deleted successfully');
        alert('Xóa lớp thành công!');
        
        // Quay lại danh sách lớp
        showClassListView();
        
      } catch (error) {
        console.error('❌ Error deleting class:', error);
        alert('Lỗi xóa lớp: ' + error.message);
      }
    }

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

    // ========================================
    // INITIALIZATION
    // ========================================
    if (classesList) {
      // Hiển thị placeholder
      renderPlaceholders();
      
      // Load classes từ Firestore
      console.log('📦 Loading classes from Firestore...');
      const classesUnsubscribe = db.collection('classes')
        .orderBy('createdAt', 'desc')
        .onSnapshot({
          next: (snapshot) => {
            console.log('✅ Classes loaded:', snapshot.size, 'classes');
            renderClasses(snapshot);
          },
          error: (error) => {
            console.error('❌ Error loading classes:', error);
            classesList.innerHTML = '<div class="error">Lỗi tải danh sách lớp: ' + error.message + '</div>';
          }
        });

      // Cleanup
      window.addEventListener('beforeunload', () => {
        console.log('🧹 Cleaning up listeners...');
        if (classStudentsUnsubscribe) classStudentsUnsubscribe();
        if (classesUnsubscribe) classesUnsubscribe();
      });
    }
  }
});