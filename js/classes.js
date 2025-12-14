// Classes management with gender icons and edit student modal
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 DOM Content Loaded');
  
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      window.location.href = 'index.html';
      return;
    }
    console.log('✅ User authenticated:', user.uid);
    initClasses();
  });

  function initClasses() {
    console.log('🎯 Initializing classes management');
    
    const classesList = document.getElementById('classes-list');
    const classStudentsList = document.getElementById('class-students-list');
    const btnAddClass = document.getElementById('btn-add-class');
    const btnBackToClasses = document.getElementById('btn-back-to-classes');
    const btnAddStudentToClass = document.getElementById('btn-add-student-to-class');
    const saveClassBtn = document.getElementById('save-class');
    const closeModalBtn = document.getElementById('close-modal');
    const saveNewStudentBtn = document.getElementById('save-new-student');
    const closeAddStudentModalBtn = document.getElementById('close-add-student-modal');
    
    // Edit student modal elements
    const closeEditStudentModalBtn = document.getElementById('close-edit-student-modal');
    const saveEditStudentBtn = document.getElementById('save-edit-student');

    let editingClassId = null;
    let currentClassId = null;
    let currentPhotoFile = null;
    let classStudentsUnsubscribe = null;
    let editingStudentId = null;

    // ==== CLOUDINARY CONFIGURATION ====
    // THAY ĐỔI 2 DÒNG NÀY BẰNG THÔNG TIN CỦA BẠN
    const CLOUDINARY_CLOUD_NAME = 'dlcb3l2ec'; // Thay bằng cloud name của bạn
    const CLOUDINARY_UPLOAD_PRESET = 'student_photos'; // Thay bằng upload preset của bạn

    // Hàm upload trực tiếp lên Cloudinary
    async function uploadToCloudinary(file) {
      if (!file) return null;
      
      try {
        console.log('☁️ Uploading to Cloudinary:', file.name);
        
        // Tạo FormData cho Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        // Gửi request trực tiếp tới Cloudinary
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
        
        // Cloudinary trả về secure_url hoặc url
        return data.secure_url || data.url;
        
      } catch (err) {
        console.error('❌ Cloudinary upload error:', err);
        return null;
      }
    }

    // Hàm upload chính - chỉ dùng Cloudinary
    async function uploadImage(file) {
      console.log('📤 Starting image upload...');
      
      if (!file) {
        console.log('⚠️ No file to upload');
        return null;
      }
      
      // Chỉ dùng Cloudinary
      const url = await uploadToCloudinary(file);
      
      if (url) {
        console.log('✅ Upload successful, URL:', url);
        return url;
      } else {
        console.error('❌ Upload failed');
        throw new Error('Không thể upload ảnh');
      }
    }

    // Check if required elements exist
    console.log('🔍 Checking required elements:', {
      classesList: !!classesList,
      classStudentsList: !!classStudentsList,
      btnAddClass: !!btnAddClass,
      btnAddStudentToClass: !!btnAddStudentToClass
    });

    if (!classesList || !classStudentsList) {
      console.error('❌ Critical elements missing!');
      return;
    }

    // =========================
    // 1️⃣ Load classes with placeholders
    // =========================
    let classCount = parseInt(localStorage.getItem('classCount')) || 3;
    renderPlaceholders();

    // =========================
    // 2️⃣ Load actual classes from Firestore
    // =========================
    console.log('📦 Loading classes from Firestore...');
    const classesUnsubscribe = db.collection('classes')
      .orderBy('createdAt', 'desc')
      .onSnapshot({
        next: (snapshot) => {
          console.log('✅ Classes snapshot:', snapshot.size, 'classes');
          localStorage.setItem('classCount', snapshot.size);
          renderClasses(snapshot);
        },
        error: (error) => {
          console.error('❌ Error loading classes:', error);
          classesList.innerHTML = '<div class="error">Lỗi tải danh sách lớp: ' + error.message + '</div>';
        }
      });

    // =========================
    // Event Listeners
    // =========================
    btnAddClass.addEventListener('click', function(e) {
      e.preventDefault();
      openAddClassModal();
    });
    
    btnBackToClasses.addEventListener('click', function(e) {
      e.preventDefault();
      showClassListView();
    });
    
    if (btnAddStudentToClass) {
      btnAddStudentToClass.addEventListener('click', function(e) {
        e.preventDefault();
        openAddStudentModal();
      });
    } else {
      console.error('❌ btnAddStudentToClass not found');
    }

    closeModalBtn.addEventListener('click', function(e) {
      e.preventDefault();
      hideModal('class-modal');
    });
    
    saveClassBtn.addEventListener('click', function(e) {
      e.preventDefault();
      saveClass();
    });

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

    // Edit student modal events
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

    // Ngăn submit form khi nhấn Enter
    document.querySelectorAll('.modal input, .modal select').forEach(element => {
      element.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          return false;
        }
      });
    });

    // =========================
    // Core Functions
    // =========================
    function renderPlaceholders() {
      classesList.innerHTML = '';
      for (let i = 0; i < classCount; i++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'class-card glass placeholder';
        placeholder.innerHTML = `
          <h3>Đang tải <img src="https://i.gifer.com/ZZ5H.gif" style="width:16px;height:16px;vertical-align:middle"></h3>
          <p>Khối: ...</p>
          <p>GVCN: ...</p>
          <p>Sỉ số: ...</p>
        `;
        classesList.appendChild(placeholder);
      }
    }

    function renderClasses(snapshot) {
      console.log('🎨 Rendering classes...');
      classesList.innerHTML = '';

      if (snapshot.empty) {
        console.log('ℹ️ No classes found');
        classesList.innerHTML = '<div class="no-data">Chưa có lớp học nào</div>';
        return;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`🏫 Rendering class: ${data.name} (${doc.id})`);
        
        const classCard = document.createElement('div');
        classCard.className = 'class-card glass';
        classCard.innerHTML = `
          <div class="class-card-content">
            <h3>${data.name}</h3>
            <p>Khối: ${data.grade || 'Chưa cập nhật'}</p>
            <p>GVCN: ${data.teacher || 'Chưa cập nhật'}</p>
            <p>Sỉ số: <span class="student-count-${doc.id}">0</span> học sinh</p>
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
                console.log('✅ Class found, showing detail view');
                showClassDetailView(classId, doc.data());
              } else {
                console.error('❌ Class not found:', classId);
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
      
      document.getElementById('class-list-view').classList.remove('hidden');
      document.getElementById('class-detail-view').classList.add('hidden');
      
      // Unsubscribe from student listener
      if (classStudentsUnsubscribe) {
        console.log('🔴 Unsubscribing from student listener');
        classStudentsUnsubscribe();
        classStudentsUnsubscribe = null;
      }
      
      currentClassId = null;
    }

    function showClassDetailView(classId, classData) {
      console.log('🎯 Showing class detail view:', {
        classId: classId,
        classData: classData
      });
      
      document.getElementById('class-list-view').classList.add('hidden');
      document.getElementById('class-detail-view').classList.remove('hidden');
      
      currentClassId = classId;
      
      // Update class info
      document.getElementById('class-detail-title').textContent = classData.name;
      document.getElementById('class-detail-name').textContent = classData.name;
      document.getElementById('class-detail-grade').textContent = classData.grade || 'Chưa cập nhật';
      document.getElementById('class-detail-teacher').textContent = classData.teacher || 'Chưa cập nhật';
      
      // Load students for this class
      loadClassStudents(classId);
    }

    function loadClassStudents(classId) {
      console.log('👨‍🎓 Loading students for class:', classId);
      
      if (!classStudentsList) {
        console.error('❌ classStudentsList element not found');
        return;
      }
      
      classStudentsList.innerHTML = '<div class="loading">Đang tải học sinh...</div>';

      // Unsubscribe from previous listener
      if (classStudentsUnsubscribe) {
        console.log('🔴 Unsubscribing from previous student listener');
        classStudentsUnsubscribe();
      }

      // Real-time listener for students in this class
      console.log(`🔍 Querying: students where classId == "${classId}"`);
      
      classStudentsUnsubscribe = db.collection('students')
        .where('classId', '==', classId)
        .onSnapshot({
          next: (snapshot) => {
            console.log('✅ Students query result:', snapshot.size, 'students');
            
            classStudentsList.innerHTML = '';
            
            if (snapshot.empty) {
              console.log('ℹ️ No students found for this class');
              classStudentsList.innerHTML = '<div class="no-data">Chưa có học sinh nào trong lớp này</div>';
              updateStudentCount(0);
              return;
            }

            let studentCount = 0;
            snapshot.forEach(doc => {
              studentCount++;
              const data = doc.data();
              renderStudentCard(doc.id, data);
            });

            updateStudentCount(studentCount);
            attachStudentEventListeners();
          },
          error: (error) => {
            console.error('❌ Error in students query:', error);
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
      const genderIcon = data.gender === 'male' ? '♂' : data.gender === 'female' ? '♀' : '?';
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

    function removeStudentFromClass(studentId) {
      if (confirm('Bạn có chắc muốn xóa học sinh này khỏi lớp?')) {
        console.log('🗑️ Removing student from class:', studentId);
        
        db.collection('students').doc(studentId).update({
          classId: '',
          className: ''
        }).then(() => {
          console.log('✅ Student removed from class');
          alert('Đã xóa học sinh khỏi lớp!');
        }).catch(error => {
          console.error('❌ Error removing student:', error);
          alert('Lỗi xóa học sinh: ' + error.message);
        });
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
      
      // Disable button để tránh double click
      saveEditStudentBtn.disabled = true;
      const originalText = saveEditStudentBtn.textContent;
      saveEditStudentBtn.textContent = 'Đang lưu...';
      
      try {
        // Lấy giá trị từ form
        const name = document.getElementById('edit-stu-name').value.trim();
        const studentId = document.getElementById('edit-stu-id').value.trim();
        const birthdate = document.getElementById('edit-stu-birthdate').value;
        const phone = document.getElementById('edit-stu-phone').value.trim();
        const email = document.getElementById('edit-stu-email').value.trim();
        const gender = document.getElementById('edit-stu-gender').value;

        console.log('📝 Edit form data:', { name, studentId, birthdate, phone, email, gender });

        if (!name) {
          alert('Vui lòng nhập họ tên học sinh!');
          return;
        }

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
            // Vẫn tiếp tục cập nhật thông tin khác
          }
        }

        console.log('🔥 Updating student with data:', updateData);
        
        // Update lên Firestore
        await db.collection('students').doc(editingStudentId).update(updateData);
        
        console.log('✅ Student updated successfully');
        
        // Hiển thị thông báo thành công
        alert('Cập nhật học sinh thành công!');
        
        // Đóng modal
        closeEditStudentModal();
        
        // Refresh danh sách học sinh (tự động qua listener)
        
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
          const countElement = document.querySelector(`.student-count-${classId}`);
          if (countElement) {
            countElement.textContent = snapshot.size;
            console.log(`📊 Student count for ${classId}: ${snapshot.size}`);
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
      
      // Disable button để tránh double click
      saveNewStudentBtn.disabled = true;
      const originalText = saveNewStudentBtn.textContent;
      saveNewStudentBtn.textContent = 'Đang thêm...';
      
      try {
        // Lấy giá trị từ form
        const name = document.getElementById('new-stu-name').value.trim();
        const studentId = document.getElementById('new-stu-id').value.trim();
        const birthdate = document.getElementById('new-stu-birthdate').value;
        const phone = document.getElementById('new-stu-phone').value.trim();
        const email = document.getElementById('new-stu-email').value.trim();
        const gender = document.getElementById('new-stu-gender').value;

        console.log('📝 Student form data:', {
          name, studentId, birthdate, phone, email, gender, currentClassId
        });

        if (!name) {
          alert('Vui lòng nhập họ tên học sinh!');
          return;
        }

        if (!currentClassId) {
          alert('Lỗi: Không tìm thấy lớp học!');
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
          studentId: studentId,
          birthdate: birthdate,
          phone: phone,
          email: email,
          gender: gender,
          classId: currentClassId,
          className: classData.name,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
            // Vẫn tiếp tục lưu học sinh không có ảnh
          }
        }

        // Lưu học sinh vào Firestore
        await db.collection('students').add(studentData);
        
        console.log('✅ Student added successfully');
        
        // Hiển thị thông báo thành công
        alert('Thêm học sinh thành công!');
        
        // Đóng modal
        closeAddStudentModal();
        
        // Refresh danh sách học sinh (tự động qua listener)
        
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

    function saveClass() {
      console.log('💾 Saving class...');
      
      // Disable button để tránh double click
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

      if (editingClassId) {
        console.log('✏️ Updating existing class:', editingClassId);
        db.collection('classes').doc(editingClassId).update(classData)
          .then(() => {
            alert('Cập nhật lớp thành công!');
          })
          .catch(error => {
            console.error('❌ Error updating class:', error);
            alert('Lỗi cập nhật: ' + error.message);
          })
          .finally(() => {
            saveClassBtn.textContent = originalText;
            saveClassBtn.disabled = false;
          });
      } else {
        console.log('➕ Adding new class');
        classData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection('classes').add(classData)
          .then(() => {
            alert('Thêm lớp thành công!');
          })
          .catch(error => {
            console.error('❌ Error adding class:', error);
            alert('Lỗi thêm lớp: ' + error.message);
          })
          .finally(() => {
            saveClassBtn.textContent = originalText;
            saveClassBtn.disabled = false;
          });
      }
    }

    function deleteClass(classId) {
      console.log('🗑️ Deleting class:', classId);
      
      if (!confirm('Bạn có chắc muốn xóa lớp này? Học sinh trong lớp sẽ bị xóa khỏi lớp.')) return;

      db.collection('students')
        .where('classId', '==', classId)
        .get()
        .then(snapshot => {
          const batch = db.batch();
          snapshot.forEach(doc => {
            batch.update(doc.ref, { classId: '', className: '' });
          });
          return batch.commit();
        })
        .then(() => db.collection('classes').doc(classId).delete())
        .then(() => {
          console.log('✅ Class deleted successfully');
          alert('Xóa lớp thành công!');
        })
        .catch(error => {
          console.error('❌ Error deleting class:', error);
          alert('Lỗi xóa lớp: ' + error.message);
        });
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

    // Cleanup
    window.addEventListener('beforeunload', () => {
      console.log('🧹 Cleaning up listeners...');
      if (classStudentsUnsubscribe) classStudentsUnsubscribe();
      if (classesUnsubscribe) classesUnsubscribe();
    });
  }
});